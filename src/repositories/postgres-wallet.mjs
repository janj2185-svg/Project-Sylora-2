function iso(value){return value instanceof Date?value.toISOString():String(value||'')}
function gift(row){return row?{id:row.id,name:row.name,tier:row.tier,price:Number(row.price),enabled:row.enabled,color:row.color}:null}
function wallet(row){return row?{userId:row.user_id,balance:Number(row.balance),earnings:Number(row.earnings),currency:row.currency}:null}
function transfer(row){return row?{id:row.id,correlationId:row.id,idempotencyKey:row.idempotency_key,fromUserId:row.sender_id,toUserId:row.recipient_id,giftId:row.gift_id,quantity:Number(row.quantity),amount:Number(row.gross_amount),grossAmount:Number(row.gross_amount),creatorAmount:Number(row.creator_amount),platformAmount:Number(row.platform_amount),currency:row.currency,liveId:row.live_id||null,createdAt:iso(row.created_at),type:'gift'}:null}

export class PostgresWalletRepository {
  constructor(pool=null){this.pool=pool}
  get enabled(){return !!this.pool}

  async ensureWallet(userId,initialBalance=10000){
    const client=await this.pool.connect();
    try{
      await client.query('BEGIN');
      let result=await client.query('SELECT * FROM wallets WHERE user_id=$1 FOR UPDATE',[userId]);
      if(!result.rowCount){
        result=await client.query('INSERT INTO wallets(user_id,currency,balance,earnings) VALUES($1,\'LUMEN\',$2,0) RETURNING *',[userId,initialBalance]);
        if(initialBalance>0){
          const correlationId=randomUUID();
          await client.query("INSERT INTO ledger_entries(id,wallet_user_id,direction,amount,currency,reason,correlation_id) VALUES($4,$1,'credit',$2,'LUMEN','starter_grant',$3)",[userId,initialBalance,correlationId,randomUUID()]);
          await client.query("INSERT INTO platform_ledger_entries(id,direction,amount,currency,reason,correlation_id) VALUES($3,'debit',$1,'LUMEN','starter_grant',$2)",[initialBalance,correlationId,randomUUID()]);
        }
      }
      await client.query('COMMIT');return wallet(result.rows[0]);
    }catch(error){try{await client.query('ROLLBACK')}catch{}throw error}finally{client.release()}
  }

  async getWallet(userId){const result=await this.pool.query('SELECT * FROM wallets WHERE user_id=$1',[userId]);return wallet(result.rows[0])}
  async listGifts(){const result=await this.pool.query('SELECT * FROM gifts WHERE enabled=true ORDER BY price,id');return result.rows.map(gift)}

