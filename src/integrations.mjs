import { hasTurnServer, parseIceServers } from './rtc-config.mjs';

/** External integration readiness — honest BLOCKED_EXTERNAL until credentials exist. */
export function integrationStatus() {
  const iceServers = parseIceServers(process.env.SYLORA_ICE_SERVERS_JSON);
  return {
    googleOAuth: {
      status: process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET
        ? 'CONFIGURED'
        : 'BLOCKED_EXTERNAL',
      note: 'Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET'
    },
    turn: {
      status: hasTurnServer(iceServers) ? 'CONFIGURED' : 'BLOCKED_EXTERNAL',
      note: 'Set SYLORA_ICE_SERVERS_JSON with a TURN server for NAT traversal'
    },
    payments: {
      status: process.env.PAYMENT_PROVIDER_API_KEY ? 'CONFIGURED' : 'BLOCKED_EXTERNAL',
      note: 'Real payments require PAYMENT_PROVIDER_API_KEY — TEST LUMEN remains sandbox'
    },
    translation: {
      status: (process.env.SYLORA_TRANSLATE_API_KEY || process.env.OPENAI_API_KEY) ? 'CONFIGURED' : 'BLOCKED_EXTERNAL',
      note: 'Machine translation requires provider credentials'
    }
  };
}
