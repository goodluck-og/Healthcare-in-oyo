import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  HEALTH_GUIDE_CATEGORIES,
  OFFLINE_HEALTH_LIBRARY,
} from '../src/data/offlineHealthLibrary';
import {
  buildLocalKnowledgeResponse,
  detectUrgentRedFlags,
  evaluatePromptForRouting,
  searchOfflineHealthLibrary,
} from '../src/services/localHealthAi';
import { routeHybridHealthQuery } from '../src/services/hybridAiRouter';

const ROOT = process.cwd();

describe('Offline Curated Health Reference Library (6 Volumes / 18 Chapters)', () => {
  it('bundles all 6 confirmed WHO & Nigeria health volumes with non-empty clinical guidance', () => {
    expect(HEALTH_GUIDE_CATEGORIES).toHaveLength(6);
    expect(OFFLINE_HEALTH_LIBRARY.length).toBeGreaterThanOrEqual(18);

    for (const category of HEALTH_GUIDE_CATEGORIES) {
      const count = OFFLINE_HEALTH_LIBRARY.filter((g) => g.category === category).length;
      expect(count).toBeGreaterThanOrEqual(2);
    }

    for (const guide of OFFLINE_HEALTH_LIBRARY) {
      expect(guide.title.length).toBeGreaterThan(5);
      expect(guide.source.length).toBeGreaterThan(5);
      expect(guide.keyPoints.length).toBeGreaterThanOrEqual(3);
      expect(guide.whenToSeekCare.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('finds clinically relevant guides using Nigerian & medical synonyms (bp, sugar, pcos, malaria, ss, stroke)', () => {
    const bpMatches = searchOfflineHealthLibrary('high bp hypertension target');
    expect(bpMatches[0]?.guide.id).toContain('blood-pressure');

    const malariaMatches = searchOfflineHealthLibrary('malaria rdt act fever');
    expect(malariaMatches[0]?.guide.id).toContain('malaria');

    const pcosMatches = searchOfflineHealthLibrary('polycystic ovary syndrome pcos insulin');
    expect(pcosMatches[0]?.guide.title.toLowerCase()).toContain('pcos');

    const sickleMatches = searchOfflineHealthLibrary('genotype ss hbss sickle cell pain crisis');
    expect(sickleMatches[0]?.guide.id).toContain('sickle-cell');

    const strokeMatches = searchOfflineHealthLibrary('face drooping slurred speech stroke');
    expect(strokeMatches[0]?.guide.id).toContain('stroke');
  });
});

describe('Instant Local Clinical Red-Flag Detector', () => {
  it('flags acute chest pain, stroke signs, seizures, and pregnancy danger signs immediately', () => {
    const chest = detectUrgentRedFlags('I have crushing chest pain and cannot breathe well');
    expect(chest.isUrgent).toBe(true);
    expect(chest.immediateGuidance).toContain('112');

    const stroke = detectUrgentRedFlags('My father has sudden face drooping and slurred speech');
    expect(stroke.isUrgent).toBe(true);

    const pregnancy = detectUrgentRedFlags('I am pregnant with heavy bleeding and severe headache');
    expect(pregnancy.isUrgent).toBe(true);
  });

  it('does not falsely trigger emergency alerts for routine health education questions', () => {
    const normal = detectUrgentRedFlags('What does HbA1c 5.4% mean on my lab result?');
    expect(normal.isUrgent).toBe(false);
    expect(normal.matchedSignals).toHaveLength(0);
  });
});

describe('Unified Hybrid AI Router (Local, On-Device Gemini Nano, Cloud & Fallback)', () => {
  it('stays 100% offline in Offline Mode when on-device Gemini Nano is unavailable (never calls Cloud)', async () => {
    const mockCloud = vi.fn();
    const mockFirebaseHybrid = vi.fn();

    const result = await routeHybridHealthQuery(
      {
        prompt: 'How should I prepare ORS for diarrhoea at home?',
        mode: 'General Symptom Guidance',
        routingPreference: 'smart-hybrid',
        cloudProvider: 'gemini',
        conversationHistory: [],
        includeProfileContext: true,
        cloudConsentGranted: true,
        patientContext: 'Age 34, Ibadan',
        isOnline: false,
        serverCloudConfigured: true,
      },
      {
        detectOnDevice: async () => ({
          status: 'unavailable',
          label: 'Unavailable',
          detail: 'Test browser without Gemini Nano',
          browserSupportsPromptApi: false,
        }),
        callServerCloudAi: mockCloud,
        runFirebaseHybrid: mockFirebaseHybrid,
      }
    );

    expect(mockCloud).not.toHaveBeenCalled();
    expect(mockFirebaseHybrid).not.toHaveBeenCalled();
    expect(result.actualPath).toBe('offline-library');
    expect(result.indicatorLabel).toContain('Offline Mode');
    expect(result.profileContextSharedWithCloud).toBe(false);
    expect(result.reply.toLowerCase()).toContain('ors');
  });

  it('uses Firebase AI Logic ON-DEVICE Gemini Nano when offline and device supports it', async () => {
    const mockCloud = vi.fn();
    const mockFirebaseHybrid = vi.fn().mockResolvedValue({
      reply: 'On-device guidance: Take oral rehydration salts in small sips and seek care if danger signs appear.',
      inferenceSource: 'on_device',
      model: 'Gemini Nano (On-Device via Firebase AI Logic)',
      latencyMs: 42,
    });

    const result = await routeHybridHealthQuery(
      {
        prompt: 'Explain oral rehydration therapy for watery diarrhoea.',
        mode: 'General Symptom Guidance',
        routingPreference: 'smart-hybrid',
        cloudProvider: 'gemini',
        conversationHistory: [],
        includeProfileContext: false,
        cloudConsentGranted: false,
        isOnline: false,
        serverCloudConfigured: true,
      },
      {
        detectOnDevice: async () => ({
          status: 'available',
          label: 'Gemini Nano Ready',
          detail: 'Ready',
          browserSupportsPromptApi: true,
        }),
        callServerCloudAi: mockCloud,
        runFirebaseHybrid: mockFirebaseHybrid,
      }
    );

    expect(mockCloud).not.toHaveBeenCalled();
    expect(mockFirebaseHybrid).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'only_on_device' })
    );
    expect(result.actualPath).toBe('local-on-device');
    expect(result.indicatorLabel).toContain('Local AI');
    expect(result.profileContextSharedWithCloud).toBe(false);
  });

  it('respects Local-Only mode even when online (zero cloud transfer)', async () => {
    const mockCloud = vi.fn();
    const result = await routeHybridHealthQuery(
      {
        prompt: 'What is normal blood pressure?',
        mode: 'General Symptom Guidance',
        routingPreference: 'local-only',
        cloudProvider: 'gemini',
        conversationHistory: [],
        includeProfileContext: true,
        cloudConsentGranted: true,
        patientContext: 'Age 45, Ogbomoso',
        isOnline: true,
        serverCloudConfigured: true,
      },
      {
        detectOnDevice: async () => ({
          status: 'unavailable',
          label: 'Unavailable',
          detail: 'No Gemini Nano',
          browserSupportsPromptApi: false,
        }),
        callServerCloudAi: mockCloud,
      }
    );

    expect(mockCloud).not.toHaveBeenCalled();
    expect(result.actualPath).toBe('local-library');
    expect(result.indicatorLabel).toContain('Local AI');
    expect(result.profileContextSharedWithCloud).toBe(false);
  });

  it('strips personal profile context before sending to Cloud AI if NDPA consent is not granted', async () => {
    const mockCloud = vi.fn().mockResolvedValue({
      reply: 'HbA1c reflects your average blood sugar over 2 to 3 months.',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
    });

    const result = await routeHybridHealthQuery(
      {
        prompt: 'Compare my HbA1c 5.4%, fasting glucose 96 mg/dL, and total cholesterol 184 mg/dL and prepare 4 questions for my doctor.',
        mode: 'Medical Document Explainer',
        routingPreference: 'cloud-only',
        cloudProvider: 'gemini',
        conversationHistory: [],
        includeProfileContext: true,
        cloudConsentGranted: false,
        patientContext: 'PRIVATE_PROFILE_SHOULD_NOT_BE_SENT',
        isOnline: true,
        serverCloudConfigured: true,
      },
      {
        detectOnDevice: async () => ({
          status: 'unavailable',
          label: 'Unavailable',
          detail: 'No Gemini Nano',
          browserSupportsPromptApi: false,
        }),
        callServerCloudAi: mockCloud,
      }
    );

    expect(mockCloud).toHaveBeenCalledTimes(1);
    const sentPayload = mockCloud.mock.calls[0][0];
    expect(sentPayload.patientContext || '').not.toContain('PRIVATE_PROFILE_SHOULD_NOT_BE_SENT');
    expect(result.profileContextSharedWithCloud).toBe(false);
    expect(['hybrid', 'cloud']).toContain(result.actualPath);
  });

  it('falls back cleanly to Offline Health Library when Cloud AI throws an error or times out', async () => {
    const mockCloud = vi.fn().mockRejectedValue(new Error('503 Cloud Gateway Down'));
    const mockFirebaseHybrid = vi.fn().mockRejectedValue(new Error('Network timeout'));

    const result = await routeHybridHealthQuery(
      {
        prompt: 'What are the warning signs of malaria and typhoid?',
        mode: 'General Symptom Guidance',
        routingPreference: 'cloud-only',
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
          detail: 'No Gemini Nano',
          browserSupportsPromptApi: false,
        }),
        callServerCloudAi: mockCloud,
        runFirebaseHybrid: mockFirebaseHybrid,
      }
    );

    expect(result.actualPath).toBe('offline-library');
    expect(result.fallbackNotice).toBeTruthy();
    expect(result.reply.toLowerCase()).toContain('malaria');
  });

  it('evaluates short terminology queries as local-suitable and complex multi-turn record queries as cloud-preferred', () => {
    const localEval = evaluatePromptForRouting('What is hypertension?', 'General Symptom Guidance', false, 0);
    expect(localEval.suitableForLocal).toBe(true);

    const cloudEval = evaluatePromptForRouting(
      'Can you compare my last three HbA1c values with my blood pressure logs and help prepare a referral summary for UCH Ibadan cardiology?',
      'Health Record Summary',
      true,
      4
    );
    expect(cloudEval.suitableForLocal).toBe(false);

    const localBuilt = buildLocalKnowledgeResponse(
      'What does malaria RDT mean?',
      detectUrgentRedFlags('What does malaria RDT mean?'),
      searchOfflineHealthLibrary('malaria RDT')
    );
    expect(localBuilt.citedGuides.length).toBeGreaterThan(0);
  });
});

