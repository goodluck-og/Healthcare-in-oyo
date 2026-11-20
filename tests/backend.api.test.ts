import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApiApp } from '../server/createApp';
import { getRecentServerAuditEvents } from '../server/services/auditService';
import type { TokenVerifier } from '../server/middleware/auth';

describe('HealthConnect Africa Backend API & Auth Security', () => {
  let server: Server;
  let baseUrl: string;

  const mockTokenVerifier: TokenVerifier = async (idToken: string) => {
    if (idToken === 'valid-patient-token') {
      return {
        uid: 'patient-uid-001',
        email: 'patient@healthconnect.africa',
        emailVerified: true,
      };
    }
    throw new Error('Invalid or expired Firebase ID token');
  };

  beforeAll(async () => {
    const app = createApiApp({ tokenVerifier: mockTokenVerifier });
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
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.INTERSWITCH_ENVIRONMENT;
    delete process.env.INTERSWITCH_DISABLE_SANDBOX_FALLBACK;
    delete process.env.INTERSWITCH_MERCHANT_CODE;
    delete process.env.INTERSWITCH_PAY_ITEM_ID;
    delete process.env.INTERSWITCH_CLIENT_ID;
    delete process.env.INTERSWITCH_SECRET_KEY;
    delete process.env.INTERSWITCH_WEBHOOK_SECRET;
    delete process.env.TERMII_API_KEY;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.VITE_GOOGLE_MAPS_API_KEY;
  });

  it('GET /api/health and /api/config/integrations report honest boolean status without leaking secrets', async () => {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    expect(healthRes.status).toBe(200);
    const healthBody = (await healthRes.json()) as Record<string, unknown>;
    expect(healthBody.ok).toBe(true);
    expect(healthBody.service).toBe('healthconnect-africa');

    const configRes = await fetch(`${baseUrl}/api/config/integrations`);
    expect(configRes.status).toBe(200);
    const configBody = (await configRes.json()) as Record<string, unknown>;
    expect(configBody).toEqual({
      geminiConfigured: false,
      openrouterConfigured: false,
      googleMapsConfigured: false,
      interswitchConfigured: true,
      interswitchUsingPublicSandboxDefaults: true,
      interswitchEnvironment: 'sandbox',
      interswitchWebhookConfigured: false,
      interswitchMissingCount: 0,
      smsConfigured: false,
      firebaseProjectId: expect.any(String),
    });
  });

  it('rejects unauthenticated requests to protected payment and verification endpoints with 401', async () => {
    const payRes = await fetch(`${baseUrl}/api/payments/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountNgn: 18500,
        category: 'Consultation',
        description: 'Cardiology visit',
        method: 'Interswitch Card',
      }),
    });
    expect(payRes.status).toBe(401);

    const smsRes = await fetch(`${baseUrl}/api/verification/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer forged-token',
      },
      body: JSON.stringify({ phone: '+2348012345678' }),
    });
    expect(smsRes.status).toBe(401);
  });

  it('validates AI assistant requests, rejects bad Bearer tokens, and reports unconfigured Gemini/OpenRouter honestly', async () => {
    const badTokenRes = await fetch(`${baseUrl}/api/ai/health-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer bad-token',
      },
      body: JSON.stringify({
        provider: 'gemini',
        messages: [{ role: 'user', content: 'Explain HbA1c' }],
      }),
    });
    expect(badTokenRes.status).toBe(401);

    const badPayloadRes = await fetch(`${baseUrl}/api/ai/health-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-patient-token',
      },
      body: JSON.stringify({
        provider: 'openrouter',
        model: 'disallowed/model-name',
        messages: [],
      }),
    });
    expect(badPayloadRes.status).toBe(400);

    const unsetGeminiRes = await fetch(`${baseUrl}/api/ai/health-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-patient-token',
      },
      body: JSON.stringify({
        provider: 'gemini',
        messages: [{ role: 'user', content: 'What is normal resting blood pressure?' }],
      }),
    });
    expect(unsetGeminiRes.status).toBe(503);

    const unsetOpenRouterRes = await fetch(`${baseUrl}/api/ai/health-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-patient-token',
      },
      body: JSON.stringify({
        provider: 'openrouter',
        model: 'openai/gpt-4o',
        messages: [{ role: 'user', content: 'What is normal resting blood pressure?' }],
      }),
    });
    expect(unsetOpenRouterRes.status).toBe(503);
  });

  it('initializes Interswitch checkout using official sandbox defaults and falls back cleanly when disabled', async () => {
    const sandboxRes = await fetch(`${baseUrl}/api/payments/interswitch/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-patient-token',
      },
      body: JSON.stringify({
        orderId: 'plan-oyo-individual-monthly',
        amountNgn: 16000,
        category: 'Subscription',
        description: 'HealthConnect Oyo State Individual Plan',
        method: 'Interswitch Card',
      }),
    });

    expect(sandboxRes.status).toBe(200);
    const sandboxData = (await sandboxRes.json()) as {
      mode: string;
      reference: string;
      configured: boolean;
      usingPublicSandboxDefaults: boolean;
      webRedirectUrl: string;
      webRedirectFields: Record<string, string>;
    };
    expect(sandboxData.mode).toBe('sandbox');
    expect(sandboxData.configured).toBe(true);
    expect(sandboxData.usingPublicSandboxDefaults).toBe(true);
    expect(sandboxData.reference).toMatch(/^ISW-OYO-/);
    expect(sandboxData.webRedirectUrl).toBe(
      'https://newwebpay-sandbox.interswitchng.com/collections/w/pay'
    );
    expect(sandboxData.webRedirectFields.merchant_code).toBe('MX6072');
    expect(sandboxData.webRedirectFields.pay_item_id).toBe('9405967');
    expect(sandboxData.webRedirectFields.amount).toBe('1600000');
    expect(sandboxData.webRedirectFields.currency).toBe('566');

    process.env.INTERSWITCH_DISABLE_SANDBOX_FALLBACK = 'true';
    const disabledRes = await fetch(`${baseUrl}/api/payments/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-patient-token',
      },
      body: JSON.stringify({
        amountNgn: 16000,
        category: 'Subscription',
        description: 'HealthConnect Oyo State Individual Plan',
        method: 'Interswitch Card',
      }),
    });

    expect(disabledRes.status).toBe(200);
    const disabledData = (await disabledRes.json()) as {
      mode: string;
      reference: string;
      merchantCodeConfigured: boolean;
    };
    expect(disabledData.mode).toBe('sandbox-unconfigured');
    expect(disabledData.merchantCodeConfigured).toBe(false);
    expect(disabledData.reference).toMatch(/^ISW-OYO-/);

    const recentAudits = getRecentServerAuditEvents();
    expect(
      recentAudits.some(
        (evt) =>
          evt.actorUid === 'patient-uid-001' &&
          evt.action === 'INTERSWITCH_INIT' &&
          evt.summary.includes(sandboxData.reference)
      )
    ).toBe(true);
  });

  it('validates SMS phone input and returns honest 503 when SMS credentials are missing', async () => {
    const invalidPhoneRes = await fetch(`${baseUrl}/api/verification/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-patient-token',
      },
      body: JSON.stringify({ phone: 'abc' }),
    });
    expect(invalidPhoneRes.status).toBe(400);

    const unconfiguredSmsRes = await fetch(`${baseUrl}/api/verification/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-patient-token',
      },
      body: JSON.stringify({ phone: '+2348012345678' }),
    });
    expect(unconfiguredSmsRes.status).toBe(503);
    const smsData = (await unconfiguredSmsRes.json()) as {
      sent: boolean;
      configured: boolean;
    };
    expect(smsData.sent).toBe(false);
    expect(smsData.configured).toBe(false);
  });
});
