import { normalizePrivacy, PRIVACY_LEVELS } from './permissions.mjs';

function text(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function textList(value, { maxItems = 40, maxLength = 40 } = {}) {
  if (!Array.isArray(value)) return null;
  return value.map(item => text(item, maxLength)).filter(Boolean).slice(0, maxItems);
}

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

export function sanitizeIdentityRecord(identity = {}, user = {}) {
  const base = defaultIdentity({
    id: identity.userId || user.id,
    username: user.username || identity.username,
    displayName: user.displayName || identity.displayName,
    locale: user.locale || 'uk'
  });
  const creatorPersona = identity.creatorPersona && typeof identity.creatorPersona === 'object' ? identity.creatorPersona : {};
  const professional = identity.professional && typeof identity.professional === 'object' ? identity.professional : {};
  const privacySource = identity.privacy && typeof identity.privacy === 'object' ? identity.privacy : {};
  const reputationSource = identity.reputationRefs && typeof identity.reputationRefs === 'object' ? identity.reputationRefs : {};
  const privacy = Object.fromEntries(
    Object.entries(base.privacy).map(([key, fallback]) => [key, normalizePrivacy(privacySource[key], fallback)])
  );
  const reputationRefs = Object.fromEntries(
    Object.keys(base.reputationRefs).map(key => [key, reputationSource[key] == null ? null : text(reputationSource[key], 160)])
  );
  return {
    ...base,
    userId: text(identity.userId || user.id, 80),
    username: text(user.username || identity.username, 30),
    displayName: text(user.displayName || identity.displayName, 80),
    verifiedPerson: identity.verifiedPerson === true,
    creatorPersona: {
      headline: text(creatorPersona.headline, 160),
      niches: textList(creatorPersona.niches) || [],
      languages: textList(creatorPersona.languages, { maxItems: 20, maxLength: 20 }) || base.creatorPersona.languages
    },
    professional: {
      title: text(professional.title, 120),
      company: text(professional.company, 120),
      skills: textList(professional.skills) || [],
      education: textList(professional.education, { maxItems: 40, maxLength: 160 }) || [],
      achievements: textList(professional.achievements, { maxItems: 40, maxLength: 160 }) || []
    },
    portfolio: Array.isArray(identity.portfolio) ? identity.portfolio.slice(0, 30).map(value => {
      const item = value && typeof value === 'object' ? value : { title: value };
      return { title: text(item.title, 120), url: text(item.url, 500), kind: text(item.kind || 'work', 40) };
    }).filter(item => item.title) : [],
    interests: textList(identity.interests) || [],
    agentId: identity.agentId == null ? null : text(identity.agentId, 80),
    privacy,
    reputationRefs,
    updatedAt: text(identity.updatedAt || base.updatedAt, 64)
  };
}

export function patchIdentity(current, patch = {}) {
  current = sanitizeIdentityRecord(current, current);
  const next = { ...current, updatedAt: new Date().toISOString() };
  if (patch.privacy && typeof patch.privacy === 'object') {
    next.privacy = { ...current.privacy };
    for (const [key, value] of Object.entries(patch.privacy)) {
      if (key in next.privacy) next.privacy[key] = normalizePrivacy(value, next.privacy[key]);
    }
  }
  const interests = textList(patch.interests);
  if (interests) next.interests = interests;
  if (patch.professional && typeof patch.professional === 'object') {
    const professional = current.professional || { title: '', company: '', skills: [], education: [], achievements: [] };
    next.professional = {
      title: patch.professional.title == null ? professional.title : text(patch.professional.title, 120),
      company: patch.professional.company == null ? professional.company : text(patch.professional.company, 120),
      skills: textList(patch.professional.skills) || professional.skills || [],
      education: professional.education || [],
      achievements: professional.achievements || []
    };
  }
  if (patch.creatorPersona && typeof patch.creatorPersona === 'object') {
    const creatorPersona = current.creatorPersona || { headline: '', niches: [], languages: [] };
    next.creatorPersona = {
      headline: patch.creatorPersona.headline == null ? creatorPersona.headline : text(patch.creatorPersona.headline, 160),
      niches: textList(patch.creatorPersona.niches) || creatorPersona.niches || [],
      languages: textList(patch.creatorPersona.languages, { maxItems: 20, maxLength: 20 }) || creatorPersona.languages || []
    };
  }
  if (Array.isArray(patch.portfolio)) {
    next.portfolio = patch.portfolio.slice(0, 30).map(value => {
      const item = value && typeof value === 'object' ? value : { title: value };
      return {
        title: text(item.title, 120),
        url: text(item.url, 500),
        kind: text(item.kind || 'work', 40)
      };
    }).filter(item => item.title);
  }
  return next;
}

export function publicIdentityView(identity, relation = 'public') {
  if (!identity) return null;
  identity = sanitizeIdentityRecord(identity, identity);
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
