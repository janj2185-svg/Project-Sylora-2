import { normalizeAiPermissions } from '../ecosystem/permissions.mjs';

function iso(value) {
  return value instanceof Date ? value.toISOString() : String(value || '');
}

export class PostgresEcosystemRepository {
  constructor(pool = null) {
    this.pool = pool;
  }

  get enabled() {
    return !!this.pool;
  }

  async getIdentityProfile(userId) {
    const result = await this.pool.query('SELECT * FROM identity_profiles WHERE user_id=$1', [userId]);
    if (!result.rowCount) return null;
    const row = result.rows[0];
    return {
      userId: row.user_id,
      creatorPersona: row.creator_persona || '',
      professionalTitle: row.professional_title || '',
      skills: row.skills || [],
      interests: row.interests || [],
      portfolio: row.portfolio || [],
      education: row.education || [],
      achievements: row.achievements || [],
      reputation: row.reputation || {},
      visibility: row.visibility || {},
      verifiedIdentity: row.verified_identity,
      updatedAt: iso(row.updated_at)
    };
  }

  async upsertIdentityProfile(userId, profile) {
    const result = await this.pool.query(
      `INSERT INTO identity_profiles(user_id,creator_persona,professional_title,skills,interests,portfolio,education,achievements,reputation,visibility,verified_identity,updated_at)
       VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11,now())
       ON CONFLICT(user_id) DO UPDATE SET
         creator_persona=EXCLUDED.creator_persona,
         professional_title=EXCLUDED.professional_title,
         skills=EXCLUDED.skills,
         interests=EXCLUDED.interests,
         portfolio=EXCLUDED.portfolio,
         education=EXCLUDED.education,
         achievements=EXCLUDED.achievements,
         reputation=EXCLUDED.reputation,
         visibility=EXCLUDED.visibility,
         verified_identity=EXCLUDED.verified_identity,
         updated_at=now()
       RETURNING *`,
      [
        userId,
        profile.creatorPersona || '',
        profile.professionalTitle || '',
        JSON.stringify(profile.skills || []),
        JSON.stringify(profile.interests || []),
        JSON.stringify(profile.portfolio || []),
        JSON.stringify(profile.education || []),
        JSON.stringify(profile.achievements || []),
        JSON.stringify(profile.reputation || {}),
        JSON.stringify(profile.visibility || {}),
        !!profile.verifiedIdentity
      ]
    );
    return this.getIdentityProfile(result.rows[0].user_id);
  }

  async getAiSettings(userId) {
    const result = await this.pool.query('SELECT * FROM ai_user_settings WHERE user_id=$1', [userId]);
    if (!result.rowCount) {
      return {
        userId,
        agentName: 'Sylora',
        permissions: normalizeAiPermissions(),
        updatedAt: null
      };
    }
    const row = result.rows[0];
    return {
      userId: row.user_id,
      agentName: row.agent_name || 'Sylora',
      permissions: normalizeAiPermissions(row.permissions || {}),
      updatedAt: iso(row.updated_at)
    };
  }

  async saveAiSettings(record) {
    const result = await this.pool.query(
      `INSERT INTO ai_user_settings(user_id,agent_name,permissions,updated_at)
       VALUES($1,$2,$3::jsonb,now())
       ON CONFLICT(user_id) DO UPDATE SET agent_name=EXCLUDED.agent_name,permissions=EXCLUDED.permissions,updated_at=now()
       RETURNING *`,
      [record.userId, record.agentName || 'Sylora', JSON.stringify(normalizeAiPermissions(record.permissions))]
    );
    const row = result.rows[0];
    return {
      userId: row.user_id,
      agentName: row.agent_name,
      permissions: normalizeAiPermissions(row.permissions),
      updatedAt: iso(row.updated_at)
    };
  }

  async appendActionLog(record) {
    await this.pool.query(
      `INSERT INTO ai_action_log(id,user_id,agent_id,action_type,level,permission,input,confirmed,result,error,created_at)
       VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10,$11)`,
      [
        record.id,
        record.userId,
        record.actor?.agentId || 'personal',
        record.actionType,
        record.level,
        record.permission || null,
        JSON.stringify(record.input || {}),
        !!record.confirmed,
        record.result ? JSON.stringify(record.result) : null,
        record.error || null,
        record.createdAt
      ]
    );
    return record;
  }

  async listActionLog(userId, limit = 40) {
    const result = await this.pool.query(
      'SELECT * FROM ai_action_log WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2',
      [userId, Math.max(1, Math.min(100, Number(limit) || 40))]
    );
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      actor: { type: 'agent', agentId: row.agent_id },
      actionType: row.action_type,
      level: row.level,
      permission: row.permission,
      input: row.input || {},
      confirmed: row.confirmed,
      result: row.result,
      error: row.error,
      createdAt: iso(row.created_at)
    }));
  }

  async createKnowledgeNode(node) {
    const result = await this.pool.query(
      `INSERT INTO knowledge_nodes(id,owner_id,node_type,label,visibility,metadata,created_at)
       VALUES($1,$2,$3,$4,$5,$6::jsonb,$7) RETURNING *`,
      [node.id, node.ownerId, node.type, node.label, node.visibility, JSON.stringify(node.metadata || {}), node.createdAt]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      ownerId: row.owner_id,
      type: row.node_type,
      label: row.label,
      visibility: row.visibility,
      metadata: row.metadata || {},
      createdAt: iso(row.created_at)
    };
  }

  async listKnowledgeNodes(userId, limit = 50) {
    const result = await this.pool.query(
      'SELECT * FROM knowledge_nodes WHERE owner_id=$1 ORDER BY created_at DESC LIMIT $2',
      [userId, Math.max(1, Math.min(200, Number(limit) || 50))]
    );
    return result.rows.map(row => ({
      id: row.id,
      ownerId: row.owner_id,
      type: row.node_type,
      label: row.label,
      visibility: row.visibility,
      metadata: row.metadata || {},
      createdAt: iso(row.created_at)
    }));
  }
}
