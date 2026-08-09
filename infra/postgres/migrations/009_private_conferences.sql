CREATE TABLE IF NOT EXISTS conference_rooms (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('science','business')),
 title text NOT NULL CHECK(length(title) BETWEEN 2 AND 120),
 description text NOT NULL DEFAULT '',
 sylora_enabled boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS conference_members (
 room_id uuid NOT NULL REFERENCES conference_rooms(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 role text NOT NULL DEFAULT 'member' CHECK(role IN ('owner','member')),
 joined_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(room_id,user_id)
);
CREATE TABLE IF NOT EXISTS conference_invites (
 id uuid PRIMARY KEY,
 room_id uuid NOT NULL REFERENCES conference_rooms(id) ON DELETE CASCADE,
 invited_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 invited_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(room_id,invited_user_id)
);
CREATE INDEX IF NOT EXISTS conference_members_user_idx ON conference_members(user_id,joined_at DESC);
CREATE INDEX IF NOT EXISTS conference_invites_user_idx ON conference_invites(invited_user_id,status,created_at DESC);
