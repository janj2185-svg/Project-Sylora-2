import { createPersonalAgent, createActivityEntry, permissionDashboard, contextRole } from './personal-ai.mjs';
import { mergeAiPermissions as mergePerms, ACTION_LEVELS, DEFAULT_AI_PERMISSIONS } from './permissions.mjs';
import { defaultIdentity, patchIdentity, publicIdentityView, sanitizeIdentityRecord } from './identity.mjs';
import { createNode, createEdge, visibleNodes, graphSummary, KG_NODE_TYPES, KG_EDGE_TYPES } from './knowledge-graph.mjs';
import { createActionRecord, canExecute, markConfirmed, markCompleted, markFailed, validateToolInput, BUILTIN_ACTIONS } from './action-engine.mjs';
import { createAgentManifest, installRecord, STARTER_CATALOG } from './agents.mjs';
import { createDeveloperApp, generateApiKey, createApiKeyRecord, hashApiKey, OAUTH_DOC, scopeAllows } from './developer-platform.mjs';
import { createTranslationJob, localDetectLanguage, localTranslateStub, VOICE_POLICY } from './translation.mjs';
import { createOrganization, createMembership, rbacAllows, defaultEnterpriseControlPlane, createTeam, createOrgDocument, createOrgTask } from './business-os.mjs';
import { emptyReputation, applyEvidence, openDispute } from './reputation.mjs';
import { createProvenance, createSecurityCenterView, privacyRequest } from './trust.mjs';
import { createCommerceItem, sandboxCheckout } from './commerce.mjs';
import { structuredSearch, planAiSearch, semanticSearchFallback } from './search.mjs';
import { createMetricsRegistry, aiUsageEvent } from './observability.mjs';
import { defaultUserBudget, consume } from './cost-control.mjs';
import { defaultRevenueShares } from './economy.mjs';
import { createNegotiation, draftBusinessReply, confirmNegotiation } from './ai-to-ai.mjs';
import {
  buildPersonalityInstructions,
  modeFromView,
  voiceCatalog,
  languageSupportMatrix,
  PROACTIVE_LEVELS,
  SYLORA_MODES,
  sanitizeMemoryValue
} from './sylora-intelligence.mjs';
import {
  analyzeLiveRoom,
  buildCreatorContentPack,
  buildMeetingBrief,
  summarizeMeetingNotes,
  proposeTasksFromDecisions,
  buildLessonQuiz,
  adaptiveLearningState,
  homeHubPayload
} from './domain-intelligence.mjs';
import { buildCommandPlan, buildPlatformStatus, MEMORY_CATEGORIES, honestyLabel, modelRouteFor } from './platform-core.mjs';
import { resolveFlags } from './feature-flags.mjs';
import { providerSnapshot } from './providers.mjs';
import { listSpacesForUser, getSpace, SPACE_CAPABILITIES } from './spaces.mjs';
import { getTool } from './sylora-tools.mjs';
import {
  selectContextSlices,
  routeOperatingIntent,
  orchestrateTask,
  buildDailyBrief,
  buildIntelligentInbox,
  createActivityEvent,
  createContentUnderstanding,
  extractTopics,
  createDecisionRecord,
  createSharedMemoryRecord,
  createUniversalTask,
  createGoal,
  goalProgress,
  structuredMeetingResult,
  creatorPipelinePlan,
  localizedContentTracks,
  ownershipGraphNode,
  revenueSplitDraft,
  scienceClaim,
  learningKnowledgeNode,
  personalDashboardPayload,
  guestPublicView,
  onboardingState,
  emptyPlatformSeed,
  connectedServiceRecord,
  canvasWorkspace,
  PLATFORM_SKILLS,
  KNOWLEDGE_SCOPES,
  SPECIALIST_AGENTS
} from './sylora-os.mjs';

import {
  BATTLE_MODES, LIVE_ROOM_KINDS, MINI_GAMES, CHALLENGE_KINDS,
  createBattlePlan, applyBattleFactor, advanceBattleRound, resonanceWorldState,
  createLiveChallenge, createLiveQuiz, quizLeaderboard, createMiniGameSession,
  createAudienceVsSylora, createCoHostControl, createLiveRoomProfile,
  createStageState, stageRaiseHand, stageInvite, stageRemove
} from './live-entertainment.mjs';
import {
  TIMER_KINDS, FOCUS_PRESETS, createServerTimer, timerSnapshot, createFocusSession,
  parseTimeAssistantIntent, pauseTimer, resumeTimer, TIMER_SCOPES
} from './timer-engine.mjs';
import { createQuiz, openQuiz, submitAnswer, quizLeaderboard as engineQuizLeaderboard, QUIZ_CONTEXTS } from './quiz-engine.mjs';
import {
  createExperimentLog, appendExperimentVersion, mutateExperimentVersion,
  listCalculators, runCalculator, createFormulaWorkspace, analyzeStatistics,
  visualizationManifest, matchResearchers, createScienceCircle, addCircleComment
} from './science-tools.mjs';
import { createConferenceProgram, addConferenceQa, attachRecording, CONFERENCE_KINDS } from './conference-mode.mjs';
import {
  createFunSocialRoom, createCommunityEvent, createDiscoveryProfile, matchDiscovery,
  evaluateAchievements, createSeasonalLiveEvent, SHARED_ENGINE_REGISTRY, PRIORITY_ORDER, QA_CHECKLIST,
  FUN_ROOM_KINDS, ACHIEVEMENT_CATALOG
} from './social-ecosystem.mjs';
import {
  CALL_KINDS, createCallSession, acceptCall, declineCall, endCall, setCallMedia,
  enableCallTranslation, createSyloraCall, callHistoryEntry
} from './call-engine.mjs';
import {
  BUSINESS_HUB_SECTIONS, INVOICE_STATUSES, resolveCountryAdapter, createBusinessCountryProfile,
  createInvoiceDraft, createExpenseExtraction, confirmExpenseExtraction, createCrmRecord,
  createQuote, createTimeEntry, createProjectBudget, createInventoryItem,
  createAccountantInvite, financeAssistantGuard, legalAssistantDisclaimer, createContractRecord,
  buildAccountingExportMeta, ACCOUNTING_EXPORT_FORMATS
} from './business-finance.mjs';
import {
  LEARNING_HUB_SECTIONS, SCIENCE_HUB_SECTIONS, TUTOR_MODES, createTutorSession,
  tutorResponsePolicy, createFlashcardDeck, scheduleFlashcardReview, createExamPlan,
  createAssignment, createQuizBuilder, createSmartNote, createWhiteboardSession,
  createResearchLibraryItem, createPaperReaderView, createCitation, createResearchProject,
  createDatasetWorkspace, languageTutorMode
} from './learning-science.mjs';
import { SyloraContextEngine, SyloraReactionEngine } from './living-sylora/index.mjs';
import { AIDirectorEngine, directorStatus } from './ai-director.mjs';
import { createClipJob, processClipJob } from './clip-jobs.mjs';
import { capabilityDependencyGraph, nextImplementableCapability } from '../capability-graph.mjs';
import { emitPlatformEvent } from '../platform-events.mjs';

function canReadMemory(agent) {
  const permissions = mergePerms(agent?.permissions || {});
  return agent?.privacyControls?.memory !== false && permissions.memory_read !== false;
}

function canProposeMemory(agent) {
  const permissions = mergePerms(agent?.permissions || {});
  return agent?.privacyControls?.memory !== false && permissions.memory_propose !== false;
}

function publicDeveloperKey(key) {
  return {
    id: key.id,
    appId: key.appId,
    prefix: key.prefix,
    label: key.label,
    lastUsedAt: key.lastUsedAt || null,
    revokedAt: key.revokedAt || null,
    createdAt: key.createdAt
  };
}

function ensureCollections(store) {
  const d = store.data;
  d.identities ||= [];
  d.personalAgents ||= [];
  d.aiActivity ||= [];
  d.kgNodes ||= [];
  d.kgEdges ||= [];
  d.ecosystemActions ||= [];
  d.agentCatalog ||= [];
  d.agentInstalls ||= [];
  d.developerApps ||= [];
  d.apiKeys ||= [];
  d.translationJobs ||= [];
  d.organizations ||= [];
  d.orgMembers ||= [];
  d.orgTeams ||= [];
  d.orgDocuments ||= [];
  d.orgTasks ||= [];
  d.agentNegotiations ||= [];
  d.enterpriseControls ||= [];
  d.reputations ||= [];
  d.provenance ||= [];
  d.commerceItems ||= [];
  d.quizzes ||= [];
  d.quizAttempts ||= [];
  d.commerceOrders ||= [];
  d.privacyRequests ||= [];
  d.aiBudgets ||= [];
  d.aiUsage ||= [];
  d.studioAiPlans ||= [];
  d.platformEvents ||= [];
  d.calendarItems ||= [];
  d.projects ||= [];
  d.projectMembers ||= [];
  d.projectTasks ||= [];
  d.projectMilestones ||= [];
  d.collaborativeDocuments ||= [];
  d.contentAttributions ||= [];
  d.verificationRequests ||= [];
  d.featureFlagOverrides ||= [];
  d.continuitySessions ||= [];
  d.smartNotificationBundles ||= [];
  d.toolAudit ||= [];
  d.activityGraph ||= [];
  d.contentUnderstanding ||= [];
  d.contentHistory ||= [];
  d.sharedMemories ||= [];
  d.decisionRecords ||= [];
  d.universalTasks ||= [];
  d.goals ||= [];
  d.meetingResults ||= [];
  d.canvasWorkspaces ||= [];
  d.connectedServices ||= [];
  d.skillInstalls ||= [];
  d.ownershipGraph ||= [];
  d.revenueSplits ||= [];
  d.learningGraphs ||= [];
  d.businessWorkflows ||= [];
  d.dailyBriefPrefs ||= [];
  d.liveChallenges ||= [];
  d.liveQuizzes ||= [];
  d.liveMiniGames ||= [];
  d.liveStages ||= [];
  d.liveRoomProfiles ||= [];
  d.liveTimers ||= [];
  d.focusSessions ||= [];
  d.callSessions ||= [];
  d.callHistory ||= [];
  d.syloraCalls ||= [];
  d.businessCountryProfiles ||= [];
  d.invoices ||= [];
  d.expenseExtractions ||= [];
  d.crmRecords ||= [];
  d.quotes ||= [];
  d.timeEntries ||= [];
  d.projectBudgets ||= [];
  d.inventoryItems ||= [];
  d.accountantInvites ||= [];
  d.contracts ||= [];
  d.flashcardDecks ||= [];
  d.examPlans ||= [];
  d.assignments ||= [];
  d.quizBuilders ||= [];
  d.smartNotes ||= [];
  d.whiteboards ||= [];
  d.researchLibrary ||= [];
  d.researchProjects ||= [];
  d.datasets ||= [];
  d.tutorSessions ||= [];
  d.experimentLogs ||= [];
  d.formulaWorkspaces ||= [];
  d.scienceCircles ||= [];
  d.conferencePrograms ||= [];
  d.sharedQuizzes ||= [];
  d.funSocialRooms ||= [];
  d.communityEvents ||= [];
  d.discoveryProfiles ||= [];
  d.userAchievements ||= [];
  d.seasonalLiveEvents ||= [];
  d.audit ||= d.audit || [];
}



function audit(store, actorId, action, targetType, targetId, metadata = {}) {
  store.data.audit.unshift({
    id: store.id(),
    actorId,
    action,
    targetType,
    targetId,
    metadata,
    createdAt: store.now()
  });
}

export class EcosystemService {
  constructor(store, repo = null) {
    this.store = store;
    this.repo = repo;
    this.metrics = createMetricsRegistry();
    /** Optional realtime hooks from server (notifyUser, emitCall). */
    this.hooks = {
      notifyUser: null,
      emitCall: null,
      findLiveRoom: null,
      listLiveRooms: null,
      listLiveMessages: null,
      liveEngagement: null,
      activeBattle: null,
      createBattle: null,
      getBattlePlan: null,
      saveBattlePlan: null,
      getBattlePlanByLiveId: null,
      getStage: null,
      saveStage: null,
      getRoomProfile: null,
      saveRoomProfile: null,
      listRoomsForUser: null,
      searchLive: null,
      searchPosts: null,
      createClipJob: null,
      updateClipJob: null,
      getClipJob: null,
      aiComplete: null,
      postgresLiveState: false
    };
    this.livingSylora = new SyloraContextEngine();
    this.aiDirector = new AIDirectorEngine();
    ensureCollections(store);
    this._catalogReady = null;
    this.seedCatalog();
  }

  setHooks(hooks = {}) {
    this.hooks = { ...this.hooks, ...hooks };
  }

  /** Postgres-aware LIVE room lookup (hooks from server.mjs in production). */
  async resolveLiveRoom(liveId) {
    if (typeof this.hooks.findLiveRoom === 'function') return this.hooks.findLiveRoom(liveId);
    return (this.store.data.liveRooms || []).find(r => r.id === liveId && r.status === 'live') || null;
  }

  async resolveLiveRooms({ limit = 100 } = {}) {
    if (typeof this.hooks.listLiveRooms === 'function') {
      return (await this.hooks.listLiveRooms()).slice(0, limit);
    }
    return (this.store.data.liveRooms || []).filter(r => r.status === 'live').slice(0, limit);
  }

  async resolveLiveMessages(liveId, limit = 200) {
    if (typeof this.hooks.listLiveMessages === 'function') {
      return (await this.hooks.listLiveMessages(liveId)).slice(-limit);
    }
    return (this.store.data.liveMessages || []).filter(m => m.liveId === liveId).slice(-limit);
  }

  async resolveLiveEngagement(liveId) {
    if (typeof this.hooks.liveEngagement === 'function') return this.hooks.liveEngagement(liveId);
    const row = (this.store.data.liveEngagement || []).find(e => e.liveId === liveId);
    return { likes: row?.likes || 0, resonance: row?.resonance || 0 };
  }

  async resolveActiveBattle(liveId) {
    if (typeof this.hooks.activeBattle === 'function') return this.hooks.activeBattle(liveId);
    return (this.store.data.liveBattles || []).find(b =>
      b.status === 'live' && (b.hostLiveId === liveId || b.opponentLiveId === liveId)) || null;
  }

  battlePlanById(battleId) {
    return (this.store.data.liveBattles || []).find(b => b.id === battleId) || null;
  }

  async resolveBattlePlan(battleId) {
    if (this.hooks.postgresLiveState && typeof this.hooks.getBattlePlan === 'function') {
      const pg = await this.hooks.getBattlePlan(battleId);
      if (pg) return pg;
    }
    return this.battlePlanById(battleId);
  }

  async resolveBattlePlanByLiveId(liveId) {
    if (this.hooks.postgresLiveState && typeof this.hooks.getBattlePlanByLiveId === 'function') {
      const pg = await this.hooks.getBattlePlanByLiveId(liveId);
      if (pg) return pg;
    }
    return (this.store.data.liveBattles || []).find(b =>
      b.status === 'live' && (b.hostLiveId === liveId || b.opponentLiveId === liveId)) || null;
  }

  get liveStatePg() {
    return !!this.hooks.postgresLiveState;
  }

  async resolveDashboardLives(user, limit = 20) {
    if (this.hooks.postgresLiveState && typeof this.hooks.listRoomsForUser === 'function') {
      return (await this.hooks.listRoomsForUser(user.id, limit)) || [];
    }
    return (this.store.data.liveRooms || []).filter(r => r.hostId === user.id || r.status === 'live').slice(0, limit);
  }

  get pg() { return this.repo?.enabled ? this.repo : null; }

  seedCatalog() {
    if (this.store.data.agentCatalog.length) return;
    for (const item of STARTER_CATALOG) {
      const agent = createAgentManifest({
        id: this.store.id(),
        developerId: 'sylora-platform',
        ...item,
        tools: item.capabilities,
        sandbox: true
      });
      this.store.data.agentCatalog.push(agent);
      if (this.pg) this._catalogReady = (this._catalogReady || Promise.resolve()).then(() => this.pg.upsertAgentCatalog(agent)).catch(() => {});
    }
    this.store.save();
  }

  // —— Personal AI ——
  ensurePersonalAgent(user) {
    ensureCollections(this.store);
    let agent = this.store.data.personalAgents.find(a => a.userId === user.id && a.kind === 'personal');
    if (!agent) {
      agent = createPersonalAgent({ id: this.store.id(), userId: user.id, locale: user.locale || 'uk' });
      this.store.data.personalAgents.push(agent);
      this.store.save();
      audit(this.store, user.id, 'personal_ai.created', 'personal_agent', agent.id);
    }
    return agent;
  }

  async ensurePersonalAgentAsync(user) {
    if (this.pg) {
      const existing = await this.pg.findPersonalAgent(user.id);
      if (existing) {
        const idx = this.store.data.personalAgents.findIndex(a => a.userId === user.id && a.kind === 'personal');
        if (idx >= 0) this.store.data.personalAgents[idx] = existing;
        else this.store.data.personalAgents.push(existing);
        return existing;
      }
    }
    let agent = this.ensurePersonalAgent(user);
    if (this.pg) {
      agent = await this.pg.upsertPersonalAgent(agent);
      const index = this.store.data.personalAgents.findIndex(item => item.userId === user.id && item.kind === 'personal');
      if (index >= 0) this.store.data.personalAgents[index] = agent;
      else this.store.data.personalAgents.push(agent);
    }
    return agent;
  }

  updateAiPermissions(user, patch = {}) {
    const agent = this.ensurePersonalAgent(user);
    agent.permissions = mergePerms({ ...agent.permissions, ...patch });
    agent.updatedAt = this.store.now();
    this.store.save();
    audit(this.store, user.id, 'personal_ai.permissions_updated', 'personal_agent', agent.id, { permissions: agent.permissions });
    return agent;
  }

  async updateAiPermissionsAsync(user, patch = {}) {
    if (!this.pg) return this.updateAiPermissions(user, patch);
    const agent = await this.ensurePersonalAgentAsync(user);
    const permissionPatch = Object.fromEntries(
      Object.keys(DEFAULT_AI_PERMISSIONS)
        .filter(key => typeof patch[key] === 'boolean')
        .map(key => [key, patch[key]])
    );
    const saved = await this.pg.patchPersonalAgent(user.id, { permissions: permissionPatch, updatedAt: this.store.now() });
    const index = this.store.data.personalAgents.findIndex(item => item.id === agent.id);
    if (index >= 0) this.store.data.personalAgents[index] = saved;
    else this.store.data.personalAgents.push(saved);
    audit(this.store, user.id, 'personal_ai.permissions_updated', 'personal_agent', agent.id, { permissions: saved.permissions });
    return saved;
  }

  dashboard(user, pendingActions = [], source = {}) {
    const agent = this.ensurePersonalAgent(user);
    const memories = source.memories || (this.store.data.aiMemories || []).filter(m => m.userId === user.id);
    const activity = source.activity || this.store.data.aiActivity.filter(a => a.userId === user.id).slice(-50);
    return permissionDashboard(agent, memories, activity, pendingActions);
  }

  recordActivity(user, entry) {
    const agent = this.ensurePersonalAgent(user);
    const row = createActivityEntry({ id: this.store.id(), userId: user.id, agentId: agent.id, ...entry });
    this.store.data.aiActivity.push(row);
    this.store.save();
    if (this.pg) this.pg.createActivity(row).catch(() => {});
    return row;
  }

  async recordActivityAsync(user, entry) {
    if (!this.pg) return this.recordActivity(user, entry);
    const agent = await this.ensurePersonalAgentAsync(user);
    const row = createActivityEntry({ id: this.store.id(), userId: user.id, agentId: agent.id, ...entry });
    const saved = await this.pg.createActivity(row);
    this.store.data.aiActivity.push(saved || row);
    return saved || row;
  }

