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
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}

function identityFromRow(row, user = {}) {
  if (!row) return null;
  return {
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
  };
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

export class PostgresEcosystemRepository {
  constructor(pool = null) { this.pool = pool; }
  get enabled() { return !!this.pool; }

  async findPersonalAgent(userId) {
    const result = await this.pool.query("SELECT * FROM personal_agents WHERE user_id=$1 AND kind='personal' LIMIT 1", [userId]);
    return agentFromRow(result.rows[0]);
  }

  async upsertPersonalAgent(agent) {
    const result = await this.pool.query(
      `INSERT INTO personal_agents(id,user_id,name,kind,locale,permissions,contexts,created_at,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT(user_id,kind) DO UPDATE SET
         name=EXCLUDED.name, locale=EXCLUDED.locale, permissions=EXCLUDED.permissions,
         contexts=EXCLUDED.contexts, updated_at=EXCLUDED.updated_at
       RETURNING *`,
      [agent.id, agent.userId, agent.name, agent.kind, agent.locale, jsonb(agent.permissions, {}), jsonb(agent.contexts, {}), agent.createdAt, agent.updatedAt]
    );
    return agentFromRow(result.rows[0]);
  }

  async getIdentity(userId) {
    const result = await this.pool.query('SELECT * FROM identity_profiles WHERE user_id=$1 LIMIT 1', [userId]);
    return identityFromRow(result.rows[0], { id: userId });
  }

  async upsertIdentity(identity) {
    const result = await this.pool.query(
      `INSERT INTO identity_profiles(user_id,verified_person,creator_persona,professional,portfolio,interests,privacy,reputation_refs,agent_id,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT(user_id) DO UPDATE SET
         verified_person=EXCLUDED.verified_person, creator_persona=EXCLUDED.creator_persona,
         professional=EXCLUDED.professional, portfolio=EXCLUDED.portfolio, interests=EXCLUDED.interests,
         privacy=EXCLUDED.privacy, reputation_refs=EXCLUDED.reputation_refs, agent_id=EXCLUDED.agent_id,
         updated_at=EXCLUDED.updated_at
       RETURNING *`,
      [
        identity.userId, !!identity.verifiedPerson, jsonb(identity.creatorPersona, {}), jsonb(identity.professional, {}),
        jsonb(identity.portfolio, []), jsonb(identity.interests, []), jsonb(identity.privacy, {}), jsonb(identity.reputationRefs, {}),
        identity.agentId || null, identity.updatedAt
      ]
    );
    return identityFromRow(result.rows[0], identity);
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
}
