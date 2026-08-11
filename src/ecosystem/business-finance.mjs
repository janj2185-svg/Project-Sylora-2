/**
 * Business Operating Hub + Finance foundations (199–217).
 * Not a bank. Country-aware invoicing adapters (not invented compliance).
 * Sylora drafts only — confirmation before send/post.
 */

import { randomUUID } from 'node:crypto';

const createId = (prefix = 'id') => `${prefix}_${randomUUID()}`;

export const BUSINESS_HUB_SECTIONS = Object.freeze([
  "dashboard",
  "companies",
  "clients",
  "projects",
  "tasks",
  "calendar",
  "meetings",
  "documents",
  "finance",
  "invoices",
  "expenses",
  "contracts",
  "legal",
  "team",
  "reports",
  "sylora_business",
  "crm",
  "quotes",
  "time",
  "accounting",
  "vault"
]);

export const INVOICE_STATUSES = Object.freeze([
  "draft",
  "issued",
  "sent",
  "paid",
  "partially_paid",
  "overdue",
  "cancelled",
  "corrected"
]);

/** Country profiles — configure currency/tax; do not infer from IP alone. */
export const COUNTRY_INVOICE_ADAPTERS = Object.freeze({
  PL: {
    country: "PL",
    currency: "PLN",
    dateFormat: "YYYY-MM-DD",
    taxLabel: "VAT",
    taxRates: [0, 5, 8, 23],
    requiresTaxId: true,
    eInvoicingNote:
      "Poland e-invoicing (KSeF / official APIs) must be verified against current law before production. Adapter stub only — no invented compliance.",
    adapterStatus: "architecture_stub"
  },
  UA: {
    country: "UA",
    currency: "UAH",
    dateFormat: "DD.MM.YYYY",
    taxLabel: "ПДВ",
    taxRates: [0, 20],
    requiresTaxId: true,
    eInvoicingNote: "Verify current UA fiscal/e-document rules before production.",
    adapterStatus: "architecture_stub"
  },
  DE: {
    country: "DE",
    currency: "EUR",
    dateFormat: "DD.MM.YYYY",
    taxLabel: "MwSt",
    taxRates: [0, 7, 19],
    requiresTaxId: true,
    eInvoicingNote: "Verify XRechnung/Peppol and current DE rules before production.",
    adapterStatus: "architecture_stub"
  },
  US: {
    country: "US",
    currency: "USD",
    dateFormat: "MM/DD/YYYY",
    taxLabel: "Sales tax",
    taxRates: [0],
    requiresTaxId: false,
    eInvoicingNote: "State-specific sales tax — configure per business; not a bank.",
    adapterStatus: "architecture_stub"
  },
  DEFAULT: {
    country: "DEFAULT",
    currency: "EUR",
    dateFormat: "YYYY-MM-DD",
    taxLabel: "Tax",
    taxRates: [0],
    requiresTaxId: false,
    eInvoicingNote: "Generic template. Select operating country explicitly. Verify local requirements before production.",
    adapterStatus: "architecture_stub"
  }
});

export function resolveCountryAdapter(countryCode = "DEFAULT") {
  const code = String(countryCode || "DEFAULT").toUpperCase();
  return COUNTRY_INVOICE_ADAPTERS[code] || COUNTRY_INVOICE_ADAPTERS.DEFAULT;
}

export function createBusinessCountryProfile({ countryCode, currency, timezone } = {}) {
  const adapter = resolveCountryAdapter(countryCode);
  return {
    id: createId("biz-country"),
    countryCode: adapter.country,
    currency: currency || adapter.currency,
    dateFormat: adapter.dateFormat,
    taxLabel: adapter.taxLabel,
    taxRates: [...adapter.taxRates],
    timezone: timezone || null,
    eInvoicingNote: adapter.eInvoicingNote,
    adapterStatus: adapter.adapterStatus,
    selectedByUser: true,
    notInferredFromIp: true,
    createdAt: new Date().toISOString()
  };
}

