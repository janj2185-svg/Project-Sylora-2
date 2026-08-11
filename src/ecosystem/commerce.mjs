import { assertIntegerAmount } from '../wallet-integers.mjs';

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
  paymentMode = 'test_lumen'
}) {
  if (!COMMERCE_PRODUCT_TYPES.includes(type)) throw new Error('INVALID_COMMERCE_TYPE');
  // sandbox kept as alias for test_lumen; production stays blocked without PSP
  if (!['sandbox', 'test_lumen', 'production'].includes(paymentMode)) throw new Error('INVALID_PAYMENT_MODE');
  const mode = paymentMode === 'sandbox' ? 'test_lumen' : paymentMode;
  const priceInt = assertIntegerAmount(Math.max(0, Math.trunc(Number(price) || 0)), 'price');
  return {
    id,
    creatorId,
    type,
    title: String(title || '').slice(0, 120),
    description: String(description || '').slice(0, 2000),
    price: priceInt,
    currency,
    paymentMode: mode,
    status: mode === 'production' ? 'blocked_until_provider' : 'listed_test_lumen',
    createdAt: new Date().toISOString()
  };
}

/**
 * Real TEST LUMEN checkout — debits buyer, credits creator earnings.
 * Not a card/PSP capture. Production mode requires SYLORA_PAYMENT_*.
 */
export function lumenTestCheckout({
  id,
  buyerId,
  item,
  buyerWallet,
  creatorWallet,
  platformFeeBps = 1500,
  now = new Date().toISOString()
}) {
  if (!item) return { ok: false, error: 'ITEM_NOT_FOUND' };
  if (item.paymentMode === 'production') {
    return { ok: false, error: 'PAYMENT_PROVIDER_REQUIRED', status: 'blocked_external' };
  }
  if (item.creatorId === buyerId) return { ok: false, error: 'CANNOT_BUY_OWN_ITEM' };
  if (!buyerWallet || !creatorWallet) return { ok: false, error: 'WALLET_NOT_FOUND' };

  let gross;
  try {
    gross = assertIntegerAmount(item.price, 'price');
  } catch {
    return { ok: false, error: 'INVALID_PRICE' };
  }
  if (gross <= 0) return { ok: false, error: 'INVALID_PRICE' };

  const balance = assertIntegerAmount(buyerWallet.balance ?? 0, 'balance');
  if (balance < gross) return { ok: false, error: 'INSUFFICIENT_BALANCE' };

  const platformFee = Math.floor(gross * platformFeeBps / 10000);
  const creatorNet = gross - platformFee;

  buyerWallet.balance = balance - gross;
  if (creatorWallet.earnings == null) creatorWallet.earnings = 0;
  creatorWallet.earnings = assertIntegerAmount(creatorWallet.earnings, 'earnings') + creatorNet;

  const order = {
    id,
    buyerId,
    itemId: item.id,
    creatorId: item.creatorId,
    gross,
    platformFee,
    creatorNet,
    currency: item.currency || 'LUMEN',
    mode: 'test_lumen',
    status: 'paid_test_lumen',
    honesty: {
      state: 'test_lumen_ledger',
      note: 'TEST LUMEN wallet transfer completed. Not a real-world payment capture.'
    },
    createdAt: now
  };

  const ledgerEntries = [
    {
      id: `${id}-debit`,
      type: 'commerce_purchase',
      fromUserId: buyerId,
      toUserId: item.creatorId,
      amount: gross,
      grossAmount: gross,
      creatorAmount: creatorNet,
      platformAmount: platformFee,
      currency: 'LUMEN',
      itemId: item.id,
      correlationId: id,
      createdAt: now
    }
  ];

  return { ok: true, order, ledgerEntries, buyerBalance: buyerWallet.balance, creatorEarnings: creatorWallet.earnings };
}

/** @deprecated alias — use lumenTestCheckout */
export function sandboxCheckout(args) {
  return lumenTestCheckout(args);
}
