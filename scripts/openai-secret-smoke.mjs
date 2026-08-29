const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
const model = String(process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1').trim();

if (!apiKey) {
  throw new Error('OPENAI_API_KEY GitHub Secret is not configured.');
}

const headers = {
  authorization: `Bearer ${apiKey}`,
  'content-type': 'application/json'
};

async function request(path, options = {}) {
  const response = await fetch(`https://api.openai.com${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}.`);
  }
  return response.json();
}

const models = await request('/v1/models');
if (!Array.isArray(models.data)) {
  throw new Error('/v1/models returned an unexpected response.');
}
console.log('OPENAI_MODELS_ACCESS_OK');

const secret = await request('/v1/realtime/client_secrets', {
  method: 'POST',
  body: JSON.stringify({
    expires_after: { anchor: 'created_at', seconds: 60 },
    session: {
      type: 'realtime',
      model,
      output_modalities: ['audio'],
      audio: {
        input: { turn_detection: { type: 'semantic_vad' } },
        output: { voice: 'marin' }
      }
    }
  })
});

if (typeof secret.value !== 'string' || secret.value.length < 10 || secret.session?.type !== 'realtime') {
  throw new Error('Realtime client secret response was incomplete.');
}

console.log(`OPENAI_REALTIME_ACCESS_OK model=${model}`);
