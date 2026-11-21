import crypto from 'node:crypto';
import {
  getMissingInterswitchCredentials,
  getServerConfig,
  type InterswitchEnvironment,
} from '../config/env.ts';
import {
  AUTHORITATIVE_ORDER_CATALOG,
  getPaymentByReference,
  getWebhookEventByEventId,
  listAllPaymentRecords,
  listAllWebhookEvents,
  savePaymentRecord,
  saveWebhookEvent,
  updatePaymentRecord,
  type ServerPaymentRecord,
} from './paymentStore.ts';
import { recordServerAudit } from './auditService.ts';

export type PaymentCategory =
  | 'Subscription'
  | 'Consultation'
  | 'Laboratory'
  | 'Pharmacy'
  | 'Equipment Rental'
  | 'Wallet Top-Up';

export interface InitializePaymentInput {
  orderId?: string;
  amountNgn?: number;
  category?: PaymentCategory;
  description?: string;
  method?: 'Interswitch Card' | 'Interswitch Bank Transfer' | 'Interswitch USSD';
  customerUid?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  siteRedirectUrl?: string;
}

export interface InterswitchInlineCheckoutPayload {
  merchant_code: string;
  pay_item_id: string;
  txn_ref: string;
  amount: number; // Minor currency units (kobo for NGN)
  currency: 566;
  cust_name: string;
  cust_email: string;
  cust_phone?: string;
  pay_item_name: string;
  site_redirect_url: string;
  mode: 'TEST' | 'LIVE';
}

export interface InterswitchWebRedirectFields {
  merchant_code: string;
  pay_item_id: string;
  site_redirect_url: string;
  txn_ref: string;
  amount: string; // Minor currency units (kobo) as string for HTML form POST
  currency: '566';
  cust_name: string;
  cust_email: string;
  pay_item_name: string;
}

export function getInterswitchInlineScriptUrl(env: InterswitchEnvironment): string {
  return env === 'production'
    ? 'https://newwebpay.interswitchng.com/inline-checkout.js'
    : 'https://newwebpay-sandbox.interswitchng.com/inline-checkout.js';
}

export function getInterswitchWebRedirectUrl(env: InterswitchEnvironment): string {
  return env === 'production'
    ? 'https://newwebpay.interswitchng.com/collections/w/pay'
    : 'https://newwebpay-sandbox.interswitchng.com/collections/w/pay';
}

export function getInterswitchVerifyUrl(
  env: InterswitchEnvironment,
  merchantCode: string,
  reference: string,
  amountKobo: number
): string {
  const base =
    env === 'production'
      ? 'https://webpay.interswitchng.com/collections/api/v2/gettransaction.json'
      : 'https://sandbox.interswitchng.com/collections/api/v1/gettransaction.json';
  const params = new URLSearchParams({
    merchantcode: merchantCode,
    transactionreference: reference,
    amount: String(amountKobo),
  });
  return `${base}?${params.toString()}`;
}

export function getInterswitchPassportTokenUrl(env: InterswitchEnvironment): string {
  return env === 'production'
    ? 'https://passport.k8.isw.la/passport/oauth/token'
    : 'https://sandbox.interswitchng.com/passport/oauth/token';
}

function generateUniqueTxnRef(): string {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `ISW-OYO-${Date.now()}-${rand}`;
}

