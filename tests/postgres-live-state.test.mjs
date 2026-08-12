import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { newDb } from 'pg-mem';
import { PostgresLiveRepository } from '../src/repositories/postgres-live.mjs';
import { Store } from '../src/store.mjs';
import { EcosystemService } from '../src/ecosystem/service.mjs';
import { createStageState } from '../src/ecosystem/live-entertainment.mjs';

test('Postgres canonical live state: stages and battle overlay', async () => {
  const memory = newDb();
  memory.public.none(`
    CREATE TABLE users (id uuid PRIMARY KEY, username text NOT NULL);
    CREATE TABLE live_rooms (id uuid PRIMARY KEY,host_id uuid NOT NULL REFERENCES users(id),title text NOT NULL,status text NOT NULL,created_at timestamptz NOT NULL,ended_at timestamptz);
    CREATE TABLE live_messages (id uuid PRIMARY KEY,live_id uuid NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,body text NOT NULL,created_at timestamptz NOT NULL);
    CREATE TABLE live_engagement(live_id uuid PRIMARY KEY REFERENCES live_rooms(id),likes bigint NOT NULL DEFAULT 0,resonance bigint NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE live_battles(id uuid PRIMARY KEY,host_live_id uuid NOT NULL REFERENCES live_rooms(id),opponent_live_id uuid NOT NULL REFERENCES live_rooms(id),status text NOT NULL DEFAULT 'live',host_score bigint NOT NULL DEFAULT 0,opponent_score bigint NOT NULL DEFAULT 0,started_at timestamptz NOT NULL,ends_at timestamptz NOT NULL,ended_at timestamptz,overlay jsonb NOT NULL DEFAULT '{}');
    CREATE TABLE live_stages(live_id uuid PRIMARY KEY REFERENCES live_rooms(id),host_id uuid NOT NULL REFERENCES users(id),state jsonb NOT NULL DEFAULT '{}',updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE live_room_profiles(id uuid PRIMARY KEY,live_id uuid NOT NULL REFERENCES live_rooms(id),host_id uuid NOT NULL REFERENCES users(id),kind text NOT NULL DEFAULT 'standard',title text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(live_id));
    CREATE TABLE clip_jobs(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),live_id uuid,media_id uuid,title text NOT NULL,status text NOT NULL DEFAULT 'queued',output_path text,output_metadata jsonb NOT NULL DEFAULT '{}',error text,attempts int NOT NULL DEFAULT 0,max_attempts int NOT NULL DEFAULT 3,created_at timestamptz NOT NULL DEFAULT now(),started_at timestamptz,completed_at timestamptz,updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE posts(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),body text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
  `);
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  const repo = new PostgresLiveRepository(pool);
  const hostId = randomUUID();
  const liveId = randomUUID();
  const oppId = randomUUID();
  const oppLiveId = randomUUID();
  await pool.query('INSERT INTO users(id,username) VALUES($1,$2),($3,$4)', [hostId, 'host', oppId, 'opp']);
  await repo.createRoom({ id: liveId, hostId, title: 'PG LIVE', status: 'live', createdAt: new Date().toISOString(), endedAt: null });
  await repo.createRoom({ id: oppLiveId, hostId: oppId, title: 'OPP', status: 'live', createdAt: new Date().toISOString(), endedAt: null });

  const stage = createStageState({ liveId, hostId });
  stage.raisedHands.push(randomUUID());
  const savedStage = await repo.saveStage(stage);
  assert.equal(savedStage.liveId, liveId);
  assert.equal(savedStage.raisedHands.length, 1);

  const battle = await repo.createBattle({
    id: randomUUID(),
    hostLiveId: liveId,
    opponentLiveId: oppLiveId,
    startedAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 180000).toISOString(),
    overlay: { mode: '1v1', factors: { likes: 0 }, rounds: [{ index: 1, status: 'active' }] }
  });
  assert.equal(battle.mode, '1v1');
  battle.factors.likes = 5;
  battle.hostScore = 10;
  const updated = await repo.saveBattlePlan(battle);
  assert.equal(updated.factors.likes, 5);

  const store = new Store(':memory:').load();
  store.data.users.push({ id: hostId, username: 'host', displayName: 'Host', email: 'h@test.dev', passwordHash: 'x', locale: 'en', bio: '', role: 'user', createdAt: store.now() });
  const ecosystem = new EcosystemService(store, null);
  ecosystem.setHooks({
    findLiveRoom: (id) => repo.findLiveRoom(id),
    listLiveRooms: () => repo.listActiveRooms(50),
    listLiveMessages: (id) => repo.listMessages(id, 200),
    liveEngagement: (id) => repo.engagement(id),
    activeBattle: (id) => repo.activeBattle(id),
    createBattle: (payload) => repo.createBattle(payload),
    getBattlePlan: (id) => repo.getBattlePlan(id),
    saveBattlePlan: (b) => repo.saveBattlePlan(b),
    getBattlePlanByLiveId: (id) => repo.getBattlePlanByLiveId(id),
    getStage: (id) => repo.getStage(id),
    saveStage: (s) => repo.saveStage(s),
    listRoomsForUser: (uid, limit) => repo.listRoomsForUser(uid, limit),
    postgresLiveState: true
  });

  assert.equal(ecosystem.liveStatePg, true);
  const viewerId = randomUUID();
  store.data.users.push({ id: viewerId, username: 'viewer', displayName: 'Viewer', email: 'v@test.dev', passwordHash: 'x', locale: 'en', bio: '', role: 'user', createdAt: store.now() });
  const stageAction = await ecosystem.stageAction({ id: viewerId }, liveId, 'raise_hand', null);
  assert.ok(stageAction.raisedHands.includes(viewerId));

  const pgStage = await repo.getStage(liveId);
  assert.ok(pgStage.raisedHands.includes(viewerId));

  await pool.end();
});
