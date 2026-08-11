import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

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
  businesses: [], conferenceRooms: [], conferenceMembers: [], conferenceInvites: [], liveRooms: [], liveMessages: [], liveEngagement: [], liveBattles: [], donorProgress: [], supportProgress: [], studioScenes: [], media: [], mediaJobs: [], videos: [], audit: [], gifts: [
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

export class Store {
  constructor(file) { this.file = path.resolve(file); this.data = initial(); }
  load() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    if (fs.existsSync(this.file)) { const defaults=initial(),saved=JSON.parse(fs.readFileSync(this.file,'utf8'));this.data={...defaults,...saved,gifts:defaults.gifts}; }
    else this.save();
    return this;
  }
  save() {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }
  id() { return randomUUID(); }
  now() { return new Date().toISOString(); }
  publicUser(user) {
    if (!user) return null;
    const { passwordHash, email, role, ...safe } = user;
    return safe;
  }
  notify(userId, type, actorId, payload = {}) {
    if (!userId || userId === actorId) return null;
    const notification={ id: this.id(), userId, type, actorId, payload, read: false, createdAt: this.now() };
    this.data.notifications.unshift(notification);
    return notification;
  }
}
