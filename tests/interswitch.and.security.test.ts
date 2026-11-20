import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApiApp } from '../server/createApp';
import type { TokenVerifier } from '../server/middleware/auth';
import {
  computeInterswitchWebhookSignature,
  getInterswitchInlineScriptUrl,
  getInterswitchVerifyUrl,
  getInterswitchWebRedirectUrl,
  type FetchLike,
} from '../server/services/paymentService';
import { clearPaymentStoreForTests } from '../server/services/paymentStore';

describe('Interswitch Web Checkout (14 Scenarios) & Enterprise Security Audit Suite', () => {
  let server: Server;
  let baseUrl: string;
  let mockGatewayBehavior:
    | 'approve'
    | 'fail'
    | 'cancel'
    | 'amount_mismatch'
    | 'currency_mismatch' = 'approve';
  let lastVerifiedUrl = '';

  const mockTokenVerifier: TokenVerifier = async (idToken: string) => {
    if (idToken === 'valid-patient-token') {
      return {
        uid: 'patient-oyo-001',
        email: 'patient@oyocare.ng',
        emailVerified: true,
      };
    }
    if (idToken === 'valid-admin-token') {
      return {
        uid: 'admin-oyo-001',
        email: 'amesinlolagoodluck@gmail.com',
        emailVerified: true,
      };
    }
    if (idToken === 'unverified-admin-token') {
      return {
        uid: 'admin-unverified-001',
        email: 'amesinlolagoodluck@gmail.com',
        emailVerified: false,
      };
    }
    throw new Error('Invalid Firebase ID token');
  };

  const mockGatewayFetch: FetchLike = async (input) => {
    const url = String(input);
    if (url.includes('/passport/oauth/token')) {
      return new Response(JSON.stringify({ access_token: 'mock-passport-token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    lastVerifiedUrl = url;
    const parsedUrl = new URL(url);
    const ref = parsedUrl.searchParams.get('transactionreference') || '';
    const amountKobo = Number(parsedUrl.searchParams.get('amount') || '0');

    if (mockGatewayBehavior === 'fail') {
      return new Response(
        JSON.stringify({
          ResponseCode: '51',
          ResponseDescription: 'Insufficient Funds',
          Amount: amountKobo,
          MerchantReference: ref,
          CurrencyCode: '566',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (mockGatewayBehavior === 'cancel') {
      return new Response(
        JSON.stringify({
          ResponseCode: 'Z6',
          ResponseDescription: 'Customer cancelled transaction',
          Amount: amountKobo,
          MerchantReference: ref,
          CurrencyCode: '566',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (mockGatewayBehavior === 'amount_mismatch') {
      return new Response(
        JSON.stringify({
          ResponseCode: '00',
          ResponseDescription: 'Approved by Financial Institution',
          Amount: amountKobo - 10000,
          MerchantReference: ref,
          CurrencyCode: '566',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (mockGatewayBehavior === 'currency_mismatch') {
      return new Response(
        JSON.stringify({
          ResponseCode: '00',
          ResponseDescription: 'Approved by Financial Institution',
          Amount: amountKobo,
          MerchantReference: ref,
          CurrencyCode: '840',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        ResponseCode: '00',
        ResponseDescription: 'Approved by Financial Institution',
        Amount: amountKobo,
        MerchantReference: ref,
        CurrencyCode: '566',
        Channel: 'Interswitch Verve Card',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  beforeAll(async () => {
    const app = createApiApp({
      tokenVerifier: mockTokenVerifier,
      fetchImpl: mockGatewayFetch,
    });
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    clearPaymentStoreForTests();
    mockGatewayBehavior = 'approve';
    lastVerifiedUrl = '';
    process.env.INTERSWITCH_ENVIRONMENT = 'sandbox';
    delete process.env.INTERSWITCH_DISABLE_SANDBOX_FALLBACK;
    process.env.INTERSWITCH_MERCHANT_CODE = 'MX_TEST_OYO_001';
    process.env.INTERSWITCH_PAY_ITEM_ID = 'PAY_TEST_9001';
    process.env.INTERSWITCH_CLIENT_ID = 'IKIA_TEST_CLIENT';
    process.env.INTERSWITCH_SECRET_KEY = 'SUPER_SECRET_KEY_NEVER_LEAK';
    process.env.INTERSWITCH_CALLBACK_URL = 'https://healthconnect.africa/payment-response';
    process.env.INTERSWITCH_WEBHOOK_SECRET = 'WEBHOOK_HMAC_SHA512_SECRET_KEY';
  });

  it('sets enterprise HTTP security headers and blocks unauthorized CORS origins', async () => {
    const okRes = await fetch(`${baseUrl}/api/health`);
    expect(okRes.status).toBe(200);
    expect(okRes.headers.get('x-content-type-options')).toBe('nosniff');
    expect(okRes.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(okRes.headers.get('content-security-policy')).toContain('newwebpay-sandbox.interswitchng.com');
    expect(okRes.headers.get('x-powered-by')).toBeNull();

    // Unauthorized cross-origin API request must be blocked with 403 and no ACAO header
    const blockedRes = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'https://evil-attacker.example' },
    });
    expect(blockedRes.status).toBe(403);
    expect(blockedRes.headers.get('access-control-allow-origin')).toBeNull();

    // Preflight from unknown origin is rejected with 403
    const preflight = await fetch(`${baseUrl}/api/payments/interswitch/initialize`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil-attacker.example' },
    });
    expect(preflight.status).toBe(403);
  });

  it('1-2. initializes Interswitch checkout with server-calculated authoritative amount (defeats client price tampering) and never leaks secret key', async () => {
    const res = await fetch(`${baseUrl}/api/payments/interswitch/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-patient-token',
      },
      body: JSON.stringify({
        orderId: 'consult-uch-cardiology',
        // Attacker attempts to tamper price down to 500 NGN
        amountNgn: 500,
        method: 'Interswitch Card',
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      configured: boolean;
      mode: string;
      reference: string;
      amountNgn: number;
      amountKobo: number;
      scriptUrl: string;
      checkoutPayload: Record<string, unknown>;
    };

    expect(body.configured).toBe(true);
    expect(body.mode).toBe('sandbox');
    // Server MUST enforce catalog price of NGN 18,000 (1,800,000 kobo)
    expect(body.amountNgn).toBe(18000);
    expect(body.amountKobo).toBe(1800000);
    expect(body.scriptUrl).toBe('https://newwebpay-sandbox.interswitchng.com/inline-checkout.js');
    expect(body.checkoutPayload.merchant_code).toBe('MX_TEST_OYO_001');
    expect(body.checkoutPayload.pay_item_id).toBe('PAY_TEST_9001');
    expect(body.checkoutPayload.currency).toBe(566);
    // Secret key must NEVER appear in response payload
    expect(JSON.stringify(body)).not.toContain('SUPER_SECRET_KEY_NEVER_LEAK');
    expect(JSON.stringify(body)).not.toContain('WEBHOOK_HMAC_SHA512_SECRET_KEY');
  });

  it('3-4. verifies successful payment server-side and protects against duplicate idempotent replay', async () => {
    const initRes = await fetch(`${baseUrl}/api/payments/interswitch/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-patient-token',
      },
      body: JSON.stringify({ orderId: 'plan-family-annual' }),
    });
    const initBody = (await initRes.json()) as { reference: string };

    const verify1 = await fetch(
      `${baseUrl}/api/payments/interswitch/verify/${encodeURIComponent(initBody.reference)}`,
      { headers: { Authorization: 'Bearer valid-patient-token' } }
    );
    expect(verify1.status).toBe(200);
    const v1 = (await verify1.json()) as {
      verified: boolean;
      status: string;
      idempotentReplay: boolean;
      amountNgn: number;
    };
    expect(v1.verified).toBe(true);
    expect(v1.status).toBe('PAID');
    expect(v1.idempotentReplay).toBe(false);
    expect(v1.amountNgn).toBe(95000);
    expect(lastVerifiedUrl).toContain('sandbox.interswitchng.com/collections/api/v1/gettransaction.json');

    // Second verify call MUST return idempotent replay without double processing
    const verify2 = await fetch(
      `${baseUrl}/api/payments/interswitch/verify/${encodeURIComponent(initBody.reference)}`,
      { headers: { Authorization: 'Bearer valid-patient-token' } }
    );
    expect(verify2.status).toBe(200);
    const v2 = (await verify2.json()) as { verified: boolean; idempotentReplay: boolean };
    expect(v2.verified).toBe(true);
    expect(v2.idempotentReplay).toBe(true);
  });

  it('5-7. handles failed payment, cancelled payment, amount mismatch, and currency mismatch safely', async () => {
    const makeInit = async () => {
      const r = await fetch(`${baseUrl}/api/payments/interswitch/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-patient-token',
        },
        body: JSON.stringify({ orderId: 'lab-sickle-genotype' }),
      });
      return ((await r.json()) as { reference: string }).reference;
    };

    // Failed
    const failRef = await makeInit();
    mockGatewayBehavior = 'fail';
    const failRes = await fetch(`${baseUrl}/api/payments/interswitch/verify/${failRef}`, {
      headers: { Authorization: 'Bearer valid-patient-token' },
    });
    const failData = (await failRes.json()) as { verified: boolean; status: string };
    expect(failData.verified).toBe(false);
    expect(failData.status).toBe('FAILED');

    // Cancelled
    const cancelRef = await makeInit();
    mockGatewayBehavior = 'cancel';
    const cancelRes = await fetch(`${baseUrl}/api/payments/interswitch/verify/${cancelRef}`, {
      headers: { Authorization: 'Bearer valid-patient-token' },
    });
    const cancelData = (await cancelRes.json()) as { verified: boolean; status: string };
    expect(cancelData.verified).toBe(false);
    expect(cancelData.status).toBe('CANCELLED');

    // Amount mismatch
    const amtRef = await makeInit();
    mockGatewayBehavior = 'amount_mismatch';
    const amtRes = await fetch(`${baseUrl}/api/payments/interswitch/verify/${amtRef}`, {
      headers: { Authorization: 'Bearer valid-patient-token' },
    });
    expect(amtRes.status).toBe(400);
    const amtData = (await amtRes.json()) as { verified: boolean; status: string };
    expect(amtData.verified).toBe(false);
    expect(amtData.status).toBe('AMOUNT_MISMATCH');

    // Currency mismatch
    const curRef = await makeInit();
    mockGatewayBehavior = 'currency_mismatch';
    const curRes = await fetch(`${baseUrl}/api/payments/interswitch/verify/${curRef}`, {
      headers: { Authorization: 'Bearer valid-patient-token' },
    });
    expect(curRes.status).toBe(400);
    const curData = (await curRes.json()) as { verified: boolean; status: string };
    expect(curData.verified).toBe(false);
    expect(curData.status).toBe('FAILED');
  });

  it('8-11. validates HMAC-SHA512 webhook signature, rejects invalid/missing signatures, and deduplicates replay webhooks', async () => {
    const initRes = await fetch(`${baseUrl}/api/payments/interswitch/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-patient-token',
      },
      body: JSON.stringify({ orderId: 'consult-bodija-obgyn' }),
    });
    const { reference } = (await initRes.json()) as { reference: string };

    const webhookPayload = JSON.stringify({
      event: 'TRANSACTION.COMPLETED',
      uuid: 'evt-oyo-001',
      timestamp: Date.now(),
      data: {
        merchantReference: reference,
        responseCode: '00',
        amount: 1650000,
        currencyCode: '566',
      },
    });

    // Missing signature -> 401
    const noSig = await fetch(`${baseUrl}/api/webhooks/interswitch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: webhookPayload,
    });
    expect(noSig.status).toBe(401);

    // Invalid signature -> 401
    const badSig = await fetch(`${baseUrl}/api/webhooks/interswitch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Interswitch-Signature': '0000deadbeef',
      },
      body: webhookPayload,
    });
    expect(badSig.status).toBe(401);

    // Valid HMAC-SHA512 signature -> 200 PROCESSED
    const validSig = computeInterswitchWebhookSignature(
      webhookPayload,
      process.env.INTERSWITCH_WEBHOOK_SECRET!
    );
    const goodRes = await fetch(`${baseUrl}/api/webhooks/interswitch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Interswitch-Signature': validSig,
      },
      body: webhookPayload,
    });
    expect(goodRes.status).toBe(200);
    const goodBody = (await goodRes.json()) as {
      accepted: boolean;
      duplicate: boolean;
      processingStatus: string;
    };
    expect(goodBody.accepted).toBe(true);
    expect(goodBody.duplicate).toBe(false);
    expect(goodBody.processingStatus).toBe('PROCESSED');

    // Duplicate replay webhook -> safely ignored
    const dupRes = await fetch(`${baseUrl}/api/webhooks/interswitch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Interswitch-Signature': validSig,
      },
      body: webhookPayload,
    });
    expect(dupRes.status).toBe(200);
    const dupBody = (await dupRes.json()) as { duplicate: boolean };
    expect(dupBody.duplicate).toBe(true);
  });

  it('12-13. handles missing credentials in production gracefully (503, never fakes payment) and switches sandbox vs production URLs cleanly', async () => {
    expect(getInterswitchInlineScriptUrl('sandbox')).toBe(
      'https://newwebpay-sandbox.interswitchng.com/inline-checkout.js'
    );
    expect(getInterswitchInlineScriptUrl('production')).toBe(
      'https://newwebpay.interswitchng.com/inline-checkout.js'
    );
    expect(getInterswitchWebRedirectUrl('sandbox')).toBe(
      'https://newwebpay-sandbox.interswitchng.com/collections/w/pay'
    );
    expect(getInterswitchWebRedirectUrl('production')).toBe(
      'https://newwebpay.interswitchng.com/collections/w/pay'
    );
    expect(getInterswitchVerifyUrl('production', 'MX01', 'REF-1', 100000)).toContain(
      'https://webpay.interswitchng.com/collections/api/v2/gettransaction.json'
    );

    process.env.INTERSWITCH_ENVIRONMENT = 'production';
    delete process.env.INTERSWITCH_MERCHANT_CODE;
    delete process.env.INTERSWITCH_PAY_ITEM_ID;

    const initRes = await fetch(`${baseUrl}/api/payments/interswitch/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-patient-token',
      },
      body: JSON.stringify({ orderId: 'plan-oyo-individual-monthly' }),
    });
    expect(initRes.status).toBe(503);
    const body = (await initRes.json()) as {
      configured: boolean;
      missingCredentials: string[];
    };
    expect(body.configured).toBe(false);
    expect(body.missingCredentials).toContain('INTERSWITCH_MERCHANT_CODE');
    expect(body.missingCredentials).toContain('INTERSWITCH_PAY_ITEM_ID');
  });

  it('13b. enforces authoritative Oyo monthly subscription prices (₦16k & ₦50k) and handles POST /payment-response 303 redirect', async () => {
    const indRes = await fetch(`${baseUrl}/api/payments/interswitch/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-patient-token',
      },
      body: JSON.stringify({
        orderId: 'plan-oyo-individual-monthly',
        amountNgn: 100, // tampered client amount must be ignored
        siteRedirectUrl: 'https://healthconnect-oyo.example/payment-response',
      }),
    });
    expect(indRes.status).toBe(200);
    const indBody = (await indRes.json()) as {
      amountNgn: number;
      amountKobo: number;
      webRedirectUrl: string;
      webRedirectFields: Record<string, string>;
    };
    expect(indBody.amountNgn).toBe(16000);
    expect(indBody.amountKobo).toBe(1600000);
    expect(indBody.webRedirectUrl).toBe(
      'https://newwebpay-sandbox.interswitchng.com/collections/w/pay'
    );
    expect(indBody.webRedirectFields.amount).toBe('1600000');
    expect(indBody.webRedirectFields.currency).toBe('566');
    expect(indBody.webRedirectFields.site_redirect_url).toBe(
      'https://healthconnect-oyo.example/payment-response'
    );

    const famRes = await fetch(`${baseUrl}/api/payments/interswitch/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-patient-token',
      },
      body: JSON.stringify({
        orderId: 'plan-oyo-family-monthly',
        amountNgn: 1000, // tampered client amount must be ignored
      }),
    });
    expect(famRes.status).toBe(200);
    const famBody = (await famRes.json()) as {
      amountNgn: number;
      amountKobo: number;
      reference: string;
    };
    expect(famBody.amountNgn).toBe(50000);
    expect(famBody.amountKobo).toBe(5000000);

    // Interswitch Option 2 Web Redirect POST callback must 303 redirect to GET /payment-response
    const callbackRes = await fetch(`${baseUrl}/payment-response`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        txnref: famBody.reference,
        resp: '00',
        desc: 'Approved by Financial Institution',
        payRef: 'FBN|WEB|TEST|001',
      }).toString(),
    });
    expect(callbackRes.status).toBe(303);
    const location = callbackRes.headers.get('location') || '';
    expect(location).toContain('/payment-response?');
    expect(location).toContain(`txnref=${encodeURIComponent(famBody.reference)}`);
    expect(location).toContain('resp=00');
  });

  it('14. enforces strict Admin RBAC on /api/admin/payments and rejects invalid input payloads', async () => {
    // Unauthenticated -> 401
    const unauth = await fetch(`${baseUrl}/api/admin/payments`);
    expect(unauth.status).toBe(401);

    // Patient -> 403
    const patient = await fetch(`${baseUrl}/api/admin/payments`, {
      headers: { Authorization: 'Bearer valid-patient-token' },
    });
    expect(patient.status).toBe(403);

    // Unverified admin -> 403
    const unverifiedAdmin = await fetch(`${baseUrl}/api/admin/payments`, {
      headers: { Authorization: 'Bearer unverified-admin-token' },
    });
    expect(unverifiedAdmin.status).toBe(403);

    // Verified admin -> 200
    const admin = await fetch(`${baseUrl}/api/admin/payments`, {
      headers: { Authorization: 'Bearer valid-admin-token' },
    });
    expect(admin.status).toBe(200);
    const adminBody = (await admin.json()) as {
      configured: boolean;
      summary: { totalTransactions: number };
    };
    expect(adminBody.configured).toBe(true);
    expect(adminBody.summary.totalTransactions).toBe(0);

    // Invalid input rejection (negative amount / bad reference)
    const badAmount = await fetch(`${baseUrl}/api/payments/interswitch/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-patient-token',
      },
      body: JSON.stringify({ amountNgn: -500 }),
    });
    expect(badAmount.status).toBe(400);

    const badRef = await fetch(`${baseUrl}/api/payments/interswitch/verify/bad$ref!`, {
      headers: { Authorization: 'Bearer valid-patient-token' },
    });
    expect(badRef.status).toBe(400);
  });
});
