ALTER TABLE ecosystem_actions
  ADD CONSTRAINT ecosystem_actions_id_user_id_key UNIQUE(id,user_id);

CREATE TABLE IF NOT EXISTS studio_scenes (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  overlay_title text NOT NULL DEFAULT 'SYLORA LIVE',
  overlay_style text NOT NULL DEFAULT 'violet'
    CHECK(overlay_style IN ('violet','cyan','clean')),
  profile_id text NOT NULL DEFAULT 'vertical720'
    CHECK(profile_id IN (
      'vertical480','vertical720','vertical1080','vertical1080p60',
      'horizontal480','horizontal720','horizontal1080','horizontal1080p60',
      'square1080','portrait4x5','horizontal1440','horizontal2160'
    )),
  mic_gain smallint NOT NULL DEFAULT 100 CHECK(mic_gain BETWEEN 0 AND 150),
  mic_muted boolean NOT NULL DEFAULT false,
  action_id uuid UNIQUE,
  action_user_id uuid,
  ai_plan jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT studio_scenes_action_owner_fk
    FOREIGN KEY(action_id,action_user_id)
    REFERENCES ecosystem_actions(id,user_id) ON DELETE SET NULL,
  CHECK(
    (action_id IS NULL AND action_user_id IS NULL)
    OR (action_id IS NOT NULL AND action_user_id IS NOT NULL AND action_user_id=user_id)
  ),
  CHECK(char_length(name) BETWEEN 2 AND 60),
  CHECK(char_length(overlay_title) BETWEEN 1 AND 60)
);

CREATE INDEX IF NOT EXISTS studio_scenes_user_updated_idx
  ON studio_scenes(user_id,updated_at DESC,id DESC);
