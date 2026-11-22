import express from 'express';
import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  EMERGENCY_PAGE_ROUTE,
  scanTextForMedicalRedFlags,
  URGENT_CARE_FOOTER,
} from '../shared/medicalRedFlags';
import { medicalRedFlagAiMiddleware } from '../server/middleware/medicalRedFlagMiddleware';
import { createApiApp } from '../server/createApp';
import { routeHybridHealthQuery } from '../src/services/hybridAiRouter';

async function startServer(app: express.Express): Promise<{ server: http.Server; baseUrl: string }> {
  return await new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

describe('Medical Red-Flag Keyword Filtering Middleware Layer (Server + Client)', () => {
  let mainServer: http.Server;
  let mainBaseUrl: string;
  let mockLlmServer: http.Server;
  let mockLlmBaseUrl: string;

  beforeAll(async () => {
    const mainApp = createApiApp();
    const startedMain = await startServer(mainApp);
    mainServer = startedMain.server;
    mainBaseUrl = startedMain.baseUrl;

    // Dedicated Express app with a stubbed LLM route wrapped by medicalRedFlagAiMiddleware
    // to verify POST-LLM AI response interception directly.
    const mockApp = express();
    mockApp.use(express.json());
    mockApp.post('/api/ai/health-assistant', medicalRedFlagAiMiddleware, (req, res) => {
      const stubReply =
        typeof req.body?.stubAiReply === 'string'
          ? req.body.stubAiReply
          : 'HbA1c reflects your average blood glucose over 2 to 3 months.';
      res.json({
        reply: stubReply,
        provider: 'gemini',
        model: 'gemini-test-stub',
        authenticatedUid: null,
      });
    });
    const startedMock = await startServer(mockApp);
    mockLlmServer = startedMock.server;
    mockLlmBaseUrl = startedMock.baseUrl;
  });

  afterAll(async () => {
    if (mainServer) {
      await new Promise<void>((resolve) => mainServer.close(() => resolve()));
    }
    if (mockLlmServer) {
      await new Promise<void>((resolve) => mockLlmServer.close(() => resolve()));
    }
  });

  it('detects "shortness of breath", "unconscious", and other critical medical red flags', () => {
    const breathScan = scanTextForMedicalRedFlags('I suddenly have shortness of breath at rest');
    expect(breathScan.detected).toBe(true);
    expect(breathScan.matchedKeywords).toContain('shortness of breath');
    expect(breathScan.footer).toBe(URGENT_CARE_FOOTER);
    expect(breathScan.emergencyRoute).toBe(EMERGENCY_PAGE_ROUTE);

    const unconsciousScan = scanTextForMedicalRedFlags('My neighbour collapsed and is unconscious');
    expect(unconsciousScan.detected).toBe(true);
    expect(unconsciousScan.matchedKeywords).toContain('unconscious');

    const safeScan = scanTextForMedicalRedFlags('What is a healthy fasting blood sugar range?');
    expect(safeScan.detected).toBe(false);
    expect(safeScan.matchedKeywords).toHaveLength(0);
  });

  it('Express middleware intercepts incoming red-flag prompts ("shortness of breath" / "unconscious") BEFORE calling external AI', async () => {
    const res = await fetch(`${mainBaseUrl}/api/ai/health-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'gemini',
        mode: 'General Symptom Guidance',
        messages: [
          {
            role: 'user',
            content: 'My uncle just fell unconscious and has shortness of breath.',
          },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      reply: string;
      redFlagDetected: boolean;
      haltEducationalDialogue: boolean;
      matchedKeywords: string[];
      urgentFooter: string;
      emergencyRoute: string;
      provider: string;
    };

    expect(data.redFlagDetected).toBe(true);
    expect(data.haltEducationalDialogue).toBe(true);
    expect(data.provider).toBe('safety-middleware');
    expect(data.urgentFooter).toBe('Urgent: Seek Professional Care');
    expect(data.emergencyRoute).toBe('/emergency');
    expect(data.matchedKeywords).toEqual(
      expect.arrayContaining(['unconscious', 'shortness of breath'])
    );
    expect(data.reply).toContain('Urgent: Seek Professional Care');
    expect(data.reply).toContain('/emergency');
  });

  it('Express middleware filters outgoing AI responses containing red-flag keywords and halts educational dialogue', async () => {
    const res = await fetch(`${mockLlmBaseUrl}/api/ai/health-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Why do I feel dizzy when standing up?' }],
        stubAiReply:
          'You might be developing severe dehydration or shortness of breath; let us continue talking about diet.',
      }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      reply: string;
      redFlagDetected: boolean;
      haltEducationalDialogue: boolean;
      matchedKeywords: string[];
      urgentFooter: string;
      emergencyRoute: string;
    };

    expect(data.redFlagDetected).toBe(true);
    expect(data.haltEducationalDialogue).toBe(true);
    expect(data.matchedKeywords).toContain('shortness of breath');
    expect(data.urgentFooter).toBe('Urgent: Seek Professional Care');
    expect(data.emergencyRoute).toBe('/emergency');
    expect(data.reply).toContain('Urgent: Seek Professional Care');
    expect(data.reply).not.toContain('let us continue talking about diet');
  });

  it('Express middleware passes safe educational AI responses through unmodified', async () => {
    const res = await fetch(`${mockLlmBaseUrl}/api/ai/health-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What does HbA1c mean?' }],
        stubAiReply: 'HbA1c reflects your average blood glucose over 2 to 3 months.',
      }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      reply: string;
      redFlagDetected: boolean;
      haltEducationalDialogue: boolean;
    };

    expect(data.redFlagDetected).toBe(false);
    expect(data.haltEducationalDialogue).toBe(false);
    expect(data.reply).toBe('HbA1c reflects your average blood glucose over 2 to 3 months.');
  });

  it('Client Hybrid AI router halts educational dialogue immediately on red-flag prompt without calling Cloud AI', async () => {
    const mockCloud = vi.fn();

    const result = await routeHybridHealthQuery(
      {
        prompt: 'My sister is unconscious on the floor',
        mode: 'General Symptom Guidance',
        routingPreference: 'smart-hybrid',
        cloudProvider: 'gemini',
        conversationHistory: [],
        includeProfileContext: false,
        cloudConsentGranted: false,
        isOnline: true,
        serverCloudConfigured: true,
      },
      {
        detectOnDevice: async () => ({
          status: 'unavailable',
          label: 'Unavailable',
          detail: 'Test',
          browserSupportsPromptApi: false,
        }),
        callServerCloudAi: mockCloud,
      }
    );

    expect(mockCloud).not.toHaveBeenCalled();
    expect(result.actualPath).toBe('safety-middleware');
    expect(result.haltEducationalDialogue).toBe(true);
    expect(result.urgentFooter).toBe('Urgent: Seek Professional Care');
    expect(result.emergencyRoute).toBe('/emergency');
    expect(result.reply).toContain('Urgent: Seek Professional Care');
  });

  it('Client AI response middleware intercepts AI-generated output mentioning "shortness of breath" across Hybrid/On-Device paths', async () => {
    const mockFirebaseHybrid = vi.fn().mockResolvedValue({
      reply:
        'Based on your note, worsening shortness of breath can occur; here is an educational overview of lungs.',
      inferenceSource: 'on_device',
      model: 'Gemini Nano (On-Device via Firebase AI Logic)',
      latencyMs: 30,
    });

    const result = await routeHybridHealthQuery(
      {
        prompt: 'Why do I feel tired climbing one flight of stairs?',
        mode: 'General Symptom Guidance',
        routingPreference: 'smart-hybrid',
        cloudProvider: 'gemini',
        conversationHistory: [],
        includeProfileContext: false,
        cloudConsentGranted: false,
        isOnline: true,
        serverCloudConfigured: false,
      },
      {
        detectOnDevice: async () => ({
          status: 'available',
          label: 'Gemini Nano Ready',
          detail: 'Ready',
          browserSupportsPromptApi: true,
        }),
        runFirebaseHybrid: mockFirebaseHybrid,
      }
    );

    expect(mockFirebaseHybrid).toHaveBeenCalledTimes(1);
    expect(result.actualPath).toBe('safety-middleware');
    expect(result.haltEducationalDialogue).toBe(true);
    expect(result.urgentFooter).toBe('Urgent: Seek Professional Care');
    expect(result.emergencyRoute).toBe('/emergency');
    expect(result.reply).toContain('Urgent: Seek Professional Care');
    expect(result.reply).not.toContain('educational overview of lungs');
  });
});
