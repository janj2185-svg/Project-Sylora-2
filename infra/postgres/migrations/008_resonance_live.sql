-- SYLORA Resonance: expanded gift catalogue and original LIVE engagement layer.
INSERT INTO gifts(id,name,tier,price,enabled,color) VALUES
 ('spark','Crystal Star','basic',10,true,'#e8b95f'),
 ('pulse','Crystal Heart','basic',25,true,'#a98ae8'),
 ('lumen-bloom','Eternal Lotus','basic',75,true,'#72cfb8'),
 ('nova','Cosmic Bloom','premium',250,true,'#d98fc2'),
 ('dream-orbit','Orbital Core','premium',500,true,'#79cbdc'),
 ('aurora','Royal Crown','epic',1000,true,'#d9a84b'),
 ('celestial-wing','Divine Wings','epic',1800,true,'#9d84df'),
 ('time-gate','Portal of Infinity','epic',3000,true,'#69c9c5'),
 ('cosmos','Phoenix Rebirth','legendary',5000,true,'#eea45e'),
 ('infinite-sylora','Infinity','legendary',10000,true,'#b782db')
ON CONFLICT(id) DO UPDATE SET name=excluded.name,tier=excluded.tier,price=excluded.price,enabled=excluded.enabled,color=excluded.color;

CREATE TABLE IF NOT EXISTS live_engagement (
 live_id uuid PRIMARY KEY REFERENCES live_rooms(id) ON DELETE CASCADE,
 likes bigint NOT NULL DEFAULT 0 CHECK(likes>=0),
 resonance bigint NOT NULL DEFAULT 0 CHECK(resonance>=0),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_battles (
 id uuid PRIMARY KEY,
 host_live_id uuid NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
 opponent_live_id uuid NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'live' CHECK(status IN ('live','ended')),
 host_score bigint NOT NULL DEFAULT 0 CHECK(host_score>=0),
 opponent_score bigint NOT NULL DEFAULT 0 CHECK(opponent_score>=0),
 started_at timestamptz NOT NULL DEFAULT now(),
 ends_at timestamptz NOT NULL,
 ended_at timestamptz,
 CHECK(host_live_id<>opponent_live_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS live_battles_one_active_host ON live_battles(host_live_id) WHERE status='live';
CREATE UNIQUE INDEX IF NOT EXISTS live_battles_one_active_opponent ON live_battles(opponent_live_id) WHERE status='live';

CREATE TABLE IF NOT EXISTS donor_progress (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 gift_xp bigint NOT NULL DEFAULT 0 CHECK(gift_xp>=0), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS support_progress (
 supporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 bond_xp bigint NOT NULL DEFAULT 0 CHECK(bond_xp>=0), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(supporter_id,creator_id), CHECK(supporter_id<>creator_id)
);
