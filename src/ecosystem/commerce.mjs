/** Creator Commerce foundation — sandbox vs production payment boundary. */

export function ensureCommerce(store) {
  store.data.commerceProducts ??= [];
  store.data.commerceOrders ??= [];
  store.data.commerceSubscriptions ??= [];
  store.data.commerceMemberships ??= [];
  store.data.payoutRequests ??= [];
  store.data.refundRequests ??= [];
  return store;
}

export function paymentMode(env = process.env) {
  if (env.SYLORA_PAYMENT_PROVIDER && env.SYLORA_PAYMENT_SECRET_KEY) return 'production_ready_config';
  if (env.SYLORA_PAYMENT_PROVIDER) return 'provider_selected_missing_secrets';
  return 'sandbox';
}

export function createProduct(store, {
  id, creatorId, type, title, priceCents = 0, currency = 'USD', metadata = {}
}, now) {
  ensureCommerce(store);
  const allowed = ['subscription', 'membership', 'digital', 'course', 'event', 'ticket', 'consulting', 'service', 'affiliate', 'physical', 'tip', 'premium_community', 'paid_content'];
  if (!allowed.includes(type)) throw new Error('PRODUCT_TYPE_INVALID');
  const product = {
    id,
    creatorId,
    type,
    title: String(title || '').slice(0, 120),
    priceCents: Math.max(0, Number(priceCents) || 0),
    currency,
    metadata,
    active: true,
    createdAt: now()
  };
  if (!product.title) throw new Error('PRODUCT_TITLE_REQUIRED');
  store.data.commerceProducts.push(product);
  store.save();
  return product;
}

export function createSandboxOrder(store, { id, buyerId, productId }, now, env = process.env) {
  ensureCommerce(store);
  const product = store.data.commerceProducts.find(p => p.id === productId && p.active);
  if (!product) throw new Error('PRODUCT_NOT_FOUND');
  const mode = paymentMode(env);
  if (mode === 'production_ready_config') {
    // Explicitly do not charge here without a verified provider adapter + webhook.
    throw new Error('PAYMENT_PROVIDER_ADAPTER_REQUIRED');
  }
  const order = {
    id,
    buyerId,
    productId,
    creatorId: product.creatorId,
    amountCents: product.priceCents,
    currency: product.currency,
    status: product.priceCents === 0 ? 'fulfilled' : 'sandbox_completed',
    paymentMode: 'sandbox',
    createdAt: now()
  };
  store.data.commerceOrders.push(order);
  store.save();
  return order;
}

export function revenueDashboard(store, creatorId) {
  ensureCommerce(store);
  const products = store.data.commerceProducts.filter(p => p.creatorId === creatorId);
  const orders = store.data.commerceOrders.filter(o => o.creatorId === creatorId);
  const sandboxCents = orders.reduce((sum, o) => sum + (o.amountCents || 0), 0);
  return {
    products: products.length,
    orders: orders.length,
    sandboxRevenueCents: sandboxCents,
    paymentMode: paymentMode(),
    payoutsEnabled: false,
    note: 'Sandbox/demo payments are separated from production payouts.'
  };
}
