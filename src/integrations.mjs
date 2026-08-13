import { loadConfig } from './config.mjs';

/** External integration readiness — honest BLOCKED_EXTERNAL until credentials exist. */
export function integrationStatus(env = process.env) {
  const config = loadConfig(env);
  return {
    googleOAuth: {
      status: env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET
        ? 'CONFIGURED'
        : 'BLOCKED_EXTERNAL',
      note: 'Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET'
    },
    turn: {
      status: config.webrtc.turnConfigured ? 'CONFIGURED' : 'BLOCKED_EXTERNAL',
      readiness: config.isProduction ? (config.webrtc.turnConfigured ? 'OK' : 'NOT_READY') : (config.webrtc.turnConfigured ? 'OK' : 'DEGRADED'),
      note: 'Set SYLORA_TURN_URL or SYLORA_ICE_SERVERS_JSON with a TURN server for NAT traversal'
    },
    payments: {
      status: config.payments.configured ? 'CONFIGURED' : 'BLOCKED_EXTERNAL',
      reason: config.payments.reason,
      note: 'Real payments require SYLORA_PAYMENT_PROVIDER plus provider secrets — TEST LUMEN remains sandbox'
    },
    translation: {
      status: (env.SYLORA_TRANSLATE_API_KEY || config.ai.configured) ? 'CONFIGURED' : 'BLOCKED_EXTERNAL',
      note: 'Machine translation requires provider credentials'
    },
    ai: {
      status: config.ai.configured ? 'CONFIGURED' : 'BLOCKED_EXTERNAL',
      aiStatus: config.ai.status,
      reason: config.ai.reason
    }
  };
}
