/** Trust & Safety foundation — security center, privacy requests, synthetic labels. */

export function ensureTrust(store) {
  store.data.securitySessions ??= [];
  store.data.securityDevices ??= [];
  store.data.privacyRequests ??= [];
  store.data.contentReports ??= store.data.reports || [];
  store.data.syntheticLabels ??= [];
  store.data.moderationAppeals ??= [];
  return store;
}

export function recordSession(store, { id, userId, userAgent = '', ipHash = '' }, now) {
  ensureTrust(store);
  const session = {
    id,
    userId,
    userAgent: String(userAgent).slice(0, 200),
    ipHash,
    createdAt: now(),
    lastSeenAt: now(),
    revokedAt: null
  };
  store.data.securitySessions.unshift(session);
  store.data.securitySessions = store.data.securitySessions.slice(0, 500);
  store.save();
  return session;
}

export function securityCenter(store, userId) {
  ensureTrust(store);
  return {
    sessions: store.data.securitySessions.filter(s => s.userId === userId).slice(0, 20),
    devices: store.data.securityDevices.filter(d => d.userId === userId).slice(0, 20),
    privacyRequests: store.data.privacyRequests.filter(p => p.userId === userId).slice(0, 20),
    blockedUsers: (store.data.blocks || []).filter(b => b.userId === userId).map(b => b.blockedUserId),
    features: {
      exportData: true,
      deleteAccount: true,
      revokeAgents: true,
      appeals: true,
      parentalControls: 'architecture',
      ageAssurance: 'architecture',
      deepfakeProtection: 'architecture'
    }
  };
}

export function createPrivacyRequest(store, { id, userId, type }, now) {
  ensureTrust(store);
  const allowed = ['export', 'delete_account', 'delete_ai_memory', 'revoke_agents', 'revoke_integrations'];
  if (!allowed.includes(type)) throw new Error('PRIVACY_REQUEST_INVALID');
  const row = { id, userId, type, status: 'queued', createdAt: now(), completedAt: null };
  store.data.privacyRequests.push(row);
  store.save();
  return row;
}

export function labelSyntheticContent(store, { id, contentId, contentType, aiInvolvement = 'generated', creatorId }, now) {
  ensureTrust(store);
  const label = {
    id,
    contentId,
    contentType,
    aiInvolvement,
    creatorId,
    label: aiInvolvement === 'none' ? null : 'ai_generated_or_modified',
    createdAt: now()
  };
  store.data.syntheticLabels.push(label);
  store.save();
  return label;
}

export function openAppeal(store, { id, userId, reportId, message }, now) {
  ensureTrust(store);
  const appeal = {
    id,
    userId,
    reportId,
    message: String(message || '').slice(0, 2000),
    status: 'open',
    createdAt: now()
  };
  store.data.moderationAppeals.push(appeal);
  store.save();
  return appeal;
}
