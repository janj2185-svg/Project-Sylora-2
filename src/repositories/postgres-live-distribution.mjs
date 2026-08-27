function iso(value) {
  return value instanceof Date ? value.toISOString() : String(value || '');
}

function jsonValue(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function destinationFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    label: row.label,
    serverUrl: row.server_url,
    encryptedStreamKey: row.encrypted_stream_key,
    keyFingerprint: row.key_fingerprint,
    enabled: row.enabled,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}

function sessionFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    liveId: row.live_id,
    userId: row.user_id,
    status: row.status,
    encryptedIngestPath: row.encrypted_ingest_path,
    ingestKeyFingerprint: row.ingest_key_fingerprint,
    destinationIds: jsonValue(row.destination_ids, []),
    destinationStates: jsonValue(row.destination_states, []),
    record: row.record,
    createdAt: iso(row.created_at),
    startedAt: row.started_at ? iso(row.started_at) : null,
    stoppedAt: row.stopped_at ? iso(row.stopped_at) : null,
    lastObservedAt: row.last_observed_at ? iso(row.last_observed_at) : null
  };
}

export class PostgresLiveDistributionRepository {
  constructor(pool = null) { this.pool = pool; }
  get enabled() { return !!this.pool; }

  async listDestinations(userId) {
    const result = await this.pool.query(
      'SELECT * FROM live_stream_destinations WHERE user_id=$1 ORDER BY updated_at DESC,id DESC',
      [userId]
    );
    return result.rows.map(destinationFromRow);
  }

  async getDestination(userId, id) {
    const result = await this.pool.query(
      'SELECT * FROM live_stream_destinations WHERE id=$1 AND user_id=$2 LIMIT 1',
      [id, userId]
    );
    return destinationFromRow(result.rows[0]);
  }

  async getDestinations(userId, ids) {
    if (!ids.length) return [];
    const placeholders = ids.map((_, index) => `$${index + 2}`).join(',');
    const result = await this.pool.query(
      `SELECT * FROM live_stream_destinations WHERE user_id=$1 AND id IN (${placeholders}) ORDER BY created_at,id`,
      [userId, ...ids]
    );
    return result.rows.map(destinationFromRow);
  }

  async createDestination(destination) {
    const result = await this.pool.query(
      `INSERT INTO live_stream_destinations(
        id,user_id,provider,label,server_url,encrypted_stream_key,key_fingerprint,enabled,created_at,updated_at
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        destination.id, destination.userId, destination.provider, destination.label,
        destination.serverUrl, destination.encryptedStreamKey, destination.keyFingerprint,
        destination.enabled, destination.createdAt, destination.updatedAt
      ]
    );
    return destinationFromRow(result.rows[0]);
  }

  async updateDestination(destination) {
    const result = await this.pool.query(
      `UPDATE live_stream_destinations SET
        provider=$3,label=$4,server_url=$5,encrypted_stream_key=$6,key_fingerprint=$7,enabled=$8,updated_at=$9
      WHERE id=$1 AND user_id=$2 RETURNING *`,
      [
        destination.id, destination.userId, destination.provider, destination.label,
        destination.serverUrl, destination.encryptedStreamKey, destination.keyFingerprint,
        destination.enabled, destination.updatedAt
      ]
    );
    return destinationFromRow(result.rows[0]);
  }

  async deleteDestination(userId, id) {
    const result = await this.pool.query(
      'DELETE FROM live_stream_destinations WHERE id=$1 AND user_id=$2 RETURNING id',
      [id, userId]
    );
    return result.rowCount > 0;
  }

  async destinationInActiveSession(userId, destinationId) {
    const result = await this.pool.query(
      `SELECT 1 FROM live_distribution_sessions
       WHERE user_id=$1 AND status IN ('preparing','waiting_for_source','live','degraded')
         AND destination_ids @> $2::jsonb LIMIT 1`,
      [userId, JSON.stringify([destinationId])]
    );
    return result.rowCount > 0;
  }

  async createSession(session) {
    const result = await this.pool.query(
      `INSERT INTO live_distribution_sessions(
        id,live_id,user_id,status,encrypted_ingest_path,ingest_key_fingerprint,
        destination_ids,destination_states,record,created_at,started_at,stopped_at,last_observed_at
      ) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13) RETURNING *`,
      [
        session.id, session.liveId, session.userId, session.status,
        session.encryptedIngestPath, session.ingestKeyFingerprint,
        JSON.stringify(session.destinationIds || []), JSON.stringify(session.destinationStates || []),
        session.record !== false, session.createdAt, session.startedAt, session.stoppedAt, session.lastObservedAt
      ]
    );
    return sessionFromRow(result.rows[0]);
  }

  async updateSession(session) {
    const result = await this.pool.query(
      `UPDATE live_distribution_sessions SET
        status=$2,destination_states=$3::jsonb,record=$4,started_at=$5,stopped_at=$6,last_observed_at=$7
      WHERE id=$1 AND user_id=$8 RETURNING *`,
      [
        session.id, session.status, JSON.stringify(session.destinationStates || []),
        session.record !== false, session.startedAt, session.stoppedAt, session.lastObservedAt, session.userId
      ]
    );
    return sessionFromRow(result.rows[0]);
  }

  async getActiveSession(userId, liveId) {
    const result = await this.pool.query(
      `SELECT * FROM live_distribution_sessions
       WHERE user_id=$1 AND live_id=$2 AND status IN ('preparing','waiting_for_source','live','degraded')
       ORDER BY created_at DESC,id DESC LIMIT 1`,
      [userId, liveId]
    );
    return sessionFromRow(result.rows[0]);
  }

  async getLatestSession(userId, liveId) {
    const result = await this.pool.query(
      `SELECT * FROM live_distribution_sessions
       WHERE user_id=$1 AND live_id=$2 ORDER BY created_at DESC,id DESC LIMIT 1`,
      [userId, liveId]
    );
    return sessionFromRow(result.rows[0]);
  }
}
