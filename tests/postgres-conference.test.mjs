import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { newDb } from 'pg-mem';
import { PostgresConferenceRepository } from '../src/repositories/postgres-conference.mjs';

test('private conferences require invitation and persist optional Sylora presence',async()=>{
  const memory=newDb();memory.public.none(`
    CREATE TABLE users(id uuid PRIMARY KEY,username text NOT NULL,display_name text NOT NULL);
    CREATE TABLE conference_rooms(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES users(id),kind text NOT NULL,title text NOT NULL,description text NOT NULL DEFAULT '',sylora_enabled boolean NOT NULL DEFAULT false,status text NOT NULL DEFAULT 'open',created_at timestamptz NOT NULL);
    CREATE TABLE conference_members(room_id uuid NOT NULL REFERENCES conference_rooms(id),user_id uuid NOT NULL REFERENCES users(id),role text NOT NULL,joined_at timestamptz NOT NULL,PRIMARY KEY(room_id,user_id));
    CREATE TABLE conference_invites(id uuid PRIMARY KEY,room_id uuid NOT NULL REFERENCES conference_rooms(id),invited_user_id uuid NOT NULL REFERENCES users(id),invited_by uuid NOT NULL REFERENCES users(id),status text NOT NULL DEFAULT 'pending',created_at timestamptz NOT NULL,UNIQUE(room_id,invited_user_id));
  `);const adapter=memory.adapters.createPg(),pool=new adapter.Pool(),repo=new PostgresConferenceRepository(pool),ownerId=randomUUID(),studentId=randomUUID(),roomId=randomUUID(),now=new Date().toISOString();
  await pool.query('INSERT INTO users(id,username,display_name) VALUES($1,$2,$3),($4,$5,$6)',[ownerId,'mentor','Mentor',studentId,'student','Student']);
  const room=await repo.create({id:roomId,ownerId,kind:'science',title:'Quantum Circle',description:'Private research',createdAt:now});assert.equal(room.role,'owner');assert.equal((await repo.listForUser(studentId,'science')).length,0);
  const invite=await repo.invite({id:randomUUID(),roomId,ownerId,username:'student',createdAt:now});assert.equal(invite.user.username,'student');assert.equal((await repo.listForUser(studentId,'science'))[0].role,null);
  await repo.accept({inviteId:invite.id,userId:studentId,joinedAt:now});assert.equal((await repo.listForUser(studentId,'science'))[0].role,'member');assert.equal((await repo.participants(roomId,studentId)).length,2);
  assert.equal((await repo.toggleSylora(roomId,ownerId,true)).syloraEnabled,true);
  await pool.end();
});
