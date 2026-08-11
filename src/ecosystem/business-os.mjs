export const ORG_ROLES = Object.freeze(['owner', 'admin', 'member', 'viewer']);

export function createOrganization({ id, ownerId, name, description = '' }) {
  return {
    id,
    ownerId,
    name: String(name || '').slice(0, 120),
    description: String(description || '').slice(0, 1000),
    createdAt: new Date().toISOString()
  };
}

export function createMembership({ id, orgId, userId, role = 'member' }) {
  if (!ORG_ROLES.includes(role)) throw new Error('INVALID_ORG_ROLE');
  return { id, orgId, userId, role, joinedAt: new Date().toISOString() };
}

export function createTeam({ id, orgId, name, memberIds = [] }) {
  return {
    id,
    orgId,
    name: String(name || '').slice(0, 80),
    memberIds: [...new Set(memberIds)].slice(0, 200),
    createdAt: new Date().toISOString()
  };
}

export function createOrgDocument({ id, orgId, authorId, title, body = '', privacy = 'business' }) {
  return {
    id,
    orgId,
    authorId,
    title: String(title || '').slice(0, 160),
    body: String(body || '').slice(0, 20000),
    privacy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function createOrgTask({ id, orgId, creatorId, title, assigneeId = null, status = 'open' }) {
  return {
    id,
    orgId,
    creatorId,
    assigneeId,
    title: String(title || '').slice(0, 160),
    status: ['open', 'doing', 'done'].includes(status) ? status : 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function rbacAllows(role, action) {
  const matrix = {
    owner: ['*'],
    admin: ['manage_members', 'manage_agents', 'manage_knowledge', 'view_audit', 'manage_billing', 'control_ai'],
    member: ['use_agents', 'view_knowledge', 'create_tasks'],
    viewer: ['view_knowledge']
  };
  const allowed = matrix[role] || [];
  return allowed.includes('*') || allowed.includes(action);
}

export function defaultEnterpriseControlPlane(orgId) {
  return {
    orgId,
    allowlist: [],
    blocklist: [],
    budgets: { aiTokensPerDay: 200000, aiActionsPerDay: 500 },
    killSwitch: false,
    requireApprovalFor: ['EXECUTE_ALLOWED', 'spend_money', 'install_agent'],
    policies: [],
    updatedAt: new Date().toISOString()
  };
}
