import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { newDb } from 'pg-mem';
import { PostgresLiveRepository } from '../src/repositories/postgres-live.mjs';

test('PostgreSQL LIVE repository persists room lifecycle and chat',async()=>{
  const memory=newDb();
  memory.public.none(`
    CREATE TABLE users (id uuid PRIMARY KEY, username text NOT NULL);
    CREATE TABLE live_rooms (id uuid PRIMARY KEY,host_id uuid NOT NULL REFERENCES users(id),title text NOT NULL,status text NOT NULL,created_at timestamptz NOT NULL,ended_at timestamptz);
    CREATE TABLE live_messages (id uuid PRIMARY KEY,live_id uuid NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,body text NOT NULL,created_at timestamptz NOT NULL);
    CREATE TABLE live_engagement(live_id uuid PRIMARY KEY REFERENCES live_rooms(id),likes bigint NOT NULL DEFAULT 0,resonance bigint NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE live_battles(id uuid PRIMARY KEY,host_live_id uuid NOT NULL REFERENCES live_rooms(id),opponent_live_id uuid NOT NULL REFERENCES live_rooms(id),status text NOT NULL DEFAULT 'live',host_score bigint NOT NULL DEFAULT 0,opponent_score bigint NOT NULL DEFAULT 0,started_at timestamptz NOT NULL,ends_at timestamptz NOT NULL,ended_at timestamptz);
  `);
  const adapter=memory.adapters.createPg(),pool=new adapter.Pool(),repo=new PostgresLiveRepository(pool),hostId=randomUUID(),viewerId=randomUUID(),liveId=randomUUID();
  await pool.query('INSERT INTO users(id,username) VALUES($1,$2),($3,$4)',[hostId,'host',viewerId,'viewer']);
  const room=await repo.createRoom({id:liveId,hostId,title:'SYLORA LIVE',status:'live',createdAt:new Date().toISOString(),endedAt:null});
  assert.equal(room.status,'live');
  assert.equal((await repo.listActiveRooms())[0].id,liveId);
  const message=await repo.createMessage({id:randomUUID(),liveId,userId:viewerId,username:'viewer',text:'Привіт LIVE',createdAt:new Date().toISOString()});
  assert.equal(message.text,'Привіт LIVE');
  assert.equal((await repo.listMessages(liveId))[0].username,'viewer');
  assert.deepEqual(await repo.engagement(liveId),{likes:0,resonance:0});
  assert.deepEqual(await repo.addLike(liveId,3),{likes:3,resonance:3});
  const opponentId=randomUUID();
  await repo.createRoom({id:opponentId,hostId:viewerId,title:'OPPONENT',status:'live',createdAt:new Date().toISOString(),endedAt:null});
  const battle=await repo.createBattle({id:randomUUID(),hostLiveId:liveId,opponentLiveId:opponentId,startedAt:new Date().toISOString(),endsAt:new Date(Date.now()+180000).toISOString()});
  assert.equal(battle.hostScore,0);
  await repo.addLike(liveId,2);
  assert.equal((await repo.activeBattle(liveId)).hostScore,2);
  const ended=await repo.endRoom(liveId,hostId,new Date().toISOString());
  assert.equal(ended.status,'ended');
  assert.equal(await repo.findLiveRoom(liveId),null);
  assert.equal((await repo.listActiveRooms()).length,1);
  await pool.end();
});
