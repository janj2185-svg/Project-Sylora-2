import { PRIVACY_LEVELS, privacyAllows } from './permissions.mjs';

export function defaultIdentity(user, now) {
  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    verifiedPerson: false,
    creatorPersona: '',
    professionalIdentity: '',
    skills: [],
    interests: [],
    portfolio: [],
    education: [],
    achievements: [],
    subscriptions: [],
    communities: [],
    aiAgentId: `sylora-personal-${user.id}`,
    digitalAssets: [],
    privacy: {
      identity: 'public',
      skills: 'public',
      portfolio: 'followers',
      education: 'connections',
      professional: 'business',
      achievements: 'public',
      aiAgent: 'private',
      digitalAssets: 'private'
    },
    reputationRefs: {
      creator: null,
      professional: null,
      marketplace: null,
      community: null,
      contribution: null,
      trust: null
    },
    updatedAt: now(),
    createdAt: now()
  };
}

export function ensureIdentity(store, user, now) {
  store.data.identities ??= [];
  let identity = store.data.identities.find(x => x.userId === user.id);
  if (!identity) {
    identity = defaultIdentity(user, now);
    store.data.identities.push(identity);
    store.save();
  }
  return identity;
}

export function patchIdentity(identity, patch = {}) {
  const listFields = ['skills', 'interests', 'portfolio', 'education', 'achievements', 'subscriptions', 'communities', 'digitalAssets'];
  for (const key of ['creatorPersona', 'professionalIdentity', 'displayName']) {
    if (typeof patch[key] === 'string') identity[key] = patch[key].slice(0, 500);
  }
  if (typeof patch.verifiedPerson === 'boolean') identity.verifiedPerson = patch.verifiedPerson;
  for (const key of listFields) {
    if (Array.isArray(patch[key])) identity[key] = patch[key].slice(0, 100);
  }
  if (patch.privacy && typeof patch.privacy === 'object') {
    identity.privacy ??= {};
    for (const [field, level] of Object.entries(patch.privacy)) {
      if (PRIVACY_LEVELS.includes(level)) identity.privacy[field] = level;
    }
  }
  return identity;
}

export function presentIdentity(identity, { viewerRelation = 'self', purpose = 'human' } = {}) {
  const out = {
    userId: identity.userId,
    username: identity.username,
    displayName: identity.displayName,
    verifiedPerson: identity.verifiedPerson,
    privacyLevels: identity.privacy
  };
  const fields = [
    ['creatorPersona', 'identity'],
    ['professionalIdentity', 'professional'],
    ['skills', 'skills'],
    ['interests', 'identity'],
    ['portfolio', 'portfolio'],
    ['education', 'education'],
    ['achievements', 'achievements'],
    ['aiAgentId', 'aiAgent'],
    ['digitalAssets', 'digitalAssets'],
    ['subscriptions', 'identity'],
    ['communities', 'identity'],
    ['reputationRefs', 'identity']
  ];
  for (const [field, privacyKey] of fields) {
    const level = identity.privacy?.[privacyKey] || 'private';
    if (privacyAllows({ level, viewerRelation, purpose })) out[field] = identity[field];
    else out[field] = null;
  }
  return out;
}
