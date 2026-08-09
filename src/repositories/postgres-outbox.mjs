import { randomUUID } from 'node:crypto';

function rowToEvent(row){return row?{id:row.id,topic:row.topic,aggregateId:row.aggregate_id||null,eventType:row.event_type,payload:typeof row.payload==='string'?JSON.parse(row.payload):row.payload,availableAt:new Date(row.available_at).toISOString(),createdAt:new Date(row.created_at).toISOString(),attempts:Number(row.attempts||0)}:null}

export class PostgresOutboxRepository {
  constructor(pool=null){this.pool=pool}
  get enabled(){return !!this.pool}

  async health(){if(!this.pool)return{configured:false,ok:true,pending:0};try{const result=await this.pool.query('SELECT count(*)::int AS pending,min(created_at) AS oldest FROM realtime_outbox WHERE published_at IS NULL');return{configured:true,ok:true,pending:Number(result.rows[0].pending||0),oldest:result.rows[0].oldest?new Date(result.rows[0].oldest).toISOString():null}}catch{return{configured:true,ok:false,pending:null,oldest:null}}}

  async claimBatch({limit=20,claimToken=randomUUID(),claimTimeoutMs=30_000}={}){
    if(!this.pool)return {claimToken,events:[]};
    const bounded=Math.max(1,Math.min(100,Math.trunc(limit)||20)),staleBefore=new Date(Date.now()-Math.max(5_000,claimTimeoutMs)).toISOString();
    const result=await this.pool.query(`WITH picked AS (
      SELECT id FROM realtime_outbox
      WHERE published_at IS NULL AND available_at<=now() AND (claimed_at IS NULL OR claimed_at<$2)
      ORDER BY created_at
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE realtime_outbox o SET claimed_at=now(),claim_token=$3,attempts=o.attempts+1
    FROM picked WHERE o.id=picked.id RETURNING o.*`,[bounded,staleBefore,claimToken]);
    return {claimToken,events:result.rows.map(rowToEvent)};
  }

  async markPublished(id,claimToken){const result=await this.pool.query('UPDATE realtime_outbox SET published_at=now(),claimed_at=NULL,claim_token=NULL,last_error=NULL WHERE id=$1 AND claim_token=$2 AND published_at IS NULL',[id,claimToken]);return result.rowCount===1}

  async releaseClaim(id,claimToken,error='',retryDelayMs=1_000){const next=new Date(Date.now()+Math.max(250,Math.min(60_000,retryDelayMs))).toISOString(),message=String(error||'DELIVERY_FAILED').slice(0,1000);const result=await this.pool.query('UPDATE realtime_outbox SET claimed_at=NULL,claim_token=NULL,last_error=$3,available_at=$4 WHERE id=$1 AND claim_token=$2 AND published_at IS NULL',[id,claimToken,message,next]);return result.rowCount===1}
}