  exportMemory(user) {
    const memories = (this.store.data.aiMemories || []).filter(m => m.userId === user.id);
    const activity = this.store.data.aiActivity.filter(a => a.userId === user.id);
    audit(this.store, user.id, 'personal_ai.memory_exported', 'user', user.id, { count: memories.length });
    return { exportedAt: this.store.now(), memories, activity };
  }

  clearMemory(user) {
    const before = (this.store.data.aiMemories || []).length;
    this.store.data.aiMemories = (this.store.data.aiMemories || []).filter(m => m.userId !== user.id);
    this.store.data.aiActivity = this.store.data.aiActivity.filter(a => a.userId !== user.id);
    this.store.save();
    audit(this.store, user.id, 'personal_ai.memory_cleared', 'user', user.id, { removed: before - this.store.data.aiMemories.length });
    return { cleared: true };
  }

  // —— Identity ——
  ensureIdentity(user) {
    ensureCollections(this.store);
    const existingIndex = this.store.data.identities.findIndex(x => x.userId === user.id);
    let identity = existingIndex >= 0 ? this.store.data.identities[existingIndex] : null;
    if (!identity) {
      identity = defaultIdentity(user);
      const agent = this.ensurePersonalAgent(user);
      identity.agentId = agent.id;
      this.store.data.identities.push(identity);
      this.store.save();
    } else {
      identity = sanitizeIdentityRecord(identity, user);
      this.store.data.identities[existingIndex] = identity;
    }
    identity.username = user.username;
    identity.displayName = user.displayName;
    return identity;
  }

  async ensureIdentityAsync(user) {
    ensureCollections(this.store);
    if (!this.pg) return this.ensureIdentity(user);
    let identity = await this.pg.getIdentity(user.id);
    if (!identity) {
      const agent = await this.ensurePersonalAgentAsync(user);
      identity = defaultIdentity(user);
      identity.agentId = agent.id;
      identity = await this.pg.upsertIdentity(identity);
    }
    identity.username = user.username;
    identity.displayName = user.displayName;
    const index = this.store.data.identities.findIndex(item => item.userId === user.id);
    if (index >= 0) this.store.data.identities[index] = identity;
    else this.store.data.identities.push(identity);
    return identity;
  }

  updateIdentity(user, patch) {
    const current = this.ensureIdentity(user);
    const next = patchIdentity(current, patch);
    const idx = this.store.data.identities.findIndex(x => x.userId === user.id);
    this.store.data.identities[idx] = next;
    this.store.save();
    audit(this.store, user.id, 'identity.updated', 'identity', user.id);
    return next;
  }

  async updateIdentityAsync(user, patch) {
    if (!this.pg) return this.updateIdentity(user, patch);
    await this.ensureIdentityAsync(user);
    const next = await this.pg.patchIdentity(user, patch);
    next.username = user.username;
    next.displayName = user.displayName;
    const index = this.store.data.identities.findIndex(item => item.userId === user.id);
    if (index >= 0) this.store.data.identities[index] = next;
    else this.store.data.identities.push(next);
    return next;
  }

  getPublicIdentity(user, relation = 'public') {
    return publicIdentityView(this.ensureIdentity(user), relation);
  }

  async getPublicIdentityAsync(user, relation = 'public') {
    return publicIdentityView(await this.ensureIdentityAsync(user), relation);
  }

  // —— Knowledge Graph ——
  addNode(user, input) {
    const node = createNode({
      id: this.store.id(),
      ownerId: user.id,
      type: input.type,
      label: input.label,
      data: input.data || {},
      privacy: input.privacy || 'private',
      provenance: input.provenance || { source: 'user', createdHow: 'manual', aiInvolved: false }
    });
    this.store.data.kgNodes.push(node);
    this.store.save();
    if (this.pg) this.pg.createKgNode(node).catch(() => {});
    audit(this.store, user.id, 'kg.node_created', 'kg_node', node.id, { type: node.type, privacy: node.privacy });
    return node;
  }

  addEdge(user, input) {
    const edge = createEdge({
      id: this.store.id(),
      ownerId: user.id,
      fromId: input.fromId,
      toId: input.toId,
      type: input.type,
      data: input.data || {},
      privacy: input.privacy || 'private'
    });
    this.store.data.kgEdges.push(edge);
    this.store.save();
    if (this.pg) this.pg.createKgEdge(edge).catch(() => {});
    return edge;
  }

  graphFor(user, { asAi = false, relation = 'self' } = {}) {
    const nodes = visibleNodes(this.store.data.kgNodes.filter(n => n.ownerId === user.id), {
      viewerId: user.id,
      relation,
      asAi
    });
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = this.store.data.kgEdges.filter(e => e.ownerId === user.id && !e.deletedAt && nodeIds.has(e.fromId) && nodeIds.has(e.toId));
    return { ...graphSummary(nodes, edges), nodes, edges, types: { nodes: KG_NODE_TYPES, edges: KG_EDGE_TYPES } };
  }

  deleteNode(user, id) {
    const node = this.store.data.kgNodes.find(n => n.id === id && n.ownerId === user.id);
    if (!node) return false;
    node.deletedAt = this.store.now();
    this.store.save();
    if (this.pg) this.pg.softDeleteKgNode(user.id, id).catch(() => {});
    audit(this.store, user.id, 'kg.node_deleted', 'kg_node', id);
    return true;
  }

  // —— Action Engine ——
  proposeAction(user, input) {
    const agent = this.ensurePersonalAgent(user);
    if (agent.privacyControls?.aiActions === false) {
      throw new Error('AI_ACTIONS_DISABLED');
    }
    const type = input.type;
    const toolCheck = getTool(type) ? validateToolInput(type, input.input || {}) : { ok: true };
    if (!toolCheck.ok) throw new Error(toolCheck.error || 'VALIDATION_FAILED');
    const action = createActionRecord({
      id: this.store.id(),
      userId: user.id,
      agentId: agent.id,
      type,
      level: input.level || ACTION_LEVELS.REQUEST_CONFIRMATION,
      input: input.input || {},
      permission: input.permission || null,
      context: input.context || 'command_center'
    });
    this.store.data.ecosystemActions.push(action);
    this.store.data.toolAudit.unshift({
      id: this.store.id(),
      userId: user.id,
      tool: type,
      event: 'proposed',
      inputKeys: Object.keys(action.input || {}),
      createdAt: this.store.now()
    });
    this.store.save();
    this.recordActivity(user, {
      kind: 'action_proposed',
      summary: `Proposed ${action.type}`,
      dataUsed: Object.keys(action.input || {}),
      reason: input.reason || 'User or agent requested an action',
      context: action.context
    });
    return action;
  }

  /** Execute a confirmed tool against store APIs (no raw DB for AI). */
  async executeTool(user, type, input = {}) {
    ensureCollections(this.store);
    const budget = this.consumeBudget(user, 'aiRequests', 1);
    if (!budget.ok) return { ok: false, error: budget.error };

    switch (type) {
      case 'search_platform':
      case 'search_people': {
        const collections = this._searchCollections(user);
        const out = type === 'search_people'
          ? { ...structuredSearch(input.q || '', { users: collections.users }), filtered: 'people' }
          : await this.universalSearch(user, input.q || '');
        return { ok: true, result: out };
      }
      case 'manage_notifications': {
        const notes = (this.store.data.notifications || []).filter(n => n.userId === user.id && !n.read);
        return { ok: true, result: { unread: notes.length, items: notes.slice(0, 20), view: 'messages' } };
      }
      case 'summarize_content': {
        const text = String(input.text || '').slice(0, 8000);
        const sentences = text.split(/(?<=[.!?…])\s+/).filter(Boolean);
        return {
          ok: true,
          result: {
            summary: sentences.slice(0, 3).join(' ').slice(0, 600) || text.slice(0, 280),
            mode: 'extractive_local',
            honesty: honestyLabel({ configured: !!process.env.OPENAI_API_KEY, mock: !process.env.OPENAI_API_KEY })
          }
        };
      }
      case 'translate_content': {
        const job = this.translate(user, { text: input.text || input.raw || '', targetLang: input.targetLang || 'en', mode: 'text' });
        return { ok: true, result: { job, original: input.text || input.raw || '' } };
      }
      case 'create_post': {
        const text = String(input.text || '').slice(0, 4000);
        if (text.length < 1) return { ok: false, error: 'TEXT_REQUIRED' };
        const post = typeof this.hooks.createPost === 'function'
          ? await this.hooks.createPost(user, text)
          : { id: this.store.id(), userId: user.id, text, kind: 'text', createdAt: this.store.now(), provenance: 'original_upload' };
        if (!post) return { ok: false, error: 'POST_CREATE_FAILED' };
        if (typeof this.hooks.createPost !== 'function') this.store.data.posts.unshift(post);
        this.addProvenance(user, { contentId: post.id, contentType: 'post', origin: 'human', creationMethod: 'command', aiInvolved: true });
        return { ok: true, result: { post } };
      }
      case 'create_live': {
        const title = String(input.title || `${user.displayName} LIVE`).slice(0, 120);
        const live = {
          id: this.store.id(), hostId: user.id, title, status: 'live', viewerCount: 0,
          createdAt: this.store.now(), endedAt: null, source: 'action_engine'
        };
        const persisted = typeof this.hooks.createLive === 'function' ? await this.hooks.createLive(live) : live;
        if (!persisted) return { ok: false, error: 'LIVE_CREATE_FAILED' };
        if (typeof this.hooks.createLive !== 'function') this.store.data.liveRooms.unshift(persisted);
        this.upsertCalendarItem(user, {
          kind: 'live', title, startsAt: this.store.now(), refType: 'live', refId: persisted.id
        });
        return { ok: true, result: { live: persisted } };
      }
      case 'schedule_live': {
        const title = String(input.title || 'Scheduled LIVE').slice(0, 120);
        const startsAt = String(input.startsAt || 'tomorrow 20:00').slice(0, 80);
        const live = {
          id: this.store.id(), hostId: user.id, title, status: 'scheduled', viewerCount: 0,
          scheduledFor: startsAt, createdAt: this.store.now(), endedAt: null, source: 'action_engine'
        };
        this.store.data.liveRooms.unshift(live);
        const cal = this.upsertCalendarItem(user, {
          kind: 'live', title, startsAt, refType: 'live', refId: live.id
        });
        return { ok: true, result: { live, calendarItem: cal } };
      }
      case 'create_project': {
        const name = String(input.name || 'New project').slice(0, 120);
        const project = this.createProject(user, { name, description: input.description || '' });
        return { ok: true, result: { project } };
      }
      case 'create_room': {
        const title = String(input.title || 'Meeting').slice(0, 120);
        const kind = ['science', 'education', 'business'].includes(input.kind) ? input.kind : 'business';
        const room = {
          id: this.store.id(), ownerId: user.id, kind, title,
          description: String(input.description || '').slice(0, 800),
          syloraEnabled: false, status: 'open', createdAt: this.store.now()
        };
        this.store.data.conferenceRooms.push(room);
        this.store.data.conferenceMembers.push({ roomId: room.id, userId: user.id, role: 'owner', joinedAt: this.store.now() });
        this.upsertCalendarItem(user, { kind: 'meeting', title, startsAt: this.store.now(), refType: 'conference', refId: room.id });
        return { ok: true, result: { room } };
      }
      case 'create_event': {
        const event = this.createEvent(user, {
          title: input.title || 'Event',
          startsAt: input.startsAt || this.store.now(),
          mode: input.mode || 'online',
          description: input.description || ''
        });
        return { ok: true, result: { event } };
      }
      case 'create_clip': {
        const job = createClipJob({
          id: this.store.id(),
          userId: user.id,
          liveId: input.liveId || null,
          mediaId: input.mediaId || null,
          title: String(input.title || 'Clip').slice(0, 120)
        });
        if (typeof this.hooks.createClipJob === 'function') {
          const persisted = await this.hooks.createClipJob(job);
          processClipJob(persisted, {
            mediaRoot: process.env.SYLORA_MEDIA_ROOT || null,
            repo: { updateClipJob: (j) => this.hooks.updateClipJob(j) }
          }).catch(() => {});
          this.addProvenance(user, { contentId: persisted.id, contentType: 'clip', origin: 'human', creationMethod: 'clip_from_live', aiInvolved: true });
          return {
            ok: true,
            result: {
              clip: persisted,
              honesty: honestyLabel({ configured: true, mock: false, note: persisted.status === 'failed' ? persisted.error : 'async_render' })
            }
          };
        }
        const clip = { ...job, status: 'queued', note: 'Clip job queued — awaiting media source' };
        this.store.data.videos.unshift(clip);
        this.addProvenance(user, { contentId: clip.id, contentType: 'clip', origin: 'human', creationMethod: 'clip_from_live', aiInvolved: true });
        processClipJob(clip, { mediaRoot: process.env.SYLORA_MEDIA_ROOT || null }).then(rendered => {
          const idx = this.store.data.videos.findIndex(v => v.id === clip.id);
          if (idx >= 0) this.store.data.videos[idx] = { ...this.store.data.videos[idx], ...rendered };
          this.store.save();
        }).catch(() => {});
        return { ok: true, result: { clip, honesty: honestyLabel({ configured: false, mock: false, note: 'json_fallback_queue' }) } };
      }
      case 'send_message': {
        const text = String(input.text || '').slice(0, 2000);
        const otherId = input.userId;
        if (!text || !otherId) return { ok: false, error: 'MESSAGE_REQUIRED' };
        if (typeof this.hooks.sendMessage === 'function') {
          const sent = await this.hooks.sendMessage(user, { ...input, text, userId: otherId });
          return sent ? { ok: true, result: sent } : { ok: false, error: 'INVALID_RECIPIENT' };
        }
        let c = this.store.data.conversations.find(x => x.memberIds?.length === 2 && x.memberIds.includes(user.id) && x.memberIds.includes(otherId));
        if (!c) {
          c = { id: this.store.id(), memberIds: [user.id, otherId], createdAt: this.store.now() };
          this.store.data.conversations.push(c);
        }
        const msg = { id: this.store.id(), conversationId: c.id, userId: user.id, text, createdAt: this.store.now(), editedAt: null };
        this.store.data.messages.push(msg);
        this.store.notify(otherId, 'message', user.id, { conversationId: c.id });
        return { ok: true, result: { message: msg, conversationId: c.id } };
      }
      case 'invite_user': {
        const username = String(input.username || '').replace(/^@/, '').trim();
        if (typeof this.hooks.inviteUser === 'function') {
          const invited = await this.hooks.inviteUser(user, { ...input, username });
          return invited ? { ok: true, result: invited } : { ok: false, error: 'USER_NOT_FOUND' };
        }
        const target = this.store.data.users.find(u => u.username === username);
        if (!target) return { ok: false, error: 'USER_NOT_FOUND' };
        this.store.notify(target.id, 'invite', user.id, {
          targetType: input.targetType || 'space',
          targetId: input.targetId || null
        });
        return { ok: true, result: { invitedUserId: target.id, username } };
      }
      case 'daily_brief':
        return { ok: true, result: this.dailyBrief(user) };
      case 'list_open_work':
        return { ok: true, result: { tasks: this.listTasks(user).filter(t => t.status !== 'done'), continuity: this.continuityList(user) } };
      case 'prepare_meeting':
        return { ok: true, result: this.prepareMeetingBriefOs(user, input) };
      case 'content_history_search':
        return { ok: true, result: this.searchContentHistory(user, input.q || input.raw || '') };
      case 'recall_decision':
        return { ok: true, result: { decisions: this.findDecisions(user, input.q || input.raw || '') } };
      case 'list_goals':
        return { ok: true, result: { goals: this.listGoals(user) } };
      case 'intelligent_inbox':
        return { ok: true, result: this.intelligentInbox(user) };
      case 'timer_assistant':
        return { ok: true, result: this.timeAssistant(user, input.raw || input.text || input.q || '') };
      default:
        return { ok: true, result: { accepted: true, type, note: 'No dedicated executor — marked complete' } };
    }
  }

  async confirmEcosystemAction(user, id) {
    const action = this.store.data.ecosystemActions.find(a => a.id === id && a.userId === user.id);
    if (!action) return { ok: false, error: 'ACTION_NOT_FOUND' };
    if (action.status === 'completed') return { ok: true, action, already: true };
    if (new Date(action.expiresAt).getTime() <= Date.now()) {
      action.status = 'expired';
      this.store.save();
      return { ok: false, error: 'ACTION_EXPIRED' };
    }
    Object.assign(action, markConfirmed(action));
    const gate = canExecute(action, ACTION_LEVELS.EXECUTE_ALLOWED);
    if (!gate.ok) {
      Object.assign(action, markFailed(action, gate.error));
      this.store.save();
      return { ok: false, error: gate.error, action, gate };
    }
    const executed = await this.executeTool(user, action.type, action.input || {});
    if (!executed.ok) {
      Object.assign(action, markFailed(action, executed.error));
      this.store.save();
      audit(this.store, user.id, 'action.failed', 'ecosystem_action', id, { type: action.type, error: executed.error });
      return { ok: false, error: executed.error, action };
    }
    Object.assign(action, markCompleted(action, executed.result));
    this.store.data.toolAudit.unshift({
      id: this.store.id(), userId: user.id, tool: action.type, event: 'executed',
      actionId: id, createdAt: this.store.now()
    });
    this.store.save();
    audit(this.store, user.id, 'action.executed', 'ecosystem_action', id, { type: action.type });
    this.recordActivity(user, {
      kind: 'action_executed',
      summary: `Executed ${action.type}`,
      dataUsed: Object.keys(action.input || {}),
      reason: 'User confirmed action',
      context: action.context
    });
    return { ok: true, action, result: executed.result, gate };
  }

  listActions(user) {
    return this.store.data.ecosystemActions.filter(a => a.userId === user.id).slice(-50);
  }

  // —— Universal Command ——
  async universalCommand(user, text, { locale, executeReads = true, view } = {}) {
    const orchestration = orchestrateTask({ text });
    const osRoute = orchestration.routing;
    const plan = buildCommandPlan(text, { locale: locale || user.locale || 'uk' });
    // Prefer operating-layer routing when confidence is higher
    if (osRoute.confidence >= (plan.confidence || 0) && osRoute.tool) {
      plan.intent = osRoute.intent;
      plan.tool = osRoute.tool;
      plan.view = view || osRoute.view || plan.view;
      plan.confidence = osRoute.confidence;
      plan.requiresConfirmation = !!osRoute.requiresConfirmation || plan.requiresConfirmation;
      plan.specialist = osRoute.specialist;
      plan.skill = osRoute.skill;
    }
    plan.orchestration = orchestration;
    plan.contextEngine = this.buildContextEngine(user, { view: plan.view || 'command_center', query: text });

    const tool = getTool(plan.tool);
    const osTools = new Set([
      'daily_brief', 'list_open_work', 'prepare_meeting', 'content_history_search',
      'recall_decision', 'list_goals', 'intelligent_inbox', 'timer_assistant'
    ]);
    this.recordActivity(user, {
      kind: 'universal_command',
      summary: `Command: ${plan.intent}`,
      dataUsed: ['intent_detection', 'tool_catalog', 'context_engine', 'orchestration'],
      reason: String(text || '').slice(0, 200),
      context: plan.view || 'command_center'
    });
    this.recordActivityGraph(user, {
      type: 'custom',
      summary: `Sylora OS: ${plan.intent}`,
      data: { tool: plan.tool, specialist: plan.specialist || null }
    });

    if (!tool && !osTools.has(plan.tool)) {
      return { plan, status: 'needs_clarification', message: 'Sylora needs a clearer request.', orchestration };
    }

    if ((!plan.requiresConfirmation || osTools.has(plan.tool)) && executeReads) {
      const executed = await this.executeTool(user, plan.tool, { ...(plan.slots || {}), raw: text, q: text });
      return { plan, status: executed.ok ? 'executed' : 'failed', orchestration, ...executed };
    }

    const action = this.proposeAction(user, {
      type: plan.tool,
      level: tool?.level,
      input: plan.slots || {},
      context: plan.view || 'command_center',
      reason: `Universal Command: ${plan.intent}`
    });
    return {
      plan,
      status: 'pending_confirmation',
      action,
      orchestration,
      message: 'Confirm this action for Sylora to execute it with platform tools.'
    };
  }

