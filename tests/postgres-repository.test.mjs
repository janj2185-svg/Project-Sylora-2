import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { randomUUID } from 'node:crypto';
import { PostgresAuthSocialRepository } from '../src/repositories/postgres-auth-social.mjs';

test('PostgreSQL auth/social repository persists the social and messaging runtime', async () => {
  const memory = newDb();
  memory.public.none(`
    CREATE TABLE users (id uuid PRIMARY KEY, email text UNIQUE NOT NULL, username text UNIQUE NOT NULL, password_hash text NOT NULL, display_name text NOT NULL, bio text NOT NULL DEFAULT '', locale text NOT NULL DEFAULT 'uk', avatar text NOT NULL DEFAULT '', role text NOT NULL DEFAULT 'user', status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL);
    CREATE TABLE posts (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), kind text NOT NULL, body text NOT NULL, created_at timestamptz NOT NULL);
    CREATE TABLE follows (follower_id uuid NOT NULL REFERENCES users(id), following_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(follower_id,following_id));
    CREATE TABLE reactions (post_id uuid NOT NULL REFERENCES posts(id), user_id uuid NOT NULL REFERENCES users(id), kind text NOT NULL DEFAULT 'spark', created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(post_id,user_id,kind));
    CREATE TABLE comments (id uuid PRIMARY KEY, post_id uuid NOT NULL REFERENCES posts(id), user_id uuid NOT NULL REFERENCES users(id), body text NOT NULL, created_at timestamptz NOT NULL);
    CREATE TABLE blocks (blocker_id uuid NOT NULL REFERENCES users(id), blocked_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(blocker_id,blocked_id));
    CREATE TABLE conversations (id uuid PRIMARY KEY, direct_key text UNIQUE, created_at timestamptz NOT NULL);
    CREATE TABLE conversation_members (conversation_id uuid NOT NULL REFERENCES conversations(id), user_id uuid NOT NULL REFERENCES users(id), joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(conversation_id,user_id));
    CREATE TABLE messages (id uuid PRIMARY KEY, conversation_id uuid NOT NULL REFERENCES conversations(id), user_id uuid NOT NULL REFERENCES users(id), body text NOT NULL, created_at timestamptz NOT NULL, edited_at timestamptz);
    CREATE TABLE notifications (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), actor_id uuid REFERENCES users(id), type text NOT NULL, payload jsonb NOT NULL DEFAULT '{}', read_at timestamptz, created_at timestamptz NOT NULL);
  `);
  const adapter = memory.adapters.createPg(), pool = new adapter.Pool(), repo = new PostgresAuthSocialRepository(pool);
  const user = { id: randomUUID(), email: 'pg@test.dev', username: 'pguser', passwordHash: 'hash', displayName: 'PG User', bio: '', locale: 'uk', avatar: '', role: 'user', createdAt: new Date().toISOString() };
  const session = { tokenHash: 'a'.repeat(64), userId: user.id, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString() };

  await repo.register(user, session);
  assert.equal(await repo.accountExists(user.email, user.username), true);
  assert.equal((await repo.findUserByIdentity('pguser')).email, user.email);
  assert.equal((await repo.userForSession(session.tokenHash)).id, user.id);

  user.displayName = 'Updated PG User'; user.bio = 'Database backed';
  const updated = await repo.updateUser(user);
  assert.equal(updated.displayName, 'Updated PG User');
  assert.equal(updated.bio, 'Database backed');

  const post = await repo.createPost({ id: randomUUID(), userId: user.id, text: 'PostgreSQL runtime post', kind: 'text', createdAt: new Date().toISOString() });
  assert.equal((await repo.findPost(post.id)).text, 'PostgreSQL runtime post');
  const feed = await repo.listPosts();
  assert.equal(feed[0].post.id, post.id);
  assert.equal(feed[0].author.displayName, 'Updated PG User');

  const other = { id: randomUUID(), email: 'other@test.dev', username: 'other', passwordHash: 'hash', displayName: 'Other User', bio: '', locale: 'pl', avatar: '', role: 'user', createdAt: new Date().toISOString() };
  await repo.register(other, { tokenHash: 'b'.repeat(64), userId: other.id, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString() });
  assert.equal(await repo.toggleFollow(user.id,other.id),true);
  assert.equal((await repo.socialStats(other.id)).followers,1);
  assert.equal(await repo.toggleReaction(post.id,other.id),true);
  await repo.createComment({id:randomUUID(),postId:post.id,userId:other.id,text:'DB comment',createdAt:new Date().toISOString()});
  const engagement=await repo.engagementForPosts([post.id],other.id);
  assert.deepEqual(engagement.get(post.id),{commentCount:1,reactionCount:1,reacted:true});
  assert.equal((await repo.listComments(post.id))[0].author.id,other.id);

  await repo.block(user.id,other.id);
  assert.equal(await repo.isBlockedBetween(user.id,other.id),true);
  assert.deepEqual(await repo.blockedUserIds(user.id),[other.id]);
  assert.equal((await repo.socialStats(other.id)).followers,0);
  await repo.unblock(user.id,other.id);
  assert.equal(await repo.isBlockedBetween(user.id,other.id),false);

  const conversation=await repo.getOrCreateConversation(user.id,other.id,randomUUID(),new Date().toISOString());
  const sameConversation=await repo.getOrCreateConversation(other.id,user.id,randomUUID(),new Date().toISOString());
  assert.equal(sameConversation.id,conversation.id);
  assert.equal((await repo.conversationForUser(conversation.id,user.id)).memberIds.length,2);
  const message={id:randomUUID(),conversationId:conversation.id,userId:user.id,text:'Hello from PostgreSQL',createdAt:new Date().toISOString(),editedAt:null};
  await repo.createMessage(message);
  assert.equal((await repo.listMessages(conversation.id))[0].text,message.text);
  assert.equal((await repo.listConversations(other.id))[0].lastMessage.text,message.text);

  await repo.createNotification({id:randomUUID(),userId:other.id,actorId:user.id,type:'message',payload:{conversationId:conversation.id},createdAt:new Date().toISOString()});
  const notifications=await repo.listNotifications(other.id);
  assert.equal(notifications[0].type,'message');
  assert.equal(notifications[0].payload.conversationId,conversation.id);

  await repo.deleteSession(session.tokenHash);
  assert.equal(await repo.userForSession(session.tokenHash), null);
  await pool.end();
});
