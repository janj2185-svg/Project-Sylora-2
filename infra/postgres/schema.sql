CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE,
  username text NOT NULL UNIQUE, password_hash text NOT NULL, display_name text NOT NULL,
  bio text NOT NULL DEFAULT '', locale text NOT NULL DEFAULT 'uk' CHECK (locale IN ('uk','pl','en')),
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX sessions_user_idx ON sessions(user_id);

CREATE TABLE follows (follower_id uuid REFERENCES users(id) ON DELETE CASCADE, following_id uuid REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(follower_id,following_id), CHECK(follower_id<>following_id));
CREATE TABLE posts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind text NOT NULL, body text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX posts_created_idx ON posts(created_at DESC);
CREATE INDEX posts_user_idx ON posts(user_id,created_at DESC);
CREATE TABLE reactions (post_id uuid REFERENCES posts(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE CASCADE, kind text NOT NULL DEFAULT 'spark', created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(post_id,user_id,kind));
CREATE TABLE comments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, parent_id uuid REFERENCES comments(id) ON DELETE CASCADE, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX comments_post_idx ON comments(post_id,created_at);

CREATE TABLE media (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, object_key text NOT NULL UNIQUE, mime text NOT NULL, bytes bigint NOT NULL CHECK(bytes>0), sha256 text NOT NULL, width int, height int, duration_seconds numeric, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE videos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, media_id uuid NOT NULL REFERENCES media(id), title text NOT NULL, description text NOT NULL DEFAULT '', format text NOT NULL CHECK(format IN ('clip','video')), visibility text NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','unlisted','private')), created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX videos_feed_idx ON videos(format,visibility,created_at DESC);

CREATE TABLE conversations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE conversation_members (conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE CASCADE, joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(conversation_id,user_id));
CREATE TABLE messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), edited_at timestamptz);
CREATE INDEX messages_conversation_idx ON messages(conversation_id,created_at DESC);

CREATE TABLE communities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users(id), name text NOT NULL, description text NOT NULL DEFAULT '', visibility text NOT NULL CHECK(visibility IN ('public','private')), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE community_members (community_id uuid REFERENCES communities(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE CASCADE, role text NOT NULL DEFAULT 'member', joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(community_id,user_id));
CREATE TABLE community_channels (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE, name text NOT NULL, position int NOT NULL CHECK(position>0), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(community_id,name));
CREATE TABLE community_posts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE, channel_id uuid NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX community_posts_channel_idx ON community_posts(channel_id,created_at DESC);

CREATE TABLE live_rooms (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), host_id uuid NOT NULL REFERENCES users(id), title text NOT NULL, status text NOT NULL CHECK(status IN ('scheduled','live','ended')), created_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz);
CREATE TABLE live_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), live_id uuid REFERENCES live_rooms(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE CASCADE, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE gifts (id text PRIMARY KEY, name text NOT NULL, tier text NOT NULL, price bigint NOT NULL CHECK(price>0), enabled boolean NOT NULL DEFAULT true);
CREATE TABLE wallets (user_id uuid PRIMARY KEY REFERENCES users(id), currency text NOT NULL DEFAULT 'LUMEN');
CREATE TABLE ledger_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), wallet_user_id uuid NOT NULL REFERENCES wallets(user_id), direction text NOT NULL CHECK(direction IN ('debit','credit')), amount bigint NOT NULL CHECK(amount>0), currency text NOT NULL, reason text NOT NULL, correlation_id uuid NOT NULL, counterparty_user_id uuid REFERENCES users(id), gift_id text REFERENCES gifts(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(wallet_user_id,correlation_id,direction));
CREATE INDEX ledger_wallet_idx ON ledger_entries(wallet_user_id,created_at DESC);

CREATE TABLE courses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), instructor_id uuid NOT NULL REFERENCES users(id), title text NOT NULL, description text NOT NULL DEFAULT '', price bigint NOT NULL DEFAULT 0 CHECK(price>=0), published boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE lessons (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE, title text NOT NULL, content text NOT NULL DEFAULT '', position int NOT NULL CHECK(position>0), UNIQUE(course_id,position));
CREATE TABLE enrollments (course_id uuid REFERENCES courses(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE CASCADE, progress numeric NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 1), enrolled_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(course_id,user_id));
CREATE TABLE lesson_progress (lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE CASCADE, completed boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(lesson_id,user_id));

CREATE TABLE ai_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, role text NOT NULL CHECK(role IN ('user','assistant')), body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ai_messages_user_idx ON ai_messages(user_id,created_at DESC);
CREATE TABLE ai_memories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, label text NOT NULL, value text NOT NULL, source text NOT NULL CHECK(source IN ('user','ai_confirmed')), created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ai_memories_user_idx ON ai_memories(user_id,created_at DESC);
CREATE TABLE ai_actions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, type text NOT NULL CHECK(type IN ('publish_post','remember')), payload jsonb NOT NULL, status text NOT NULL CHECK(status IN ('pending','completed','cancelled','expired')), created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, completed_at timestamptz);
CREATE INDEX ai_actions_pending_idx ON ai_actions(user_id,status,expires_at);

CREATE TABLE businesses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users(id), name text NOT NULL, description text NOT NULL DEFAULT '', website text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, actor_id uuid REFERENCES users(id) ON DELETE SET NULL, type text NOT NULL, payload jsonb NOT NULL DEFAULT '{}', read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX notifications_user_idx ON notifications(user_id,created_at DESC);
CREATE TABLE audit_log (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid REFERENCES users(id) ON DELETE SET NULL, action text NOT NULL, target_type text NOT NULL, target_id text, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