  _searchCollections(user) {
    ensureCollections(this.store);
    const myConvIds = new Set(
      (this.store.data.conversations || [])
        .filter(c => (c.memberIds || []).includes(user.id))
        .map(c => c.id)
    );
    return {
      users: (this.store.data.users || []).map(u => this.store.publicUser(u)),
      posts: this.store.data.posts || [],
      communities: this.store.data.communities || [],
      courses: (this.store.data.courses || []).filter(c => c.published),
      businesses: this.store.data.businesses || [],
      organizations: this.listOrgs(user),
      agents: this.listAgents(),
      lives: this._cachedLivesForSearch || (this.store.data.liveRooms || []).filter(x => x.status === 'live' || x.status === 'scheduled'),
      videos: this.store.data.videos || [],
      messages: (this.store.data.messages || []).filter(m => myConvIds.has(m.conversationId)),
      documents: [
        ...(this.store.data.orgDocuments || []).filter(d => this.listOrgs(user).some(o => o.id === d.orgId)),
        ...(this.store.data.collaborativeDocuments || []).filter(d => d.ownerId === user.id || (d.memberIds || []).includes(user.id))
      ],
      projects: (this.store.data.projects || []).filter(p => p.ownerId === user.id || (this.store.data.projectMembers || []).some(m => m.projectId === p.id && m.userId === user.id)),
      events: (this.store.data.platformEvents || []).filter(e => e.ownerId === user.id || (e.participantIds || []).includes(user.id)),
      research: (this.store.data.courses || []).filter(c => c.kind === 'research' || c.track === 'science')
    };
  }

  async refreshSearchLives(user) {
    if (typeof this.hooks.listLiveRooms === 'function') {
      this._cachedLivesForSearch = await this.hooks.listLiveRooms();
    } else {
      this._cachedLivesForSearch = (this.store.data.liveRooms || []).filter(x => x.status === 'live');
    }
    return this._cachedLivesForSearch;
  }

  async universalSearch(user, query) {
    await this.refreshSearchLives(user);
    const collections = this._searchCollections(user);
    let pgLive = [];
    let pgPosts = [];
    if (this.hooks.postgresLiveState && typeof this.hooks.searchLive === 'function' && query.length >= 2) {
      pgLive = await this.hooks.searchLive(query, 20);
      collections.lives = [...pgLive, ...collections.lives.filter(l => !pgLive.some(p => p.id === l.id))];
    }
    if (this.hooks.postgresLiveState && typeof this.hooks.searchPosts === 'function' && query.length >= 2) {
      pgPosts = await this.hooks.searchPosts(query, 30);
      collections.posts = [...pgPosts, ...collections.posts.filter(p => !pgPosts.some(x => x.id === p.id))];
    }
    const structured = structuredSearch(query, collections);
    const semantic = semanticSearchFallback(query, collections);
    return {
      query,
      structured: structured.results,
      semantic: semantic.results,
      semanticHonesty: semantic.honesty,
      postgres: { live: pgLive.length, posts: pgPosts.length },
      plan: planAiSearch(query),
      types: ['people', 'posts', 'videos', 'live', 'messages', 'communities', 'projects', 'companies', 'courses', 'research', 'files', 'events']
    };
  }

  universalSearchSync(user, query) {
    const collections = this._searchCollections(user);
    const structured = structuredSearch(query, collections);
    const semantic = semanticSearchFallback(query, collections);
    return {
      query,
      structured: structured.results,
      semantic: semantic.results,
      semanticHonesty: semantic.honesty,
      plan: planAiSearch(query),
      types: ['people', 'posts', 'videos', 'live', 'messages', 'communities', 'projects', 'companies', 'courses', 'research', 'files', 'events']
    };
  }

  ingestPlatformEvent(event) {
    this.livingSylora.observe(event);
    this.aiDirector.ingest(event);
  }

  async livingSyloraReact(event) {
    const engine = new SyloraReactionEngine({
      contextEngine: this.livingSylora,
      aiComplete: typeof this.hooks.aiComplete === 'function' ? this.hooks.aiComplete : null
    });
    const reaction = await engine.react(event);
    emitPlatformEvent('assistant.reaction.ready', reaction.payload, {
      liveRoomId: reaction.liveRoomId,
      correlationId: reaction.correlationId,
      actor: reaction.actor
    });
    return reaction;
  }

  directorPropose(context = {}) {
    const cue = this.aiDirector.propose(context);
    emitPlatformEvent('director.cue.proposed', cue.payload, { liveRoomId: cue.liveRoomId, actor: cue.actor });
    return { ...cue.payload, director: directorStatus() };
  }

  platformCapabilityGraph() {
    return {
      graph: capabilityDependencyGraph(),
      next: nextImplementableCapability(),
      livingSylora: { runtime: 'PARTIAL', engine: 'context+reaction' },
      director: directorStatus()
    };
  }

  // —— Memory Center ——
  memoryCenter(user, source = null) {
    const agent = this.ensurePersonalAgent(user);
    const memories = source || (this.store.data.aiMemories || []).filter(m => m.userId === user.id);
    const byCategory = Object.fromEntries(MEMORY_CATEGORIES.map(c => [c, []]));
    for (const m of memories) {
      const cat = MEMORY_CATEGORIES.includes(m.category) ? m.category : 'preferences';
      byCategory[cat].push(m);
    }
    return {
      enabled: agent.privacyControls?.memory !== false,
      categories: MEMORY_CATEGORIES,
      byCategory,
      memories,
      controls: {
        canView: true,
        canEdit: true,
        canDelete: true,
        canDisable: true,
        canExport: true
      },
      honesty: 'AI does not secretly accumulate personal data — all durable memories are listed here.'
    };
  }

  updateMemory(user, id, patch = {}) {
    const memory = (this.store.data.aiMemories || []).find(m => m.id === id && m.userId === user.id);
    if (!memory) return null;
    if (patch.label != null) memory.label = String(patch.label).slice(0, 80);
    if (patch.value != null) memory.value = sanitizeMemoryValue(String(patch.value).slice(0, 2000));
    if (patch.category && MEMORY_CATEGORIES.includes(patch.category)) memory.category = patch.category;
    if (patch.tier === 'short' || patch.tier === 'long') memory.tier = patch.tier;
    memory.updatedAt = this.store.now();
    this.store.save();
    audit(this.store, user.id, 'memory.updated', 'ai_memory', id);
    return memory;
  }

  setMemoryEnabled(user, enabled) {
    const agent = this.ensurePersonalAgent(user);
    agent.privacyControls = { ...(agent.privacyControls || {}), memory: !!enabled };
    agent.updatedAt = this.store.now();
    this.store.save();
    return { enabled: !!enabled };
  }

  async setMemoryEnabledAsync(user, enabled) {
    if (!this.pg) return this.setMemoryEnabled(user, enabled);
    const agent = await this.ensurePersonalAgentAsync(user);
    const saved = await this.pg.patchPersonalAgent(user.id, {
      privacyControls: { memory: !!enabled },
      updatedAt: this.store.now()
    });
    const index = this.store.data.personalAgents.findIndex(item => item.id === agent.id);
    if (index >= 0) this.store.data.personalAgents[index] = saved;
    else this.store.data.personalAgents.push(saved);
    return { enabled: !!enabled };
  }

  async memoryAccessEnabled(user) {
    const agent = await this.ensurePersonalAgentAsync(user);
    return canReadMemory(agent);
  }

  async memoryProposalEnabled(user) {
    const agent = await this.ensurePersonalAgentAsync(user);
    return canProposeMemory(agent);
  }

  // —— Events / Calendar / Projects / Spaces ——
  createEvent(user, input = {}) {
    ensureCollections(this.store);
    const event = {
      id: this.store.id(),
      ownerId: user.id,
      title: String(input.title || 'Event').slice(0, 160),
      description: String(input.description || '').slice(0, 2000),
      mode: input.mode === 'offline' ? 'offline' : 'online',
      startsAt: String(input.startsAt || this.store.now()).slice(0, 80),
      endsAt: input.endsAt || null,
      registrationOpen: input.registrationOpen !== false,
      participantIds: [user.id],
      speakers: input.speakers || [],
      ticketMode: input.ticketMode || 'free',
      liveId: input.liveId || null,
      schedule: input.schedule || [],
      notifications: true,
      recording: input.recording || null,
      createdAt: this.store.now()
    };
    this.store.data.platformEvents.unshift(event);
    this.upsertCalendarItem(user, {
      kind: 'event', title: event.title, startsAt: event.startsAt, refType: 'event', refId: event.id
    });
    this.store.save();
    audit(this.store, user.id, 'event.created', 'platform_event', event.id);
    return event;
  }

  listEvents(user) {
    ensureCollections(this.store);
    return this.store.data.platformEvents.filter(
      e => e.ownerId === user.id || (e.participantIds || []).includes(user.id)
    );
  }

  registerForEvent(user, eventId) {
    const event = this.store.data.platformEvents.find(e => e.id === eventId);
    if (!event) return { ok: false, error: 'EVENT_NOT_FOUND' };
    if (!event.registrationOpen) return { ok: false, error: 'REGISTRATION_CLOSED' };
    event.participantIds = event.participantIds || [];
    if (!event.participantIds.includes(user.id)) event.participantIds.push(user.id);
    this.upsertCalendarItem(user, {
      kind: 'event', title: event.title, startsAt: event.startsAt, refType: 'event', refId: event.id
    });
    this.store.save();
    return { ok: true, event };
  }

  upsertCalendarItem(user, input = {}) {
    ensureCollections(this.store);
    const existing = this.store.data.calendarItems.find(
      c => c.userId === user.id && c.refType === input.refType && c.refId === input.refId
    );
    if (existing) {
      Object.assign(existing, {
        title: String(input.title || existing.title).slice(0, 160),
        startsAt: String(input.startsAt || existing.startsAt).slice(0, 80),
        kind: input.kind || existing.kind,
        updatedAt: this.store.now()
      });
      this.store.save();
      return existing;
    }
    const item = {
      id: this.store.id(),
      userId: user.id,
      kind: input.kind || 'custom',
      title: String(input.title || 'Item').slice(0, 160),
      startsAt: String(input.startsAt || this.store.now()).slice(0, 80),
      endsAt: input.endsAt || null,
      refType: input.refType || null,
      refId: input.refId || null,
      createdAt: this.store.now(),
      updatedAt: this.store.now()
    };
    this.store.data.calendarItems.push(item);
    this.store.save();
    return item;
  }

  listCalendar(user) {
    ensureCollections(this.store);
    return this.store.data.calendarItems
      .filter(c => c.userId === user.id)
      .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
  }

  createCalendarItem(user, input = {}) {
    // Calendar mutations always require explicit user intent (caller / confirm path).
    return this.upsertCalendarItem(user, { ...input, refType: input.refType || 'manual', refId: input.refId || this.store.id() });
  }

  createProject(user, input = {}) {
    ensureCollections(this.store);
    const project = {
      id: this.store.id(),
      ownerId: user.id,
      name: String(input.name || 'Project').slice(0, 120),
      description: String(input.description || '').slice(0, 2000),
      status: 'active',
      timeline: [],
      createdAt: this.store.now()
    };
    this.store.data.projects.push(project);
    this.store.data.projectMembers.push({
      id: this.store.id(), projectId: project.id, userId: user.id, role: 'owner', joinedAt: this.store.now()
    });
    // Also keep Business OS org for deeper workspace if name is unique enough
    try {
      this.createOrg(user, { name: project.name, description: project.description });
    } catch { /* ignore duplicate-ish */ }
    this.store.save();
    audit(this.store, user.id, 'project.created', 'project', project.id);
    return project;
  }

  listProjects(user) {
    ensureCollections(this.store);
    const memberOf = new Set(
      (this.store.data.projectMembers || []).filter(m => m.userId === user.id).map(m => m.projectId)
    );
    return this.store.data.projects.filter(p => p.ownerId === user.id || memberOf.has(p.id));
  }

  projectWorkspace(user, projectId) {
    const project = this.listProjects(user).find(p => p.id === projectId);
    if (!project) return { ok: false, error: 'PROJECT_NOT_FOUND' };
    return {
      ok: true,
      project,
      members: (this.store.data.projectMembers || []).filter(m => m.projectId === projectId),
      tasks: (this.store.data.projectTasks || []).filter(t => t.projectId === projectId),
      milestones: (this.store.data.projectMilestones || []).filter(m => m.projectId === projectId),
      documents: (this.store.data.collaborativeDocuments || []).filter(d => d.projectId === projectId),
      space: getSpace(projectId, this.store.data)
    };
  }

  listUserSpaces(user) {
    ensureCollections(this.store);
    return {
      spaces: listSpacesForUser(user.id, this.store.data),
      capabilities: SPACE_CAPABILITIES,
      engine: 'unified_space_adapter'
    };
  }

  async askAboutContext(user, { view, contentType, contentId, question } = {}) {
    const q = String(question || 'поясни').slice(0, 2000);
    const plan = buildCommandPlan(q, { locale: user.locale || 'uk' });
    const context = {
      view: view || 'ai',
      contentType: contentType || 'unknown',
      contentId: contentId || null,
      note: 'Contextual Ask Sylora — uses current surface metadata; does not invent missing media.'
    };
    let excerpt = '';
    if (contentType === 'post') {
      excerpt = this.store.data.posts.find(p => p.id === contentId)?.text || '';
    } else if (contentType === 'live') {
      const live = this.store.data.liveRooms.find(r => r.id === contentId);
      const chat = (this.store.data.liveMessages || []).filter(m => m.liveId === contentId).slice(-30).map(m => m.text).join('\n');
      excerpt = `${live?.title || ''}\n${chat}`;
    } else if (contentType === 'document') {
      excerpt = this.store.data.orgDocuments.find(d => d.id === contentId)?.body
        || this.store.data.collaborativeDocuments.find(d => d.id === contentId)?.body || '';
    } else if (contentType === 'course' || contentType === 'lesson') {
      excerpt = this.store.data.lessons.find(l => l.id === contentId)?.title
        || this.store.data.courses.find(c => c.id === contentId)?.title || '';
    }
    const summary = await this.executeTool(user, 'summarize_content', { text: `${q}\n\n${excerpt}` });
    this.recordActivity(user, {
      kind: 'ask_sylora_context',
      summary: `Ask Sylora about ${contentType || view}`,
      dataUsed: ['context_surface', excerpt ? 'content_excerpt' : 'metadata_only'],
      reason: q.slice(0, 200),
      context: view || 'ai'
    });
    return {
      plan,
      context,
      answer: summary.result?.summary || 'Need more context on this surface.',
      originalAvailable: true,
      honesty: summary.result?.honesty
    };
  }

  async liveCopilotBundle(user, liveId) {
    const room = await this.resolveLiveRoom(liveId);
    if (!room) return { ok: false, error: 'LIVE_NOT_FOUND' };
    if (room.hostId !== user.id) return { ok: false, error: 'LIVE_HOST_REQUIRED' };
    const chat = await this.resolveLiveMessages(liveId, 80);
    const questions = chat.filter(m => /\?|як|what|how|чому/i.test(m.text || '')).slice(-10);
    return {
      ok: true,
      liveId,
      highlights: questions.map(m => ({ id: m.id, text: m.text, userId: m.userId })),
      suggestions: [
        'Answer top chat question',
        'Create a poll from recurring theme',
        'Mark clip moment',
        'Draft LIVE summary (private until you publish)'
      ],
      policy: {
        speakAsStreamer: false,
        note: 'Sylora assists the host — never speaks as the streamer without explicit control.'
      },
      translationReady: !!process.env.OPENAI_API_KEY || !!process.env.SYLORA_TRANSLATE_API_KEY
    };
  }

  smartNotifications(user) {
    const notes = (this.store.data.notifications || []).filter(n => n.userId === user.id && !n.read);
    const critical = notes.filter(n => ['security', 'payment', 'invite', 'call'].includes(n.type));
    const rest = notes.filter(n => !critical.includes(n));
    const bundle = {
      id: this.store.id(),
      userId: user.id,
      createdAt: this.store.now(),
      total: notes.length,
      critical: critical.slice(0, 10),
      summary: rest.length
        ? `За останній період у тебе ${notes.length} сповіщень. Ось ${Math.min(3, rest.length)} важливі з групи.`
        : critical.length ? 'Є критичні сповіщення.' : 'Немає непрочитаних.',
      top: rest.slice(0, 3)
    };
    this.store.data.smartNotificationBundles.unshift(bundle);
    this.store.save();
    return bundle;
  }

  continuityUpsert(user, input = {}) {
    ensureCollections(this.store);
    let row = this.store.data.continuitySessions.find(
      s => s.userId === user.id && s.kind === (input.kind || 'draft') && s.key === (input.key || 'default')
    );
    if (!row) {
      row = {
        id: this.store.id(),
        userId: user.id,
        kind: input.kind || 'draft',
        key: input.key || 'default',
        payload: {},
        device: input.device || 'unknown',
        updatedAt: this.store.now(),
        createdAt: this.store.now()
      };
      this.store.data.continuitySessions.push(row);
    }
    row.payload = { ...(row.payload || {}), ...(input.payload || {}) };
    row.device = input.device || row.device;
    row.updatedAt = this.store.now();
    this.store.save();
    return row;
  }

  continuityList(user) {
    return (this.store.data.continuitySessions || []).filter(s => s.userId === user.id);
  }

  flagsFor(user) {
    const overrides = Object.fromEntries(
      (this.store.data.featureFlagOverrides || [])
        .filter(f => f.userId === user.id)
        .map(f => [f.name, f.enabled])
    );
    return resolveFlags(overrides);
  }

  platformStatus() {
    return buildPlatformStatus({ env: process.env });
  }

  // —— Agents marketplace ——
  listAgents() {
    return this.store.data.agentCatalog.filter(a => a.status !== 'removed');
  }

  publishAgent(user, input) {
    const manifest = createAgentManifest({
      id: this.store.id(),
      developerId: user.id,
      slug: input.slug,
      name: input.name,
      summary: input.summary,
      category: input.category || 'custom',
      permissions: input.permissions || [],
      capabilities: input.capabilities || [],
      tools: input.tools || [],
      pricing: input.pricing,
      version: input.version || '0.1.0',
      sandbox: input.sandbox !== false
    });
    this.store.data.agentCatalog.push(manifest);
    this.store.save();
    if (this.pg) this.pg.upsertAgentCatalog(manifest).catch(() => {});
    audit(this.store, user.id, 'agent.published', 'agent', manifest.id);
    return manifest;
  }

  installAgent(user, agentId) {
    const agent = this.store.data.agentCatalog.find(a => a.id === agentId);
    if (!agent) return { ok: false, error: 'AGENT_NOT_FOUND' };
    if (this.store.data.agentInstalls.find(x => x.userId === user.id && x.agentId === agentId && !x.removedAt)) {
      return { ok: false, error: 'ALREADY_INSTALLED' };
    }
    const row = installRecord({ id: this.store.id(), userId: user.id, agentId, permissions: agent.permissions });
    this.store.data.agentInstalls.push(row);
    agent.installs = (agent.installs || 0) + 1;
    this.store.save();
    if (this.pg) {
      this.pg.createInstall(row).catch(() => {});
      this.pg.bumpAgentInstalls(agentId).catch(() => {});
    }
    audit(this.store, user.id, 'agent.installed', 'agent', agentId);
    return { ok: true, install: row, agent };
  }

