/** Integer-only money helpers — reject floats for financial fields. */
export function assertIntegerAmount(value, label = 'amount') {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    const err = new Error(`INVALID_INTEGER_${String(label).toUpperCase()}`);
    err.code = 'INVALID_INTEGER_AMOUNT';
    throw err;
  }
  return n;
}

export function integerQuantity(value, { min = 1, max = 99 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    const err = new Error('INVALID_QUANTITY');
    err.code = 'INVALID_QUANTITY';
    throw err;
  }
  return Math.max(min, Math.min(max, n));
}
