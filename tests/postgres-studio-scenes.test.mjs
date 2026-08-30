import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { DataType, newDb } from 'pg-mem';
import { PostgresStudioSceneRepository } from '../src/repositories/postgres-studio-scenes.mjs';

test('PostgreSQL Studio scene repository is tenant-scoped and survives repository restart', async () => {
  const memory = newDb();
  memory.public.registerFunction({ name: 'char_length', args: [DataType.text], returns: DataType.integer, implementation: value => value.length });
  memory.public.none('CREATE TABLE users(id uuid PRIMARY KEY)');
  memory.public.none('CREATE TABLE ecosystem_actions(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE)');
  memory.public.none(fs.readFileSync(new URL('../infra/postgres/migrations/016_studio_scenes.sql', import.meta.url), 'utf8'));
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  const repository = new PostgresStudioSceneRepository(pool);
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const sceneId = randomUUID();
  const createdAt = '2026-08-30T10:00:00.000Z';
  await pool.query('INSERT INTO users(id) VALUES($1),($2)', [userId, otherUserId]);

  const created = await repository.createScene({
    id: sceneId,
    userId,
    name: 'Primary LIVE',
    overlayTitle: 'SYLORA NOW',
    overlayStyle: 'cyan',
    profileId: 'square1080',
    micGain: 118,
    micMuted: true,
    createdAt,
    updatedAt: createdAt
  });
  assert.equal(created.userId, userId);
  assert.equal(created.micGain, 118);
  assert.equal(await repository.getScene(otherUserId, sceneId), null);
  assert.deepEqual(await repository.listScenes(otherUserId), []);

  const updated = await repository.updateScene({
    ...created,
    name: 'Primary LIVE 2',
    overlayStyle: 'clean',
    profileId: 'portrait4x5',
    micGain: 75,
    micMuted: false,
    updatedAt: '2026-08-30T10:05:00.000Z'
  });
  assert.equal(updated.name, 'Primary LIVE 2');
  assert.equal(updated.profileId, 'portrait4x5');
  assert.equal(await repository.updateScene({ ...updated, userId: otherUserId }), null);

  const restartedRepository = new PostgresStudioSceneRepository(pool);
  const persisted = await restartedRepository.getScene(userId, sceneId);
  assert.equal(persisted.name, 'Primary LIVE 2');
  assert.equal(persisted.updatedAt, '2026-08-30T10:05:00.000Z');
  assert.equal((await restartedRepository.listScenes(userId))[0].id, sceneId);
  assert.equal(await restartedRepository.deleteScene(otherUserId, sceneId), false);
  const actionId = randomUUID();
  await pool.query('INSERT INTO ecosystem_actions(id,user_id) VALUES($1,$2)', [actionId, userId]);
  await assert.rejects(
    pool.query(
      'INSERT INTO studio_scenes(id,user_id,name,action_id,action_user_id) VALUES($1,$2,$3,$4,NULL)',
      [randomUUID(), otherUserId, 'Unowned action', actionId]
    ),
    /check constraint/i
  );
  const aiScene = { ...created, id: actionId, name: 'AI Scene', actionId, aiPlan: { topic: 'Idempotent Studio' } };
  await assert.rejects(
    pool.query(
      'INSERT INTO studio_scenes(id,user_id,name,action_id,action_user_id) VALUES($1,$2,$3,$4,$5)',
      [randomUUID(), otherUserId, 'Forged owner', actionId, userId]
    ),
    /check constraint/i
  );
  await assert.rejects(
    restartedRepository.createScene({ ...aiScene, id: randomUUID(), userId: otherUserId }),
    /foreign key constraint/i
  );
  const firstAi = await restartedRepository.createSceneOnce(aiScene);
  const repeatedAi = await restartedRepository.createSceneOnce({ ...aiScene, name: 'Duplicate' });
  assert.equal(firstAi.id, actionId);
  assert.equal(repeatedAi.name, 'AI Scene');
  assert.equal(repeatedAi.aiPlan.topic, 'Idempotent Studio');
  assert.equal(Number((await pool.query('SELECT count(*) AS count FROM studio_scenes WHERE action_id=$1', [actionId])).rows[0].count), 1);
  assert.equal((await pool.query('SELECT action_user_id FROM studio_scenes WHERE id=$1', [actionId])).rows[0].action_user_id, userId);
  await pool.query('DELETE FROM ecosystem_actions WHERE id=$1', [actionId]);
  assert.equal((await restartedRepository.getScene(userId, actionId)).actionId, null);
  assert.equal((await pool.query('SELECT action_user_id FROM studio_scenes WHERE id=$1', [actionId])).rows[0].action_user_id, null);
  assert.equal(await restartedRepository.deleteScene(userId, sceneId), true);
  assert.equal(await restartedRepository.getScene(userId, sceneId), null);
  await pool.end();
});
