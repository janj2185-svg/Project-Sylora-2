import { normalizePrivacy, PRIVACY_LEVELS } from './permissions.mjs';

export function defaultIdentity(user = {}) {
  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    verifiedPerson: false,
    creatorPersona: { headline: '', niches: [], languages: [user.locale || 'uk'] },
    professional: { title: '', company: '', skills: [], education: [], achievements: [] },
    portfolio: [],
    interests: [],
    subscriptions: [],
    communities: [],
    agentId: null,
    digitalAssets: [],
    privacy: {
      profile: 'public',
      professional: 'connections',
      portfolio: 'public',
      skills: 'public',
      interests: 'followers',
      reputation: 'public',
      agent: 'private',
      assets: 'private'
    },
    reputationRefs: {
      creator: null,
      professional: null,
      marketplace: null,
      community: null,
      contribution: null,
      trust: null
    },
    updatedAt: new Date().toISOString()
  };
}

export function patchIdentity(current, patch = {}) {
  const next = { ...current, ...patch, userId: current.userId, updatedAt: new Date().toISOString() };
  if (patch.privacy && typeof patch.privacy === 'object') {
    next.privacy = { ...current.privacy };
    for (const [key, value] of Object.entries(patch.privacy)) {
      if (key in next.privacy) next.privacy[key] = normalizePrivacy(value, next.privacy[key]);
    }
  }
  if (Array.isArray(patch.interests)) next.interests = patch.interests.map(x => String(x).slice(0, 40)).slice(0, 40);
  if (patch.professional && typeof patch.professional === 'object') {
    next.professional = {
      ...current.professional,
      ...patch.professional,
      skills: Array.isArray(patch.professional.skills)
        ? patch.professional.skills.map(x => String(x).slice(0, 40)).slice(0, 40)
        : current.professional.skills
    };
  }
  if (patch.creatorPersona && typeof patch.creatorPersona === 'object') {
    next.creatorPersona = { ...current.creatorPersona, ...patch.creatorPersona };
  }
  if (Array.isArray(patch.portfolio)) {
    next.portfolio = patch.portfolio.slice(0, 30).map(item => ({
      title: String(item.title || '').slice(0, 120),
      url: String(item.url || '').slice(0, 500),
      kind: String(item.kind || 'work').slice(0, 40)
    }));
  }
  return next;
}

export function publicIdentityView(identity, relation = 'public') {
  if (!identity) return null;
  const allow = (field) => {
    const level = identity.privacy?.[field] || 'public';
    if (relation === 'self') return true;
    const rank = Object.fromEntries(PRIVACY_LEVELS.map((x, i) => [x, i]));
    const relRank = { public: 0, follower: 1, connection: 2, business: 3, self: 5, ai: 5 };
    if (level === 'ai_only') return false;
    if (level === 'private') return false;
    return (relRank[relation] ?? 0) >= (rank[level] ?? 0);
  };
  return {
    userId: identity.userId,
    username: identity.username,
    displayName: identity.displayName,
    verifiedPerson: !!identity.verifiedPerson,
    creatorPersona: allow('profile') ? identity.creatorPersona : undefined,
    professional: allow('professional') ? identity.professional : undefined,
    portfolio: allow('portfolio') ? identity.portfolio : undefined,
    interests: allow('interests') ? identity.interests : undefined,
    reputationRefs: allow('reputation') ? identity.reputationRefs : undefined
  };
}
