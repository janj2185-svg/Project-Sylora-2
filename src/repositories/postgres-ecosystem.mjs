import { patchIdentity as applyIdentityPatch, sanitizeIdentityRecord } from '../ecosystem/identity.mjs';

function iso(value) {
  return value instanceof Date ? value.toISOString() : (value ? String(value) : null);
}

function jsonb(value, fallback = {}) {
  if (value == null) return JSON.stringify(fallback);
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function asObject(value, fallback = {}) {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return value;
}

function asArray(value, fallback = []) {
  const parsed = asObject(value, fallback);
  return Array.isArray(parsed) ? parsed : fallback;
}

function agentFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    kind: row.kind,
    locale: row.locale,
    permissions: asObject(row.permissions, {}),
    contexts: asObject(row.contexts, {}),
    privacyControls: asObject(row.privacy_controls, {}),
    proactiveLevel: row.proactive_level || 'IMPORTANT_ONLY',
    voicePersonality: row.voice_personality || 'warm',
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}

function identityFromRow(row, user = {}) {
  if (!row) return null;
  return sanitizeIdentityRecord({
    userId: row.user_id,
    username: user.username,
    displayName: user.displayName,
    verifiedPerson: !!row.verified_person,
    creatorPersona: asObject(row.creator_persona, {}),
    professional: asObject(row.professional, {}),
    portfolio: asArray(row.portfolio, []),
    interests: asArray(row.interests, []),
    privacy: asObject(row.privacy, {}),
    reputationRefs: asObject(row.reputation_refs, {}),
    agentId: row.agent_id || null,
    updatedAt: iso(row.updated_at)
  }, user);
}

function nodeFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    type: row.type,
    label: row.label,
    data: asObject(row.data, {}),
    privacy: row.privacy,
    provenance: asObject(row.provenance, {}),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    deletedAt: row.deleted_at ? iso(row.deleted_at) : null
  };
}

function edgeFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    fromId: row.from_id,
    toId: row.to_id,
    type: row.type,
    data: asObject(row.data, {}),
    privacy: row.privacy,
    createdAt: iso(row.created_at),
    deletedAt: row.deleted_at ? iso(row.deleted_at) : null
  };
}

function actionFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    agentId: row.agent_id || null,
    actorType: row.actor_type || 'personal_ai',
    type: row.type,
    level: row.level,
    input: asObject(row.input, {}),
    output: asObject(row.output, null),
    permission: row.permission || null,
    context: row.context || 'command_center',
    status: row.status,
    confirmationRequired: !!row.confirmation_required,
    result: asObject(row.result, null),
    error: row.error || null,
    createdAt: iso(row.created_at),
    expiresAt: iso(row.expires_at),
    confirmedAt: row.confirmed_at ? iso(row.confirmed_at) : null,
    completedAt: row.completed_at ? iso(row.completed_at) : null,
    auditTrail: []
  };
}

function catalogFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    developerId: row.developer_id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    category: row.category,
    permissions: asArray(row.permissions, []),
    capabilities: asArray(row.capabilities, []),
    tools: asArray(row.tools, []),
    pricing: asObject(row.pricing, {}),
    version: row.version,
    status: row.status,
    securityReview: row.security_review,
    installs: row.installs || 0,
    revenueShareBps: row.revenue_share_bps,
    ratings: { average: 0, count: 0 },
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}

function orgFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description || '',
    createdAt: iso(row.created_at)
  };
}

function developerAppFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description || '',
    scopes: asArray(row.scopes, []),
    redirectUris: asArray(row.redirect_uris, []),
    webhookUrl: row.webhook_url || '',
    status: row.status || 'sandbox',
    rateLimitPerMinute: Number(row.rate_limit_per_minute || 60),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}

function developerApiKeyFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    appId: row.app_id,
    ownerId: row.owner_id,
    prefix: row.prefix,
    hash: row.hash,
    label: row.label || 'default',
    lastUsedAt: row.last_used_at ? iso(row.last_used_at) : null,
    revokedAt: row.revoked_at ? iso(row.revoked_at) : null,
    createdAt: iso(row.created_at)
  };
}

export class PostgresEcosystemRepository {
  constructor(pool = null) { this.pool = pool; }
  get enabled() { return !!this.pool; }

  async findPersonalAgent(userId) {
    const result = await this.pool.query("SELECT * FROM personal_agents WHERE user_id=$1 AND kind='personal' LIMIT 1", [userId]);
    return agentFromRow(result.rows[0]);
  }