  async sendGift({id,notificationId,senderId,recipientId,giftId,quantity,idempotencyKey,creatorShareBps,liveId=null,createdAt,senderPublic=null,recipientPublic=null}){
    const client=await this.pool.connect();
    try{
      await client.query('BEGIN');
      let existing=await client.query('SELECT * FROM gift_transfers WHERE sender_id=$1 AND idempotency_key=$2',[senderId,idempotencyKey]);
      if(existing.rowCount){const sender=await client.query('SELECT * FROM wallets WHERE user_id=$1',[senderId]);await client.query('COMMIT');return {transfer:transfer(existing.rows[0]),wallet:wallet(sender.rows[0]),replayed:true}}
      const locked=await client.query('SELECT * FROM wallets WHERE user_id IN ($1,$2) ORDER BY user_id FOR UPDATE',[senderId,recipientId]);
      const senderRow=locked.rows.find(r=>r.user_id===senderId),recipientRow=locked.rows.find(r=>r.user_id===recipientId);
      if(!senderRow||!recipientRow){const error=new Error('WALLET_NOT_FOUND');error.code='WALLET_NOT_FOUND';throw error}
      existing=await client.query('SELECT * FROM gift_transfers WHERE sender_id=$1 AND idempotency_key=$2',[senderId,idempotencyKey]);
      if(existing.rowCount){await client.query('COMMIT');return {transfer:transfer(existing.rows[0]),wallet:wallet(senderRow),replayed:true}}
      const giftResult=await client.query('SELECT * FROM gifts WHERE id=$1 AND enabled=true FOR SHARE',[giftId]);
      if(!giftResult.rowCount){const error=new Error('GIFT_NOT_FOUND');error.code='GIFT_NOT_FOUND';throw error}
      const giftRow=giftResult.rows[0],gross=Number(giftRow.price)*quantity,creator=Math.floor(gross*creatorShareBps/10000),platform=gross-creator;
      if(Number(senderRow.balance)<gross){const error=new Error('INSUFFICIENT_BALANCE');error.code='INSUFFICIENT_BALANCE';throw error}
      await client.query('UPDATE wallets SET balance=$2 WHERE user_id=$1',[senderId,Number(senderRow.balance)-gross]);
      await client.query('UPDATE wallets SET earnings=$2 WHERE user_id=$1',[recipientId,Number(recipientRow.earnings)+creator]);
      await client.query("INSERT INTO ledger_entries(id,wallet_user_id,direction,amount,currency,reason,correlation_id,counterparty_user_id,gift_id,created_at,bucket) VALUES($8,$1,'debit',$3,'LUMEN','gift',$5,$2,$4,$6,'spendable'),($9,$2,'credit',$7,'LUMEN','gift_creator_share',$5,$1,$4,$6,'earnings')",[senderId,recipientId,gross,giftId,id,createdAt,creator,randomUUID(),randomUUID()]);
      if(platform>0)await client.query("INSERT INTO platform_ledger_entries(id,direction,amount,currency,reason,correlation_id,created_at) VALUES($4,'credit',$1,'LUMEN','gift_platform_share',$2,$3)",[platform,id,createdAt,randomUUID()]);
      const inserted=await client.query('INSERT INTO gift_transfers(id,idempotency_key,sender_id,recipient_id,gift_id,quantity,gross_amount,creator_amount,platform_amount,currency,live_id,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,\'LUMEN\',$10,$11) RETURNING *',[id,idempotencyKey,senderId,recipientId,giftId,quantity,gross,creator,platform,liveId,createdAt]);
      const donor=await client.query('INSERT INTO donor_progress(user_id,gift_xp,updated_at) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET gift_xp=donor_progress.gift_xp+$2,updated_at=$3 RETURNING gift_xp',[senderId,gross,createdAt]);
      const support=await client.query('INSERT INTO support_progress(supporter_id,creator_id,bond_xp,updated_at) VALUES($1,$2,$3,$4) ON CONFLICT(supporter_id,creator_id) DO UPDATE SET bond_xp=support_progress.bond_xp+$3,updated_at=$4 RETURNING bond_xp',[senderId,recipientId,gross,createdAt]);
      if(liveId)await client.query("UPDATE live_engagement SET resonance=resonance+$2,updated_at=$3 WHERE live_id=$1",[liveId,gross,createdAt]);
      if(liveId)await client.query("UPDATE live_battles SET host_score=host_score+CASE WHEN host_live_id=$1 THEN $2 ELSE 0 END,opponent_score=opponent_score+CASE WHEN opponent_live_id=$1 THEN $2 ELSE 0 END WHERE status='live' AND ends_at>now() AND (host_live_id=$1 OR opponent_live_id=$1)",[liveId,gross]);
      await client.query("INSERT INTO notifications(id,user_id,actor_id,type,payload,created_at) VALUES($1,$2,$3,'gift',$4,$5)",[notificationId,recipientId,senderId,{giftId,amount:gross,quantity,liveId},createdAt]);
      const eventTransfer=transfer(inserted.rows[0]),eventGift=gift(giftRow),notification={id:notificationId,userId:recipientId,actorId:senderId,type:'gift',payload:{giftId,amount:gross,quantity,liveId},read:false,createdAt,actor:senderPublic};
      const progress={donorXp:Number(donor.rows[0].gift_xp),bondXp:Number(support.rows[0].bond_xp)},realtimeEvent={...eventTransfer,gift:eventGift,sender:senderPublic,recipient:recipientPublic,notification,progress};
      await client.query("INSERT INTO realtime_outbox(id,topic,aggregate_id,event_type,payload,available_at,created_at) VALUES($1,'gift',$2,'gift.sent',$3,$4,$4)",[id,liveId||recipientId,realtimeEvent,createdAt]);
      const current=await client.query('SELECT * FROM wallets WHERE user_id=$1',[senderId]);
      await client.query('COMMIT');return {transfer:transfer(inserted.rows[0]),wallet:wallet(current.rows[0]),gift:gift(giftRow),progress,replayed:false};
    }catch(error){try{await client.query('ROLLBACK')}catch{}throw error}finally{client.release()}
  }

  async listLedger(userId){const result=await this.pool.query("SELECT le.*,CASE WHEN le.reason='gift' THEN gt.quantity ELSE 1 END AS quantity,gt.creator_amount,gt.platform_amount,gt.live_id FROM ledger_entries le LEFT JOIN gift_transfers gt ON gt.id=le.correlation_id WHERE le.wallet_user_id=$1 ORDER BY le.created_at DESC LIMIT 100",[userId]);return result.rows.map(r=>({id:r.id,type:r.reason.startsWith('gift')?'gift':r.reason,direction:r.direction,bucket:r.bucket,amount:Number(r.amount),grossAmount:r.reason==='gift'?Number(r.amount):undefined,creatorAmount:r.creator_amount==null?undefined:Number(r.creator_amount),platformAmount:r.platform_amount==null?undefined:Number(r.platform_amount),quantity:Number(r.quantity||1),currency:r.currency,giftId:r.gift_id,fromUserId:r.direction==='debit'?userId:r.counterparty_user_id,toUserId:r.direction==='credit'?userId:r.counterparty_user_id,liveId:r.live_id||null,correlationId:r.correlation_id,createdAt:iso(r.created_at)}))}
  async giftStats(userId){const result=await this.pool.query('SELECT COALESCE(sum(gross_amount),0)::bigint AS gross,COALESCE(sum(creator_amount),0)::bigint AS earnings FROM gift_transfers WHERE recipient_id=$1',[userId]);return {giftsReceived:Number(result.rows[0].gross),creatorEarnings:Number(result.rows[0].earnings)}}
  async progress(userId){const d=await this.pool.query('SELECT gift_xp FROM donor_progress WHERE user_id=$1',[userId]);return{donorXp:Number(d.rows[0]?.gift_xp||0)}}
}
import { randomUUID } from 'node:crypto';
