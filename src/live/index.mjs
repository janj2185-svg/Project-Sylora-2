/** SYLORA LIVE streaming ecosystem — public entry. */
export { createSyloraLiveService, SyloraLiveService } from './service.mjs';
export { handleSyloraLiveRoutes } from './routes.mjs';
export { LiveEventBus } from './events/bus.mjs';
export { PLATFORM_CAPABILITIES, capabilityMatrixRows } from './platforms/capabilities.mjs';
export { AUTOMATION_TEMPLATES, createAutomationRule, AutomationEngine } from './automation/engine.mjs';
export { normalizeAiHostControls, shouldAiSpeak } from './ai-host/autonomy.mjs';
export { UnifiedLiveChat } from './chat/unified-chat.mjs';
export { rankMessages, scoreChatMessage } from './chat/priority.mjs';