  async upsertPersonalAgent(agent) {
    const result = await this.pool.query(
      `INSERT INTO personal_agents(id,user_id,name,kind,locale,permissions,contexts,privacy_controls,proactive_level,voice_personality,created_at,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       -- This is the create-if-missing path. A stale cold-start must never
       -- overwrite privacy or permission changes made by another instance.
       ON CONFLICT(user_id,kind) DO UPDATE SET user_id=EXCLUDED.user_id
       RETURNING *`,
      [agent.id, agent.userId, agent.name, agent.kind, agent.locale, jsonb(agent.permissions, {}), jsonb(agent.contexts, {}), jsonb(agent.privacyControls, {}), agent.proactiveLevel || 'IMPORTANT_ONLY', agent.voicePersonality || 'warm', agent.createdAt, agent.updatedAt]
    );
    return agentFromRow(result.rows[0]);
  }

  async patchPersonalAgent(userId, {
    permissions = null,
    privacyControls = null,
    proactiveLevel = null,
    voicePersonality = null,
    updatedAt = new Date().toISOString()
  } = {}) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const currentResult = await client.query(
        "SELECT * FROM personal_agents WHERE user_id=$1 AND kind='personal' FOR UPDATE",
        [userId]
      );
      const current = agentFromRow(currentResult.rows[0]);
      if (!current) {
        await client.query('ROLLBACK');
        return null;
      }
      const result = await client.query(
        `UPDATE personal_agents SET permissions=$2,privacy_controls=$3,proactive_level=$4,voice_personality=$5,updated_at=$6
         WHERE user_id=$1 AND kind='personal' RETURNING *`,
        [
          userId,
          jsonb(permissions == null ? current.permissions : { ...current.permissions, ...permissions }, {}),
          jsonb(privacyControls == null ? current.privacyControls : { ...current.privacyControls, ...privacyControls }, {}),
          proactiveLevel || current.proactiveLevel,
          voicePersonality || current.voicePersonality,
          updatedAt
        ]
      );
      await client.query('COMMIT');
      return agentFromRow(result.rows[0]);
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      client.release();
    }
  }

  async getIdentity(userId) {
    const result = await this.pool.query('SELECT * FROM identity_profiles WHERE user_id=$1 LIMIT 1', [userId]);
    return identityFromRow(result.rows[0], { id: userId });
  }

  async upsertIdentity(identity) {
    const result = await this.pool.query(
      `INSERT INTO identity_profiles(user_id,verified_person,creator_persona,professional,portfolio,interests,privacy,reputation_refs,agent_id,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       -- Creation is conflict-preserving so a stale cold-start cannot erase a
       -- profile already updated by another application instance.
       ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id
       RETURNING *`,
      [
        identity.userId, !!identity.verifiedPerson, jsonb(identity.creatorPersona, {}), jsonb(identity.professional, {}),
        jsonb(identity.portfolio, []), jsonb(identity.interests, []), jsonb(identity.privacy, {}), jsonb(identity.reputationRefs, {}),
        identity.agentId || null, identity.updatedAt
      ]
    );
    return identityFromRow(result.rows[0], identity);
  }

  async patchIdentity(user, patch = {}) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const currentResult = await client.query(
        'SELECT * FROM identity_profiles WHERE user_id=$1 FOR UPDATE',
        [user.id]
      );
      if (!currentResult.rowCount) {
        await client.query('ROLLBACK');
        return null;
      }
      const next = applyIdentityPatch(identityFromRow(currentResult.rows[0], user), patch);
      const result = await client.query(
        `UPDATE identity_profiles SET creator_persona=$2,professional=$3,portfolio=$4,interests=$5,privacy=$6,updated_at=$7
         WHERE user_id=$1 RETURNING *`,
        [
          user.id,
          jsonb(next.creatorPersona, {}),
          jsonb(next.professional, {}),
          jsonb(next.portfolio, []),
          jsonb(next.interests, []),
          jsonb(next.privacy, {}),
          next.updatedAt
        ]
      );
      await client.query('COMMIT');
      return identityFromRow(result.rows[0], user);
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      client.release();
    }
  }

  async createKgNode(node) {
    const result = await this.pool.query(
      `INSERT INTO kg_nodes(id,owner_id,type,label,data,privacy,provenance,created_at,updated_at,deleted_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [node.id, node.ownerId, node.type, node.label, jsonb(node.data, {}), node.privacy, jsonb(node.provenance, {}), node.createdAt, node.updatedAt, node.deletedAt]
    );
    return nodeFromRow(result.rows[0]);
  }

  async listKgNodes(ownerId) {
    const result = await this.pool.query('SELECT * FROM kg_nodes WHERE owner_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC', [ownerId]);
    return result.rows.map(nodeFromRow);
  }

  async softDeleteKgNode(ownerId, id) {
    const result = await this.pool.query(
      'UPDATE kg_nodes SET deleted_at=now() WHERE id=$1 AND owner_id=$2 AND deleted_at IS NULL RETURNING id',
      [id, ownerId]
    );
    return result.rowCount > 0;
  }

  async createKgEdge(edge) {
    const result = await this.pool.query(
      `INSERT INTO kg_edges(id,owner_id,from_id,to_id,type,data,privacy,created_at,deleted_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [edge.id, edge.ownerId, edge.fromId, edge.toId, edge.type, jsonb(edge.data, {}), edge.privacy, edge.createdAt, edge.deletedAt]
    );
    return edgeFromRow(result.rows[0]);
  }

  async listKgEdges(ownerId) {
    const result = await this.pool.query('SELECT * FROM kg_edges WHERE owner_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC', [ownerId]);
    return result.rows.map(edgeFromRow);
  }

  async createEcosystemAction(action) {
    await this.pool.query(
      `INSERT INTO ecosystem_actions(
        id,user_id,agent_id,actor_type,type,level,input,output,permission,context,status,
        confirmation_required,result,error,created_at,expires_at,confirmed_at,completed_at
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      ON CONFLICT(id) DO NOTHING`,
      [
        action.id, action.userId, action.agentId || null, action.actorType || 'personal_ai', action.type,
        action.level, jsonb(action.input, {}), action.output == null ? null : jsonb(action.output, {}),
        action.permission || null, action.context || 'command_center', action.status,
        !!action.confirmationRequired, action.result == null ? null : jsonb(action.result, {}), action.error || null,
        action.createdAt, action.expiresAt, action.confirmedAt || null, action.completedAt || null
      ]
    );
    return this.findEcosystemAction(action.userId, action.id);
  }

  async findEcosystemAction(userId, id) {
    const result = await this.pool.query('SELECT * FROM ecosystem_actions WHERE id=$1 AND user_id=$2 LIMIT 1', [id, userId]);
    return actionFromRow(result.rows[0]);
  }

  async listEcosystemActions(userId, limit = 50) {
    const result = await this.pool.query('SELECT * FROM ecosystem_actions WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2', [userId, Math.max(1, Math.min(100, Number(limit) || 50))]);
    return result.rows.map(actionFromRow);
  }

  async claimEcosystemAction(userId, id, confirmedAt) {
    const result = await this.pool.query(
      `UPDATE ecosystem_actions SET status='confirmed',confirmed_at=$3
       WHERE id=$1 AND user_id=$2 AND (
         status IN ('pending','ready') OR (status='confirmed' AND confirmed_at < $3::timestamptz - interval '30 seconds')
       ) RETURNING *`,
      [id, userId, confirmedAt]
    );
    return actionFromRow(result.rows[0]);
  }

  async saveEcosystemAction(action) {
    const result = await this.pool.query(
      `UPDATE ecosystem_actions SET status=$3,output=$4,result=$5,error=$6,confirmed_at=$7,completed_at=$8
       WHERE id=$1 AND user_id=$2 RETURNING *`,
      [
        action.id, action.userId, action.status, action.output == null ? null : jsonb(action.output, {}),
        action.result == null ? null : jsonb(action.result, {}), action.error || null,
        action.confirmedAt || null, action.completedAt || null
      ]
    );
    return actionFromRow(result.rows[0]);
  }

  async listAgentCatalog() {
    const result = await this.pool.query("SELECT * FROM agent_catalog WHERE status <> 'removed' ORDER BY created_at ASC");
    return result.rows.map(catalogFromRow);
  }

  async upsertAgentCatalog(agent) {
    const result = await this.pool.query(
      `INSERT INTO agent_catalog(id,developer_id,slug,name,summary,category,permissions,capabilities,tools,pricing,version,status,security_review,installs,revenue_share_bps,created_at,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT(slug) DO UPDATE SET
         name=EXCLUDED.name, summary=EXCLUDED.summary, installs=EXCLUDED.installs, updated_at=EXCLUDED.updated_at
       RETURNING *`,
      [
        agent.id, agent.developerId, agent.slug, agent.name, agent.summary, agent.category,
        jsonb(agent.permissions, []), jsonb(agent.capabilities, []), jsonb(agent.tools, []), jsonb(agent.pricing, {}),
        agent.version, agent.status, agent.securityReview || 'pending', agent.installs || 0,
        agent.revenueShareBps || 7000, agent.createdAt, agent.updatedAt
      ]
    );
    return catalogFromRow(result.rows[0]);
  }

  async findAgent(id) {
    const result = await this.pool.query('SELECT * FROM agent_catalog WHERE id=$1 LIMIT 1', [id]);
    return catalogFromRow(result.rows[0]);
  }

  async createInstall(row) {
    const result = await this.pool.query(
      `INSERT INTO agent_installs(id,user_id,org_id,agent_id,permissions,status,installed_at,removed_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [row.id, row.userId, row.orgId, row.agentId, jsonb(row.permissions, []), row.status, row.installedAt, row.removedAt]
    );
    return {
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      orgId: result.rows[0].org_id,
      agentId: result.rows[0].agent_id,
      permissions: asArray(result.rows[0].permissions, []),
      status: result.rows[0].status,
      installedAt: iso(result.rows[0].installed_at),
      removedAt: result.rows[0].removed_at ? iso(result.rows[0].removed_at) : null
    };
  }

  async listInstalls(userId) {
    const result = await this.pool.query('SELECT * FROM agent_installs WHERE user_id=$1 AND removed_at IS NULL ORDER BY installed_at DESC', [userId]);
    return result.rows.map(row => ({
      id: row.id, userId: row.user_id, orgId: row.org_id, agentId: row.agent_id,
      permissions: asArray(row.permissions, []), status: row.status,
      installedAt: iso(row.installed_at), removedAt: row.removed_at ? iso(row.removed_at) : null
    }));
  }

  async removeInstall(userId, agentId) {
    const result = await this.pool.query(
      `UPDATE agent_installs SET removed_at=now(), status='removed'
       WHERE user_id=$1 AND agent_id=$2 AND removed_at IS NULL RETURNING id`,
      [userId, agentId]
    );
    return result.rowCount > 0;
  }

  async bumpAgentInstalls(agentId) {
    await this.pool.query('UPDATE agent_catalog SET installs=installs+1, updated_at=now() WHERE id=$1', [agentId]);
  }

  async createDeveloperApp(app) {
    const result = await this.pool.query(
      `INSERT INTO developer_apps(id,owner_id,name,description,scopes,redirect_uris,webhook_url,status,rate_limit_per_minute,created_at,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [app.id, app.ownerId, app.name, app.description, jsonb(app.scopes, []), jsonb(app.redirectUris, []), app.webhookUrl, app.status, app.rateLimitPerMinute, app.createdAt, app.updatedAt]
    );
    return developerAppFromRow(result.rows[0]);
  }

  async listDeveloperApps(ownerId) {
    const result = await this.pool.query('SELECT * FROM developer_apps WHERE owner_id=$1 ORDER BY created_at DESC', [ownerId]);
    return result.rows.map(developerAppFromRow);
  }

  async findDeveloperApp(appId, ownerId = null) {
    const result = ownerId
      ? await this.pool.query('SELECT * FROM developer_apps WHERE id=$1 AND owner_id=$2 LIMIT 1', [appId, ownerId])
      : await this.pool.query('SELECT * FROM developer_apps WHERE id=$1 LIMIT 1', [appId]);
    return developerAppFromRow(result.rows[0]);
  }

  async createDeveloperApiKey(key) {
    const result = await this.pool.query(
      `INSERT INTO developer_api_keys(id,app_id,owner_id,prefix,hash,label,last_used_at,revoked_at,created_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [key.id, key.appId, key.ownerId, key.prefix, key.hash, key.label, key.lastUsedAt, key.revokedAt, key.createdAt]
    );
    return developerApiKeyFromRow(result.rows[0]);
  }

  async listDeveloperApiKeys(ownerId, appId) {
    const result = await this.pool.query(
      'SELECT * FROM developer_api_keys WHERE owner_id=$1 AND app_id=$2 ORDER BY created_at DESC',
      [ownerId, appId]
    );
    return result.rows.map(developerApiKeyFromRow);
  }

  async resolveDeveloperApiKey(hash) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const keyResult = await client.query(
        'SELECT * FROM developer_api_keys WHERE hash=$1 AND revoked_at IS NULL FOR UPDATE',
        [hash]
      );
      const key = developerApiKeyFromRow(keyResult.rows[0]);
      if (!key) {
        await client.query('ROLLBACK');
        return null;
      }
      const appResult = await client.query('SELECT * FROM developer_apps WHERE id=$1 LIMIT 1', [key.appId]);
      const app = developerAppFromRow(appResult.rows[0]);
      if (!app || !['sandbox', 'active'].includes(app.status)) {
        await client.query('ROLLBACK');
        return null;
      }
      const touched = await client.query('UPDATE developer_api_keys SET last_used_at=now() WHERE id=$1 RETURNING *', [key.id]);
      await client.query('COMMIT');
      return { key: developerApiKeyFromRow(touched.rows[0]), app };
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      client.release();
    }
  }

  async revokeDeveloperApiKey(ownerId, appId, keyId) {
    const result = await this.pool.query(
      `UPDATE developer_api_keys SET revoked_at=now()
       WHERE id=$1 AND app_id=$2 AND owner_id=$3 AND revoked_at IS NULL
       RETURNING *`,
      [keyId, appId, ownerId]
    );
    return developerApiKeyFromRow(result.rows[0]);
  }

  async createOrg(org) {
    const result = await this.pool.query(
      'INSERT INTO organizations(id,owner_id,name,description,created_at) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [org.id, org.ownerId, org.name, org.description || '', org.createdAt]
    );
    return orgFromRow(result.rows[0]);
  }

  async createMembership(member) {
    await this.pool.query(
      'INSERT INTO organization_members(id,org_id,user_id,role,joined_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(org_id,user_id) DO NOTHING',
      [member.id, member.orgId, member.userId, member.role, member.joinedAt]
    );
    return member;
  }

  async listOrgsForUser(userId) {
    const owned = await this.pool.query(
      'SELECT * FROM organizations WHERE owner_id=$1 ORDER BY created_at DESC',
      [userId]
    );
    const member = await this.pool.query(
      `SELECT organizations.* FROM organization_members
       INNER JOIN organizations ON organizations.id=organization_members.org_id
       WHERE organization_members.user_id=$1
       ORDER BY organizations.created_at DESC`,
      [userId]
    );
    const byId = new Map();
    for (const row of [...owned.rows, ...member.rows]) byId.set(row.id, row);
    return [...byId.values()].map(orgFromRow);
  }

  async getMembership(orgId, userId) {
    const result = await this.pool.query('SELECT * FROM organization_members WHERE org_id=$1 AND user_id=$2 LIMIT 1', [orgId, userId]);
    if (!result.rowCount) return null;
    const row = result.rows[0];
    return { id: row.id, orgId: row.org_id, userId: row.user_id, role: row.role, joinedAt: iso(row.joined_at) };
  }

  async getControlPlane(orgId) {
    const result = await this.pool.query('SELECT * FROM enterprise_ai_controls WHERE org_id=$1 LIMIT 1', [orgId]);
    if (!result.rowCount) return null;
    const row = result.rows[0];
    return {
      orgId: row.org_id,
      allowlist: asArray(row.allowlist, []),
      blocklist: asArray(row.blocklist, []),
      budgets: asObject(row.budgets, {}),
      killSwitch: !!row.kill_switch,
      requireApprovalFor: asArray(row.require_approval_for, []),
      policies: asArray(row.policies, []),
      updatedAt: iso(row.updated_at)
    };
  }

  async upsertControlPlane(plane) {
    await this.pool.query(
      `INSERT INTO enterprise_ai_controls(org_id,allowlist,blocklist,budgets,kill_switch,require_approval_for,policies,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(org_id) DO UPDATE SET
         allowlist=EXCLUDED.allowlist, blocklist=EXCLUDED.blocklist, budgets=EXCLUDED.budgets,
         kill_switch=EXCLUDED.kill_switch, require_approval_for=EXCLUDED.require_approval_for,
         policies=EXCLUDED.policies, updated_at=EXCLUDED.updated_at`,
      [plane.orgId, jsonb(plane.allowlist, []), jsonb(plane.blocklist, []), jsonb(plane.budgets, {}), !!plane.killSwitch, jsonb(plane.requireApprovalFor, []), jsonb(plane.policies, []), plane.updatedAt]
    );
    return plane;
  }

  async createActivity(row) {
    await this.pool.query(
      `INSERT INTO ai_activity(id,user_id,agent_id,kind,summary,data_used,reason,context,created_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [row.id, row.userId, row.agentId, row.kind, row.summary, jsonb(row.dataUsed, []), row.reason || '', row.context || 'command_center', row.createdAt]
    );
    return row;
  }

  async listActivity(userId, limit = 50) {
    const result = await this.pool.query(
      'SELECT * FROM ai_activity WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2',
      [userId, Math.max(1, Math.min(200, Number(limit) || 50))]
    );
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      agentId: row.agent_id,
      kind: row.kind,
      summary: row.summary,
      dataUsed: asArray(row.data_used, []),
      reason: row.reason || '',
      context: row.context,
      createdAt: iso(row.created_at)
    })).reverse();
  }

  async clearActivity(userId) {
    const result = await this.pool.query('DELETE FROM ai_activity WHERE user_id=$1', [userId]);
    return result.rowCount;
  }
}
