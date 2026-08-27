import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { toPublicUser } from './auth.mjs';

const initial = () => ({
  users: [], sessions: [], posts: [], comments: [], reactions: [], follows: [], blocks: [], reports: [],
  notifications: [], wallets: [], ledger: [], messages: [], conversations: [],
  aiMessages: [], aiMemories: [], aiActions: [],
  identities: [], personalAgents: [], aiActivity: [], kgNodes: [], kgEdges: [], ecosystemActions: [],
  agentCatalog: [], agentInstalls: [], developerApps: [], apiKeys: [], translationJobs: [],
  organizations: [], orgMembers: [], orgTeams: [], orgDocuments: [], orgTasks: [], agentNegotiations: [],
  enterpriseControls: [], reputations: [], provenance: [], studioAiPlans: [],
  commerceItems: [], commerceOrders: [], privacyRequests: [], aiBudgets: [], aiUsage: [],
  communities: [], communityMembers: [], communityChannels: [], communityPosts: [], courses: [], lessons: [], enrollments: [], lessonProgress: [], quizzes: [], quizAttempts: [],
  businesses: [], conferenceRooms: [], conferenceMembers: [], conferenceInvites: [], liveRooms: [], liveMessages: [], liveEngagement: [], liveBattles: [], donorProgress: [], supportProgress: [], studioScenes: [], liveStreamDestinations: [], liveDistributionSessions: [], media: [], mediaJobs: [], videos: [],
  platformEvents: [], calendarItems: [], projects: [], projectMembers: [], projectTasks: [], projectMilestones: [], collaborativeDocuments: [], contentAttributions: [], verificationRequests: [], featureFlagOverrides: [], continuitySessions: [], smartNotificationBundles: [], toolAudit: [],
  activityGraph: [], contentUnderstanding: [], contentHistory: [], sharedMemories: [], decisionRecords: [], universalTasks: [], goals: [], meetingResults: [], canvasWorkspaces: [], connectedServices: [], skillInstalls: [], ownershipGraph: [], revenueSplits: [], learningGraphs: [], businessWorkflows: [], dailyBriefPrefs: [],
  liveChallenges: [], liveQuizzes: [], liveMiniGames: [], liveStages: [], liveRoomProfiles: [], liveTimers: [], focusSessions: [], callSessions: [], callHistory: [], syloraCalls: [], businessCountryProfiles: [], invoices: [], expenseExtractions: [], crmRecords: [], quotes: [], timeEntries: [], projectBudgets: [], inventoryItems: [], accountantInvites: [], contracts: [], flashcardDecks: [], examPlans: [], assignments: [], quizBuilders: [], smartNotes: [], whiteboards: [], researchLibrary: [], researchProjects: [], datasets: [], tutorSessions: [], experimentLogs: [], formulaWorkspaces: [], scienceCircles: [], conferencePrograms: [], sharedQuizzes: [], funSocialRooms: [], communityEvents: [], discoveryProfiles: [], userAchievements: [], seasonalLiveEvents: [],
  audit: [], gifts: [
    { id: 'spark', name: 'Crystal Star', price: 10, tier: 'basic', color: '#e8b95f' },
    { id: 'pulse', name: 'Crystal Heart', price: 25, tier: 'basic', color: '#a98ae8' },
    { id: 'lumen-bloom', name: 'Eternal Lotus', price: 75, tier: 'basic', color: '#72cfb8' },
    { id: 'nova', name: 'Cosmic Bloom', price: 250, tier: 'premium', color: '#d98fc2' },
    { id: 'dream-orbit', name: 'Orbital Core', price: 500, tier: 'premium', color: '#79cbdc' },
    { id: 'aurora', name: 'Royal Crown', price: 1000, tier: 'epic', color: '#d9a84b' },
    { id: 'celestial-wing', name: 'Divine Wings', price: 1800, tier: 'epic', color: '#9d84df' },
    { id: 'time-gate', name: 'Portal of Infinity', price: 3000, tier: 'epic', color: '#69c9c5' },
    { id: 'cosmos', name: 'Phoenix Rebirth', price: 5000, tier: 'legendary', color: '#eea45e' },
    { id: 'infinite-sylora', name: 'Infinity', price: 10000, tier: 'legendary', color: '#b782db' }
  ]
});

function safeUserRecord(record = {}) {
  const { password, password_hash, ...user } = record;
  if (!user.passwordHash && typeof password_hash === 'string') user.passwordHash = password_hash;
  return user;
}

function safeSessionRecord(record = {}) {
  const { token, ...session } = record;
  return session;
}

function persistenceSnapshot(data) {
  return {
    ...data,
    users: Array.isArray(data.users) ? data.users.map(safeUserRecord) : [],
    sessions: Array.isArray(data.sessions) ? data.sessions.map(safeSessionRecord) : []
  };
}

export class Store {
  constructor(file, { persistent = true } = {}) {
    this.file = file ? path.resolve(file) : null;
    this.persistent = !!persistent;
    this.data = initial();
  }
  load() {
    if (!this.persistent) return this;
    if (!this.file) throw new Error('STORE_FILE_REQUIRED');
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    if (fs.existsSync(this.file)) {
      const defaults = initial();
      const saved = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      const savedUsers = Array.isArray(saved.users) ? saved.users : [];
      const savedSessions = Array.isArray(saved.sessions) ? saved.sessions : [];
      const needsCredentialRewrite = savedUsers.some(record => 'password' in record || 'password_hash' in record)
        || savedSessions.some(record => 'token' in record);
      const users = Array.isArray(saved.users)
        ? saved.users.map(record => {
          const user = safeUserRecord(record);
          return {
          ...user,
          status: user.status || 'active',
          updatedAt: user.updatedAt || user.createdAt || new Date().toISOString()
          };
        })
        : [];
      const now = Date.now();
      const sessions = Array.isArray(saved.sessions)
        ? saved.sessions.map(record => {
          const { token } = record;
          const safe = safeSessionRecord(record);
          if (!safe.tokenHash && token) safe.tokenHash = createHash('sha256').update(String(token)).digest('hex');
          return safe;
        }).filter(session => session.tokenHash && new Date(session.expiresAt).getTime() > now)
        : [];
      this.data = { ...defaults, ...saved, users, sessions, gifts: defaults.gifts };
      if (needsCredentialRewrite || sessions.length !== savedSessions.length) this.save();
    }
    else this.save();
    return this;
  }
  save() {
    if (!this.persistent) return false;
    if (!this.file) throw new Error('STORE_FILE_REQUIRED');
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(persistenceSnapshot(this.data), null, 2));
    fs.renameSync(tmp, this.file);
    return true;
  }
  id() { return randomUUID(); }
  now() { return new Date().toISOString(); }
  publicUser(user) {
    return toPublicUser(user);
  }
  notify(userId, type, actorId, payload = {}) {
    if (!userId || userId === actorId) return null;
    const notification={ id: this.id(), userId, type, actorId, payload, read: false, createdAt: this.now() };
    this.data.notifications.unshift(notification);
    return notification;
  }
}