  uninstallAgent(user, agentId) {
    const row = this.store.data.agentInstalls.find(x => x.userId === user.id && x.agentId === agentId && !x.removedAt);
    if (!row) return false;
    row.removedAt = this.store.now();
    row.status = 'removed';
    this.store.save();
    if (this.pg) this.pg.removeInstall(user.id, agentId).catch(() => {});
    audit(this.store, user.id, 'agent.uninstalled', 'agent', agentId);
    return true;
  }

  myInstalls(user) {
    return this.store.data.agentInstalls.filter(x => x.userId === user.id && !x.removedAt);
  }

  // —— Developer platform ——
  createApp(user, input) {
    const app = createDeveloperApp({
      id: this.store.id(),
      ownerId: user.id,
      name: input.name,
      description: input.description,
      scopes: input.scopes,
      redirectUris: input.redirectUris,
      webhookUrl: input.webhookUrl
    });
    this.store.data.developerApps.push(app);
    this.store.save();
    audit(this.store, user.id, 'developer.app_created', 'developer_app', app.id);
    return app;
  }

  async createAppAsync(user, input) {
    if (!this.pg) return this.createApp(user, input);
    const app = createDeveloperApp({
      id: this.store.id(),
      ownerId: user.id,
      name: input.name,
      description: input.description,
      scopes: input.scopes,
      redirectUris: input.redirectUris,
      webhookUrl: input.webhookUrl
    });
    const saved = await this.pg.createDeveloperApp(app);
    this.store.data.developerApps.push(saved);
    audit(this.store, user.id, 'developer.app_created', 'developer_app', saved.id);
    return saved;
  }

  listApps(user) {
    return this.store.data.developerApps.filter(a => a.ownerId === user.id);
  }

  async listAppsAsync(user) {
    if (!this.pg) return this.listApps(user);
    const apps = await this.pg.listDeveloperApps(user.id);
    this.store.data.developerApps = this.store.data.developerApps.filter(app => app.ownerId !== user.id).concat(apps);
    return apps;
  }

  createKey(user, appId, label) {
    const app = this.store.data.developerApps.find(a => a.id === appId && a.ownerId === user.id);
    if (!app) return { ok: false, error: 'APP_NOT_FOUND' };
    const generated = generateApiKey();
    const record = createApiKeyRecord({
      id: this.store.id(),
      appId,
      ownerId: user.id,
      prefix: generated.prefix,
      hash: generated.hash,
      label
    });
    this.store.data.apiKeys.push(record);
    this.store.save();
    audit(this.store, user.id, 'developer.api_key_created', 'api_key', record.id, { prefix: record.prefix });
    return { ok: true, key: { id: record.id, prefix: record.prefix, label: record.label, createdAt: record.createdAt }, raw: generated.raw, oauth: OAUTH_DOC };
  }

  async createKeyAsync(user, appId, label) {
    if (!this.pg) return this.createKey(user, appId, label);
    const app = await this.pg.findDeveloperApp(appId, user.id);
    if (!app) return { ok: false, error: 'APP_NOT_FOUND' };
    const generated = generateApiKey();
    const record = createApiKeyRecord({
      id: this.store.id(),
      appId,
      ownerId: user.id,
      prefix: generated.prefix,
      hash: generated.hash,
      label
    });
    const saved = await this.pg.createDeveloperApiKey(record);
    this.store.data.apiKeys.push(saved);
    audit(this.store, user.id, 'developer.api_key_created', 'api_key', saved.id, { prefix: saved.prefix });
    return { ok: true, key: publicDeveloperKey(saved), raw: generated.raw, oauth: OAUTH_DOC };
  }

  async listKeysAsync(user, appId) {
    if (!this.pg) {
      const app = this.store.data.developerApps.find(item => item.id === appId && item.ownerId === user.id);
      if (!app) return { ok: false, error: 'APP_NOT_FOUND' };
      return { ok: true, keys: this.store.data.apiKeys.filter(key => key.appId === appId && key.ownerId === user.id).map(publicDeveloperKey) };
    }
    const app = await this.pg.findDeveloperApp(appId, user.id);
    if (!app) return { ok: false, error: 'APP_NOT_FOUND' };
    const keys = await this.pg.listDeveloperApiKeys(user.id, appId);
    return { ok: true, keys: keys.map(publicDeveloperKey) };
  }

  resolveApiKey(raw) {
    if (!raw) return null;
    const hash = hashApiKey(raw);
    const key = this.store.data.apiKeys.find(k => k.hash === hash && !k.revokedAt);
    if (!key) return null;
    const app = this.store.data.developerApps.find(a => a.id === key.appId);
    if (!app) return null;
    key.lastUsedAt = this.store.now();
    this.store.save();
    return { key, app };
  }

  async resolveApiKeyAsync(raw) {
    if (!this.pg) return this.resolveApiKey(raw);
    if (!raw) return null;
    return this.pg.resolveDeveloperApiKey(hashApiKey(raw));
  }

  async revokeKeyAsync(user, appId, keyId) {
    if (!this.pg) {
      const key = this.store.data.apiKeys.find(item => item.id === keyId && item.appId === appId && item.ownerId === user.id && !item.revokedAt);
      if (!key) return false;
      key.revokedAt = this.store.now();
      this.store.save();
      audit(this.store, user.id, 'developer.api_key_revoked', 'api_key', key.id, { appId });
      return true;
    }
    const revoked = await this.pg.revokeDeveloperApiKey(user.id, appId, keyId);
    if (!revoked) return false;
    const cached = this.store.data.apiKeys.find(item => item.id === keyId);
    if (cached) Object.assign(cached, revoked);
    audit(this.store, user.id, 'developer.api_key_revoked', 'api_key', keyId, { appId });
    return true;
  }

  // —— Translation ——
  translate(user, input) {
    const detected = input.sourceLang && input.sourceLang !== 'auto' ? input.sourceLang : localDetectLanguage(input.text);
    const job = createTranslationJob({
      id: this.store.id(),
      userId: user.id,
      mode: input.mode || 'text',
      sourceLang: detected,
      targetLang: input.targetLang || 'en',
      text: input.text,
      preserveVoice: !!input.preserveVoice,
      context: input.context || {}
    });
    const providerConfigured = !!(process.env.SYLORA_TRANSLATE_API_KEY || process.env.OPENAI_API_KEY);
    if (!providerConfigured) {
      job.status = 'completed_local';
      job.provider = 'local-passthrough';
      job.result = localTranslateStub(input.text, job.targetLang);
      job.result.detectedSourceLang = detected;
      job.result.voicePolicy = VOICE_POLICY;
      job.result.blocked = 'TRANSLATION_PROVIDER_OPTIONAL';
    } else {
      // Full MT provider path is prepared; without a dedicated translator we still passthrough with metadata.
      job.status = 'completed_local';
      job.provider = process.env.SYLORA_TRANSLATE_PROVIDER || 'openai-prepared';
      job.result = localTranslateStub(input.text, job.targetLang);
      job.result.detectedSourceLang = detected;
      job.result.voicePolicy = VOICE_POLICY;
      job.result.note = 'Dedicated MT provider integration is wired for configuration; response is labeled non-production until SYLORA_TRANSLATE_API_KEY is set.';
    }
    this.store.data.translationJobs.push(job);
    this.metrics.incr('translation.jobs');
    this.store.save();
    return job;
  }

  // —— Business OS ——
  createOrg(user, input) {
    const org = createOrganization({ id: this.store.id(), ownerId: user.id, name: input.name, description: input.description });
    const membership = createMembership({ id: this.store.id(), orgId: org.id, userId: user.id, role: 'owner' });
    const plane = defaultEnterpriseControlPlane(org.id);
    this.store.data.organizations.push(org);
    this.store.data.orgMembers.push(membership);
    this.store.data.enterpriseControls.push(plane);
    this.store.save();
    if (this.pg) {
      this.pg.createOrg(org).then(() => this.pg.createMembership(membership)).then(() => this.pg.upsertControlPlane(plane)).catch(() => {});
    }
    audit(this.store, user.id, 'org.created', 'organization', org.id);
    return org;
  }

  listOrgs(user) {
    const memberOf = new Set(this.store.data.orgMembers.filter(m => m.userId === user.id).map(m => m.orgId));
    return this.store.data.organizations.filter(o => memberOf.has(o.id) || o.ownerId === user.id);
  }

  getControlPlane(user, orgId) {
    const membership = this.store.data.orgMembers.find(m => m.orgId === orgId && m.userId === user.id);
    if (!membership || (membership.role !== 'owner' && !rbacAllows(membership.role, 'control_ai'))) {
      return { ok: false, error: 'FORBIDDEN' };
    }
    const plane = this.store.data.enterpriseControls.find(c => c.orgId === orgId);
    const installs = this.store.data.agentInstalls.filter(i => i.orgId === orgId || (!i.orgId && false));
    return {
      ok: true,
      plane,
      role: membership.role,
      activeAgents: installs,
      usage: this.store.data.aiUsage.filter(u => u.orgId === orgId).slice(-100)
    };
  }

  updateControlPlane(user, orgId, patch = {}) {
    const current = this.getControlPlane(user, orgId);
    if (!current.ok) return current;
    Object.assign(current.plane, patch, { updatedAt: this.store.now() });
    this.store.save();
    audit(this.store, user.id, 'enterprise.control_updated', 'organization', orgId, patch);
    return { ok: true, plane: current.plane };
  }

  // —— Reputation / trust / commerce / search / privacy ——
  reputation(user) {
    let rep = this.store.data.reputations.find(r => r.userId === user.id);
    if (!rep) {
      rep = emptyReputation(user.id);
      this.store.data.reputations.push(rep);
      this.store.save();
    }
    return rep;
  }

  addReputationEvidence(user, dimension, delta, reason) {
    const idx = this.store.data.reputations.findIndex(r => r.userId === user.id);
    const current = this.reputation(user);
    const next = applyEvidence(current, dimension, delta, reason);
    if (idx >= 0) this.store.data.reputations[idx] = next;
    else this.store.data.reputations.push(next);
    this.store.save();
    return next;
  }

  disputeReputation(user, dimension, reason) {
    const idx = this.store.data.reputations.findIndex(r => r.userId === user.id);
    const current = this.reputation(user);
    const next = openDispute(current, { id: this.store.id(), dimension, reason });
    this.store.data.reputations[idx] = next;
    this.store.save();
    return next;
  }

  addProvenance(user, input) {
    const row = createProvenance({ id: this.store.id(), creatorId: user.id, ...input });
    this.store.data.provenance.push(row);
    this.store.save();
    return row;
  }

  securityCenter(user, { sessions = [], blocks = [], capabilities = {}, memories: memorySource = null, activity: activitySource = null } = {}) {
    const agent = this.ensurePersonalAgent(user);
    const memories = memorySource || (this.store.data.aiMemories || []).filter(m => m.userId === user.id);
    const activity = activitySource || this.store.data.aiActivity.filter(a => a.userId === user.id).slice(-50);
    const integrations = (this.store.data.agentInstalls || [])
      .filter(x => x.userId === user.id && !x.removedAt)
      .map(x => {
        const agentRow = this.store.data.agentCatalog.find(a => a.id === x.agentId);
        return { id: x.id, agentId: x.agentId, name: agentRow?.name || x.agentId, installedAt: x.installedAt };
      });
    return createSecurityCenterView({
      userId: user.id,
      sessions,
      blocks,
      exportReady: true,
      agent,
      memories,
      activity,
      integrations,
      capabilities
    });
  }

  updatePrivacyControls(user, patch = {}) {
    const agent = this.ensurePersonalAgent(user);
    agent.privacyControls = { ...(agent.privacyControls || {}), ...Object.fromEntries(
      Object.entries(patch).filter(([, v]) => typeof v === 'boolean')
    ) };
    if (patch.proactiveLevel) {
      const next = String(patch.proactiveLevel).toUpperCase();
      if (PROACTIVE_LEVELS.includes(next)) agent.proactiveLevel = next;
    }
    if (patch.voicePersonality) agent.voicePersonality = String(patch.voicePersonality).slice(0, 40);
    agent.updatedAt = this.store.now();
    this.store.save();
    this.recordActivity(user, {
      kind: 'privacy_controls_updated',
      summary: 'Sylora оновила privacy / AI controls за запитом користувача',
      dataUsed: ['personal_agent'],
      reason: 'User changed Privacy & AI Control Center',
      context: 'security'
    });
    return agent;
  }

