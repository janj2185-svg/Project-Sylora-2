export const COMMERCE_PRODUCT_TYPES = Object.freeze([
  'subscription', 'membership', 'digital_product', 'course', 'event',
  'ticket', 'consultation', 'service', 'affiliate', 'physical',
  'tip', 'premium_community', 'paid_content'
]);

export function createCommerceItem({
  id,
  creatorId,
  type,
  title,
  description = '',
  price = 0,
  currency = 'LUMEN',
  paymentMode = 'sandbox'
}) {
  if (!COMMERCE_PRODUCT_TYPES.includes(type)) throw new Error('INVALID_COMMERCE_TYPE');
  if (!['sandbox', 'production'].includes(paymentMode)) throw new Error('INVALID_PAYMENT_MODE');
  return {
    id,
    creatorId,
    type,
    title: String(title || '').slice(0, 120),
    description: String(description || '').slice(0, 2000),
    price: Math.max(0, Number(price) || 0),
    currency,
    paymentMode,
    status: paymentMode === 'production' ? 'blocked_until_provider' : 'sandbox_listed',
    createdAt: new Date().toISOString()
  };
}

/** Sandbox only — never claim real PSP capture. Production mode stays blocked until provider secrets exist. */
export function sandboxCheckout({ id, buyerId, item, platformFeeBps = 1500 }) {
  if (item.paymentMode === 'production') {
    return { ok: false, error: 'PAYMENT_PROVIDER_REQUIRED' };
  }
  const gross = item.price;
  const platformFee = Math.floor(gross * platformFeeBps / 10000);
  const creatorNet = gross - platformFee;
  return {
    ok: true,
    order: {
      id,
      buyerId,
      itemId: item.id,
      creatorId: item.creatorId,
      gross,
      platformFee,
      creatorNet,
      currency: item.currency,
      mode: 'sandbox',
      status: 'sandbox_paid',
      honesty: {
        state: 'sandbox_not_real_payment',
        note: 'Sandbox marker only. Real card/PSP success requires SYLORA_PAYMENT_* credentials.'
      },
      createdAt: new Date().toISOString()
    }
  };
}
