import { auth } from '../firebaseConfig';
import type { IntegrationStatus } from '../types/healthcare';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      headers.Authorization = `Bearer ${token}`;
    } catch {
      // Allow caller to handle unauthenticated / token error cleanly
    }
  }
  return headers;
}

async function safeReadJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Server returned an unexpected response (${res.status}). Please try again shortly.`
    );
  }
}

export async function fetchIntegrationStatus(): Promise<IntegrationStatus> {
  const res = await fetch('/api/config/integrations');
  if (!res.ok) {
    throw new Error(`Unable to fetch integration status (${res.status})`);
  }
  return await safeReadJson<IntegrationStatus>(res);
}

export async function callAiHealthAssistant(payload: {
  provider: 'gemini' | 'openrouter';
  model?: string;
  mode: string;
  patientContext?: string;
  image?: {
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    base64Data: string;
    categoryHint?: string;
  };
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<{
  reply: string;
  provider: string;
  model?: string;
  authenticatedUid?: string | null;
  redFlagDetected?: boolean;
  haltEducationalDialogue?: boolean;
  matchedKeywords?: string[];
  matchedCategories?: string[];
  urgentFooter?: string;
  emergencyRoute?: '/emergency';
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/ai/health-assistant', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await safeReadJson<{
    reply?: string;
    provider?: string;
    model?: string;
    authenticatedUid?: string | null;
    redFlagDetected?: boolean;
    haltEducationalDialogue?: boolean;
    matchedKeywords?: string[];
    matchedCategories?: string[];
    urgentFooter?: string;
    emergencyRoute?: '/emergency';
    error?: string;
  }>(res);
  if (!res.ok || !data.reply) {
    throw new Error(data.error || `AI request failed with status ${res.status}`);
  }
  return {
    reply: data.reply,
    provider: data.provider || payload.provider,
    model: data.model,
    authenticatedUid: data.authenticatedUid,
    redFlagDetected: Boolean(data.redFlagDetected),
    haltEducationalDialogue: Boolean(data.haltEducationalDialogue),
    matchedKeywords: data.matchedKeywords,
    matchedCategories: data.matchedCategories,
    urgentFooter: data.urgentFooter,
    emergencyRoute: data.emergencyRoute,
  };
}

export interface OpenFdaDrugEntry {
  brandName: string;
  genericName: string;
  route: string;
  purpose: string;
  warnings: string;
  dosageSummary: string;
}

export async function lookupOpenFdaDrug(queryText: string): Promise<{
  query: string;
  source: string;
  results: OpenFdaDrugEntry[];
  message?: string;
  disclaimer?: string;
}> {
  const res = await fetch(`/api/medical/drug-lookup?q=${encodeURIComponent(queryText.trim())}`);
  const data = await safeReadJson<{
    query?: string;
    source?: string;
    results?: OpenFdaDrugEntry[];
    message?: string;
    disclaimer?: string;
    error?: string;
  }>(res);
  if (!res.ok) {
    throw new Error(data.error || `Unable to look up medication (${res.status})`);
  }
  return {
    query: data.query || queryText,
    source: data.source || 'openFDA Drug Labeling API',
    results: data.results || [],
    message: data.message,
    disclaimer: data.disclaimer,
  };
}

export async function initializeInterswitchCheckout(payload: {
  amountNgn: number;
  category: string;
  description: string;
  method: 'Interswitch Card' | 'Interswitch Bank Transfer' | 'Interswitch USSD';
}): Promise<{
  mode: 'live' | 'sandbox-unconfigured';
  reference: string;
  merchantCodeConfigured: boolean;
  message: string;
  checkoutPayload?: Record<string, unknown>;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/payments/initialize', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await safeReadJson<{
    mode?: 'live' | 'sandbox-unconfigured';
    reference?: string;
    merchantCodeConfigured?: boolean;
    message?: string;
    checkoutPayload?: Record<string, unknown>;
    error?: string;
  }>(res);
  if (!res.ok || !data.reference || !data.mode) {
    throw new Error(data.error || `Payment initialization failed (${res.status})`);
  }
  return {
    mode: data.mode,
    reference: data.reference,
    merchantCodeConfigured: Boolean(data.merchantCodeConfigured),
    message: data.message || 'Checkout initialized.',
    checkoutPayload: data.checkoutPayload,
  };
}

export async function verifyInterswitchTransaction(
  reference: string,
  amountNgn: number
): Promise<{
  verified: boolean;
  mode: 'live' | 'sandbox-unconfigured';
  status: 'Verified' | 'Paid (Demo Sandbox)' | 'Pending Verification';
  message: string;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/payments/verify', {
    method: 'POST',
    headers,
    body: JSON.stringify({ reference, amountNgn }),
  });
  const data = await safeReadJson<{
    verified?: boolean;
    mode?: 'live' | 'sandbox-unconfigured';
    status?: 'Verified' | 'Paid (Demo Sandbox)' | 'Pending Verification';
    message?: string;
    error?: string;
  }>(res);
  if (!res.ok || !data.mode || !data.status) {
    throw new Error(data.error || `Payment verification failed (${res.status})`);
  }
  return {
    verified: Boolean(data.verified),
    mode: data.mode,
    status: data.status,
    message: data.message || 'Verification completed.',
  };
}

export async function requestSmsOtp(phone: string): Promise<{
  sent: boolean;
  configured: boolean;
  message: string;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/verification/sms/send', {
    method: 'POST',
    headers,
    body: JSON.stringify({ phone }),
  });
  const data = await safeReadJson<{
    sent?: boolean;
    configured?: boolean;
    message?: string;
    error?: string;
  }>(res);
  if (!res.ok) {
    throw new Error(data.error || data.message || `SMS verification unavailable (${res.status})`);
  }
  return {
    sent: Boolean(data.sent),
    configured: Boolean(data.configured),
    message: data.message || 'SMS verification status checked.',
  };
}

export interface InterswitchInlineParams {
  merchant_code: string;
  pay_item_id: string;
  txn_ref: string;
  amount: number;
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
  amount: string;
  currency: '566';
  cust_name?: string;
  cust_email?: string;
  pay_item_name?: string;
}

export interface InterswitchInitResponse {
  configured: boolean;
  mode: 'sandbox' | 'production' | 'sandbox-unconfigured';
  environment: 'sandbox' | 'production';
  merchantCodeConfigured: boolean;
  usingPublicSandboxDefaults?: boolean;
  missingCredentials: string[];
  reference: string;
  orderId: string;
  amountNgn: number;
  amountKobo: number;
  currency: '566';
  scriptUrl: string;
  webRedirectUrl?: string;
  webRedirectFields?: InterswitchWebRedirectFields;
  checkoutPayload?: InterswitchInlineParams;
  message: string;
  error?: string;
}

export async function initializeInterswitchWebCheckoutApi(payload: {
  orderId?: string;
  amountNgn?: number;
  category?: string;
  description?: string;
  method?: 'Interswitch Card' | 'Interswitch Bank Transfer' | 'Interswitch USSD';
  customerName?: string;
  customerPhone?: string;
  siteRedirectUrl?: string;
}): Promise<InterswitchInitResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/payments/interswitch/initialize', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await safeReadJson<InterswitchInitResponse>(res);
  if (res.status === 503 && data.configured === false) {
    return data;
  }
  if (!res.ok) {
    throw new Error(data.error || data.message || `Interswitch initialization failed (${res.status})`);
  }
  return data;
}

export interface InterswitchVerifyResponse {
  ok: boolean;
  verified: boolean;
  idempotentReplay: boolean;
  mode: 'sandbox' | 'production' | 'sandbox-unconfigured';
  status: 'PAID' | 'FAILED' | 'CANCELLED' | 'PENDING' | 'AMOUNT_MISMATCH' | 'UNCONFIGURED';
  reference: string;
  orderId?: string;
  amountNgn?: number;
  currency?: '566';
  verifiedAt?: string;
  responseCode?: string;
  missingCredentials?: string[];
  message: string;
  error?: string;
}

export async function verifyInterswitchReferenceApi(
  transactionReference: string
): Promise<InterswitchVerifyResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `/api/payments/interswitch/verify/${encodeURIComponent(transactionReference)}`,
    {
      method: 'GET',
      headers,
    }
  );
  const data = await safeReadJson<InterswitchVerifyResponse>(res);
  if (!res.ok && res.status !== 503 && res.status !== 400 && res.status !== 404) {
    throw new Error(data.error || data.message || `Verification request failed (${res.status})`);
  }
  return data;
}

export interface EmergencySmsRecipientResult {
  name: string;
  to: string;
  sent: boolean;
  sid?: string;
  status?: string;
  error?: string;
}

export interface EmergencySmsDispatchResponse {
  ok: boolean;
  configured: boolean;
  provider?: 'twilio';
  missingCredentials?: string[];
  messageBody?: string;
  dispatchedCount: number;
  failedCount: number;
  results: EmergencySmsRecipientResult[];
  message: string;
  error?: string;
  requiresAuth?: boolean;
}

export async function dispatchEmergencySmsApi(payload: {
  patientName: string;
  emergencyType: 'SOS Medical Triage' | 'Ambulance Dispatch Request' | 'Watch Critical Alert';
  locationLabel: string;
  coordinates: { lat: number; lng: number } | null;
  bloodGroup?: string;
  allergies?: string;
  notes?: string;
  contacts: Array<{ id?: string; name: string; phone: string }>;
}): Promise<EmergencySmsDispatchResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/emergency/sms/dispatch', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await safeReadJson<EmergencySmsDispatchResponse>(res);
  if (res.status === 401) {
    return {
      ok: false,
      configured: true,
      dispatchedCount: 0,
      failedCount: 0,
      results: [],
      requiresAuth: true,
      message:
        data.error ||
        'Sign in to your HealthConnect account to dispatch automated Twilio SMS alerts from the server, or use the direct device SMS button below.',
    };
  }
  if (res.status === 503 && data.configured === false) {
    return data;
  }
  if (!res.ok && res.status !== 502) {
    throw new Error(
      data.error || data.message || `Emergency SMS request failed (${res.status})`
    );
  }
  return data;
}