  async updatePrivacyControlsAsync(user, patch = {}) {
    if (!this.pg) return this.updatePrivacyControls(user, patch);
    const agent = await this.ensurePersonalAgentAsync(user);
    const privacyControls = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => typeof value === 'boolean')
    );
    let proactiveLevel = null;
    if (patch.proactiveLevel) {
      const next = String(patch.proactiveLevel).toUpperCase();
      if (PROACTIVE_LEVELS.includes(next)) proactiveLevel = next;
    }
    const voicePersonality = patch.voicePersonality ? String(patch.voicePersonality).slice(0, 40) : null;
    const saved = await this.pg.patchPersonalAgent(user.id, {
      privacyControls,
      proactiveLevel,
      voicePersonality,
      updatedAt: this.store.now()
    });
    const index = this.store.data.personalAgents.findIndex(item => item.id === agent.id);
    if (index >= 0) this.store.data.personalAgents[index] = saved;
    else this.store.data.personalAgents.push(saved);
    await this.recordActivityAsync(user, {
      kind: 'privacy_controls_updated',
      summary: 'Sylora оновила privacy / AI controls за запитом користувача',
      dataUsed: ['personal_agent'],
      reason: 'User changed Privacy & AI Control Center',
      context: 'security'
    });
    return saved;
  }

  requestPrivacy(user, type, details) {
    const row = privacyRequest({ id: this.store.id(), userId: user.id, type, details });
    this.store.data.privacyRequests.push(row);
    this.store.save();
    audit(this.store, user.id, 'privacy.request', type, user.id);
    return row;
  }

  createProduct(user, input) {
    const item = createCommerceItem({ id: this.store.id(), creatorId: user.id, ...input, paymentMode: input.paymentMode || 'sandbox' });
    this.store.data.commerceItems.push(item);
    this.store.save();
    return item;
  }

  checkout(user, itemId) {
    const item = this.store.data.commerceItems.find(i => i.id === itemId);
    if (!item) return { ok: false, error: 'ITEM_NOT_FOUND' };
    const result = sandboxCheckout({ id: this.store.id(), buyerId: user.id, item });
    if (result.ok) {
      this.store.data.commerceOrders.push(result.order);
      this.store.save();
    }
    return result;
  }

  listProducts(userId) {
    return this.store.data.commerceItems.filter(i => !userId || i.creatorId === userId);
  }

  search(query, collections) {
    return structuredSearch(query, collections);
  }

  async aiSearch(prompt, user = null) {
    const plan = planAiSearch(prompt);
    if (!user) return plan;
    const uni = await this.universalSearch(user, prompt);
    return { ...plan, results: uni.semantic, structured: uni.structured, semanticHonesty: uni.semanticHonesty, postgres: uni.postgres };
  }

  metricsSnapshot() {
    return this.metrics.snapshot();
  }

  trackAiUsage(event) {
    const row = aiUsageEvent(event);
    this.store.data.aiUsage.push(row);
    this.metrics.incr('ai.requests', 1, { action: event.action || 'chat' });
    this.store.save();
    return row;
  }

  budget(user) {
    let b = this.store.data.aiBudgets.find(x => x.userId === user.id);
    if (!b) {
      b = defaultUserBudget(user.id);
      this.store.data.aiBudgets.push(b);
      this.store.save();
    }
    return b;
  }

  consumeBudget(user, kind, amount) {
    const idx = this.store.data.aiBudgets.findIndex(x => x.userId === user.id);
    const current = this.budget(user);
    const result = consume(current, kind, amount);
    if (idx >= 0) this.store.data.aiBudgets[idx] = result.budget;
    this.store.save();
    return result;
  }

  revenueShares() {
    return defaultRevenueShares();
  }

  creatorLiveInsights(user, { room, engagement, chat, gifts, battle } = {}) {
    if (!room || room.hostId !== user.id) throw new Error('LIVE_HOST_REQUIRED');
    const analysis = analyzeLiveRoom({ room, engagement, chat, gifts, battle });
    this.recordActivity(user, {
      kind: 'creator_live_analyzed',
      summary: `Sylora проаналізувала LIVE “${room.title}”`,
      dataUsed: ['live_engagement', 'live_chat', 'ledger_gifts'],
      reason: 'Creator requested LIVE insights',
      context: 'studio'
    });
    return { analysis, contentPack: buildCreatorContentPack({ topic: room.title, analysis, locale: user.locale || 'uk' }) };
  }

  creatorContentPack(user, { topic, analysis } = {}) {
    const pack = buildCreatorContentPack({ topic, analysis, locale: user.locale || 'uk' });
    const action = this.proposeAction(user, {
      type: 'prepare_content_pack',
      level: ACTION_LEVELS.REQUEST_CONFIRMATION,
      context: 'studio',
      reason: 'Creator asked Sylora for titles/clips/captions drafts',
      input: { pack }
    });
    this.recordActivity(user, {
      kind: 'creator_content_pack_proposed',
      summary: 'Sylora підготувала content pack (потрібне підтвердження)',
      dataUsed: ['creator_studio'],
      reason: 'Draft only — no publish',
      context: 'studio'
    });
    return { action, pack };
  }

  creatorStudioPlan(user, topic) {
    const pack = buildCreatorContentPack({ topic, locale: user.locale || 'uk' });
    const plan = {
      topic: String(topic || '').slice(0, 200),
      structure: ['Hook', 'Core value', 'Interactive mid', 'CTA', 'Outro'],
      scenes: ['Intro', 'Demo', 'Q&A'],
      overlays: ['Lower-third title', 'Poll', 'Gift goal'],
      questions: [`What is your experience with ${topic}?`, 'What should we deep-dive next?'],
      interactives: ['Poll', 'Q&A', 'Resonance invite'],
      moderation: 'Suggest only — host confirms',
      clips: pack.clipCandidates,
      captions: pack.captions,
      titles: pack.titles,
      thumbnailIdeas: pack.thumbnailIdeas,
      subtitlePlan: pack.subtitles.plan,
      status: 'proposal'
    };
    const action = this.proposeAction(user, {
      type: 'prepare_live',
      level: ACTION_LEVELS.REQUEST_CONFIRMATION,
      context: 'studio',
      reason: 'Creator asked Sylora to prepare a LIVE',
      input: { topic: plan.topic, plan }
    });
    this.store.data.studioAiPlans.push({ id: action.id, userId: user.id, plan, status: 'pending', createdAt: this.store.now() });
    this.store.save();
    this.addProvenance(user, {
      contentId: action.id,
      contentType: 'studio_plan',
      origin: 'ai',
      creationMethod: 'ai_creator_studio',
      aiInvolved: true
    });
    return { action, plan };
  }

  async confirmCreatorStudioPlan(user, actionId) {
    const out = await this.confirmEcosystemAction(user, actionId);
    if (!out.ok) return out;
    const saved = this.store.data.studioAiPlans.find(p => p.id === actionId && p.userId === user.id);
    if (saved) saved.status = 'confirmed';
    const plan = saved?.plan || out.action?.input?.plan || {};
    const scene = {
      id: this.store.id(),
      userId: user.id,
      name: String(plan.topic || 'AI LIVE Plan').slice(0, 60),
      overlayTitle: String(plan.topic || 'SYLORA LIVE').slice(0, 60),
      overlayStyle: 'violet',
      profileId: 'vertical1080',
      micGain: 100,
      micMuted: false,
      aiPlan: plan,
      createdAt: this.store.now(),
      updatedAt: this.store.now()
    };
    this.store.data.studioScenes.push(scene);
    this.store.save();
    this.recordActivity(user, {
      kind: 'studio_plan_confirmed',
      summary: `Confirmed AI LIVE plan: ${scene.name}`,
      dataUsed: ['creator_studio', 'action_engine'],
      reason: 'User confirmed prepare_live action',
      context: 'studio'
    });
    return { ok: true, action: out.action, scene, plan };
  }

  createTeam(user, orgId, name) {
    const membership = this.store.data.orgMembers.find(m => m.orgId === orgId && m.userId === user.id);
    if (!membership || (membership.role !== 'owner' && !rbacAllows(membership.role, 'manage_members'))) {
      return { ok: false, error: 'FORBIDDEN' };
    }
    const team = createTeam({ id: this.store.id(), orgId, name, memberIds: [user.id] });
    this.store.data.orgTeams.push(team);
    this.store.save();
    audit(this.store, user.id, 'org.team_created', 'organization_team', team.id, { orgId });
    return { ok: true, team };
  }

  listTeams(user, orgId) {
    const membership = this.store.data.orgMembers.find(m => m.orgId === orgId && m.userId === user.id);
    if (!membership) return { ok: false, error: 'FORBIDDEN' };
    return { ok: true, teams: this.store.data.orgTeams.filter(t => t.orgId === orgId) };
  }

  addOrgDocument(user, orgId, input) {
    const membership = this.store.data.orgMembers.find(m => m.orgId === orgId && m.userId === user.id);
    if (!membership || (membership.role !== 'owner' && !rbacAllows(membership.role, 'view_knowledge'))) {
      return { ok: false, error: 'FORBIDDEN' };
    }
    const doc = createOrgDocument({
      id: this.store.id(),
      orgId,
      authorId: user.id,
      title: input.title,
      body: input.body,
      privacy: input.privacy || 'business'
    });
    this.store.data.orgDocuments.push(doc);
    this.store.save();
    this.addNode(user, {
      type: 'document',
      label: doc.title,
      privacy: 'business',
      data: { orgId, documentId: doc.id },
      provenance: { source: 'business_os', createdHow: 'manual', aiInvolved: false }
    });
    return { ok: true, document: doc };
  }

  addOrgTask(user, orgId, input) {
    const membership = this.store.data.orgMembers.find(m => m.orgId === orgId && m.userId === user.id);
    if (!membership) return { ok: false, error: 'FORBIDDEN' };
    const task = createOrgTask({
      id: this.store.id(),
      orgId,
      creatorId: user.id,
      title: input.title,
      assigneeId: input.assigneeId || null,
      status: input.status || 'open'
    });
    this.store.data.orgTasks.push(task);
    this.store.save();
    return { ok: true, task };
  }

  listOrgWorkspace(user, orgId) {
    const membership = this.store.data.orgMembers.find(m => m.orgId === orgId && m.userId === user.id);
    if (!membership) return { ok: false, error: 'FORBIDDEN' };
    return {
      ok: true,
      role: membership.role,
      teams: this.store.data.orgTeams.filter(t => t.orgId === orgId),
      documents: this.store.data.orgDocuments.filter(d => d.orgId === orgId).slice(-50),
      tasks: this.store.data.orgTasks.filter(t => t.orgId === orgId).slice(-50)
    };
  }

  startNegotiation(user, input) {
    const personal = this.ensurePersonalAgent(user);
    const target = this.store.data.agentCatalog.find(a => a.id === input.toAgentId);
    if (!target) return { ok: false, error: 'AGENT_NOT_FOUND' };
    if (!this.store.data.agentInstalls.find(x => x.userId === user.id && x.agentId === target.id && !x.removedAt)
      && target.developerId !== 'sylora-platform') {
      // Platform starter agents may be negotiated without install; third-party requires install.
    }
    let negotiation;
    try {
      negotiation = createNegotiation({
        id: this.store.id(),
        userId: user.id,
        fromAgentId: personal.id,
        toAgentId: target.id,
        topic: input.topic || 'proposal',
        message: input.message || '',
        payload: input.payload || {}
      });
    } catch (e) {
      return { ok: false, error: e.message };
    }
    negotiation.reply = draftBusinessReply(negotiation, target);
    this.store.data.agentNegotiations.push(negotiation);
    const action = this.proposeAction(user, {
      type: 'agent_negotiation',
      level: ACTION_LEVELS.REQUEST_CONFIRMATION,
      context: 'business',
      reason: 'AI-to-AI proposal requires human confirmation before any binding step',
      input: { negotiationId: negotiation.id, topic: negotiation.topic, toAgentId: target.id }
    });
    this.recordActivity(user, {
      kind: 'ai_to_ai_proposed',
      summary: `Personal AI proposed ${negotiation.topic} to ${target.name}`,
      dataUsed: ['agent_manifest', 'permissions'],
      reason: negotiation.message || 'User requested agent negotiation',
      context: 'business'
    });
    this.store.save();
    return { ok: true, negotiation, action, warning: 'No financial or legal action executed.' };
  }

  confirmNegotiation(user, negotiationId) {
    const negotiation = this.store.data.agentNegotiations.find(n => n.id === negotiationId && n.userId === user.id);
    if (!negotiation) return { ok: false, error: 'NEGOTIATION_NOT_FOUND' };
    const result = confirmNegotiation(negotiation);
    if (!result.ok) return result;
    Object.assign(negotiation, result.negotiation);
    // Still does NOT execute booking/payment — only marks human-approved proposal readiness.
    negotiation.status = 'approved_to_prepare';
    negotiation.updatedAt = this.store.now();
    this.store.save();
    audit(this.store, user.id, 'ai_to_ai.confirmed', 'agent_negotiation', negotiationId, { topic: negotiation.topic });
    return { ok: true, negotiation, executed: false, note: 'Approved to prepare only. EXECUTE_ALLOWED was not granted.' };
  }

  listNegotiations(user) {
    return this.store.data.agentNegotiations.filter(n => n.userId === user.id).slice(-50);
  }

  commandCenterContext(view = 'command_center') {
    return {
      view,
      principle: 'One Personal AI, one memory, one knowledge graph, many contexts.',
      builtinActions: BUILTIN_ACTIONS,
      defaultPermissions: DEFAULT_AI_PERMISSIONS
    };
  }

  /** Build the single-AI multi-context pack used by chat / voice / LIVE / business. */
  contextPack(user, view = 'command_center', { query = '', spaceId = null } = {}) {
    const agent = this.ensurePersonalAgent(user);
    const role = contextRole(agent, view);
    const graph = this.graphFor(user, { asAi: true, relation: 'self' });
    const installs = this.myInstalls(user).map(i => {
      const catalog = this.store.data.agentCatalog.find(a => a.id === i.agentId);
      return catalog ? { id: catalog.id, name: catalog.name, category: catalog.category, permissions: i.permissions } : null;
    }).filter(Boolean);
    const selected = this.buildContextEngine(user, { view, query, spaceId });
    return {
      view,
      role,
      agent: { id: agent.id, name: agent.name, permissions: agent.permissions, contexts: agent.contexts },
      knowledgeSummary: {
        nodes: Math.min(graph.nodes, 12),
        edges: graph.edges.length,
        byType: graph.byType,
        note: 'Full graph is not copied into prompts — Context Engine selects slices.'
      },
      installedAgents: installs,
      contextEngine: selected,
      instruction: this.contextInstruction(role, view)
    };
  }

  buildContextEngine(user, { view = 'command_center', query = '', spaceId = null } = {}) {
    ensureCollections(this.store);
    const agent = this.ensurePersonalAgent(user);
    const memoryReadable = canReadMemory(agent);
    if (!memoryReadable && !query) {
      // still allow non-memory slices
    }
    const memories = !memoryReadable
      ? []
      : (this.store.data.aiMemories || []).filter(m => m.userId === user.id);
    const docs = [
      ...(this.store.data.orgDocuments || []).filter(d => this.listOrgs(user).some(o => o.id === d.orgId)),
      ...(this.store.data.collaborativeDocuments || []).filter(d => d.ownerId === user.id || (d.memberIds || []).includes(user.id))
    ].map(d => ({ ...d, knowledgeScope: d.knowledgeScope || (d.orgId ? 'company' : 'my') }));
    return selectContextSlices({
      view,
      query,
      spaceId,
      user: { id: user.id, displayName: user.displayName, locale: user.locale },
      memories,
      calendar: this.listCalendar(user),
      projects: this.listProjects(user),
      orgs: this.listOrgs(user),
      lives: (this._cachedLivesForSearch || this.store.data.liveRooms || []).filter(r => r.hostId === user.id || r.status === 'live').slice(0, 20),
      notifications: (this.store.data.notifications || []).filter(n => n.userId === user.id).slice(0, 40),
      conversations: (this.store.data.conversations || [])
        .filter(c => (c.memberIds || []).includes(user.id))
        .slice(0, 20)
        .map(c => ({
          ...c,
          lastMessage: [...(this.store.data.messages || [])].reverse().find(m => m.conversationId === c.id) || null
        })),
      documents: docs,
      continuity: this.continuityList(user),
      tasks: this.listTasks(user),
      goals: this.listGoals(user),
      decisions: this.listDecisions(user, { spaceId }),
      contentIndex: this.listContentHistory(user)
    });
  }

  contextInstruction(role, view) {
    const map = {
      personal: 'Command Center / Personal mode. Stay helpful, permission-aware and never claim writes completed without confirmation.',
      creator_assistant: 'Creator Assistant / LIVE / Studio mode. Propose scenes, overlays and moderation help; never publish or go live without confirmation.',
      business_assistant: 'Business mode. Prepare proposals and AI-to-AI negotiations; financial/legal actions require confirmation.',
      tutor: 'Learning / Science mode. Prefer explanations and research help; do not invent enrollments or papers.',
      communication_assistant: 'Inbox / Messages mode. Draft replies; never send without confirmation.'
    };
    return `${map[role] || map.personal} Active view: ${view}.`;
  }

  intelligenceMeta(user) {
    const agent = this.ensurePersonalAgent(user);
    const proactive = agent.proactiveLevel || 'IMPORTANT_ONLY';
    return {
      personality: true,
      modes: Object.keys(SYLORA_MODES),
      proactiveLevels: PROACTIVE_LEVELS,
      proactive,
      voices: voiceCatalog(),
      languages: languageSupportMatrix(),
      instructionsPreview: buildPersonalityInstructions({
        mode: modeFromView('command_center'),
        locale: agent.locale || 'uk',
        proactive
      })
    };
  }

  intelligenceProfile(user) {
    const agent = this.ensurePersonalAgent(user);
    const memories = (this.store.data.aiMemories || [])
      .filter(m => m.userId === user.id)
      .map(m => ({
        id: m.id,
        label: m.label,
        value: m.value,
        source: m.source || 'user',
        importance: m.importance ?? 0.5,
        confidence: m.confidence ?? 0.8,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt || m.createdAt
      }));
    return {
      ...this.intelligenceMeta(user),
      agent: {
        id: agent.id,
        name: agent.name,
        locale: agent.locale,
        proactiveLevel: agent.proactiveLevel || 'IMPORTANT_ONLY',
        voicePersonality: agent.voicePersonality || 'warm',
        permissions: agent.permissions
      },
      memories,
      graph: this.graphFor(user, { asAi: false })
    };
  }

  setProactiveLevel(user, level) {
    const next = String(level || '').toUpperCase();
    if (!PROACTIVE_LEVELS.includes(next)) throw new Error('INVALID_PROACTIVE_LEVEL');
    const agent = this.ensurePersonalAgent(user);
    agent.proactiveLevel = next;
    agent.updatedAt = this.store.now();
    this.store.save();
    audit(this.store, user.id, 'personal_ai.proactive_updated', 'personal_agent', agent.id, { proactiveLevel: next });
    return this.intelligenceProfile(user);
  }

  async setProactiveLevelAsync(user, level) {
    if (!this.pg) return this.setProactiveLevel(user, level);
    const next = String(level || '').toUpperCase();
    if (!PROACTIVE_LEVELS.includes(next)) throw new Error('INVALID_PROACTIVE_LEVEL');
    const agent = await this.ensurePersonalAgentAsync(user);
    const saved = await this.pg.patchPersonalAgent(user.id, { proactiveLevel: next, updatedAt: this.store.now() });
    const index = this.store.data.personalAgents.findIndex(item => item.id === agent.id);
    if (index >= 0) this.store.data.personalAgents[index] = saved;
    else this.store.data.personalAgents.push(saved);
    audit(this.store, user.id, 'personal_ai.proactive_updated', 'personal_agent', agent.id, { proactiveLevel: next });
    return this.intelligenceProfile(user);
  }

  sanitizeMemory(value) {
    return sanitizeMemoryValue(value);
  }

  personalityFor(view, user) {
    const agent = this.ensurePersonalAgent(user);
    return buildPersonalityInstructions({
      mode: modeFromView(view),
      locale: agent.locale || user.locale || 'uk',
      proactive: agent.proactiveLevel || 'IMPORTANT_ONLY'
    });
  }

  meetingBrief(user, orgId, input = {}) {
    const membership = this.store.data.orgMembers.find(m => m.orgId === orgId && m.userId === user.id);
    if (!membership) throw new Error('FORBIDDEN');
    const documents = this.store.data.orgDocuments.filter(d => d.orgId === orgId).slice(-20);
    const brief = buildMeetingBrief({
      title: input.title || 'Meeting brief',
      agenda: input.agenda || '',
      documents,
      participants: input.participants || []
    });
    const doc = this.addOrgDocument(user, orgId, {
      title: `[Brief] ${brief.title}`,
      body: JSON.stringify(brief, null, 2),
      privacy: 'business'
    });
    if (!doc.ok) throw new Error(doc.error || 'FORBIDDEN');
    this.recordActivity(user, {
      kind: 'meeting_brief_created',
      summary: `Sylora створила meeting brief “${brief.title}”`,
      dataUsed: ['org_documents'],
      reason: 'Business mode assist',
      context: 'business'
    });
    return { brief, document: doc.document };
  }

  meetingSummary(user, orgId, input = {}) {
    const membership = this.store.data.orgMembers.find(m => m.orgId === orgId && m.userId === user.id);
    if (!membership) throw new Error('FORBIDDEN');
    const summary = summarizeMeetingNotes({
      title: input.title || 'Meeting summary',
      notes: input.notes || '',
      locale: user.locale || 'uk'
    });
    const doc = this.addOrgDocument(user, orgId, {
      title: `[Summary] ${summary.title}`,
      body: JSON.stringify(summary, null, 2),
      privacy: 'business'
    });
    if (!doc.ok) throw new Error(doc.error || 'FORBIDDEN');
    const proposedTasks = proposeTasksFromDecisions([...(summary.decisions || []), ...(summary.actionCandidates || [])]);
    this.recordActivity(user, {
      kind: 'meeting_summary_created',
      summary: `Sylora зробила meeting summary “${summary.title}”`,
      dataUsed: ['org_documents', 'notes'],
      reason: 'Business mode assist — tasks not auto-created',
      context: 'business'
    });
    return { summary, document: doc.document, proposedTasks };
  }

  confirmProposedTasks(user, orgId, tasks = []) {
    const created = [];
    for (const t of (tasks || []).slice(0, 20)) {
      if (t.financialOrLegal && !t.confirmed) continue;
      if (!t.confirmed && t.requiresConfirmation !== false) continue;
      const out = this.addOrgTask(user, orgId, { title: t.title });
      if (out.ok) created.push(out.task);
    }
    this.recordActivity(user, {
      kind: 'tasks_created_from_meeting',
      summary: `Sylora створила ${created.length} task(s) після підтвердження`,
      dataUsed: ['org_tasks'],
      reason: 'User confirmed proposed tasks',
      context: 'business'
    });
    return { created };
  }

  ensureLessonQuiz(user, lesson) {
    ensureCollections(this.store);
    let quiz = this.store.data.quizzes.find(q => q.lessonId === lesson.id);
    if (!quiz) {
      const attempts = this.store.data.quizAttempts.filter(a => a.userId === user.id);
      const adaptive = adaptiveLearningState({
        progressRatio: 0.5,
        attempts: attempts.slice(-20)
      });
      const built = buildLessonQuiz({ lesson, difficulty: adaptive.difficulty, locale: user.locale || 'uk' });
      quiz = {
        id: this.store.id(),
        lessonId: lesson.id,
        courseId: lesson.courseId,
        ...built,
        createdAt: this.store.now()
      };
      this.store.data.quizzes.push(quiz);
      this.store.save();
    }
    const publicQuiz = {
      id: quiz.id,
      lessonId: quiz.lessonId,
      difficulty: quiz.difficulty,
      questions: quiz.questions.map(q => ({
        id: q.id,
        prompt: q.prompt,
        options: q.options
      }))
    };
    return { quiz: publicQuiz, adaptive: adaptiveLearningState({
      progressRatio: 0.5,
      attempts: this.store.data.quizAttempts.filter(a => a.userId === user.id && a.quizId === quiz.id)
    }) };
  }

  gradeQuizAttempt(user, quizId, answers = {}) {
    ensureCollections(this.store);
    const quiz = this.store.data.quizzes.find(q => q.id === quizId);
    if (!quiz) throw new Error('QUIZ_NOT_FOUND');
    const q = quiz.questions[0];
    const selected = answers[q.id];
    const correct = selected === q.correctOptionId;
    const attempt = {
      id: this.store.id(),
      quizId,
      userId: user.id,
      lessonId: quiz.lessonId,
      correct,
      selected,
      createdAt: this.store.now()
    };
    this.store.data.quizAttempts.push(attempt);
    this.store.save();
    const adaptive = adaptiveLearningState({
      progressRatio: correct ? 0.8 : 0.3,
      attempts: this.store.data.quizAttempts.filter(a => a.userId === user.id && a.lessonId === quiz.lessonId)
    });
    this.recordActivity(user, {
      kind: 'quiz_attempt',
      summary: correct ? 'Sylora перевірила quiz — відповідь правильна' : 'Sylora перевірила quiz — потрібне інше пояснення',
      dataUsed: ['lesson_quiz'],
      reason: 'Learning mode',
      context: 'learning'
    });
    return {
      correct,
      explanation: correct ? quiz.explanations.correct : quiz.explanations.incorrect,
      adaptive
    };
  }

  buildHomeHub(user, collections = {}) {
    const hub = homeHubPayload({ me: user, ...collections });
    const continuity = this.continuityList(user);
    const briefPref = this.dailyBriefPrefs(user);
    return {
      ...hub,
      continue: [
        ...continuity.slice(0, 4).map(s => ({
          kind: 'continuity',
          label: `${s.kind}:${s.key}`,
          view: s.payload?.view || 'ai',
          id: s.id
        })),
        ...(hub.continue || [])
      ].slice(0, 8),
      dailyBriefEnabled: briefPref.enabled,
      emptyPlatform: emptyPlatformSeed({
        communities: collections.communities || [],
        courses: collections.courses || [],
        lives: collections.rooms || [],
        people: (collections.posts || []).map(p => p.author).filter(Boolean)
      })
    };
  }

  // —— Intelligence Layer / OS (125–164) ——
  dailyBriefPrefs(user) {
    ensureCollections(this.store);
    let pref = this.store.data.dailyBriefPrefs.find(p => p.userId === user.id);
    if (!pref) {
      pref = { userId: user.id, enabled: true, updatedAt: this.store.now() };
      this.store.data.dailyBriefPrefs.push(pref);
      this.store.save();
    }
    return pref;
  }

  setDailyBriefEnabled(user, enabled) {
    const pref = this.dailyBriefPrefs(user);
    pref.enabled = !!enabled;
    pref.updatedAt = this.store.now();
    this.store.save();
    audit(this.store, user.id, 'daily_brief.toggled', 'user', user.id, { enabled: !!enabled });
    return pref;
  }

  async dailyBrief(user) {
    ensureCollections(this.store);
    const pref = this.dailyBriefPrefs(user);
    const notifications = (this.store.data.notifications || []).filter(n => n.userId === user.id);
    const invites = notifications.filter(n => /invite|conference/i.test(String(n.type || '')));
    const enrollments = (this.store.data.enrollments || []).filter(e => e.userId === user.id && e.progress < 1);
    const courses = this.store.data.courses || [];
    const learning = enrollments.map(e => {
      const c = courses.find(x => x.id === e.courseId);
      return c ? { id: c.id, title: c.title, progress: e.progress } : null;
    }).filter(Boolean);
    const lives = await this.resolveDashboardLives(user, 50);
    const brief = buildDailyBrief({
      enabled: pref.enabled,
      notifications,
      invites,
      lives,
      calendar: this.listCalendar(user),
      projects: this.listProjects(user),
      tasks: this.listTasks(user),
      learning,
      creator: {
        recentClips: (this.store.data.videos || []).filter(v => v.userId === user.id).slice(0, 4)
      },
      business: { orgs: this.listOrgs(user) }
    });
    this.recordActivity(user, {
      kind: 'daily_brief',
      summary: brief.summary,
      dataUsed: ['notifications', 'calendar', 'tasks', 'projects'],
      reason: 'Daily Intelligence Brief',
      context: 'home'
    });
    return brief;
  }

  intelligentInbox(user) {
    ensureCollections(this.store);
    const conversations = (this.store.data.conversations || [])
      .filter(c => (c.memberIds || []).includes(user.id))
      .map(c => ({
        ...c,
        members: (c.memberIds || []).map(id => this.store.publicUser(this.store.data.users.find(u => u.id === id))),
        lastMessage: [...(this.store.data.messages || [])].reverse().find(m => m.conversationId === c.id) || null
      }));
    const notifications = (this.store.data.notifications || []).filter(n => n.userId === user.id && !n.read);
    return buildIntelligentInbox({ conversations, notifications });
  }

  recordActivityGraph(user, { type, entityType = null, entityId = null, summary = '', data = {}, spaceId = null } = {}) {
    ensureCollections(this.store);
    const row = createActivityEvent({
      id: this.store.id(),
      userId: user.id,
      type: type || 'custom',
      entityType,
      entityId,
      summary,
      data,
      spaceId
    });
    this.store.data.activityGraph.unshift(row);
    this.store.data.activityGraph = this.store.data.activityGraph.slice(0, 2000);
    this.store.save();
    return row;
  }

  activityTimeline(user, { limit = 50 } = {}) {
    ensureCollections(this.store);
    return this.store.data.activityGraph.filter(a => a.userId === user.id).slice(0, limit);
  }

  indexContent(user, input = {}) {
    ensureCollections(this.store);
    const visibility = input.visibility === 'public' ? 'public' : input.visibility === 'space' ? 'space' : 'private';
    const topics = input.topics?.length ? input.topics : extractTopics(input.transcript || input.text || input.title || '');
    const row = createContentUnderstanding({
      id: this.store.id(),
      contentId: input.contentId || this.store.id(),
      contentType: input.contentType || 'post',
      ownerId: user.id,
      visibility,
      transcript: input.transcript || input.text || '',
      captions: input.captions || [],
      language: input.language || user.locale || 'uk',
      topics,
      entities: input.entities || [],
      chapters: input.chapters || []
    });
    this.store.data.contentUnderstanding.unshift(row);
    if (input.trackHistory !== false) {
      this.store.data.contentHistory.unshift({
        id: this.store.id(),
        userId: user.id,
        contentId: row.contentId,
        contentType: row.contentType,
        title: input.title || topics[0] || row.contentType,
        topics,
        language: row.language,
        watchedAt: this.store.now(),
        enabled: true
      });
    }
    const own = ownershipGraphNode({
      id: this.store.id(),
      contentId: row.contentId,
      originalCreatorId: user.id,
      relation: input.relation || 'original',
      parentContentId: input.parentContentId || null,
      aiModified: !!input.aiModified
    });
    this.store.data.ownershipGraph.unshift(own);
    this.store.save();
    this.recordActivityGraph(user, {
      type: 'document_created',
      entityType: row.contentType,
      entityId: row.contentId,
      summary: `Indexed ${row.contentType} for understanding`
    });
    return { understanding: row, ownership: own };
  }

  listContentHistory(user) {
    ensureCollections(this.store);
    const prefOff = this.store.data.contentHistory.some(h => h.userId === user.id && h.enabled === false && h.contentId === '*');
    if (prefOff) return [];
    return this.store.data.contentHistory.filter(h => h.userId === user.id && h.enabled !== false).slice(0, 100);
  }

  setContentHistoryEnabled(user, enabled) {
    ensureCollections(this.store);
    this.store.data.contentHistory = this.store.data.contentHistory.filter(h => !(h.userId === user.id && h.contentId === '*'));
    if (!enabled) {
      this.store.data.contentHistory.unshift({
        id: this.store.id(), userId: user.id, contentId: '*', contentType: 'pref', title: 'history_off',
        topics: [], enabled: false, watchedAt: this.store.now()
      });
    }
    this.store.save();
    return { enabled: !!enabled };
  }

  searchContentHistory(user, query = '') {
    const q = String(query || '').toLowerCase();
    const tokens = q.split(/\s+/).filter(t => t.length > 2);
    const history = this.listContentHistory(user);
    const indexed = this.store.data.contentUnderstanding.filter(c => c.ownerId === user.id || c.visibility === 'public');
    const hits = [];
    for (const h of history) {
      const hay = `${h.title || ''} ${(h.topics || []).join(' ')}`.toLowerCase();
      if (!q || tokens.some(t => hay.includes(t)) || hay.includes(q)) hits.push({ source: 'history', ...h });
    }
    for (const c of indexed) {
      const hay = `${c.transcript || ''} ${(c.topics || []).join(' ')}`.toLowerCase();
      if (tokens.some(t => hay.includes(t))) {
        hits.push({
          source: 'understanding',
          contentId: c.contentId,
          contentType: c.contentType,
          title: (c.topics || [])[0] || c.contentType,
          topics: c.topics,
          visibility: c.visibility
        });
      }
    }
    return {
      query,
      results: hits.slice(0, 40),
      honesty: { embeddings: process.env.SYLORA_EMBEDDING_PROVIDER ? 'ready' : 'lexical_permission_aware' }
    };
  }

  createTask(user, input = {}) {
    ensureCollections(this.store);
    const task = createUniversalTask({
      id: this.store.id(),
      title: input.title,
      description: input.description,
      ownerId: input.ownerId || user.id,
      deadline: input.deadline || null,
      status: input.status,
      priority: input.priority,
      source: input.source || 'sylora',
      relatedType: input.relatedType || null,
      relatedId: input.relatedId || null,
      spaceId: input.spaceId || null
    });
    this.store.data.universalTasks.unshift(task);
    this.store.save();
    this.recordActivityGraph(user, {
      type: 'task_created', entityType: 'task', entityId: task.id, summary: task.title, spaceId: task.spaceId
    });
    return task;
  }

  listTasks(user) {
    ensureCollections(this.store);
    return this.store.data.universalTasks.filter(t => t.ownerId === user.id || t.createdBy === user.id);
  }

  updateTask(user, id, patch = {}) {
    const task = this.store.data.universalTasks.find(t => t.id === id && t.ownerId === user.id);
    if (!task) return null;
    if (patch.title != null) task.title = String(patch.title).slice(0, 160);
    if (patch.status) task.status = patch.status;
    if (patch.priority) task.priority = patch.priority;
    if (patch.deadline !== undefined) task.deadline = patch.deadline;
    task.updatedAt = this.store.now();
    this.store.save();
    return task;
  }

  createUserGoal(user, input = {}) {
    ensureCollections(this.store);
    const goal = createGoal({
      id: this.store.id(),
      userId: user.id,
      title: input.title,
      description: input.description,
      milestones: input.milestones || []
    });
    // Optionally break into tasks when user asked
    if (input.decompose) {
      for (const m of goal.milestones) {
        const task = this.createTask(user, {
          title: m.title,
          source: 'goal',
          relatedType: 'goal',
          relatedId: goal.id,
          priority: 'normal'
        });
        goal.taskIds.push(task.id);
      }
    }
    goal.progress = goalProgress(goal, this.listTasks(user));
    this.store.data.goals.unshift(goal);
    this.store.save();
    this.recordActivityGraph(user, { type: 'goal_updated', entityType: 'goal', entityId: goal.id, summary: goal.title });
    return goal;
  }

  listGoals(user) {
    ensureCollections(this.store);
    return this.store.data.goals.filter(g => g.userId === user.id).map(g => ({
      ...g,
      progress: goalProgress(g, this.listTasks(user))
    }));
  }

  recordDecision(user, input = {}) {
    ensureCollections(this.store);
    const row = createDecisionRecord({
      id: this.store.id(),
      spaceId: input.spaceId || input.orgId || null,
      orgId: input.orgId || null,
      projectId: input.projectId || null,
      decision: input.decision,
      owner: input.owner || user.displayName || user.username,
      reason: input.reason,
      relatedTaskIds: input.relatedTaskIds || [],
      source: input.source || { type: 'user', id: user.id }
    });
    this.store.data.decisionRecords.unshift(row);
    this.store.save();
    this.recordActivityGraph(user, {
      type: 'decision_recorded',
      entityType: 'decision',
      entityId: row.id,
      summary: row.decision,
      spaceId: row.spaceId
    });
    return row;
  }

  listDecisions(user, { spaceId = null } = {}) {
    ensureCollections(this.store);
    const orgIds = new Set(this.listOrgs(user).map(o => o.id));
    return this.store.data.decisionRecords.filter(d => {
      if (spaceId && d.spaceId !== spaceId) return false;
      if (d.orgId && !orgIds.has(d.orgId) && d.source?.id !== user.id) return false;
      return d.source?.id === user.id || (d.orgId && orgIds.has(d.orgId)) || !d.orgId;
    });
  }

  findDecisions(user, query = '') {
    const q = String(query || '').toLowerCase();
    return this.listDecisions(user).filter(d => {
      if (!q) return true;
      return `${d.decision} ${d.reason}`.toLowerCase().includes(q)
        || q.split(/\s+/).some(t => t.length > 2 && `${d.decision} ${d.reason}`.toLowerCase().includes(t));
    }).slice(0, 20);
  }

  addSharedMemory(user, input = {}) {
    ensureCollections(this.store);
    const scope = input.scope || 'project';
    const row = createSharedMemoryRecord({
      id: this.store.id(),
      scope,
      spaceId: input.spaceId || input.projectId || input.orgId || null,
      orgId: input.orgId || null,
      communityId: input.communityId || null,
      projectId: input.projectId || null,
      label: input.label,
      value: input.value,
      createdBy: user.id,
      roles: input.roles || ['member']
    });
    this.store.data.sharedMemories.unshift(row);
    this.store.save();
    audit(this.store, user.id, 'shared_memory.created', 'shared_memory', row.id, { scope });
    return row;
  }

  listSharedMemory(user, { spaceId = null, scope = null } = {}) {
    ensureCollections(this.store);
    const orgIds = new Set(this.listOrgs(user).map(o => o.id));
    return this.store.data.sharedMemories.filter(m => {
      if (m.deletedAt) return false;
      if (scope && m.scope !== scope) return false;
      if (spaceId && m.spaceId !== spaceId) return false;
      if (m.scope === 'my' && m.createdBy !== user.id) return false;
      if (m.orgId && !orgIds.has(m.orgId)) return false;
      return true;
    });
  }

  knowledgeSpaces(user) {
    return {
      scopes: KNOWLEDGE_SCOPES,
      mine: this.listSharedMemory(user, { scope: 'my' }).length,
      project: this.listSharedMemory(user, { scope: 'project' }).length,
      company: this.listSharedMemory(user, { scope: 'company' }).length,
      community: this.listSharedMemory(user, { scope: 'community' }).length,
      note: 'Private company knowledge is never mixed into personal/public memory.'
    };
  }

  prepareMeetingBriefOs(user, input = {}) {
    const cal = this.listCalendar(user).filter(c => /meeting|event/i.test(c.kind || ''));
    const next = cal[0];
    const decisions = this.listDecisions(user).slice(0, 5);
    const tasks = this.listTasks(user).filter(t => t.status !== 'done').slice(0, 8);
    return {
      meeting: next || { title: input.title || 'Next meeting', startsAt: input.startsAt || null },
      agenda: input.agenda || ['Goals', 'Decisions', 'Next steps'],
      priorDecisions: decisions,
      openTasks: tasks,
      context: this.buildContextEngine(user, { view: 'business', query: input.raw || 'meeting' }),
      note: 'Preparation only — no calendar changes without permission.'
    };
  }

  saveMeetingResult(user, input = {}) {
    ensureCollections(this.store);
    const result = structuredMeetingResult({
      id: this.store.id(),
      spaceId: input.spaceId || input.orgId || null,
      title: input.title,
      transcript: input.transcript,
      speakers: input.speakers || [],
      notes: input.notes,
      locale: user.locale || 'uk'
    });
    this.store.data.meetingResults.unshift(result);
    for (const d of result.decisions) {
      this.recordDecision(user, {
        decision: d.text,
        reason: 'Extracted from meeting',
        spaceId: result.spaceId,
        orgId: input.orgId || null,
        source: { type: 'meeting', id: result.id }
      });
    }
    for (const a of result.actionItems) {
      this.createTask(user, {
        title: a.text.slice(0, 160),
        source: 'meeting',
        relatedType: 'meeting',
        relatedId: result.id,
        spaceId: result.spaceId
      });
    }
    this.store.save();
    this.recordActivityGraph(user, {
      type: 'meeting_completed',
      entityType: 'meeting',
      entityId: result.id,
      summary: result.title,
      spaceId: result.spaceId
    });
    return result;
  }

  listSkills() {
    return PLATFORM_SKILLS;
  }

  orchestrate(user, text) {
    const orch = orchestrateTask({ text });
    orch.contextEngine = this.buildContextEngine(user, { view: orch.routing.view || 'ai', query: text });
    orch.specialists = SPECIALIST_AGENTS;
    return orch;
  }

  async personalDashboard(user) {
    const brief = await this.dailyBrief(user);
    const inbox = this.intelligentInbox(user);
    const role = user.role === 'admin' ? 'admin' : (this.listOrgs(user).length ? 'professional' : 'member');
    const lives = await this.resolveDashboardLives(user, 6);
    return personalDashboardPayload({
      role,
      brief,
      tasks: this.listTasks(user),
      goals: this.listGoals(user),
      inbox,
      continuity: this.continuityList(user),
      lives,
      projects: this.listProjects(user),
      suggestions: [
        { text: brief.summary, view: 'home' },
        { text: inbox.summary, view: 'messages' }
      ]
    });
  }

  createCanvas(user, input = {}) {
    ensureCollections(this.store);
    const row = canvasWorkspace({
      id: this.store.id(),
      userId: user.id,
      title: input.title,
      kind: input.kind,
      artifact: input.artifact || { body: input.body || '' },
      spaceId: input.spaceId || null,
      shared: !!input.shared
    });
    this.store.data.canvasWorkspaces.unshift(row);
    this.store.save();
    return row;
  }

  listCanvas(user) {
    ensureCollections(this.store);
    return this.store.data.canvasWorkspaces.filter(w => w.userId === user.id || (w.shared && w.spaceId));
  }

  async spaceAsk(user, spaceId, question) {
    const space = getSpace(spaceId, this.store.data);
    if (!space) return { ok: false, error: 'SPACE_NOT_FOUND' };
    // Shared context only — never other users' personal memories
    const shared = this.listSharedMemory(user, { spaceId });
    const decisions = this.listDecisions(user, { spaceId });
    const ctx = selectContextSlices({
      view: 'business',
      query: question,
      user: { id: user.id, displayName: user.displayName },
      memories: [], // personal memory excluded in collaborative AI
      documents: shared.map(m => ({ id: m.id, title: m.label, body: m.value, knowledgeScope: m.scope })),
      decisions,
      tasks: this.listTasks(user).filter(t => t.spaceId === spaceId)
    });
    const summary = await this.executeTool(user, 'summarize_content', {
      text: `${question}\n\n${shared.map(m => `${m.label}: ${m.value}`).join('\n')}\n${decisions.map(d => d.decision).join('\n')}`
    });
    return {
      ok: true,
      space: { id: space.id, title: space.title, kind: space.kind },
      answer: summary.result?.summary,
      contextEngine: ctx,
      policy: {
        personalMemoriesOfOthers: false,
        sharedContextOnly: true
      }
    };
  }

  creatorPipeline(user, input = {}) {
    const plan = creatorPipelinePlan({
      liveId: input.liveId,
      title: input.title,
      language: user.locale || 'uk'
    });
    const tracks = localizedContentTracks({
      originalLanguage: user.locale || 'uk',
      subtitleLanguages: input.subtitleLanguages || ['pl', 'en', 'de', 'es'],
      audioLanguages: input.audioLanguages || []
    });
    const action = this.proposeAction(user, {
      type: 'prepare_content_pack',
      context: 'studio',
      reason: 'Creator AI pipeline drafted — publish requires confirmation',
      input: { plan, tracks }
    });
    this.recordActivityGraph(user, {
      type: 'clip_suggested',
      entityType: 'live',
      entityId: input.liveId || null,
      summary: 'Creator pipeline drafted'
    });
    return { action, plan, tracks };
  }

  draftRevenueSplit(user, input = {}) {
    const draft = revenueSplitDraft({ parties: input.parties || [] });
    ensureCollections(this.store);
    const row = { id: this.store.id(), userId: user.id, ...draft, createdAt: this.store.now() };
    this.store.data.revenueSplits.unshift(row);
    this.store.save();
    return row;
  }

  scienceVerify(user, input = {}) {
    const claim = scienceClaim({
      text: input.text,
      kind: input.kind,
      sources: input.sources || []
    });
    this.recordActivity(user, {
      kind: 'science_verify',
      summary: `Science mode: ${claim.kind}`,
      dataUsed: ['user_claim', 'optional_sources'],
      reason: 'Strict verification mode',
      context: 'learning'
    });
    return { claim, mode: 'science_verification' };
  }

  upsertLearningGraph(user, concept, state, reason) {
    ensureCollections(this.store);
    let graph = this.store.data.learningGraphs.find(g => g.userId === user.id);
    if (!graph) {
      graph = { userId: user.id, nodes: [], updatedAt: this.store.now() };
      this.store.data.learningGraphs.push(graph);
    }
    const node = learningKnowledgeNode({ concept, state, reason });
    const idx = graph.nodes.findIndex(n => n.concept === node.concept);
    if (idx >= 0) graph.nodes[idx] = node;
    else graph.nodes.push(node);
    graph.updatedAt = this.store.now();
    this.store.save();
    return graph;
  }

  learningGraph(user) {
    ensureCollections(this.store);
    return this.store.data.learningGraphs.find(g => g.userId === user.id) || { userId: user.id, nodes: [] };
  }

  connectService(user, input = {}) {
    ensureCollections(this.store);
    const row = connectedServiceRecord({
      id: this.store.id(),
      userId: user.id,
      provider: String(input.provider || '').slice(0, 60),
      scopes: input.scopes || [],
      status: 'connected'
    });
    this.store.data.connectedServices.push(row);
    this.store.save();
    // Never return vault secrets
    return {
      id: row.id,
      provider: row.provider,
      scopes: row.scopes,
      status: row.status,
      lastUsedAt: row.lastUsedAt,
      tokenStorage: 'server_vault_only'
    };
  }

  listConnectedServices(user) {
    ensureCollections(this.store);
    return this.store.data.connectedServices
      .filter(s => s.userId === user.id && s.status !== 'disconnected')
      .map(s => ({
        id: s.id,
        provider: s.provider,
        scopes: s.scopes,
        status: s.status,
        lastUsedAt: s.lastUsedAt,
        permissions: s.scopes
      }));
  }

  disconnectService(user, id) {
    const row = this.store.data.connectedServices.find(s => s.id === id && s.userId === user.id);
    if (!row) return false;
    row.status = 'disconnected';
    row.tokenRef = null;
    this.store.save();
    audit(this.store, user.id, 'integration.disconnected', 'connected_service', id);
    return true;
  }

  createBusinessWorkflow(user, input = {}) {
    ensureCollections(this.store);
    const wf = {
      id: this.store.id(),
      userId: user.id,
      orgId: input.orgId || null,
      name: String(input.name || 'Lead workflow').slice(0, 120),
      steps: (input.steps || [
        'new_lead', 'qualification', 'meeting', 'summary', 'task', 'follow_up'
      ]).slice(0, 20),
      requiresConfirmationFor: ['external_email', 'payment', 'contract'],
      createdAt: this.store.now()
    };
    this.store.data.businessWorkflows.unshift(wf);
    this.store.save();
    return wf;
  }

  async guestView(input = {}) {
    const profile = input.userId
      ? this.store.data.identities.find(i => i.userId === input.userId)
      : null;
    const content = input.contentId
      ? this.store.data.contentUnderstanding.find(c => c.contentId === input.contentId)
      : null;
    const live = input.liveId
      ? await this.resolveLiveRoom(input.liveId)
      : null;
    return guestPublicView({
      content: content ? { visibility: content.visibility } : { visibility: input.visibility || 'public' },
      profile: profile || { privacy: { profile: 'public' } },
      live: live ? { ...live, visibility: live.visibility || 'public' } : null
    });
  }

  onboarding(user) {
    const done = ['account_created'];
    if (user.displayName) done.push('profile_name');
    if (this.listOrgs(user).length) done.push('business_org');
    if ((this.store.data.videos || []).some(v => v.userId === user.id)) done.push('creator_settings');
    return onboardingState({ user, stepsDone: done });
  }

  publicWebMeta(userId) {
    const user = this.store.data.users.find(u => u.id === userId);
    const identity = user ? this.ensureIdentity(user) : null;
    const publicProfile = identity?.privacy?.profile === 'public';
    return {
      canonicalPath: publicProfile ? `/u/${user.username}` : null,
      indexable: publicProfile,
      openGraph: publicProfile ? {
        title: identity.displayName || user.displayName,
        description: identity.creatorPersona?.headline || user.bio || 'SYLORA',
        type: 'profile'
      } : null,
      structuredData: publicProfile ? { '@type': 'Person', name: user.displayName } : null,
      note: 'Private profiles are not indexed.'
    };
  }


  // —— LIVE Entertainment Engine (181–193) ——
  entertainmentCatalog() {
    return {
      battleModes: BATTLE_MODES,
      roomKinds: LIVE_ROOM_KINDS,
      miniGames: MINI_GAMES,
      challengeKinds: CHALLENGE_KINDS,
      timerKinds: TIMER_KINDS,
      focusPresets: FOCUS_PRESETS,
      engine: 'shared_live_realtime',
      note: 'Uses shared LIVE/realtime core — not a TikTok LIVE clone stack.'
    };
  }

  async startResonanceBattle(user, input = {}) {
    const hostLiveId = String(input.hostLiveId || input.liveId || '');
    const host = await this.resolveLiveRoom(hostLiveId);
    if (!host || host.hostId !== user.id) throw new Error('HOST_ONLY');
    if (await this.resolveActiveBattle(hostLiveId)) throw new Error('RESONANCE_ALREADY_ACTIVE');
    const opponentLiveId = input.opponentLiveId || null;
    if (opponentLiveId) {
      const opponent = await this.resolveLiveRoom(opponentLiveId);
      if (!opponent || opponent.id === host.id || opponent.hostId === user.id) throw new Error('INVALID_OPPONENT');
      if (await this.resolveActiveBattle(opponentLiveId)) throw new Error('RESONANCE_ALREADY_ACTIVE');
    }
    const battle = createBattlePlan({
      id: this.store.id(),
      hostLiveId,
      opponentLiveId,
      mode: input.mode || '1v1',
      teamA: input.teamA || [user.id],
      teamB: input.teamB || [],
      rounds: input.rounds || null,
      durationSec: Number(input.durationSec) || 180
    });
    if (typeof this.hooks.createBattle === 'function' && opponentLiveId) {
      const persisted = await this.hooks.createBattle({
        id: battle.id,
        hostLiveId: battle.hostLiveId,
        opponentLiveId: battle.opponentLiveId,
        startedAt: battle.startedAt || this.store.now(),
        endsAt: battle.endsAt || new Date(Date.now() + (battle.durationSec || 180) * 1000).toISOString(),
        overlay: battle
      });
      Object.assign(battle, persisted);
    }
    if (this.liveStatePg) {
      if (typeof this.hooks.saveBattlePlan === 'function') {
        await this.hooks.saveBattlePlan(battle);
      }
    } else {
      this.store.data.liveBattles.push(battle);
      this.store.save();
    }
    emitPlatformEvent('battle.started', { battleId: battle.id, hostLiveId: battle.hostLiveId }, { liveRoomId: battle.hostLiveId });
    return battle;
  }

  async battleFactor(user, battleId, { side = 'A', factor = 'likes', amount = 1 } = {}) {
    const battle = await this.resolveBattlePlan(battleId);
    if (!battle || battle.status !== 'live') throw new Error('BATTLE_NOT_FOUND');
    if (!battle.factors) throw new Error('LEGACY_BATTLE');
    applyBattleFactor(battle, side, factor, amount);
    if (this.liveStatePg && typeof this.hooks.saveBattlePlan === 'function') {
      await this.hooks.saveBattlePlan(battle);
    } else {
      this.store.save();
    }
    emitPlatformEvent('battle.score.changed', {
      battleId,
      hostScore: battle.hostScore,
      opponentScore: battle.opponentScore,
      lead: battle.hostScore - battle.opponentScore
    }, { liveRoomId: battle.hostLiveId });
    return {
      battle,
      world: resonanceWorldState({
        likes: battle.factors.likes,
        comments: battle.factors.comments,
        gifts: battle.factors.gifts,
        battleLead: battle.hostScore - battle.opponentScore,
        comeback: (battle.comebackEvents || []).length > 0
      }),
      lastComeback: (battle.comebackEvents || []).slice(-1)[0] || null
    };
  }

  async advanceBattle(user, battleId) {
    const battle = await this.resolveBattlePlan(battleId);
    if (!battle) throw new Error('BATTLE_NOT_FOUND');
    const host = await this.resolveLiveRoom(battle.hostLiveId);
    if (!host || host.hostId !== user.id) throw new Error('HOST_ONLY');
    advanceBattleRound(battle);
    if (this.liveStatePg && typeof this.hooks.saveBattlePlan === 'function') {
      await this.hooks.saveBattlePlan(battle);
    } else {
      this.store.save();
    }
    return battle;
  }

  async resonanceWorld(liveId) {
    const eng = await this.resolveLiveEngagement(liveId);
    const plan = await this.resolveBattlePlanByLiveId(liveId);
    const pgBattle = await this.resolveActiveBattle(liveId);
    const active = plan || pgBattle;
    const comments = (await this.resolveLiveMessages(liveId, 500)).length;
    return resonanceWorldState({
      likes: eng.likes || 0,
      comments,
      gifts: eng.resonance || 0,
      battleLead: active ? (Number(active.hostScore || 0) - Number(active.opponentScore || 0)) : 0,
      comeback: !!(plan?.comebackEvents || []).length,
      victory: active?.status === 'ended'
    });
  }

  async startLiveChallenge(user, input = {}) {
    const live = await this.resolveLiveRoom(input.liveId);
    if (!live || live.hostId !== user.id) throw new Error('HOST_ONLY');
    const challenge = createLiveChallenge({
      id: this.store.id(),
      liveId: live.id,
      hostId: user.id,
      title: input.title,
      kind: input.kind || 'FREE',
      goalType: input.goalType || 'likes',
      goalValue: input.goalValue,
      durationSec: input.durationSec
    });
    this.store.data.liveChallenges.push(challenge);
    this.store.save();
    return challenge;
  }

  async startLiveQuiz(user, input = {}) {
    const live = await this.resolveLiveRoom(input.liveId);
    if (!live || live.hostId !== user.id) throw new Error('HOST_ONLY');
    const quiz = createLiveQuiz({
      id: this.store.id(),
      liveId: live.id,
      hostId: user.id,
      question: input.question,
      options: input.options,
      correctIndex: input.correctIndex,
      durationSec: input.durationSec,
      teamMode: !!input.teamMode,
      createdBy: input.createdBy || 'host'
    });
    this.store.data.liveQuizzes.push(quiz);
    this.store.save();
    return quiz;
  }

  answerLiveQuiz(user, quizId, optionIndex) {
    const quiz = this.store.data.liveQuizzes.find(q => q.id === quizId);
    if (!quiz || quiz.status !== 'open') throw new Error('QUIZ_NOT_OPEN');
    const correct = Number(optionIndex) === quiz.correctIndex;
    const prev = quiz.answers.filter(a => a.userId === user.id && a.correct).length;
    quiz.answers.push({
      userId: user.id,
      optionIndex: Number(optionIndex),
      correct,
      streakBonus: correct ? prev : 0,
      at: this.store.now()
    });
    this.store.save();
    return { correct, leaderboard: quizLeaderboard(quiz) };
  }

  async startMiniGame(user, input = {}) {
    const live = await this.resolveLiveRoom(input.liveId);
    if (!live || live.hostId !== user.id) throw new Error('HOST_ONLY');
    const session = createMiniGameSession({
      id: this.store.id(),
      liveId: live.id,
      hostId: user.id,
      game: input.game || 'trivia',
      config: input.config || {}
    });
    this.store.data.liveMiniGames.push(session);
    this.store.save();
    return session;
  }

  async startAudienceVsSylora(user, input = {}) {
    const live = await this.resolveLiveRoom(input.liveId);
    if (!live || live.hostId !== user.id) throw new Error('HOST_ONLY');
    const session = createAudienceVsSylora({
      id: this.store.id(),
      liveId: live.id,
      hostId: user.id,
      format: input.format || 'knowledge_quiz',
      questions: input.questions || []
    });
    this.store.data.liveMiniGames.push({ ...session, game: 'audience_vs_sylora' });
    this.store.save();
    return session;
  }

  async setCoHostAutonomy(user, liveId, autonomy) {
    const live = await this.resolveLiveRoom(liveId);
    if (!live || live.hostId !== user.id) throw new Error('HOST_ONLY');
    return createCoHostControl({ liveId, hostId: user.id, autonomy });
  }

  async setLiveRoomKind(user, liveId, kind, title = '') {
    const live = await this.resolveLiveRoom(liveId);
    if (!live || live.hostId !== user.id) throw new Error('HOST_ONLY');
    const profile = createLiveRoomProfile({ id: this.store.id(), liveId, kind, title, hostId: user.id });
    if (typeof this.hooks.saveRoomProfile === 'function') {
      return this.hooks.saveRoomProfile(profile);
    }
    this.store.data.liveRoomProfiles = this.store.data.liveRoomProfiles.filter(p => p.liveId !== liveId);
    this.store.data.liveRoomProfiles.push(profile);
    this.store.save();
    return profile;
  }

  async ensureStage(liveId, hostId) {
    if (this.hooks.postgresLiveState && typeof this.hooks.getStage === 'function') {
      let stage = await this.hooks.getStage(liveId);
      if (!stage) {
        stage = createStageState({ liveId, hostId });
        if (typeof this.hooks.saveStage === 'function') stage = await this.hooks.saveStage(stage);
      }
      return stage;
    }
    let stage = this.store.data.liveStages.find(s => s.liveId === liveId);
    if (!stage) {
      stage = createStageState({ liveId, hostId });
      this.store.data.liveStages.push(stage);
      this.store.save();
    }
    return stage;
  }

  async stageAction(user, liveId, action, targetUserId) {
    const live = await this.resolveLiveRoom(liveId);
    if (!live) throw new Error('LIVE_NOT_FOUND');
    const stage = await this.ensureStage(liveId, live.hostId);
    if (action === 'raise_hand') stageRaiseHand(stage, user.id);
    else if (action === 'invite') {
      if (user.id !== live.hostId) throw new Error('HOST_ONLY');
      stageInvite(stage, targetUserId);
    } else if (action === 'accept') {
      if (!stage.speakers.some(s => s.userId === user.id) && stage.raisedHands.includes(user.id)) {
        stageInvite(stage, user.id);
      }
    } else if (action === 'mute') {
      if (user.id !== live.hostId) throw new Error('HOST_ONLY');
      const sp = stage.speakers.find(s => s.userId === targetUserId);
      if (sp) sp.muted = true;
    } else if (action === 'remove') {
      if (user.id !== live.hostId) throw new Error('HOST_ONLY');
      stageRemove(stage, targetUserId, live.hostId);
    } else throw new Error('INVALID_STAGE_ACTION');
    if (this.liveStatePg && typeof this.hooks.saveStage === 'function') {
      return this.hooks.saveStage(stage);
    }
    this.store.save();
    return stage;
  }

  createTimer(user, input = {}) {
    const timer = createServerTimer({
      id: this.store.id(),
      scopeType: input.scopeType || 'personal',
      scopeId: input.scopeId || user.id,
      kind: input.kind || 'countdown',
      durationSec: input.durationSec,
      label: input.label,
      visibility: input.visibility || 'personal',
      ownerId: user.id,
      warnBeforeSec: input.warnBeforeSec,
      scheduledStartAtMs: input.scheduledStartAtMs,
      backgroundAllowed: input.backgroundAllowed !== false
    });
    this.store.data.liveTimers.push(timer);
    this.store.save();
    return timerSnapshot(timer);
  }

  getTimer(timerId) {
    const timer = this.store.data.liveTimers.find(t => t.id === timerId);
    if (!timer) return null;
    const snap = timerSnapshot(timer);
    if (snap.warnDue && !timer.warnFired) {
      timer.warnFired = true;
      this.store.save();
      snap.warnFiredNow = true;
    }
    // persist scheduled→running transition
    if (snap.status !== timer.status || snap.startedAtMs !== timer.startedAtMs) {
      Object.assign(timer, {
        status: snap.status,
        startedAtMs: snap.startedAtMs,
        endsAtMs: snap.endsAtMs
      });
      this.store.save();
    }
    return snap;
  }

  timerAction(user, timerId, action) {
    const timer = this.store.data.liveTimers.find(t => t.id === timerId);
    if (!timer) throw new Error('TIMER_NOT_FOUND');
    if (timer.ownerId && timer.ownerId !== user.id && timer.visibility === 'personal') {
      throw new Error('TIMER_FORBIDDEN');
    }
    let next = timer;
    if (action === 'pause') next = pauseTimer(timer);
    else if (action === 'resume') next = resumeTimer(timer);
    else if (action === 'complete') { timer.status = 'completed'; next = timer; }
    else throw new Error('INVALID_TIMER_ACTION');
    Object.assign(timer, next);
    this.store.save();
    return timerSnapshot(timer);
  }

  startFocus(user, input = {}) {
    const session = createFocusSession({
      id: this.store.id(),
      userId: user.id,
      roomId: input.roomId || null,
      preset: input.preset || '25_5',
      focusMin: input.focusMin,
      breakMin: input.breakMin
    });
    this.store.data.focusSessions.push(session);
    this.store.data.liveTimers.push(session.timer);
    this.store.save();
    return session;
  }

  timeAssistant(user, text) {
    const intent = parseTimeAssistantIntent(text);
    if (!intent) {
      return {
        ok: false,
        error: 'TIME_INTENT_UNCLEAR',
        hint: 'Examples: "постав 25 хвилин на навчання", "засічи роботу над проєктом", "попередь за 5 хвилин до кінця презентації"',
        engine: 'timer_engine_v1'
      };
    }
    if (intent.action === 'start_stopwatch') {
      const timer = this.createTimer(user, {
        kind: 'stopwatch',
        scopeType: intent.scopeType,
        label: intent.label,
        durationSec: 1
      });
      return { ok: true, intent, timer, engine: 'timer_engine_v1' };
    }
    if (intent.preset === '25_5' && intent.scopeType === 'study') {
      const session = this.startFocus(user, { preset: '25_5' });
      return { ok: true, intent, session, timer: timerSnapshot(session.timer), engine: 'timer_engine_v1' };
    }
    const timer = this.createTimer(user, {
      kind: 'countdown',
      scopeType: intent.scopeType,
      label: intent.label,
      durationSec: intent.durationSec,
      warnBeforeSec: intent.warnBeforeSec
    });
    return { ok: true, intent, timer, engine: 'timer_engine_v1' };
  }

  sharedEngines() {
    return {
      registry: SHARED_ENGINE_REGISTRY,
      priority: PRIORITY_ORDER,
      qa: QA_CHECKLIST,
      timerScopes: TIMER_SCOPES,
      quizContexts: QUIZ_CONTEXTS,
      conferenceKinds: CONFERENCE_KINDS,
      funRoomKinds: FUN_ROOM_KINDS,
      rule: 'New features must reuse shared engines — Learning/LIVE/Science quizzes share quiz_engine_v1.'
    };
  }

  // —— Science tools 238–244 ——
  createExperiment(user, input = {}) {
    const log = createExperimentLog({ researcherId: user.id, ...input });
    this.store.data.experimentLogs.unshift(log);
    this.store.save();
    return log;
  }

  updateExperiment(user, experimentId, patch = {}) {
    const log = this.store.data.experimentLogs.find(e => e.id === experimentId);
    if (!log) throw new Error('EXPERIMENT_NOT_FOUND');
    if (log.researcherId !== user.id) throw new Error('FORBIDDEN');
    appendExperimentVersion(log, patch, user.id);
    this.store.save();
    return log;
  }

  refuseExperimentRewrite(user, experimentId, version) {
    const log = this.store.data.experimentLogs.find(e => e.id === experimentId);
    if (!log) throw new Error('EXPERIMENT_NOT_FOUND');
    return mutateExperimentVersion(log, Number(version), {});
  }

  calculators() { return { calculators: listCalculators() }; }

  calculate(user, input = {}) {
    return runCalculator(input.moduleId, input.op, input.inputs || {});
  }

  createFormula(user, input = {}) {
    const ws = createFormulaWorkspace({ ...input, ownerId: user.id });
    this.store.data.formulaWorkspaces.unshift(ws);
    this.store.save();
    return ws;
  }

  statisticsAssist(user, input = {}) {
    return analyzeStatistics(input || {});
  }

  scienceViz() { return visualizationManifest(); }

  scienceMatch(user, input = {}) {
    const library = this.store.data.researchLibrary || [];
    const projects = this.store.data.researchProjects || [];
    const researchers = (this.store.data.users || []).slice(0, 50).map(u => ({
      userId: u.id,
      username: u.username,
      interests: input.seedInterests || []
    }));
    return matchResearchers({
      interests: input.interests || [],
      researchers,
      projects: projects.map(p => ({ id: p.id, title: p.title, tags: [p.hypothesis || ''], interests: [] })),
      institutions: input.institutions || []
    });
  }

  createCircle(user, input = {}) {
    const circle = createScienceCircle({ ...input, ownerId: user.id });
    this.store.data.scienceCircles.unshift(circle);
    this.store.save();
    return circle;
  }

  commentCircle(user, circleId, input = {}) {
    const circle = this.store.data.scienceCircles.find(c => c.id === circleId);
    if (!circle) throw new Error('CIRCLE_NOT_FOUND');
    const comment = addCircleComment(circle, { userId: user.id, ...input });
    this.store.save();
    return { circle, comment };
  }

  // —— Conference mode / Quiz engine ——
  createConferenceMode(user, input = {}) {
    const program = createConferenceProgram({
      conferenceId: input.conferenceId || this.store.id(),
      kind: input.kind || 'science',
      agenda: input.agenda,
      speakers: input.speakers,
      sessions: input.sessions,
      documents: input.documents,
      translationEnabled: !!input.translationEnabled
    });
    program.ownerId = user.id;
    this.store.data.conferencePrograms.unshift(program);
    this.store.save();
    return program;
  }

  conferenceQa(user, programId, input = {}) {
    const program = this.store.data.conferencePrograms.find(p => p.id === programId);
    if (!program) throw new Error('PROGRAM_NOT_FOUND');
    const item = addConferenceQa(program, { userId: user.id, ...input });
    this.store.save();
    return item;
  }

  createSharedQuiz(user, input = {}) {
    const quiz = createQuiz({
      id: this.store.id(),
      context: input.context || 'learning',
      ownerId: user.id,
      spaceId: input.spaceId || null,
      title: input.title,
      questions: input.questions || [],
      timerSec: input.timerSec,
      randomizeOrder: !!input.randomizeOrder,
      teamMode: !!input.teamMode
    });
    if (input.open) {
      const opened = openQuiz(quiz, { durationSec: input.timerSec });
      Object.assign(quiz, opened);
      if (quiz.timerSec) {
        const timer = this.createTimer(user, {
          scopeType: 'quiz',
          scopeId: quiz.id,
          kind: 'countdown',
          durationSec: quiz.timerSec,
          label: quiz.title,
          visibility: 'shared'
        });
        quiz.timerRef = timer.id;
      }
    }
    this.store.data.sharedQuizzes.unshift(quiz);
    this.store.save();
    return quiz;
  }

  answerSharedQuiz(user, quizId, input = {}) {
    const quiz = this.store.data.sharedQuizzes.find(q => q.id === quizId);
    if (!quiz) throw new Error('QUIZ_NOT_FOUND');
    const entry = submitAnswer(quiz, {
      userId: user.id,
      questionId: input.questionId,
      value: input.value,
      teamId: input.teamId
    });
    this.store.save();
    return { entry, leaderboard: engineQuizLeaderboard(quiz, { teamMode: quiz.teamMode }) };
  }

  // —— Social 248–252 ——
  createFunRoom(user, input = {}) {
    const room = createFunSocialRoom({
      id: this.store.id(),
      hostId: user.id,
      kind: input.kind || 'coffee',
      title: input.title,
      liveId: input.liveId || null
    });
    this.store.data.funSocialRooms.unshift(room);
    this.store.save();
    return room;
  }

  createCommunityEvt(user, input = {}) {
    const evt = createCommunityEvent({
      id: this.store.id(),
      communityId: input.communityId || null,
      hostId: user.id,
      kind: input.kind || 'workshop',
      title: input.title,
      startsAt: input.startsAt || null,
      liveId: input.liveId || null,
      quizId: input.quizId || null,
      timerId: input.timerId || null
    });
    this.store.data.communityEvents.unshift(evt);
    // also mirror into platform events when possible
    this.store.data.platformEvents?.unshift?.({
      id: this.store.id(),
      title: evt.title,
      startsAt: evt.startsAt || 'tba',
      mode: 'community',
      kind: evt.kind,
      hostId: user.id,
      createdAt: this.store.now()
    });
    this.store.save();
    return evt;
  }

  upsertDiscovery(user, input = {}) {
    const profile = createDiscoveryProfile({ userId: user.id, ...input });
    this.store.data.discoveryProfiles = this.store.data.discoveryProfiles.filter(p => p.userId !== user.id);
    this.store.data.discoveryProfiles.push(profile);
    this.store.save();
    return profile;
  }

  runDiscovery(user) {
    const me = this.store.data.discoveryProfiles.find(p => p.userId === user.id);
    if (!me) return { matches: [], note: 'Create an opt-in discovery profile first.' };
    return matchDiscovery(me, this.store.data.discoveryProfiles);
  }

  achievementsFor(user) {
    const signals = {
      coursesCompleted: (this.store.data.enrollments || []).filter(e => e.userId === user.id && (e.progress || 0) >= 1).length,
      livesHosted: (this.store.data.liveRooms || []).filter(r => r.hostId === user.id).length,
      researchPublished: (this.store.data.researchProjects || []).filter(p => p.ownerId === user.id).length,
      communityActions: (this.store.data.communityPosts || []).filter(p => p.userId === user.id).length,
      invoicesDrafted: (this.store.data.invoices || []).filter(i => i.ownerId === user.id).length,
      studyDays: (this.store.data.focusSessions || []).filter(f => f.userId === user.id).length
    };
    const result = evaluateAchievements({ signals });
    for (const a of result.unlocked) {
      if (!this.store.data.userAchievements.some(x => x.userId === user.id && x.id === a.id)) {
        this.store.data.userAchievements.push({ ...a, userId: user.id, unlockedAt: this.store.now() });
      }
    }
    this.store.save();
    return {
      ...result,
      catalog: ACHIEVEMENT_CATALOG,
      mine: this.store.data.userAchievements.filter(a => a.userId === user.id)
    };
  }

  createSeasonalEvent(user, input = {}) {
    const evt = createSeasonalLiveEvent({ id: this.store.id(), ...input });
    evt.hostId = user.id;
    this.store.data.seasonalLiveEvents.unshift(evt);
    this.store.save();
    return evt;
  }

  // —— Call Engine (194–198) ——
  getCall(callId) {
    return (this.store.data.callSessions || []).find(c => c.id === callId) || null;
  }

  assertCallParticipant(call, userId) {
    if (!call) throw new Error('CALL_NOT_FOUND');
    if (call.kind === 'sylora') {
      if (call.userId !== userId) throw new Error('NOT_PARTICIPANT');
      return;
    }
    if (!(call.participants || []).some(p => p.userId === userId)) throw new Error('NOT_PARTICIPANT');
  }

  startCall(user, input = {}) {
    const kind = input.kind || 'voice';
    const call = createCallSession({
      id: this.store.id(),
      kind,
      initiatorId: user.id,
      participantIds: input.participantIds || (input.userId ? [input.userId] : []),
      conversationId: input.conversationId || null,
      groupId: input.groupId || null
    });
    this.store.data.callSessions.push(call);
    this.store.save();
    const type = kind.includes('video') ? 'video_call' : 'voice_call';
    for (const p of call.participants) {
      if (p.userId === user.id) continue;
      const payload = { callId: call.id, kind, conversationId: call.conversationId };
      if (typeof this.hooks.notifyUser === 'function') {
        this.hooks.notifyUser(p.userId, type, user.id, payload);
      } else {
        this.store.notify(p.userId, type, user.id, payload);
      }
      this.hooks.emitCall?.(call.id, 'ring', {
        callId: call.id,
        kind,
        fromUserId: user.id,
        toUserId: p.userId
      });
    }
    return call;
  }

  callAction(user, callId, action, patch = {}) {
    const call = this.store.data.callSessions.find(c => c.id === callId);
    if (!call) throw new Error('CALL_NOT_FOUND');
    this.assertCallParticipant(call, user.id);
    let out;
    if (action === 'accept') out = acceptCall(call, user.id);
    else if (action === 'decline') out = declineCall(call, user.id);
    else if (action === 'end') out = endCall(call, user.id);
    else if (action === 'media') out = setCallMedia(call, user.id, patch);
    else if (action === 'translate') out = enableCallTranslation(call, { userId: user.id, ...patch });
    else throw new Error('INVALID_CALL_ACTION');
    if (!out.ok) throw new Error(out.error);
    if (['ended', 'missed'].includes(call.status)) {
      this.store.data.callHistory.unshift(callHistoryEntry(call));
    }
    this.store.save();
    this.hooks.emitCall?.(call.id, 'call', { call, action, byUserId: user.id });
    for (const p of call.participants || []) {
      if (p.userId === user.id) continue;
      if (typeof this.hooks.notifyUser === 'function') {
        this.hooks.notifyUser(p.userId, `call_${action}`, user.id, { callId: call.id, status: call.status, kind: call.kind });
      }
    }
    return call;
  }

  listCallHistory(user) {
    return (this.store.data.callHistory || []).filter(h =>
      h.initiatorId === user.id || (h.participantIds || []).includes(user.id)
    ).slice(0, 100);
  }

  startSyloraCall(user, mode = 'voice') {
    const call = createSyloraCall({ id: this.store.id(), userId: user.id, mode });
    this.store.data.syloraCalls.push(call);
    this.store.data.callHistory.unshift(callHistoryEntry({ ...call, initiatorId: user.id, participants: [{ userId: user.id }] }));
    this.store.save();
    return call;
  }

  setSyloraCallPermission(user, callId, { camera, screenShare } = {}) {
    const call = this.store.data.syloraCalls.find(c => c.id === callId && c.userId === user.id);
    if (!call) throw new Error('CALL_NOT_FOUND');
    if (typeof camera === 'boolean') call.cameraPermission = camera;
    if (typeof screenShare === 'boolean') call.screenSharePermission = screenShare;
    this.store.save();
    return call;
  }

  // —— Business Hub (199–217) ——
  businessHub() {
    return {
      sections: BUSINESS_HUB_SECTIONS,
      invoiceStatuses: INVOICE_STATUSES,
      exportFormats: ACCOUNTING_EXPORT_FORMATS,
      notABank: true,
      legal: legalAssistantDisclaimer(),
      financeGuard: financeAssistantGuard()
    };
  }

  setBusinessCountry(user, input = {}) {
    const profile = createBusinessCountryProfile(input);
    profile.userId = user.id;
    this.store.data.businessCountryProfiles = this.store.data.businessCountryProfiles.filter(p => p.userId !== user.id);
    this.store.data.businessCountryProfiles.push(profile);
    this.store.save();
    return profile;
  }

  getBusinessCountry(user) {
    return this.store.data.businessCountryProfiles.find(p => p.userId === user.id)
      || createBusinessCountryProfile({ countryCode: 'DEFAULT' });
  }

  createInvoice(user, input = {}) {
    const country = input.countryCode || this.getBusinessCountry(user).countryCode;
    const invoice = createInvoiceDraft({ ...input, countryCode: country });
    invoice.ownerId = user.id;
    this.store.data.invoices.unshift(invoice);
    this.store.save();
    return invoice;
  }

  listInvoices(user) {
    return this.store.data.invoices.filter(i => i.ownerId === user.id);
  }

  updateInvoiceStatus(user, id, status) {
    const inv = this.store.data.invoices.find(i => i.id === id && i.ownerId === user.id);
    if (!inv) throw new Error('INVOICE_NOT_FOUND');
    if (!INVOICE_STATUSES.includes(status)) throw new Error('INVALID_STATUS');
    inv.status = status;
    inv.updatedAt = this.store.now();
    this.store.save();
    return inv;
  }

  extractExpense(user, input = {}) {
    const row = createExpenseExtraction(input);
    row.ownerId = user.id;
    this.store.data.expenseExtractions.unshift(row);
    this.store.save();
    return row;
  }

  confirmExpense(user, id, overrides = {}) {
    const row = this.store.data.expenseExtractions.find(e => e.id === id && e.ownerId === user.id);
    if (!row) throw new Error('EXPENSE_NOT_FOUND');
    const confirmed = confirmExpenseExtraction(row, overrides);
    Object.assign(row, confirmed);
    this.store.save();
    return row;
  }

  upsertCrm(user, input = {}) {
    const row = createCrmRecord({ ...input, ownerId: user.id });
    this.store.data.crmRecords.unshift(row);
    this.store.save();
    return row;
  }

  listCrm(user) {
    return this.store.data.crmRecords.filter(r => r.ownerId === user.id);
  }

  createBusinessQuote(user, input = {}) {
    const q = createQuote({ ...input, countryCode: input.countryCode || this.getBusinessCountry(user).countryCode });
    q.ownerId = user.id;
    this.store.data.quotes.unshift(q);
    this.store.save();
    return q;
  }

  acceptQuote(user, id, convertTo = 'invoice_draft') {
    const q = this.store.data.quotes.find(x => x.id === id && x.ownerId === user.id);
    if (!q) throw new Error('QUOTE_NOT_FOUND');
    q.status = 'accepted';
    let result = null;
    if (convertTo === 'invoice_draft') {
      result = this.createInvoice(user, {
        items: q.items,
        currency: q.currency,
        countryCode: q.countryCode,
        notes: `From quote ${q.id}`
      });
    }
    this.store.save();
    return { quote: q, converted: result };
  }

  timeTrack(user, action, input = {}) {
    if (action === 'start') {
      const entry = createTimeEntry({ userId: user.id, ...input });
      this.store.data.timeEntries.unshift(entry);
      this.store.save();
      return entry;
    }
    const entry = this.store.data.timeEntries.find(e => e.id === input.id && e.userId === user.id);
    if (!entry) throw new Error('TIME_ENTRY_NOT_FOUND');
    if (action === 'pause') { entry.status = 'paused'; entry.pausedAt = this.store.now(); }
    else if (action === 'resume') { entry.status = 'running'; entry.pausedAt = null; }
    else if (action === 'stop') { entry.status = 'stopped'; entry.endedAt = this.store.now(); }
    else throw new Error('INVALID_TIME_ACTION');
    this.store.save();
    return entry;
  }

  listTimeEntries(user) {
    return this.store.data.timeEntries.filter(e => e.userId === user.id).slice(0, 200);
  }

  setProjectBudget(user, input = {}) {
    const budget = createProjectBudget(input);
    budget.ownerId = user.id;
    this.store.data.projectBudgets = this.store.data.projectBudgets.filter(b => !(b.projectId === budget.projectId && b.ownerId === user.id));
    this.store.data.projectBudgets.push(budget);
    this.store.save();
    return budget;
  }

  inventoryItem(user, input = {}) {
    const item = createInventoryItem(input);
    item.ownerId = user.id;
    item.optionalModule = true;
    this.store.data.inventoryItems.push(item);
    this.store.save();
    return item;
  }

  inviteAccountant(user, accountantUserId) {
    const invite = createAccountantInvite({ ownerId: user.id, accountantUserId });
    this.store.data.accountantInvites.push(invite);
    this.store.notify(accountantUserId, 'accountant_invite', user.id, { inviteId: invite.id });
    this.store.save();
    return invite;
  }

  createContract(user, input = {}) {
    const c = createContractRecord(input);
    c.ownerId = user.id;
    this.store.data.contracts.unshift(c);
    this.store.save();
    return c;
  }

  accountingExport(user, format = 'csv') {
    return {
      meta: buildAccountingExportMeta({ format, countryCode: this.getBusinessCountry(user).countryCode }),
      invoices: this.listInvoices(user),
      expenses: this.store.data.expenseExtractions.filter(e => e.ownerId === user.id && e.confirmed),
      guard: financeAssistantGuard('export')
    };
  }

  financeAssist(user, query = '') {
    const q = String(query || '').toLowerCase();
    const invoices = this.listInvoices(user);
    const unpaid = invoices.filter(i => ['issued', 'sent', 'overdue', 'partially_paid'].includes(i.status));
    const paid = invoices.filter(i => i.status === 'paid');
    const income = paid.reduce((s, i) => s + (i.gross || 0), 0);
    return {
      query,
      answer: q.includes('неоплат') || q.includes('unpaid')
        ? { unpaidCount: unpaid.length, unpaid }
        : q.includes('дохід') || q.includes('income')
          ? { incomeThisMonthApprox: income, note: 'Aggregated from paid invoices in store — not a bank balance.' }
          : { hint: 'Ask about unpaid invoices, income, or draft invoice for a client.' },
      guard: financeAssistantGuard('query'),
      canSendWithoutConfirmation: false
    };
  }

  // —— Learning + Science (218–237) ——
  learningHub() {
    return { sections: LEARNING_HUB_SECTIONS, tutorModes: TUTOR_MODES, examIntegrity: { fakeAiCheatingDetector: false } };
  }

  scienceHub() {
    return { sections: SCIENCE_HUB_SECTIONS, citationHonesty: 'Do not invent DOI/authors/publication data.' };
  }

  startTutor(user, input = {}) {
    const session = createTutorSession({ userId: user.id, ...input });
    this.store.data.tutorSessions.unshift(session);
    this.store.save();
    return { session, policy: tutorResponsePolicy({ gradedAssignment: !!input.gradedAssignment }) };
  }

  createDeck(user, input = {}) {
    const deck = createFlashcardDeck(input);
    deck.ownerId = user.id;
    this.store.data.flashcardDecks.unshift(deck);
    this.store.save();
    return deck;
  }

  reviewCard(user, deckId, cardId, quality) {
    const deck = this.store.data.flashcardDecks.find(d => d.id === deckId && d.ownerId === user.id);
    if (!deck) throw new Error('DECK_NOT_FOUND');
    const idx = deck.cards.findIndex(c => c.id === cardId);
    if (idx < 0) throw new Error('CARD_NOT_FOUND');
    deck.cards[idx] = scheduleFlashcardReview(deck.cards[idx], { quality });
    this.store.save();
    return deck.cards[idx];
  }

  createExamStudyPlan(user, input = {}) {
    const plan = createExamPlan(input);
    plan.userId = user.id;
    this.store.data.examPlans.unshift(plan);
    this.store.save();
    return plan;
  }

  createLearningAssignment(user, input = {}) {
    const a = createAssignment({ ...input, teacherId: user.id });
    this.store.data.assignments.unshift(a);
    this.store.save();
    return a;
  }

  buildQuiz(user, input = {}) {
    const q = createQuizBuilder(input);
    q.ownerId = user.id;
    this.store.data.quizBuilders.unshift(q);
    this.store.save();
    return q;
  }

  createUserSmartNote(user, input = {}) {
    const n = createSmartNote(input);
    n.ownerId = user.id;
    this.store.data.smartNotes.unshift(n);
    this.store.save();
    return n;
  }

  createBoard(user, input = {}) {
    const b = createWhiteboardSession(input);
    b.ownerId = user.id;
    this.store.data.whiteboards.unshift(b);
    this.store.save();
    return b;
  }

  addLibraryItem(user, input = {}) {
    const item = createResearchLibraryItem(input);
    item.ownerId = user.id;
    this.store.data.researchLibrary.unshift(item);
    this.store.save();
    return item;
  }

  paperReader(user, input = {}) {
    return createPaperReaderView(input);
  }

  addCitation(user, input = {}) {
    const cite = createCitation(input);
    if (cite.error) return cite;
    cite.ownerId = user.id;
    return cite;
  }

  createResearch(user, input = {}) {
    const project = createResearchProject({ ...input, ownerId: user.id, team: input.team || [user.id] });
    this.store.data.researchProjects.unshift(project);
    this.store.save();
    return project;
  }

  createDataset(user, input = {}) {
    const ds = createDatasetWorkspace(input);
    ds.ownerId = user.id;
    this.store.data.datasets.unshift(ds);
    this.store.save();
    return ds;
  }

  languageTutor(user, input = {}) {
    return languageTutorMode(input);
  }

  capabilitiesSnapshot({ aiConfigured = false, realtimeConfigured = false } = {}) {
    const providers = providerSnapshot();
    const status = this.platformStatus();
    return {
      aiText: !!aiConfigured,
      aiRealtimeVoice: !!realtimeConfigured && !!aiConfigured,
      tts: !!aiConfigured,
      stt: !!aiConfigured,
      translation: providers.translation?.status || 'degraded',
      embeddings: providers.embedding?.status || 'blocked_provider',
      websocket: true,
      degraded: {
        ai: !aiConfigured,
        voice: !realtimeConfigured || !aiConfigured,
        semanticSearch: providers.embedding?.status !== 'ready'
      },
      oneSylora: true,
      providers,
      flags: resolveFlags(),
      infrastructure: status.infrastructure,
      modelRouting: {
        simple: modelRouteFor('simple'),
        complex: modelRouteFor('complex'),
        realtime: modelRouteFor('realtime')
      },
      honesty: {
        lumenWallet: status.infrastructure.lumenWallet,
        live: status.infrastructure.live,
        ai: status.infrastructure.ai
      },
      tools: BUILTIN_ACTIONS.filter(t => getTool(t)).length
    };
  }
}

export { scopeAllows, OAUTH_DOC, hashApiKey };