function resolveSafeRedirectUrl(requestedUrl: string | undefined, fallbackUrl: string): string {
  if (!requestedUrl) return fallbackUrl;
  try {
    const parsed = new URL(requestedUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return fallbackUrl;
    }
    if (
      parsed.pathname === '/payment-response' ||
      parsed.pathname === '/payments' ||
      parsed.pathname === '/payments/callback'
    ) {
      return `${parsed.origin}${parsed.pathname}`;
    }
    return fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}

/**
 * Resolves authoritative server-side order details & amount.
 * Catalog orderIds ALWAYS override any browser-supplied amount.
 */
function resolveAuthoritativeOrder(input: InitializePaymentInput): {
  orderId: string;
  amountNgn: number;
  description: string;
  category: PaymentCategory;
} {
  if (input.orderId && AUTHORITATIVE_ORDER_CATALOG[input.orderId]) {
    const catalogItem = AUTHORITATIVE_ORDER_CATALOG[input.orderId];
    return {
      orderId: catalogItem.orderId,
      amountNgn: catalogItem.amountNgn,
      description: catalogItem.title,
      category: catalogItem.category,
    };
  }

  const amountNgn = Math.round(Number(input.amountNgn || 0));
  if (!Number.isFinite(amountNgn) || amountNgn < 500 || amountNgn > 2_000_000) {
    throw new Error('Server amount validation failed: order amount must be between NGN 500 and NGN 2,000,000.');
  }

  return {
    orderId: input.orderId?.trim() || `ORD-${Date.now()}`,
    amountNgn,
    description: (input.description || 'HealthConnect Oyo State Subscription').trim().slice(0, 200),
    category: input.category || 'Subscription',
  };
}

/**
 * Official Interswitch Web Checkout (Option 2 Web Redirect + Inline metadata) initialization.
 * Never exposes INTERSWITCH_SECRET_KEY.
 */
export function initializeInterswitchWebCheckout(input: InitializePaymentInput) {
  const cfg = getServerConfig();
  const missingCredentials = getMissingInterswitchCredentials(cfg);
  const resolved = resolveAuthoritativeOrder(input);
  const amountKobo = Math.round(resolved.amountNgn * 100);
  const txnRef = generateUniqueTxnRef();
  const now = new Date().toISOString();
  const siteRedirectUrl = resolveSafeRedirectUrl(input.siteRedirectUrl, cfg.interswitchCallbackUrl);
  const webRedirectUrl = getInterswitchWebRedirectUrl(cfg.interswitchEnvironment);

  const baseRecord: ServerPaymentRecord = {
    id: `pay-${crypto.randomBytes(6).toString('hex')}`,
    order_id: resolved.orderId,
    transaction_reference: txnRef,
    merchant_code: cfg.interswitchMerchantCode || 'UNCONFIGURED',
    amount: amountKobo,
    amount_ngn: resolved.amountNgn,
    currency: '566',
    payment_provider: 'interswitch',
    environment: cfg.interswitchEnvironment,
    payment_status: missingCredentials.length > 0 ? 'UNCONFIGURED' : 'PENDING',
    payment_method: input.method || 'Interswitch Web Redirect',
    customer_uid: input.customerUid || 'unknown',
    customer_name: (input.customerName || 'HealthConnect Oyo Member').trim().slice(0, 100),
    customer_email: (input.customerEmail || 'member@healthconnect-oyo.ng').trim().slice(0, 160),
    customer_phone: input.customerPhone?.trim().slice(0, 24) || undefined,
    description: resolved.description,
    category: resolved.category,
    created_at: now,
    updated_at: now,
  };

  if (missingCredentials.length > 0) {
    savePaymentRecord(baseRecord);
    return {
      configured: false,
      mode: 'sandbox-unconfigured' as const,
      environment: cfg.interswitchEnvironment,
      usingPublicSandboxDefaults: false,
      merchantCodeConfigured: Boolean(cfg.interswitchMerchantCode),
      missingCredentials,
      reference: txnRef,
      orderId: resolved.orderId,
      amountNgn: resolved.amountNgn,
      amountKobo,
      currency: '566' as const,
      scriptUrl: getInterswitchInlineScriptUrl(cfg.interswitchEnvironment),
      webRedirectUrl,
      message: `Interswitch Web Checkout cannot initialize real payments because required server environment variables are missing: ${missingCredentials.join(', ')}.`,
    };
  }

  savePaymentRecord(baseRecord);

  const checkoutPayload: InterswitchInlineCheckoutPayload = {
    merchant_code: cfg.interswitchMerchantCode,
    pay_item_id: cfg.interswitchPayItemId,
    txn_ref: txnRef,
    amount: amountKobo,
    currency: 566,
    cust_name: baseRecord.customer_name,
    cust_email: baseRecord.customer_email,
    ...(baseRecord.customer_phone ? { cust_phone: baseRecord.customer_phone } : {}),
    pay_item_name: resolved.description,
    site_redirect_url: siteRedirectUrl,
    mode: cfg.interswitchEnvironment === 'production' ? 'LIVE' : 'TEST',
  };

  const webRedirectFields: InterswitchWebRedirectFields = {
    merchant_code: cfg.interswitchMerchantCode,
    pay_item_id: cfg.interswitchPayItemId,
    site_redirect_url: siteRedirectUrl,
    txn_ref: txnRef,
    amount: String(amountKobo),
    currency: '566',
    cust_name: baseRecord.customer_name,
    cust_email: baseRecord.customer_email,
    pay_item_name: resolved.description,
  };

  return {
    configured: true,
    mode: cfg.interswitchEnvironment === 'production' ? ('production' as const) : ('sandbox' as const),
    environment: cfg.interswitchEnvironment,
    usingPublicSandboxDefaults: cfg.interswitchUsingPublicSandboxDefaults,
    merchantCodeConfigured: true,
    missingCredentials: [] as string[],
    reference: txnRef,
    orderId: resolved.orderId,
    amountNgn: resolved.amountNgn,
    amountKobo,
    currency: '566' as const,
    scriptUrl: getInterswitchInlineScriptUrl(cfg.interswitchEnvironment),
    webRedirectUrl,
    webRedirectFields,
    checkoutPayload,
    message: `Interswitch ${cfg.interswitchEnvironment.toUpperCase()} Web Redirect initialized. Click Make Payment to continue to Interswitch.`,
  };
}

/**
 * Legacy helper preserved for backwards-compatible `/api/payments/initialize` callers.
 */
export function initializeInterswitchPayment(input: InitializePaymentInput) {
  const init = initializeInterswitchWebCheckout(input);
  return {
    mode: init.configured ? ('live' as const) : ('sandbox-unconfigured' as const),
    merchantCodeConfigured: init.merchantCodeConfigured,
    reference: init.reference,
    amountKobo: init.amountKobo,
    currency: init.currency,
    message: init.message,
    checkoutPayload: init.checkoutPayload,
    scriptUrl: init.scriptUrl,
    missingCredentials: init.missingCredentials,
  };
}

export type FetchLike = typeof fetch;

async function fetchInterswitchAccessToken(
  env: InterswitchEnvironment,
  clientId: string,
  secretKey: string,
  fetchImpl: FetchLike
): Promise<string | null> {
  if (!clientId || !secretKey) return null;
  const basic = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
  const res = await fetchImpl(getInterswitchPassportTokenUrl(env), {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=profile',
  });
  if (!res.ok) {
    throw new Error(`Interswitch Passport token request failed with HTTP ${res.status}.`);
  }
  const body = (await res.json()) as { access_token?: string };
  return body.access_token || null;
}

/**
 * Official Server-to-Server Interswitch Verification (`gettransaction.json`).
 * Compares ResponseCode === "00", exact kobo amount, transaction reference, and currency.
 * Enforces idempotency so an already-PAID transaction is never processed twice.
 */
export async function verifyInterswitchTransactionByRef(
  transactionReference: string,
  options: { expectedAmountNgn?: number; fetchImpl?: FetchLike } = {}
) {
  const cfg = getServerConfig();
  const fetchImpl = options.fetchImpl || fetch;
  const record = getPaymentByReference(transactionReference);

  if (!record) {
    return {
      ok: false,
      httpStatus: 404,
      verified: false,
      idempotentReplay: false,
      mode: cfg.interswitchEnvironment,
      status: 'FAILED' as const,
      reference: transactionReference,
      message: 'Transaction reference not found in server payment ledger.',
    };
  }

  // Idempotency guard: already verified as PAID
  if (record.payment_status === 'PAID') {
    return {
      ok: true,
      httpStatus: 200,
      verified: true,
      idempotentReplay: true,
      mode: record.environment,
      status: 'PAID' as const,
      reference: record.transaction_reference,
      orderId: record.order_id,
      amountNgn: record.amount_ngn,
      currency: record.currency,
      verifiedAt: record.verified_at,
      message: 'Transaction was already verified and marked PAID (idempotent replay protected).',
    };
  }

  const missingCredentials = getMissingInterswitchCredentials(cfg);
  if (missingCredentials.length > 0) {
    return {
      ok: false,
      httpStatus: 503,
      verified: false,
      idempotentReplay: false,
      mode: 'sandbox-unconfigured' as const,
      status: 'UNCONFIGURED' as const,
      reference: record.transaction_reference,
      missingCredentials,
      message: `Cannot verify transaction with Interswitch because credentials are missing: ${missingCredentials.join(', ')}. Real payment is never simulated.`,
    };
  }

  // Optional sanity check if caller supplied an amount
  if (
    typeof options.expectedAmountNgn === 'number' &&
    Math.round(options.expectedAmountNgn * 100) !== record.amount
  ) {
    updatePaymentRecord(record.transaction_reference, {
      payment_status: 'AMOUNT_MISMATCH',
      gateway_response_description: 'Client amount did not match server-calculated order amount.',
    });
    return {
      ok: false,
      httpStatus: 400,
      verified: false,
      idempotentReplay: false,
      mode: cfg.interswitchEnvironment,
      status: 'AMOUNT_MISMATCH' as const,
      reference: record.transaction_reference,
      message: 'Amount mismatch detected against server-stored order total.',
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (cfg.interswitchClientId && cfg.interswitchSecretKey) {
    const accessToken = await fetchInterswitchAccessToken(
      cfg.interswitchEnvironment,
      cfg.interswitchClientId,
      cfg.interswitchSecretKey,
      fetchImpl
    );
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  const verifyUrl = getInterswitchVerifyUrl(
    cfg.interswitchEnvironment,
    cfg.interswitchMerchantCode,
    record.transaction_reference,
    record.amount
  );

  const response = await fetchImpl(verifyUrl, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    return {
      ok: false,
      httpStatus: 502,
      verified: false,
      idempotentReplay: false,
      mode: cfg.interswitchEnvironment,
      status: 'PENDING' as const,
      reference: record.transaction_reference,
      message: `Interswitch verification gateway returned HTTP ${response.status}.`,
    };
  }

  const data = (await response.json()) as {
    ResponseCode?: string;
    ResponseDescription?: string;
    Amount?: number;
    MerchantReference?: string;
    PaymentReference?: string;
    CurrencyCode?: string | number;
    Channel?: string;
  };

  const responseCode = String(data.ResponseCode || '');
  const returnedAmount = typeof data.Amount === 'number' ? data.Amount : Number(data.Amount);
  const returnedRef = data.MerchantReference || record.transaction_reference;
  const returnedCurrency =
    data.CurrencyCode !== undefined ? String(data.CurrencyCode) : '566';

  if (responseCode !== '00') {
    const failedStatus = responseCode === 'Z6' ? 'CANCELLED' : 'FAILED';
    updatePaymentRecord(record.transaction_reference, {
      payment_status: failedStatus,
      gateway_response_code: responseCode || 'ERR',
      gateway_response_description:
        data.ResponseDescription || 'Interswitch reported transaction was not successful.',
    });
    return {
      ok: false,
      httpStatus: 200,
      verified: false,
      idempotentReplay: false,
      mode: cfg.interswitchEnvironment,
      status: failedStatus,
      reference: record.transaction_reference,
      responseCode,
      message: data.ResponseDescription || 'Payment was not approved by Interswitch.',
    };
  }

  // Strict server-side integrity verification: reference, amount (kobo), currency (566)
  if (returnedRef !== record.transaction_reference) {
    updatePaymentRecord(record.transaction_reference, {
      payment_status: 'FAILED',
      gateway_response_code: 'REF_MISMATCH',
      gateway_response_description: 'Gateway transaction reference mismatch.',
    });
    return {
      ok: false,
      httpStatus: 400,
      verified: false,
      idempotentReplay: false,
      mode: cfg.interswitchEnvironment,
      status: 'FAILED' as const,
      reference: record.transaction_reference,
      message: 'Verified transaction reference did not match the requested order reference.',
    };
  }

  if (Number.isFinite(returnedAmount) && returnedAmount !== record.amount) {
    updatePaymentRecord(record.transaction_reference, {
      payment_status: 'AMOUNT_MISMATCH',
      gateway_response_code: 'AMT_MISMATCH',
      gateway_response_description: `Expected ${record.amount} kobo, gateway reported ${returnedAmount} kobo.`,
    });
    return {
      ok: false,
      httpStatus: 400,
      verified: false,
      idempotentReplay: false,
      mode: cfg.interswitchEnvironment,
      status: 'AMOUNT_MISMATCH' as const,
      reference: record.transaction_reference,
      message: 'Verified payment amount does not match the authoritative order amount.',
    };
  }

  if (returnedCurrency !== '566' && returnedCurrency !== 'NGN') {
    updatePaymentRecord(record.transaction_reference, {
      payment_status: 'FAILED',
      gateway_response_code: 'CUR_MISMATCH',
      gateway_response_description: `Unexpected currency: ${returnedCurrency}`,
    });
    return {
      ok: false,
      httpStatus: 400,
      verified: false,
      idempotentReplay: false,
      mode: cfg.interswitchEnvironment,
      status: 'FAILED' as const,
      reference: record.transaction_reference,
      message: 'Verified payment currency does not match NGN (566).',
    };
  }

  const verifiedAt = new Date().toISOString();
  updatePaymentRecord(record.transaction_reference, {
    payment_status: 'PAID',
    payment_method: data.Channel || record.payment_method,
    gateway_response_code: '00',
    gateway_response_description: data.ResponseDescription || 'Approved by Interswitch',
    verified_at: verifiedAt,
  });

  return {
    ok: true,
    httpStatus: 200,
    verified: true,
    idempotentReplay: false,
    mode: cfg.interswitchEnvironment,
    status: 'PAID' as const,
    reference: record.transaction_reference,
    orderId: record.order_id,
    amountNgn: record.amount_ngn,
    currency: '566' as const,
    verifiedAt,
    message: data.ResponseDescription || 'Payment verified with Interswitch and marked PAID.',
  };
}

/**
 * Legacy helper preserved for backwards-compatible `/api/payments/verify` callers.
 */
export async function verifyInterswitchPayment(
  reference: string,
  amountNgn: number,
  fetchImpl?: FetchLike
) {
  const result = await verifyInterswitchTransactionByRef(reference, {
    expectedAmountNgn: amountNgn,
    fetchImpl,
  });
  return {
    verified: result.verified,
    mode:
      result.mode === 'sandbox-unconfigured'
        ? ('sandbox-unconfigured' as const)
        : ('live' as const),
    status: result.verified
      ? ('Verified' as const)
      : result.mode === 'sandbox-unconfigured'
      ? ('Paid (Demo Sandbox)' as const)
      : ('Pending Verification' as const),
    reference,
    message: result.message,
  };
}

/**
 * Computes official Interswitch webhook HMAC-SHA512 hex signature over the raw body string.
 */
export function computeInterswitchWebhookSignature(rawBody: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(rawBody, 'utf8').digest('hex');
}

/**
 * Constant-time verification of X-Interswitch-Signature (HMAC-SHA512).
 */
export function verifyInterswitchWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;
  const expected = computeInterswitchWebhookSignature(rawBody, secret);
  const actualBuf = Buffer.from(signatureHeader.trim().toLowerCase(), 'utf8');
  const expectedBuf = Buffer.from(expected.toLowerCase(), 'utf8');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export interface InterswitchWebhookPayload {
  event?: string;
  uuid?: string;
  timestamp?: number;
  data?: {
    merchantReference?: string;
    transactionReference?: string;
    paymentReference?: string;
    responseCode?: string;
    amount?: number;
    currencyCode?: string | number;
  };
}

/**
 * Official Interswitch webhook processor (`POST /api/webhooks/interswitch`).
 * - Verifies HMAC-SHA512 `X-Interswitch-Signature` against INTERSWITCH_WEBHOOK_SECRET.
 * - Deduplicates repeated event deliveries via event_id.
 * - Triggers server-to-server verification before updating payment status to PAID.
 */
export async function processInterswitchWebhook(
  rawBody: string,
  signatureHeader: string | undefined,
  parsedPayload: InterswitchWebhookPayload,
  fetchImpl?: FetchLike
) {
  const cfg = getServerConfig();

  if (!cfg.interswitchWebhookSecret) {
    return {
      httpStatus: 503,
      accepted: false,
      message: 'INTERSWITCH_WEBHOOK_SECRET is not configured on the server.',
    };
  }

  const signatureValid = verifyInterswitchWebhookSignature(
    rawBody,
    signatureHeader,
    cfg.interswitchWebhookSecret
  );

  if (!signatureValid) {
    recordServerAudit({
      actorUid: 'interswitch-webhook',
      action: 'WEBHOOK_SIGNATURE_INVALID',
      endpoint: '/api/webhooks/interswitch',
      statusCode: 401,
      summary: 'Rejected Interswitch webhook with missing or invalid X-Interswitch-Signature.',
    });
    return {
      httpStatus: 401,
      accepted: false,
      message: 'Invalid or missing X-Interswitch-Signature header.',
    };
  }

  const eventType = String(parsedPayload.event || 'TRANSACTION.UPDATED');
  const txnRef = String(
    parsedPayload.data?.merchantReference ||
      parsedPayload.data?.transactionReference ||
      ''
  ).trim();
  const eventId = String(
    parsedPayload.uuid ||
      crypto.createHash('sha256').update(`${eventType}:${txnRef}:${rawBody}`).digest('hex')
  );

  // Replay & duplicate webhook protection
  const existingEvent = getWebhookEventByEventId(eventId);
  if (existingEvent) {
    return {
      httpStatus: 200,
      accepted: true,
      duplicate: true,
      eventId,
      message: 'Duplicate webhook notification safely ignored.',
    };
  }

  const receivedAt = new Date().toISOString();

  if (!txnRef) {
    saveWebhookEvent({
      id: `wh-${crypto.randomBytes(6).toString('hex')}`,
      event_id: eventId,
      event_type: eventType,
      transaction_reference: 'MISSING_REFERENCE',
      processing_status: 'FAILED',
      received_at: receivedAt,
      processed_at: new Date().toISOString(),
    });
    return {
      httpStatus: 400,
      accepted: false,
      eventId,
      message: 'Webhook payload missing transaction reference.',
    };
  }

  let processingStatus: 'PROCESSED' | 'VERIFICATION_PENDING' | 'FAILED' = 'VERIFICATION_PENDING';

  if (eventType === 'TRANSACTION.COMPLETED' || eventType === 'TRANSACTION.UPDATED') {
    const verification = await verifyInterswitchTransactionByRef(txnRef, { fetchImpl });
    processingStatus = verification.verified ? 'PROCESSED' : 'VERIFICATION_PENDING';
  }

  saveWebhookEvent({
    id: `wh-${crypto.randomBytes(6).toString('hex')}`,
    event_id: eventId,
    event_type: eventType,
    transaction_reference: txnRef,
    processing_status: processingStatus,
    received_at: receivedAt,
    processed_at: new Date().toISOString(),
  });

  recordServerAudit({
    actorUid: 'interswitch-webhook',
    action: 'WEBHOOK_PROCESSED',
    endpoint: '/api/webhooks/interswitch',
    statusCode: 200,
    summary: `Processed ${eventType} (${eventId}) for ${txnRef} -> ${processingStatus}.`,
  });

  return {
    httpStatus: 200,
    accepted: true,
    duplicate: false,
    eventId,
    processingStatus,
    message: 'Webhook signature verified and event recorded.',
  };
}

export function getAdminPaymentDashboardSummary() {
  const cfg = getServerConfig();
  const payments = listAllPaymentRecords();
  const webhookEvents = listAllWebhookEvents();
  const missingCredentials = getMissingInterswitchCredentials(cfg);

  const summary = {
    totalTransactions: payments.length,
    successfulTransactions: payments.filter((p) => p.payment_status === 'PAID').length,
    failedTransactions: payments.filter(
      (p) =>
        p.payment_status === 'FAILED' ||
        p.payment_status === 'CANCELLED' ||
        p.payment_status === 'AMOUNT_MISMATCH'
    ).length,
    pendingTransactions: payments.filter(
      (p) => p.payment_status === 'PENDING' || p.payment_status === 'UNCONFIGURED'
    ).length,
    totalVerifiedVolumeNgn: payments
      .filter((p) => p.payment_status === 'PAID')
      .reduce((sum, p) => sum + p.amount_ngn, 0),
  };

  return {
    environment: cfg.interswitchEnvironment,
    configured: missingCredentials.length === 0,
    missingCredentials,
    webhookSecretConfigured: Boolean(cfg.interswitchWebhookSecret),
    summary,
    payments,
    webhookEvents,
  };
}
