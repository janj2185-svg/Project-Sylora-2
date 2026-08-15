import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { newDb } from 'pg-mem';
import { PostgresAiRepository } from '../src/repositories/postgres-ai.mjs';

test('PostgreSQL AI repository persists chat, voice transcripts, memory and approvals', async () => {
  const memory = newDb();
  memory.public.none(`
    CREATE TABLE users (id uuid PRIMARY KEY);
    CREATE TABLE ai_messages (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), role text NOT NULL, body text NOT NULL, source text NOT NULL DEFAULT 'chat', source_event_id text, created_at timestamptz NOT NULL, UNIQUE(user_id,source_event_id));
    CREATE TABLE ai_memories (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), label text NOT NULL, value text NOT NULL, source text NOT NULL, category text NOT NULL DEFAULT 'preferences', tier text NOT NULL DEFAULT 'long', agent_id uuid, context_sources jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE ai_actions (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), type text NOT NULL, payload jsonb NOT NULL, status text NOT NULL, created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL, completed_at timestamptz);
  `);
  const adapter = memory.adapters.createPg(), pool = new adapter.Pool(), repo = new PostgresAiRepository(pool), userId = randomUUID();
  await pool.query('INSERT INTO users(id) VALUES($1)', [userId]);

  const chat = [
    { id:randomUUID(),userId,role:'user',text:'Привіт',source:'chat',sourceEventId:null,createdAt:new Date(Date.now()-1000).toISOString() },
    { id:randomUUID(),userId,role:'assistant',text:'Привіт, Іване',source:'chat',sourceEventId:null,createdAt:new Date().toISOString() }
  ];
  await repo.createMessages(chat);
  assert.deepEqual((await repo.listMessages(userId,10)).map(x=>x.text), ['Привіт','Привіт, Іване']);

  const voice = { id:randomUUID(),userId,role:'user',text:'Голосова репліка',source:'realtime_voice',sourceEventId:'evt_voice_1',createdAt:new Date(Date.now()+1000).toISOString() };
  assert.equal((await repo.createRealtimeTranscript(voice)).saved,true);
  assert.equal((await repo.createRealtimeTranscript({...voice,id:randomUUID()})).saved,false);
  assert.equal((await repo.listMessages(userId,10)).at(-1).source,'realtime_voice');

  const savedMemory = await repo.createMemory({ id:randomUUID(),userId,label:'Мова',value:'Українська',source:'user',createdAt:new Date().toISOString() });
  assert.equal(await repo.countMemories(userId),1);
  assert.equal((await repo.listMemories(userId,10))[0].value,'Українська');
  assert.equal(await repo.deleteMemory(userId,savedMemory.id),true);
  assert.equal(await repo.countMemories(userId),0);

  const action = await repo.createAction({ id:randomUUID(),userId,type:'remember',payload:{label:'Стиль',value:'Світлий'},status:'pending',createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+60_000).toISOString(),completedAt:null });
  assert.equal((await repo.listPendingActions(userId,10))[0].id,action.id);
  const completed = await repo.updateActionStatus(userId,action.id,'completed',new Date().toISOString());
  assert.equal(completed.status,'completed');
  assert.equal((await repo.listPendingActions(userId,10)).length,0);
  await pool.end();
});
