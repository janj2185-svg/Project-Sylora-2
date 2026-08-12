import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { newDb } from 'pg-mem';
import { PostgresLiveRepository } from '../src/repositories/postgres-live.mjs';
import { Store } from '../src/store.mjs';
import { EcosystemService } from '../src/ecosystem/service.mjs';

test('ecosystem LIVE helpers use Postgres hooks instead of empty JSON store', async () => {
  const memory = newDb();
  memory.public.none(`
    CREATE TABLE users (id uuid PRIMARY KEY, username text NOT NULL);
    CREATE TABLE live_rooms (id uuid PRIMARY KEY,host_id uuid NOT NULL REFERENCES users(id),title text NOT NULL,status text NOT NULL,created_at timestamptz NOT NULL,ended_at timestamptz);
    CREATE TABLE live_messages (id uuid PRIMARY KEY,live_id uuid NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,body text NOT NULL,created_at timestamptz NOT NULL);
    CREATE TABLE live_engagement(live_id uuid PRIMARY KEY REFERENCES live_rooms(id),likes bigint NOT NULL DEFAULT 0,resonance bigint NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE live_battles(id uuid PRIMARY KEY,host_live_id uuid NOT NULL REFERENCES live_rooms(id),opponent_live_id uuid NOT NULL REFERENCES live_rooms(id),status text NOT NULL DEFAULT 'live',host_score bigint NOT NULL DEFAULT 0,opponent_score bigint NOT NULL DEFAULT 0,started_at timestamptz NOT NULL,ends_at timestamptz NOT NULL,ended_at timestamptz);
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
  await repo.createMessage({
    id: randomUUID(),
    liveId,
    userId: hostId,
    username: 'host',
    text: 'How are you?',
    createdAt: new Date().toISOString()
  });

  const store = new Store(':memory:').load();
  store.data.users.push({ id: hostId, username: 'host', displayName: 'Host', email: 'h@test.dev', passwordHash: 'x', locale: 'en', bio: '', role: 'user', createdAt: store.now() });
  const ecosystem = new EcosystemService(store, null);
  ecosystem.setHooks({
    findLiveRoom: (id) => repo.findLiveRoom(id),
    listLiveRooms: () => repo.listActiveRooms(50),
    listLiveMessages: (id) => repo.listMessages(id, 200),
    liveEngagement: (id) => repo.engagement(id),
    activeBattle: (id) => repo.activeBattle(id),
    createBattle: (payload) => repo.createBattle(payload)
  });

  const user = { id: hostId, username: 'host', displayName: 'Host' };
  const copilot = await ecosystem.liveCopilotBundle(user, liveId);
  assert.equal(copilot.ok, true);
  assert.equal(copilot.highlights.length, 1);

  const rooms = await ecosystem.resolveLiveRooms();
  assert.equal(rooms.length, 2);

  const battle = await ecosystem.startResonanceBattle(user, {
    hostLiveId: liveId,
    opponentLiveId: oppLiveId,
    mode: '1v1'
  });
  assert.equal(battle.hostLiveId, liveId);
  const active = await repo.activeBattle(liveId);
  assert.equal(active?.id, battle.id);

  const viewerId = randomUUID();
  store.data.users.push({ id: viewerId, username: 'viewer', displayName: 'Viewer', email: 'v@test.dev', passwordHash: 'x', locale: 'en', bio: '', role: 'user', createdAt: store.now() });
  const stage = await ecosystem.stageAction({ id: viewerId }, liveId, 'raise_hand', null);
  assert.ok(stage.raisedHands.includes(viewerId));

  await pool.end();
});
