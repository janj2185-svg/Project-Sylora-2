import { loadRuntimeConfig } from './config.mjs';

/** External integration readiness — honest BLOCKED_EXTERNAL until credentials exist. */
export function integrationStatus(env = process.env) {
  const config = loadRuntimeConfig(env);
  return {
    googleOAuth: {
      status: env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET
        ? 'CONFIGURED'
        : 'BLOCKED_EXTERNAL',
      note: 'Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET'
    },
    turn: {
      status: config.turnConfigured ? 'CONFIGURED' : 'BLOCKED_EXTERNAL',
      readiness: config.realtime.status,
      reason: config.realtime.reason,
      authMode: config.turnAuthMode,
      note: config.turnAuthMode === 'shared_secret'
        ? 'Short-lived TURN credentials are issued to authenticated browsers; the shared secret remains server-only.'
        : config.turnAuthMode === 'static'
          ? 'Static TURN username/credential are configured; rotate them manually.'
          : 'Set a TURN URL plus SYLORA_TURN_SHARED_SECRET, or complete static username/credential values.'
    },
    payments: {
      status: config.payments.configured || env.PAYMENT_PROVIDER_API_KEY ? 'CONFIGURED' : 'BLOCKED_EXTERNAL',
      note: 'Real payments require provider secrets — TEST LUMEN remains sandbox'
    },
    ai: {
      status: config.ai.status,
      configured: config.ai.configured,
      note: 'Missing key returns AI_PROVIDER_NOT_CONFIGURED; no fake OpenAI responses'
    },
    translation: {
      status: (env.SYLORA_TRANSLATE_API_KEY || env.OPENAI_API_KEY) ? 'CONFIGURED' : 'BLOCKED_EXTERNAL',
      note: 'Machine translation requires provider credentials'
    }
  };
}
