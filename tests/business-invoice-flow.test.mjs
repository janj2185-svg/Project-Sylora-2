import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  computeInvoiceTotals,
  createInvoiceDraft,
  createQuote,
  renderInvoicePdfText,
  issueInvoiceDocument
} from '../src/ecosystem/business-finance.mjs';

async function startServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-biz-'));
  process.env.SYLORA_DATA_FILE = path.join(dir, 'data.json');
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  process.env.OPENAI_API_KEY = '';
  process.env.NODE_ENV = 'test';
  const { server } = await import(`../src/server.mjs?biz=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}`, dir };
}

async function req(base, pathname, { method = 'GET', token, body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${pathname}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

test('invoice calculations: qty, unit, discount, tax, net, gross, rounding, currency', () => {
  const items = [
    { description: 'Design', quantity: 2, unitNetPrice: 100, taxRate: 23 },
    { description: 'Hosting', quantity: 1, unitNetPrice: 49.99, taxRate: 23 }
  ];
  const t = computeInvoiceTotals(items, { discountPercent: 10 });
  // net before discount = 200 + 49.99 = 249.99; after 10% = 224.991 → 224.99
  assert.equal(t.net, 224.99);
  assert.ok(t.tax > 0);
  assert.equal(t.gross, Math.round((t.net + t.tax) * 100) / 100);
  assert.equal(t.discount, 25);
  assert.equal(t.currencyRounding, 'half_up_2dp');

  const draft = createInvoiceDraft({
    items,
    currency: 'PLN',
    countryCode: 'PL',
    discountPercent: 10,
    seller: { name: 'Studio' },
    buyer: { name: 'Client Co' }
  });
  assert.equal(draft.currency, 'PLN');
  assert.equal(draft.net, t.net);
  const pdf = renderInvoicePdfText(draft);
  assert.match(pdf, /INVOICE/);
  assert.match(pdf, /PLN/);
  issueInvoiceDocument(draft);
  assert.equal(draft.status, 'issued');
  assert.equal(draft.pdfReady, true);
  assert.ok(draft.pdfText.includes('Gross'));

  const q = createQuote({ items, discount: 5, currency: 'EUR', clientId: 'c1' });
  assert.equal(q.currency, 'EUR');
  assert.ok(q.gross <= computeInvoiceTotals(items).gross);
});

test('API: Client → Quote → Accept → Invoice → Issue → PDF → payment status', async () => {
  const { server, base, dir } = await startServer();
  try {
    const reg = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { username: 'bizowner', email: 'bizowner@ex.com', password: 'password12' }
    });
    const token = reg.data.token;

    const crm = await req(base, '/api/business/crm', {
      method: 'POST',
      token,
      body: { type: 'client', name: 'Acme Labs' }
    });
    assert.equal(crm.status, 201);
    const clientId = crm.data.record.id;

    const quote = await req(base, '/api/business/quotes', {
      method: 'POST',
      token,
      body: {
        clientId,
        currency: 'EUR',
        discount: 0,
        items: [{ description: 'Consulting', quantity: 3, unitNetPrice: 80, taxRate: 23 }]
      }
    });
    assert.equal(quote.status, 201);
    assert.equal(quote.data.quote.clientId, clientId);

    const listQ = await req(base, '/api/business/quotes', { token });
    assert.ok(listQ.data.quotes.some(q => q.id === quote.data.quote.id));

    const accepted = await req(base, `/api/business/quotes/${quote.data.quote.id}/accept`, {
      method: 'POST',
      token,
      body: { convertTo: 'invoice_draft' }
    });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.data.quote.status, 'accepted');
    assert.equal(accepted.data.converted.status, 'draft');
    const invoiceId = accepted.data.converted.id;

    const issued = await req(base, `/api/business/invoices/${invoiceId}/issue`, {
      method: 'POST',
      token,
      body: {}
    });
    assert.equal(issued.status, 200);
    assert.equal(issued.data.invoice.status, 'issued');
    assert.equal(issued.data.invoice.pdfReady, true);

    const pdf = await req(base, `/api/business/invoices/${invoiceId}/pdf`, { token });
    assert.equal(pdf.status, 200);
    assert.match(pdf.data.pdf.text, /Gross/);

    const paid = await req(base, `/api/business/invoices/${invoiceId}/status`, {
      method: 'POST',
      token,
      body: { status: 'paid' }
    });
    assert.equal(paid.status, 200);
    assert.equal(paid.data.invoice.status, 'paid');
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
