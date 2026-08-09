CREATE INDEX IF NOT EXISTS live_rooms_status_created_idx
  ON live_rooms(status,created_at DESC);

CREATE INDEX IF NOT EXISTS live_rooms_host_status_idx
  ON live_rooms(host_id,status,created_at DESC);

CREATE INDEX IF NOT EXISTS live_messages_room_created_idx
  ON live_messages(live_id,created_at DESC);
