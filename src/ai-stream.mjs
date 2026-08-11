/**
 * OpenAI Responses streaming adapter.
 * Uses native stream when available; falls back to progressive post-complete chunks.
 * E2E with live key remains BLOCKED_EXTERNAL — adapter is production-ready.
 */

export async function* streamSyloraResponse(openai, request, { signal = null } = {}) {
  if (!openai) {
    throw Object.assign(new Error('AI_PROVIDER_NOT_CONFIGURED'), { code: 'AI_PROVIDER_NOT_CONFIGURED' });
  }
  if (signal?.aborted) {
    throw Object.assign(new Error('AI_CANCELLED'), { code: 'AI_CANCELLED' });
  }

  // Prefer native token stream
  try {
    const stream = await openai.responses.create({ ...request, stream: true });
    let full = '';
    let responseId = null;
    let usage = null;
    for await (const event of stream) {
      if (signal?.aborted) {
        throw Object.assign(new Error('AI_CANCELLED'), { code: 'AI_CANCELLED' });
      }
      const type = event?.type || '';
      if (type === 'response.created' || type === 'response.in_progress') {
        responseId = event.response?.id || responseId;
        yield { kind: 'status', streaming: true, transport: 'openai_responses_stream', responseId };
      } else if (type === 'response.output_text.delta' || type === 'response.output_text.delta.partial') {
        const text = String(event.delta || event.text || '');
        if (text) {
          full += text;
          yield { kind: 'delta', text, streaming: true, transport: 'openai_responses_stream' };
        }
      } else if (type === 'response.completed') {
        responseId = event.response?.id || responseId;
        usage = event.response?.usage || usage;
        const finalText = String(event.response?.output_text || full || '');
        if (!full && finalText) {
          // Some SDK shapes only emit full text at end
          for (const chunk of chunkText(finalText, 48)) {
            yield { kind: 'delta', text: chunk, streaming: true, transport: 'openai_responses_stream' };
          }
          full = finalText;
        }
        yield {
          kind: 'done',
          message: finalText || full,
          responseId,
          usage,
          streaming: true,
          transport: 'openai_responses_stream'
        };
        return;
      } else if (type === 'error' || type === 'response.failed') {
        throw Object.assign(new Error('AI_PROVIDER_ERROR'), { code: 'AI_PROVIDER_ERROR' });
      }
    }
    if (full) {
      yield { kind: 'done', message: full, responseId, usage, streaming: true, transport: 'openai_responses_stream' };
      return;
    }
  } catch (error) {
    if (error?.code === 'AI_CANCELLED' || error?.message === 'AI_CANCELLED') throw error;
    // Fall through to non-stream complete + progressive UI chunks
  }

  if (signal?.aborted) {
    throw Object.assign(new Error('AI_CANCELLED'), { code: 'AI_CANCELLED' });
  }
  const response = await openai.responses.create(request);
  const answer = String(response.output_text || '');
  yield {
    kind: 'status',
    streaming: false,
    transport: 'progressive_after_complete',
    note: 'Provider stream unavailable; delivering completed response progressively.'
  };
  for (const chunk of chunkText(answer, 48)) {
    if (signal?.aborted) {
      throw Object.assign(new Error('AI_CANCELLED'), { code: 'AI_CANCELLED' });
    }
    yield { kind: 'delta', text: chunk, streaming: false, transport: 'progressive_after_complete' };
  }
  yield {
    kind: 'done',
    message: answer,
    responseId: response.id,
    usage: response.usage || null,
    streaming: false,
    transport: 'progressive_after_complete',
    response
  };
}

export function chunkText(text, size = 48) {
  const s = String(text || '');
  const out = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}

/** Test helper: consume async iterator into arrays. */
export async function collectStream(iterable) {
  const deltas = [];
  let done = null;
  for await (const item of iterable) {
    if (item.kind === 'delta') deltas.push(item.text);
    if (item.kind === 'done') done = item;
  }
  return { deltas, done, text: deltas.join('') };
}
