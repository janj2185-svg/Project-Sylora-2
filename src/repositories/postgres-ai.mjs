function iso(value) { return value instanceof Date ? value.toISOString() : String(value || ''); }

function messageFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    text: row.body || '',
    source: row.source || 'chat',
    sourceEventId: row.source_event_id || null,
    createdAt: iso(row.created_at)
  };
}

function memoryFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    value: row.value,
    source: row.source,
    category: row.category || 'preferences',
    tier: row.tier || 'long',
    agentId: row.agent_id || null,
    contextSources: Array.isArray(row.context_sources) ? row.context_sources : [],
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at || row.created_at)
  };
}

function actionFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    payload: row.payload || {},
    status: row.status,
    createdAt: iso(row.created_at),
    expiresAt: iso(row.expires_at),
    completedAt: row.completed_at ? iso(row.completed_at) : null
  };
}

export class PostgresAiRepository {
  constructor(pool = null) { this.pool = pool; }
  get enabled() { return !!this.pool; }

  async listMessages(userId, limit = 50) {
    const result = await this.pool.query(
      'SELECT * FROM ai_messages WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2',
      [userId, Math.max(1, Math.min(200, Number(limit) || 50))]
    );
    return result.rows.reverse().map(messageFromRow);
  }

  async createMessages(messages) {
    if (!messages.length) return [];
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const saved = [];
      for (const message of messages) {
        const result = await client.query(
          'INSERT INTO ai_messages(id,user_id,role,body,source,source_event_id,created_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
          [message.id,message.userId,message.role,message.text,message.source||'chat',message.sourceEventId||null,message.createdAt]
        );
        saved.push(messageFromRow(result.rows[0]));
      }
      await client.query('COMMIT');
      return saved;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally { client.release(); }
  }

  async createRealtimeTranscript(message) {
    if (message.sourceEventId) {
      const existing = await this.pool.query('SELECT * FROM ai_messages WHERE user_id=$1 AND source_event_id=$2 LIMIT 1', [message.userId,message.sourceEventId]);
      if (existing.rowCount) return { saved: false, message: messageFromRow(existing.rows[0]) };
    }
    try {
      const result = await this.pool.query(
        'INSERT INTO ai_messages(id,user_id,role,body,source,source_event_id,created_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [message.id,message.userId,message.role,message.text,'realtime_voice',message.sourceEventId||null,message.createdAt]
      );
      return { saved: true, message: messageFromRow(result.rows[0]) };
    } catch (error) {
      if (error?.code === '23505' && message.sourceEventId) {
        const existing = await this.pool.query('SELECT * FROM ai_messages WHERE user_id=$1 AND source_event_id=$2 LIMIT 1', [message.userId,message.sourceEventId]);
        if (existing.rowCount) return { saved: false, message: messageFromRow(existing.rows[0]) };
      }
      throw error;
    }
  }

  async listMemories(userId, limit = 50) {
    const result = await this.pool.query('SELECT * FROM ai_memories WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2', [userId,Math.max(1,Math.min(100,Number(limit)||50))]);
    return result.rows.reverse().map(memoryFromRow);
  }

  async countMemories(userId) {
    const result = await this.pool.query('SELECT count(*)::int AS count FROM ai_memories WHERE user_id=$1', [userId]);
    return Number(result.rows[0]?.count || 0);
  }

  async createMemory(memory) {
    const result = await this.pool.query('INSERT INTO ai_memories(id,user_id,label,value,source,category,tier,agent_id,context_sources,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *', [memory.id,memory.userId,memory.label,memory.value,memory.source,memory.category||'preferences',memory.tier||'long',memory.agentId||null,JSON.stringify(memory.contextSources||[]),memory.createdAt,memory.updatedAt||memory.createdAt]);
    return memoryFromRow(result.rows[0]);
  }

  async updateMemory(userId, id, patch) {
    const result = await this.pool.query(
      `UPDATE ai_memories SET
        label=COALESCE($3,label),value=COALESCE($4,value),category=COALESCE($5,category),
        tier=COALESCE($6,tier),updated_at=$7
       WHERE id=$1 AND user_id=$2 RETURNING *`,
      [id,userId,patch.label??null,patch.value??null,patch.category??null,patch.tier??null,patch.updatedAt]
    );
    return memoryFromRow(result.rows[0]);
  }

  async deleteMemory(userId, id) {
    const result = await this.pool.query('DELETE FROM ai_memories WHERE id=$1 AND user_id=$2 RETURNING id', [id,userId]);
    return result.rowCount > 0;
  }

  async clearMemories(userId) {
    const result = await this.pool.query('DELETE FROM ai_memories WHERE user_id=$1', [userId]);
    return result.rowCount;
  }

  async clearMessages(userId) {
    const result = await this.pool.query('DELETE FROM ai_messages WHERE user_id=$1', [userId]);
    return result.rowCount;
  }

  async createAction(action) {
    const result = await this.pool.query('INSERT INTO ai_actions(id,user_id,type,payload,status,created_at,expires_at,completed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [action.id,action.userId,action.type,action.payload,action.status,action.createdAt,action.expiresAt,action.completedAt]);
    return actionFromRow(result.rows[0]);
  }

  async findAction(userId, id) {
    const result = await this.pool.query('SELECT * FROM ai_actions WHERE id=$1 AND user_id=$2 LIMIT 1', [id,userId]);
    return actionFromRow(result.rows[0]);
  }

  async listPendingActions(userId, limit = 20) {
    const result = await this.pool.query("SELECT * FROM ai_actions WHERE user_id=$1 AND status='pending' AND expires_at>now() ORDER BY created_at DESC,id DESC LIMIT $2", [userId,Math.max(1,Math.min(50,Number(limit)||20))]);
    return result.rows.reverse().map(actionFromRow);
  }

  async updateActionStatus(userId, id, status, completedAt = null) {
    const result = await this.pool.query('UPDATE ai_actions SET status=$3,completed_at=$4 WHERE id=$1 AND user_id=$2 RETURNING *', [id,userId,status,completedAt]);
    return actionFromRow(result.rows[0]);
  }
}
