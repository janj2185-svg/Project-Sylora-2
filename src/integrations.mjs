import { loadRuntimeConfig } from './config.mjs';
import { buildIceServersFromEnv, hasTurnServer } from './rtc-config.mjs';

/** External integration readiness — honest BLOCKED_EXTERNAL until credentials exist. */
export function integrationStatus() {
  const iceServers = buildIceServersFromEnv();
  const config = loadRuntimeConfig();
  return {
    googleOAuth: {
      status: process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET
        ? 'CONFIGURED'
        : 'BLOCKED_EXTERNAL',
      note: 'Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET'
    },
    turn: {
      status: hasTurnServer(iceServers) ? 'CONFIGURED' : 'BLOCKED_EXTERNAL',
      readiness: config.realtime.status,
      reason: config.realtime.reason,
      note: 'Set SYLORA_TURN_URL (+ username/credential) or SYLORA_ICE_SERVERS_JSON. Client TURN credentials are browser-visible by WebRTC design.'
    },
    payments: {
      status: config.payments.configured || process.env.PAYMENT_PROVIDER_API_KEY ? 'CONFIGURED' : 'BLOCKED_EXTERNAL',
      note: 'Real payments require provider secrets — TEST LUMEN remains sandbox'
    },
    ai: {
      status: config.ai.status,
      configured: config.ai.configured,
      note: 'Missing key returns AI_PROVIDER_NOT_CONFIGURED; no fake OpenAI responses'
    },
    translation: {
      status: (process.env.SYLORA_TRANSLATE_API_KEY || process.env.OPENAI_API_KEY) ? 'CONFIGURED' : 'BLOCKED_EXTERNAL',
      note: 'Machine translation requires provider credentials'
    }
  };
}
