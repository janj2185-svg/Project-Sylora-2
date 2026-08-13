import { resolveIceConfig } from './rtc-config.mjs';
import { loadConfig } from './config.mjs';

/** External integration readiness — honest BLOCKED_EXTERNAL until credentials exist. */
export function integrationStatus(env = process.env) {
  const ice = resolveIceConfig(env);
  const runtime = loadConfig(env);
  return {
    googleOAuth: {
      status: env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET
        ? 'CONFIGURED'
        : 'BLOCKED_EXTERNAL',
      note: 'Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET'
    },
    turn: {
      status: ice.turnConfigured ? 'CONFIGURED' : 'BLOCKED_EXTERNAL',
      readiness: runtime.webrtc.status,
      reason: runtime.webrtc.reason,
      note: 'Set SYLORA_TURN_URL + credentials or SYLORA_ICE_SERVERS_JSON with a TURN server for NAT traversal. Configuration support is not a deployed TURN server.'
    },
    openai: {
      status: runtime.ai.status,
      reason: runtime.ai.reason,
      note: 'Chat/voice require OPENAI_API_KEY. Missing key is unavailable, not a fake OpenAI response.'
    },
    payments: {
      status: runtime.payments.status,
      reason: runtime.payments.reason,
      note: 'Real payments require PAYMENT_PROVIDER / SYLORA_PAYMENT_PROVIDER and provider secret — TEST LUMEN remains sandbox'
    },
    translation: {
      status: (env.SYLORA_TRANSLATE_API_KEY || env.OPENAI_API_KEY) ? 'CONFIGURED' : 'BLOCKED_EXTERNAL',
      note: 'Machine translation requires provider credentials'
    }
  };
}
