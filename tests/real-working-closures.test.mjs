import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chunkText, collectStream, streamSyloraResponse } from '../src/ai-stream.mjs';
import { createCommerceItem, lumenTestCheckout } from '../src/ecosystem/commerce.mjs';

test('ai-stream progressive fallback + chunk helper', async () => {
  assert.deepEqual(chunkText('abcdef', 2), ['ab', 'cd', 'ef']);
  const openai = {
    responses: {
      async create(req) {
        if (req.stream) throw new Error('stream_unavailable');
        return { id: 'resp_1', output_text: 'Hello world from Sylora', usage: { input_tokens: 1, output_tokens: 2 } };
      }
    }
  };
  const long = 'Hello world from Sylora. '.repeat(8);
  openai.responses.create = async (req) => {
    if (req.stream) throw new Error('stream_unavailable');
    return { id: 'resp_1', output_text: long, usage: { input_tokens: 1, output_tokens: 2 } };
  };
  const { deltas, done, text } = await collectStream(streamSyloraResponse(openai, { model: 'x' }));
  assert.ok(deltas.length >= 2);
  assert.equal(text, long);
  assert.equal(done.transport, 'progressive_after_complete');
  assert.equal(done.streaming, false);
});

test('ai-stream native token deltas when provider streams', async () => {
  async function* fakeStream() {
    yield { type: 'response.created', response: { id: 'r2' } };
    yield { type: 'response.output_text.delta', delta: 'Hi ' };
    yield { type: 'response.output_text.delta', delta: 'there' };
    yield { type: 'response.completed', response: { id: 'r2', output_text: 'Hi there', usage: { input_tokens: 3, output_tokens: 2 } } };
  }
  const openai = {
    responses: {
      async create(req) {
        assert.equal(req.stream, true);
        return fakeStream();
      }
    }
  };
  const { text, done } = await collectStream(streamSyloraResponse(openai, { model: 'x' }));
  assert.equal(text, 'Hi there');
  assert.equal(done.transport, 'openai_responses_stream');
  assert.equal(done.streaming, true);
});

test('commerce test_lumen checkout is real wallet ledger (not mock sandbox)', () => {
  const item = createCommerceItem({
    id: 'item1', creatorId: 'c1', type: 'digital_product', title: 'Pack', price: 100, paymentMode: 'sandbox'
  });
  assert.equal(item.paymentMode, 'test_lumen');
  assert.equal(item.status, 'listed_test_lumen');
  const buyer = { userId: 'b1', balance: 500, earnings: 0, currency: 'LUMEN' };
  const creator = { userId: 'c1', balance: 0, earnings: 10, currency: 'LUMEN' };
  const out = lumenTestCheckout({ id: 'ord1', buyerId: 'b1', item, buyerWallet: buyer, creatorWallet: creator });
  assert.equal(out.ok, true);
  assert.equal(out.order.status, 'paid_test_lumen');
  assert.equal(buyer.balance, 400);
  assert.equal(creator.earnings, 95); // 100 - 15% fee
  assert.equal(out.ledgerEntries.length, 1);
  const blocked = lumenTestCheckout({
    id: 'ord2', buyerId: 'b1',
    item: { ...item, paymentMode: 'production' },
    buyerWallet: buyer, creatorWallet: creator
  });
  assert.equal(blocked.error, 'PAYMENT_PROVIDER_REQUIRED');
});

