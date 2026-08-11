import { VISIBILITY } from './permissions.mjs';

export const IDENTITY_SECTIONS = Object.freeze([
  'basics',
  'creator',
  'professional',
  'skills',
  'portfolio',
  'education',
  'achievements',
  'reputation',
  'communities',
  'ai_agent',
  'digital_assets'
]);

export function defaultIdentityProfile(user) {
  return {
    userId: user.id,
    displayName: user.displayName || user.username,
    username: user.username,
    bio: user.bio || '',
    locale: user.locale || 'uk',
    verifiedIdentity: false,
    creatorPersona: '',
    professionalTitle: '',
    skills: [],
    interests: [],
    portfolio: [],
    education: [],
    achievements: [],
    reputation: {
      creator: 0,
      professional: 0,
      market: 0,
      community: 0,
      contribution: 0,
      trust: 0
    },
    visibility: {
      basics: VISIBILITY.PUBLIC,
      creator: VISIBILITY.PUBLIC,
      professional: VISIBILITY.PUBLIC,
      skills: VISIBILITY.PUBLIC,
      portfolio: VISIBILITY.PUBLIC,
      education: VISIBILITY.CONNECTIONS,
      achievements: VISIBILITY.PUBLIC,
      reputation: VISIBILITY.PUBLIC,
      communities: VISIBILITY.FOLLOWERS,
      ai_agent: VISIBILITY.PRIVATE,
      digital_assets: VISIBILITY.PRIVATE
    },
    updatedAt: null
  };
}

export function mergeIdentityProfile(base, patch = {}) {
  const out = structuredClone(base);
  if (typeof patch.creatorPersona === 'string') out.creatorPersona = patch.creatorPersona.slice(0, 2000);
  if (typeof patch.professionalTitle === 'string') out.professionalTitle = patch.professionalTitle.slice(0, 240);
  if (Array.isArray(patch.skills)) out.skills = patch.skills.slice(0, 40).map(s => String(s).slice(0, 80));
  if (Array.isArray(patch.interests)) out.interests = patch.interests.slice(0, 40).map(s => String(s).slice(0, 80));
  if (patch.visibility && typeof patch.visibility === 'object') {
    for (const [section, level] of Object.entries(patch.visibility)) {
      if (IDENTITY_SECTIONS.includes(section) && Object.values(VISIBILITY).includes(level)) {
        out.visibility[section] = level;
      }
    }
  }
  return out;
}