export function computeInvoiceTotals(items = [], { taxInclusive = false } = {}) {
  let net = 0;
  let tax = 0;
  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    const unit = Number(item.unitNetPrice ?? item.unitPrice) || 0;
    const rate = Number(item.taxRate) || 0;
    const lineNet = qty * unit;
    const lineTax = taxInclusive ? 0 : lineNet * (rate / 100);
    net += lineNet;
    tax += lineTax;
  }
  const gross = net + tax;
  return {
    net: Math.round(net * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    gross: Math.round(gross * 100) / 100
  };
}

export function createInvoiceDraft({
  seller = {},
  buyer = {},
  items = [],
  currency,
  countryCode,
  paymentMethod = "",
  paymentDeadline = null,
  bankDetails = "",
  notes = "",
  issueDate = null,
  saleDate = null,
  invoiceNumber = null
} = {}) {
  const adapter = resolveCountryAdapter(countryCode);
  const totals = computeInvoiceTotals(items);
  return {
    id: createId("invoice"),
    invoiceNumber: invoiceNumber || `DRAFT-${Date.now().toString(36).toUpperCase()}`,
    status: "draft",
    countryCode: adapter.country,
    currency: currency || adapter.currency,
    issueDate: issueDate || new Date().toISOString().slice(0, 10),
    saleDate: saleDate || null,
    seller: {
      name: seller.name || "",
      taxId: seller.taxId || "",
      address: seller.address || ""
    },
    buyer: {
      name: buyer.name || "",
      taxId: buyer.taxId || "",
      address: buyer.address || ""
    },
    items: items.map((it) => ({
      description: it.description || it.name || "",
      quantity: Number(it.quantity) || 1,
      unit: it.unit || "pcs",
      unitNetPrice: Number(it.unitNetPrice ?? it.unitPrice) || 0,
      taxRate: Number(it.taxRate) || 0
    })),
    ...totals,
    paymentMethod,
    paymentDeadline,
    bankDetails,
    notes,
    taxLabel: adapter.taxLabel,
    adapterStatus: adapter.adapterStatus,
    eInvoicingNote: adapter.eInvoicingNote,
    notABank: true,
    pdfReady: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function createExpenseExtraction({ rawText = "", extracted = {} } = {}) {
  return {
    id: createId("expense-extract"),
    status: "pending_user_confirmation",
    rawText: String(rawText || "").slice(0, 4000),
    extracted: {
      seller: extracted.seller || null,
      date: extracted.date || null,
      amount: extracted.amount ?? null,
      tax: extracted.tax ?? null,
      category: extracted.category || null,
      currency: extracted.currency || null
    },
    confirmed: false,
    postedToLedger: false,
    note: "User must confirm extracted financial data before accounting record.",
    createdAt: new Date().toISOString()
  };
}

export function confirmExpenseExtraction(extraction, overrides = {}) {
  if (!extraction) throw new Error("Extraction required");
  return {
    ...extraction,
    extracted: { ...extraction.extracted, ...overrides },
    confirmed: true,
    status: "confirmed",
    confirmedAt: new Date().toISOString()
  };
}

export function createCrmRecord({
  type = "client",
  name = "",
  companyId = null,
  status = "new",
  notes = "",
  ownerId = null
} = {}) {
  const allowed = new Set(["client", "lead", "contact", "company", "opportunity"]);
  return {
    id: createId("crm"),
    type: allowed.has(type) ? type : "client",
    name: String(name || "Untitled").slice(0, 200),
    companyId,
    status,
    notes: String(notes || "").slice(0, 4000),
    ownerId,
    tasks: [],
    meetings: [],
    documents: [],
    invoices: [],
    integratedWithBusiness: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function createQuote({
  clientId = null,
  items = [],
  currency = "EUR",
  discount = 0,
  validUntil = null,
  notes = "",
  countryCode = "DEFAULT"
} = {}) {
  const totals = computeInvoiceTotals(items);
  const discounted = Math.max(0, totals.gross * (1 - (Number(discount) || 0) / 100));
  return {
    id: createId("quote"),
    status: "draft",
    clientId,
    countryCode,
    currency,
    items,
    discount: Number(discount) || 0,
    ...totals,
    totalAfterDiscount: Math.round(discounted * 100) / 100,
    validUntil,
    notes,
    acceptanceConvertsTo: ["project", "invoice_draft"],
    createdAt: new Date().toISOString()
  };
}

export function createTimeEntry({
  userId,
  projectId = null,
  taskId = null,
  clientId = null,
  startedAt = null,
  endedAt = null,
  billable = true,
  note = ""
} = {}) {
  const start = startedAt || new Date().toISOString();
  return {
    id: createId("time"),
    userId,
    projectId,
    taskId,
    clientId,
    startedAt: start,
    endedAt: endedAt || null,
    pausedAt: null,
    status: endedAt ? "stopped" : "running",
    billable: Boolean(billable),
    note: String(note || "").slice(0, 1000),
    visibleToWorker: true,
    notHiddenSurveillance: true,
    createdAt: new Date().toISOString()
  };
}

export function createProjectBudget({
  projectId,
  estimatedCost = 0,
  actualCost = 0,
  income = 0,
  expenses = 0,
  hours = 0
} = {}) {
  const margin = Number(income) - Number(actualCost || expenses);
  return {
    id: createId("budget"),
    projectId,
    estimatedCost: Number(estimatedCost) || 0,
    actualCost: Number(actualCost) || 0,
    income: Number(income) || 0,
    expenses: Number(expenses) || 0,
    hours: Number(hours) || 0,
    margin: Math.round(margin * 100) / 100,
    updatedAt: new Date().toISOString()
  };
}

export function createInventoryItem({
  name,
  quantity = 0,
  purchasePrice = 0,
  supplier = "",
  alertBelow = null
} = {}) {
  return {
    id: createId("inv"),
    name: String(name || "Item").slice(0, 200),
    quantity: Number(quantity) || 0,
    purchasePrice: Number(purchasePrice) || 0,
    supplier: String(supplier || "").slice(0, 200),
    alertBelow: alertBelow == null ? null : Number(alertBelow),
    optionalModule: true,
    createdAt: new Date().toISOString()
  };
}

export function createAccountantInvite({ ownerId, accountantUserId, scopes = null } = {}) {
  const allowed = scopes || ["invoices", "expenses", "documents", "reports"];
  return {
    id: createId("acct-invite"),
    ownerId,
    accountantUserId,
    role: "ACCOUNTANT",
    scopes: allowed,
    deniedByDefault: ["private_chats", "personal_messages", "unrelated_modules"],
    status: "pending",
    createdAt: new Date().toISOString()
  };
}

export function financeAssistantGuard(action = "query") {
  return {
    canQuery: true,
    canDraftInvoice: true,
    canSendWithoutConfirmation: false,
    action,
    note: "Sylora Business Finance Assistant prepares drafts and answers. Sending financial documents requires explicit user confirmation. SYLORA is not a bank."
  };
}

export function legalAssistantDisclaimer() {
  return {
    informationalOnly: true,
    notLegalAdvice: true,
    note: "Sylora Legal Assistant provides informational help. High-risk legal matters require a qualified professional. This does not replace professional legal counsel."
  };
}

export function createContractRecord({ title = "", versions = [], notes = "" } = {}) {
  return {
    id: createId("contract"),
    title: String(title || "Contract").slice(0, 200),
    versions: versions.length
      ? versions
      : [{ version: 1, uploadedAt: new Date().toISOString(), label: "v1" }],
    notes: String(notes || "").slice(0, 4000),
    signIntegration: "architecture_stub",
    disclaimer: legalAssistantDisclaimer(),
    createdAt: new Date().toISOString()
  };
}

export const ACCOUNTING_EXPORT_FORMATS = Object.freeze(["csv", "xlsx", "pdf", "country_specific_future"]);

export function buildAccountingExportMeta({ format = "csv", countryCode = "DEFAULT" } = {}) {
  const fmt = ACCOUNTING_EXPORT_FORMATS.includes(format) ? format : "csv";
  return {
    format: fmt,
    countryCode,
    purpose: "hand_off_to_accountant",
    includes: ["income_register", "expense_register", "invoice_register", "payment_status"],
    note: "Country/accounting-system-specific formats are future adapters — not invented here."
  };
}