test('DM attachments + companion boundary + invoice settlement + commerce API', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-close-'));
  process.env.NODE_ENV = 'test';
  process.env.SYLORA_DATA_FILE = path.join(dir, 'db.json');
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  delete process.env.OPENAI_API_KEY;

  const { server } = await import(`../src/server.mjs?close=${Date.now()}`);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (pathname, options = {}) => {
    const response = await fetch(`${base}${pathname}`, {
      ...options,
      headers: { ...(options.headers || {}) }
    });
    const ct = response.headers.get('content-type') || '';
    const data = ct.includes('json') ? await response.json().catch(() => ({})) : {};
    return { status: response.status, data };
  };

  try {
    const a = await call('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@close.dev', username: 'closera', password: 'password123' })
    });
    const b = await call('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'b@close.dev', username: 'closerb', password: 'password123' })
    });
    const authA = { authorization: `Bearer ${a.data.token}`, 'content-type': 'application/json' };
    const authB = { authorization: `Bearer ${b.data.token}`, 'content-type': 'application/json' };

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const up = await fetch(`${base}/api/media/upload`, {
      method: 'POST',
      headers: { authorization: authA.authorization, 'content-type': 'image/png' },
      body: png
    });
    const uploaded = await up.json();
    assert.equal(up.status, 201);
    assert.equal(uploaded.media.kind, 'image');

    const convo = await call('/api/conversations', {
      method: 'POST', headers: authA, body: JSON.stringify({ userId: b.data.user.id })
    });
    const msg = await call(`/api/conversations/${convo.data.conversation.id}/messages`, {
      method: 'POST',
      headers: authA,
      body: JSON.stringify({ text: 'see this', mediaId: uploaded.media.id, clientId: 'c-att-1' })
    });
    assert.equal(msg.status, 201);
    assert.equal(msg.data.message.attachment.mediaId, uploaded.media.id);
    assert.match(msg.data.message.attachment.url, /^\/media\//);

    const listed = await call(`/api/conversations/${convo.data.conversation.id}/messages`, { headers: authB });
    assert.equal(listed.status, 200);
    assert.ok(listed.data.messages.some(m => m.attachment?.mediaId === uploaded.media.id));

    const boundary = await call('/api/studio/companion-boundary');
    assert.equal(boundary.status, 200);
    assert.equal(boundary.data.status, 'working_local');

    // Invoice manual settlement honesty
    const invCreate = await call('/api/business/invoices', {
      method: 'POST',
      headers: authA,
      body: JSON.stringify({
        items: [{ description: 'Work', quantity: 1, unitNetPrice: 100, taxRate: 0 }],
        seller: { name: 'Seller' },
        buyer: { name: 'Client' }
      })
    });
    assert.equal(invCreate.status, 201, JSON.stringify(invCreate.data));
    const invId = invCreate.data.invoice.id;
    await call(`/api/business/invoices/${invId}/issue`, { method: 'POST', headers: authA, body: '{}' });
    const paid = await call(`/api/business/invoices/${invId}/status`, {
      method: 'POST', headers: authA, body: JSON.stringify({ status: 'paid' })
    });
    assert.equal(paid.status, 200);
    assert.equal(paid.data.invoice.status, 'paid');
    assert.equal(paid.data.invoice.settlement, 'manual_bookkeeping');

    // Fund buyer wallet via gifts starter already 10000 — create product + checkout
    const product = await call('/api/commerce/products', {
      method: 'POST',
      headers: authB,
      body: JSON.stringify({ type: 'digital_product', title: 'Pack', price: 50 })
    });
    assert.equal(product.status, 201, JSON.stringify(product.data));
    const products = await call('/api/commerce/products', { headers: authA });
    assert.equal(products.data.paymentMode, 'test_lumen');
    const checkout = await call(`/api/commerce/products/${product.data.product.id}/checkout`, {
      method: 'POST',
      headers: authA,
      body: '{}'
    });
    assert.equal(checkout.status, 201, JSON.stringify(checkout.data));
    assert.equal(checkout.data.order?.status, 'paid_test_lumen');

    // Frontend wiring smoke
    const appJs = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
    assert.match(appJs, /recreateLiveViewerPeer/);
    assert.match(appJs, /dmAttachBtn/);
    assert.match(appJs, /google_token/);
    assert.match(appJs, /mediaId/);
  } finally {
    await new Promise(r => server.close(r));
  }
});
