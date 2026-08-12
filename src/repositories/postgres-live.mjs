function iso(value){return value instanceof Date?value.toISOString():String(value||'')}
function roomFromRow(row){if(!row)return null;return{id:row.id,hostId:row.host_id,title:row.title,status:row.status,viewerCount:0,createdAt:iso(row.created_at),endedAt:row.ended_at?iso(row.ended_at):null}}
function messageFromRow(row){if(!row)return null;return{id:row.id,liveId:row.live_id,userId:row.user_id,username:row.username||'',text:row.body,createdAt:iso(row.created_at)}}

export class PostgresLiveRepository {
  constructor(pool=null){this.pool=pool}
  get enabled(){return !!this.pool}

  async createRoom(room){const result=await this.pool.query('INSERT INTO live_rooms(id,host_id,title,status,created_at,ended_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[room.id,room.hostId,room.title,room.status,room.createdAt,room.endedAt]);return roomFromRow(result.rows[0])}
  async findLiveRoom(id){const result=await this.pool.query("SELECT * FROM live_rooms WHERE id=$1 AND status='live' LIMIT 1",[id]);return roomFromRow(result.rows[0])}
  async listActiveRooms(limit=100){const result=await this.pool.query("SELECT * FROM live_rooms WHERE status='live' ORDER BY created_at DESC,id DESC LIMIT $1",[Math.max(1,Math.min(200,Number(limit)||100))]);return result.rows.map(roomFromRow)}
  async endRoom(id,hostId,endedAt){const result=await this.pool.query("UPDATE live_rooms SET status='ended',ended_at=$3 WHERE id=$1 AND host_id=$2 AND status='live' RETURNING *",[id,hostId,endedAt]);return roomFromRow(result.rows[0])}
  async listMessages(liveId,limit=200){const result=await this.pool.query('SELECT m.*,u.username FROM live_messages m JOIN users u ON u.id=m.user_id WHERE m.live_id=$1 ORDER BY m.created_at DESC,m.id DESC LIMIT $2',[liveId,Math.max(1,Math.min(200,Number(limit)||200))]);return result.rows.reverse().map(messageFromRow)}
  async createMessage(message){const result=await this.pool.query('INSERT INTO live_messages(id,live_id,user_id,body,created_at) VALUES($1,$2,$3,$4,$5) RETURNING *',[message.id,message.liveId,message.userId,message.text,message.createdAt]);return{...messageFromRow(result.rows[0]),username:message.username||''}}
  async engagement(liveId){await this.pool.query('INSERT INTO live_engagement(live_id) VALUES($1) ON CONFLICT(live_id) DO NOTHING',[liveId]);const r=await this.pool.query('SELECT likes,resonance FROM live_engagement WHERE live_id=$1',[liveId]);return{likes:Number(r.rows[0]?.likes||0),resonance:Number(r.rows[0]?.resonance||0)}}
  async addLike(liveId,amount=1){const n=Math.max(1,Math.min(20,Number(amount)||1));const r=await this.pool.query('INSERT INTO live_engagement(live_id,likes,resonance) VALUES($1,$2,$2) ON CONFLICT(live_id) DO UPDATE SET likes=live_engagement.likes+$2,resonance=live_engagement.resonance+$2,updated_at=now() RETURNING likes,resonance',[liveId,n]);await this.pool.query("UPDATE live_battles SET host_score=host_score+CASE WHEN host_live_id=$1 THEN $2 ELSE 0 END,opponent_score=opponent_score+CASE WHEN opponent_live_id=$1 THEN $2 ELSE 0 END WHERE status='live' AND ends_at>now() AND (host_live_id=$1 OR opponent_live_id=$1)",[liveId,n]);return{likes:Number(r.rows[0].likes),resonance:Number(r.rows[0].resonance)}}
  async activeBattle(liveId){await this.pool.query("UPDATE live_battles SET status='ended',ended_at=now() WHERE status='live' AND ends_at<=now() AND (host_live_id=$1 OR opponent_live_id=$1)",[liveId]);const r=await this.pool.query("SELECT * FROM live_battles WHERE status='live' AND (host_live_id=$1 OR opponent_live_id=$1) ORDER BY started_at DESC LIMIT 1",[liveId]);return this.battleFromRow(r.rows[0])}
  async createBattle({id,hostLiveId,opponentLiveId,startedAt,endsAt,overlay=null}){const client=await this.pool.connect();try{await client.query('BEGIN');await client.query('SELECT id FROM live_rooms WHERE id IN ($1,$2) ORDER BY id FOR UPDATE',[hostLiveId,opponentLiveId]);const active=await client.query("SELECT id FROM live_battles WHERE status='live' AND (host_live_id IN ($1,$2) OR opponent_live_id IN ($1,$2)) LIMIT 1",[hostLiveId,opponentLiveId]);if(active.rowCount){const error=new Error('RESONANCE_ALREADY_ACTIVE');error.code='RESONANCE_ALREADY_ACTIVE';throw error}const r=await client.query("INSERT INTO live_battles(id,host_live_id,opponent_live_id,status,started_at,ends_at,overlay) VALUES($1,$2,$3,'live',$4,$5,$6::jsonb) RETURNING *",[id,hostLiveId,opponentLiveId,startedAt,endsAt,JSON.stringify(overlay||{})]);await client.query('COMMIT');return this.battleFromRow(r.rows[0])}catch(error){try{await client.query('ROLLBACK')}catch{}throw error}finally{client.release()}}

  battleFromRow(row){
    if(!row)return null;
    const overlay=typeof row.overlay==='object'?row.overlay:(row.overlay?JSON.parse(row.overlay):{});
    return{
      id:row.id,hostLiveId:row.host_live_id,opponentLiveId:row.opponent_live_id,status:row.status,
      hostScore:Number(row.host_score),opponentScore:Number(row.opponent_score),
      startedAt:iso(row.started_at),endsAt:iso(row.ends_at),endedAt:row.ended_at?iso(row.ended_at):null,
      ...overlay
    };
  }

  async getBattlePlan(battleId){
    const r=await this.pool.query('SELECT * FROM live_battles WHERE id=$1',[battleId]);
    return this.battleFromRow(r.rows[0]);
  }

  async getBattlePlanByLiveId(liveId){
    await this.pool.query("UPDATE live_battles SET status='ended',ended_at=now() WHERE status='live' AND ends_at<=now() AND (host_live_id=$1 OR opponent_live_id=$1)",[liveId]);
    const r=await this.pool.query("SELECT * FROM live_battles WHERE status='live' AND (host_live_id=$1 OR opponent_live_id=$1) ORDER BY started_at DESC LIMIT 1",[liveId]);
    return this.battleFromRow(r.rows[0]);
  }

  async saveBattlePlan(battle){
    const overlay={};
    for(const k of ['mode','teamA','teamB','rounds','currentRound','factors','opponentFactors','comebackEvents','fairness','durationSec']){
      if(battle[k]!==undefined)overlay[k]=battle[k];
    }
    await this.pool.query(`UPDATE live_battles SET
      status=$2,host_score=$3,opponent_score=$4,overlay=$5::jsonb,
      ended_at=CASE WHEN $2='ended' THEN COALESCE(ended_at,now()) ELSE ended_at END
      WHERE id=$1`,[
      battle.id,battle.status||'live',Number(battle.hostScore||0),Number(battle.opponentScore||0),JSON.stringify(overlay)
    ]);
    return this.getBattlePlan(battle.id);
  }

  async upsertBattlePlan(battle){
    const existing=await this.getBattlePlan(battle.id);
    if(existing)return this.saveBattlePlan({...existing,...battle});
    if(battle.opponentLiveId){
      return this.createBattle({
        id:battle.id,hostLiveId:battle.hostLiveId,opponentLiveId:battle.opponentLiveId,
        startedAt:battle.startedAt,endsAt:battle.endsAt,overlay:battle
      });
    }
    const r=await this.pool.query(`INSERT INTO live_battles(id,host_live_id,opponent_live_id,status,host_score,opponent_score,started_at,ends_at,overlay)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) RETURNING *`,[
      battle.id,battle.hostLiveId,battle.opponentLiveId||battle.hostLiveId,battle.status||'live',
      Number(battle.hostScore||0),Number(battle.opponentScore||0),battle.startedAt,battle.endsAt,JSON.stringify(battle)
    ]);
    return this.battleFromRow(r.rows[0]);
  }

  stageFromRow(row){
    if(!row)return null;
    const state=typeof row.state==='object'?row.state:(row.state?JSON.parse(row.state):{});
    return{liveId:row.live_id,hostId:row.host_id,...state,updatedAt:iso(row.updated_at)};
  }

  async getStage(liveId){
    const r=await this.pool.query('SELECT * FROM live_stages WHERE live_id=$1',[liveId]);
    return this.stageFromRow(r.rows[0]);
  }

  async saveStage(stage){
    const {liveId,hostId,updatedAt,...state}=stage;
    await this.pool.query(`INSERT INTO live_stages(live_id,host_id,state,updated_at) VALUES($1,$2,$3::jsonb,now())
      ON CONFLICT(live_id) DO UPDATE SET state=$3::jsonb,updated_at=now()`,[liveId,hostId,JSON.stringify(state)]);
    return this.getStage(liveId);
  }

  profileFromRow(row){
    if(!row)return null;
    return{id:row.id,liveId:row.live_id,hostId:row.host_id,kind:row.kind,title:row.title,createdAt:iso(row.created_at),engine:'shared_live_realtime'};
  }

  async getRoomProfile(liveId){
    const r=await this.pool.query('SELECT * FROM live_room_profiles WHERE live_id=$1',[liveId]);
    return this.profileFromRow(r.rows[0]);
  }

  async saveRoomProfile(profile){
    await this.pool.query(`INSERT INTO live_room_profiles(id,live_id,host_id,kind,title) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(live_id) DO UPDATE SET kind=$4,title=$5`,[
      profile.id,profile.liveId,profile.hostId,profile.kind,profile.title
    ]);
    return this.getRoomProfile(profile.liveId);
  }

  async listRoomsForUser(userId,limit=20){
    const r=await this.pool.query(`SELECT * FROM live_rooms WHERE host_id=$1 OR status='live' ORDER BY created_at DESC LIMIT $2`,[userId,Math.max(1,Math.min(100,limit))]);
    return r.rows.map(roomFromRow);
  }

  async searchLive(query,limit=20){
    const r=await this.pool.query(`SELECT * FROM live_rooms WHERE status='live' AND search_vector @@ plainto_tsquery('simple',$1) ORDER BY created_at DESC LIMIT $2`,[query,limit]);
    return r.rows.map(roomFromRow);
  }

  async searchPosts(query,limit=30){
    const r=await this.pool.query(`SELECT p.*,u.username FROM posts p JOIN users u ON u.id=p.user_id WHERE p.search_vector @@ plainto_tsquery('simple',$1) ORDER BY p.created_at DESC LIMIT $2`,[query,limit]);
    return r.rows.map(row=>({id:row.id,userId:row.user_id,body:row.body,username:row.username,createdAt:iso(row.created_at)}));
  }

  clipFromRow(row){
    if(!row)return null;
    return{
      id:row.id,userId:row.user_id,liveId:row.live_id,mediaId:row.media_id,title:row.title,
      status:row.status,outputPath:row.output_path,
      outputMetadata:typeof row.output_metadata==='object'?row.output_metadata:JSON.parse(row.output_metadata||'{}'),
      error:row.error,attempts:Number(row.attempts),maxAttempts:Number(row.max_attempts),
      createdAt:iso(row.created_at),startedAt:row.started_at?iso(row.started_at):null,
      completedAt:row.completed_at?iso(row.completed_at):null,updatedAt:iso(row.updated_at)
    };
  }

  async createClipJob(job){
    const r=await this.pool.query(`INSERT INTO clip_jobs(id,user_id,live_id,media_id,title,status,max_attempts)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[
      job.id,job.userId,job.liveId,job.mediaId,job.title,job.status||'queued',job.maxAttempts||3
    ]);
    return this.clipFromRow(r.rows[0]);
  }

  async updateClipJob(job){
    const r=await this.pool.query(`UPDATE clip_jobs SET status=$2,output_path=$3,output_metadata=$4::jsonb,error=$5,
      attempts=$6,started_at=$7,completed_at=$8,updated_at=now() WHERE id=$1 RETURNING *`,[
      job.id,job.status,job.outputPath||null,JSON.stringify(job.outputMetadata||{}),job.error||null,
      job.attempts||0,job.startedAt,job.completedAt
    ]);
    return this.clipFromRow(r.rows[0]);
  }

  async getClipJob(id){const r=await this.pool.query('SELECT * FROM clip_jobs WHERE id=$1',[id]);return this.clipFromRow(r.rows[0]);}
}
