import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { newDb } from 'pg-mem';
import { PostgresWalletRepository } from '../src/repositories/postgres-wallet.mjs';

test('PostgreSQL wallet gift transfer is atomic, balanced and idempotent', async()=>{
  const memory=newDb();
  memory.public.none(`
    CREATE TABLE users(id uuid PRIMARY KEY);
    CREATE TABLE gifts(id text PRIMARY KEY,name text NOT NULL,tier text NOT NULL,price bigint NOT NULL,enabled boolean NOT NULL DEFAULT true,color text NOT NULL);
    CREATE TABLE wallets(user_id uuid PRIMARY KEY REFERENCES users(id),currency text NOT NULL DEFAULT 'LUMEN',balance bigint NOT NULL DEFAULT 0,earnings bigint NOT NULL DEFAULT 0);
    CREATE TABLE ledger_entries(id uuid PRIMARY KEY,wallet_user_id uuid NOT NULL REFERENCES wallets(user_id),direction text NOT NULL,amount bigint NOT NULL,currency text NOT NULL,reason text NOT NULL,correlation_id uuid NOT NULL,counterparty_user_id uuid REFERENCES users(id),gift_id text REFERENCES gifts(id),created_at timestamptz NOT NULL DEFAULT now(),bucket text NOT NULL DEFAULT 'spendable',UNIQUE(wallet_user_id,correlation_id,direction));
    CREATE TABLE gift_transfers(id uuid PRIMARY KEY,idempotency_key text NOT NULL,sender_id uuid NOT NULL REFERENCES users(id),recipient_id uuid NOT NULL REFERENCES users(id),gift_id text NOT NULL REFERENCES gifts(id),quantity int NOT NULL,gross_amount bigint NOT NULL,creator_amount bigint NOT NULL,platform_amount bigint NOT NULL,currency text NOT NULL,live_id uuid,created_at timestamptz NOT NULL,UNIQUE(sender_id,idempotency_key));
    CREATE TABLE platform_ledger_entries(id uuid PRIMARY KEY,direction text NOT NULL,amount bigint NOT NULL,currency text NOT NULL,reason text NOT NULL,correlation_id uuid NOT NULL UNIQUE,created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE notifications(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),actor_id uuid REFERENCES users(id),type text NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL);
    CREATE TABLE realtime_outbox(id uuid PRIMARY KEY,topic text NOT NULL,aggregate_id text,event_type text NOT NULL,payload jsonb NOT NULL,available_at timestamptz NOT NULL,created_at timestamptz NOT NULL,claimed_at timestamptz,claim_token uuid,published_at timestamptz,attempts int NOT NULL DEFAULT 0,last_error text);
    CREATE TABLE donor_progress(user_id uuid PRIMARY KEY REFERENCES users(id),gift_xp bigint NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE support_progress(supporter_id uuid NOT NULL REFERENCES users(id),creator_id uuid NOT NULL REFERENCES users(id),bond_xp bigint NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(supporter_id,creator_id));
  `);
  const adapter=memory.adapters.createPg(),pool=new adapter.Pool(),repo=new PostgresWalletRepository(pool),senderId=randomUUID(),recipientId=randomUUID();
  await pool.query('INSERT INTO users(id) VALUES($1),($2)',[senderId,recipientId]);
  await pool.query("INSERT INTO gifts(id,name,tier,price,enabled,color) VALUES('pulse','Sylora Pulse','basic',25,true,'#5b5cf6')");
  assert.equal((await repo.ensureWallet(senderId)).balance,10000);
  assert.equal((await repo.ensureWallet(recipientId)).balance,10000);

  const request={id:randomUUID(),notificationId:randomUUID(),senderId,recipientId,giftId:'pulse',quantity:1,idempotencyKey:'gift-test-0001',creatorShareBps:7000,createdAt:new Date().toISOString()};
  const first=await repo.sendGift(request);
  assert.equal(first.replayed,false);
  assert.equal(first.wallet.balance,9975);
  assert.equal(first.transfer.creatorAmount,17);
  assert.equal(first.transfer.platformAmount,8);
  assert.equal(first.progress.donorXp,25);
  assert.equal(first.progress.bondXp,25);
  assert.equal((await repo.getWallet(recipientId)).earnings,17);

  const replay=await repo.sendGift({...request,id:randomUUID()});
  assert.equal(replay.replayed,true);
  assert.equal(replay.transfer.id,first.transfer.id);
  assert.equal(replay.wallet.balance,9975);

  const senderLedger=await repo.listLedger(senderId),recipientLedger=await repo.listLedger(recipientId);
  assert.equal(senderLedger.find(x=>x.correlationId===first.transfer.id).bucket,'spendable');
  assert.equal(recipientLedger.find(x=>x.correlationId===first.transfer.id).bucket,'earnings');
  const platform=await pool.query("SELECT amount FROM platform_ledger_entries WHERE correlation_id=$1 AND direction='credit'",[first.transfer.id]);
  assert.equal(Number(platform.rows[0].amount),8);
  assert.equal(first.transfer.grossAmount,first.transfer.creatorAmount+Number(platform.rows[0].amount));
  const notification=await pool.query("SELECT * FROM notifications WHERE user_id=$1 AND type='gift'",[recipientId]);
  assert.equal(notification.rowCount,1);
  const outbox=await pool.query('SELECT * FROM realtime_outbox WHERE id=$1',[first.transfer.id]);
  assert.equal(outbox.rowCount,1);
  assert.equal(outbox.rows[0].event_type,'gift.sent');
  assert.equal(outbox.rows[0].payload.id,first.transfer.id);

  await pool.query('ALTER TABLE gift_transfers ADD COLUMN IF NOT EXISTS refunded_at timestamptz');
  const beforeSender = (await repo.getWallet(senderId)).balance;
  const beforeEarn = (await repo.getWallet(recipientId)).earnings;
  const refund = await repo.refundGiftTransfer({
    transferId: first.transfer.id,
    refundId: randomUUID(),
    createdAt: new Date().toISOString()
  });
  assert.equal(refund.ok, true);
  assert.equal(refund.refund.gross, 25);
  assert.equal((await repo.getWallet(senderId)).balance, beforeSender + 25);
  assert.equal((await repo.getWallet(recipientId)).earnings, beforeEarn - 17);
  let again = null;
  try {
    again = await repo.refundGiftTransfer({
      transferId: first.transfer.id,
      refundId: randomUUID(),
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    assert.equal(error.code, 'ALREADY_REFUNDED');
  }
  assert.equal(again, null);
  await pool.end();
});
