export function createProvenance({
  id,
  contentId,
  contentType,
  creatorId,
  origin = 'human',
  creationMethod = 'manual',
  aiInvolved = false,
  editHistory = [],
  verification = {}
}) {
  return {
    id,
    contentId,
    contentType,
    creatorId,
    origin,
    creationMethod,
    aiInvolved: !!aiInvolved,
    aiLabel: aiInvolved ? 'ai_assisted_or_generated' : 'human',
    editHistory,
    timestamps: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    verification: {
      standard: 'sylora-provenance-v0',
      openStandardCompat: ['c2pa-ready'],
      ...verification
    }
  };
}

export function createSecurityCenterView({ userId, sessions = [], devices = [], blocks = [], exportReady = false }) {
  return {
    userId,
    sessions,
    devices,
    blocks,
    parentalControls: { enabled: false },
    loginAlerts: true,
    exportReady,
    deleteAccount: { status: 'available', note: 'Request is logged and processed through privacy workflow.' }
  };
}

export function privacyRequest({ id, userId, type, details = '' }) {
  const allowed = ['export', 'delete_account', 'delete_ai_memory', 'revoke_agents', 'revoke_integrations'];
  if (!allowed.includes(type)) throw new Error('INVALID_PRIVACY_REQUEST');
  return {
    id,
    userId,
    type,
    details: String(details || '').slice(0, 1000),
    status: 'queued',
    createdAt: new Date().toISOString()
  };
}
