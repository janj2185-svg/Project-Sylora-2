/** Business OS + Enterprise AI Control Plane foundation. */

export const ORG_ROLES = Object.freeze(['owner', 'admin', 'member', 'viewer']);

export function ensureBusiness(store) {
  store.data.organizations ??= [];
  store.data.orgMembers ??= [];
  store.data.orgProjects ??= [];
  store.data.orgAgents ??= [];
  store.data.orgPolicies ??= [];
  store.data.orgAudit ??= [];
  store.data.orgBudgets ??= [];
  return store;
}

export function createOrganization(store, { id, name, ownerId }, now) {
  ensureBusiness(store);
  const org = {
    id,
    name: String(name || '').slice(0, 120),
    ownerId,
    createdAt: now(),
    status: 'active'
  };
  if (!org.name) throw new Error('ORG_NAME_REQUIRED');
  store.data.organizations.push(org);
  store.data.orgMembers.push({ orgId: id, userId: ownerId, role: 'owner', joinedAt: now() });
  store.data.orgPolicies.push({
    orgId: id,
    allowAgents: [],
    blockAgents: [],
    requireApprovalFor: ['EXECUTE_ALLOWED', 'commerce.write', 'messages.write'],
    killSwitch: false,
    updatedAt: now()
  });
  store.data.orgBudgets.push({
    orgId: id,
    aiTokensMonthly: 500000,
    aiSpendCentsMonthly: 0,
    hardLimit: true,
    updatedAt: now()
  });
  store.save();
  return org;
}

export function getMembership(store, orgId, userId) {
  ensureBusiness(store);
  return store.data.orgMembers.find(m => m.orgId === orgId && m.userId === userId) || null;
}

export function requireOrgRole(store, orgId, userId, roles = ['owner', 'admin', 'member']) {
  const membership = getMembership(store, orgId, userId);
  if (!membership || !roles.includes(membership.role)) throw new Error('ORG_FORBIDDEN');
  return membership;
}

export function controlPlaneSnapshot(store, orgId) {
  ensureBusiness(store);
  const org = store.data.organizations.find(o => o.id === orgId);
  if (!org) throw new Error('ORG_NOT_FOUND');
  const policy = store.data.orgPolicies.find(p => p.orgId === orgId);
  const budget = store.data.orgBudgets.find(b => b.orgId === orgId);
  const agents = store.data.orgAgents.filter(a => a.orgId === orgId);
  const members = store.data.orgMembers.filter(m => m.orgId === orgId);
  const audit = store.data.orgAudit.filter(a => a.orgId === orgId).slice(0, 100);
  return { org, policy, budget, agents, members, audit };
}

export function setKillSwitch(store, orgId, enabled, actorId, now) {
  ensureBusiness(store);
  const policy = store.data.orgPolicies.find(p => p.orgId === orgId);
  if (!policy) throw new Error('ORG_NOT_FOUND');
  policy.killSwitch = !!enabled;
  policy.updatedAt = now();
  store.data.orgAudit.unshift({
    id: `${orgId}-kill-${now()}`,
    orgId,
    actorId,
    type: enabled ? 'ai.kill_switch.enabled' : 'ai.kill_switch.disabled',
    at: now()
  });
  store.save();
  return policy;
}

export function installOrgAgent(store, { id, orgId, agentId, installedBy, tools = [] }, now) {
  ensureBusiness(store);
  const policy = store.data.orgPolicies.find(p => p.orgId === orgId);
  if (!policy) throw new Error('ORG_NOT_FOUND');
  if (policy.killSwitch) throw new Error('AI_KILL_SWITCH');
  if (policy.blockAgents.includes(agentId)) throw new Error('AGENT_BLOCKED');
  if (policy.allowAgents.length && !policy.allowAgents.includes(agentId)) throw new Error('AGENT_NOT_ALLOWLISTED');
  const row = { id, orgId, agentId, installedBy, tools, installedAt: now(), disabledAt: null };
  store.data.orgAgents.push(row);
  store.data.orgAudit.unshift({ id: `${id}-audit`, orgId, actorId: installedBy, type: 'org.agent.installed', at: now(), payload: { agentId } });
  store.save();
  return row;
}
