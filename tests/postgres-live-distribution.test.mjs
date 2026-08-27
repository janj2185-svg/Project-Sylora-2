import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { newDb } from 'pg-mem';
import { PostgresLiveDistributionRepository } from '../src/repositories/postgres-live-distribution.mjs';

test('PostgreSQL live distribution repository keeps destinations and sessions tenant-scoped', async () => {
  const memory = newDb();
  memory.public.none(`
    CREATE TABLE live_stream_destinations (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL,
      provider text NOT NULL,
      label text NOT NULL,
      server_url text NOT NULL,
      encrypted_stream_key text NOT NULL,
      key_fingerprint text NOT NULL,
      enabled boolean NOT NULL,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL
    );
    CREATE TABLE live_distribution_sessions (
      id uuid PRIMARY KEY,
      live_id uuid NOT NULL,
      user_id uuid NOT NULL,
      status text NOT NULL,
      encrypted_ingest_path text NOT NULL,
      ingest_key_fingerprint text NOT NULL,
      destination_ids jsonb NOT NULL,
      destination_states jsonb NOT NULL,
      record boolean NOT NULL,
      created_at timestamptz NOT NULL,
      started_at timestamptz,
      stopped_at timestamptz,
      last_observed_at timestamptz
    );
  `);
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  const repository = new PostgresLiveDistributionRepository(pool);
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const destinationId = randomUUID();
  const liveId = randomUUID();
  const sessionId = randomUUID();
  const createdAt = '2026-08-27T12:00:00.000Z';

  const destination = await repository.createDestination({
    id: destinationId,
    userId,
    provider: 'youtube',
    label: 'Primary YouTube',
    serverUrl: 'rtmps://a.rtmp.youtube.com/live2',
    encryptedStreamKey: 'v1.iv.tag.ciphertext',
    keyFingerprint: '0123456789ab',
    enabled: true,
    createdAt,
    updatedAt: createdAt
  });
  assert.equal(destination.userId, userId);
  assert.equal((await repository.getDestinations(userId, [destinationId])).length, 1);
  assert.equal(await repository.getDestination(otherUserId, destinationId), null);

  const updatedDestination = await repository.updateDestination({
    ...destination,
    label: 'Main YouTube',
    updatedAt: '2026-08-27T12:01:00.000Z'
  });
  assert.equal(updatedDestination.label, 'Main YouTube');

  const session = await repository.createSession({
    id: sessionId,
    liveId,
    userId,
    status: 'waiting_for_source',
    encryptedIngestPath: 'v1.iv.tag.encrypted-ingest',
    ingestKeyFingerprint: 'abcdef012345',
    destinationIds: [destinationId],
    destinationStates: [{ id: destinationId, status: 'configured' }],
    record: true,
    createdAt,
    startedAt: null,
    stoppedAt: null,
    lastObservedAt: null
  });
  assert.deepEqual(session.destinationIds, [destinationId]);
  assert.equal(await repository.destinationInActiveSession(userId, destinationId), true);
  assert.equal(await repository.destinationInActiveSession(otherUserId, destinationId), false);
  assert.equal((await repository.getActiveSession(userId, liveId)).id, sessionId);

  const deniedUpdate = await repository.updateSession({
    ...session,
    userId: otherUserId,
    status: 'failed'
  });
  assert.equal(deniedUpdate, null);
  assert.equal((await repository.getActiveSession(userId, liveId)).status, 'waiting_for_source');

  const stopped = await repository.updateSession({
    ...session,
    status: 'stopped',
    stoppedAt: '2026-08-27T12:02:00.000Z',
    lastObservedAt: '2026-08-27T12:02:00.000Z'
  });
  assert.equal(stopped.status, 'stopped');
  assert.equal(await repository.getActiveSession(userId, liveId), null);
  assert.equal((await repository.getLatestSession(userId, liveId)).status, 'stopped');
  assert.equal(await repository.destinationInActiveSession(userId, destinationId), false);
  assert.equal(await repository.deleteDestination(userId, destinationId), true);
  await pool.end();
});