describe('PWA Manifest, Icons & Privacy-Strict Service Worker Configuration', () => {
  it('provides all required PWA icons in public/ (SVG, 192, 512, maskable 512, apple-touch 180)', () => {
    const requiredAssets = [
      'public/icon.svg',
      'public/pwa-192x192.png',
      'public/pwa-512x512.png',
      'public/pwa-maskable-512x512.png',
      'public/apple-touch-icon.png',
    ];
    for (const relPath of requiredAssets) {
      const fullPath = path.join(ROOT, relPath);
      expect(fs.existsSync(fullPath), `Missing PWA asset: ${relPath}`).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(500);
    }
  });

  it('configures VitePWA with HealthConnect manifest and NetworkOnly privacy rules for patient APIs', () => {
    const viteConfig = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf8');
    expect(viteConfig).toContain('VitePWA(');
    expect(viteConfig).toContain("name: 'HealthConnect'");
    expect(viteConfig).toContain("short_name: 'HealthConnect'");
    expect(viteConfig).toContain("display: 'standalone'");
    expect(viteConfig).toContain("handler: 'NetworkOnly'");
    expect(viteConfig).toContain('firestore.googleapis.com');
    expect(viteConfig).toContain('identitytoolkit.googleapis.com');

    const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    expect(indexHtml).toContain('viewport-fit=cover');
    expect(indexHtml).toContain('apple-touch-icon.png');
    expect(indexHtml).toContain('theme-color');
  });
});
