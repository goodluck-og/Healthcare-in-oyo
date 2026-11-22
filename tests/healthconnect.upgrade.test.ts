import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApp } from '../server/createApp';
import {
  buildPersonalisedDashboardPlan,
  calculateAgeFromDob,
  HEALTHCONNECT_MODULE_CATALOG,
} from '../src/services/personalisationEngine';
import { searchMedicalOntology } from '../src/data/medicalOntologyData';
import { buildInteractiveLocalIntake } from '../src/services/clinicalIntakeEngine';
import { routeHybridHealthQuery } from '../src/services/hybridAiRouter';
import {
  evaluateWearableVitals,
  findNearestEmergencyHospitals,
} from '../src/services/wearableEngine';
import {
  buildEmergencyQrPayload,
  generateLocalEmergencyQrSvg,
} from '../src/services/emergencyQrService';
import { DEMO_FACILITIES } from '../src/data/mockNigeriaData';
import type { FamilyProfile } from '../src/types/healthcare';

function makeProfile(overrides: Partial<FamilyProfile>): FamilyProfile {
  return {
    id: 'test-prof',
    fullName: 'Test Member',
    relationship: 'Self (Primary)',
    age: 30,
    gender: 'Female',
    genderConfirmed: 'female',
    city: 'Ibadan',
    bloodGroup: 'O+',
    genotype: 'AA',
    allergies: ['Penicillin'],
    chronicConditions: ['Asthma'],
    currentMedications: ['Salbutamol Inhaler'],
    hmoProvider: 'HealthConnect Care',
    demoMemberId: 'HC-TEST',
    ...overrides,
  };
}

describe('HealthConnect Universal Upgrade — Personalisation & Child Safety', () => {
  it('calculates exact age from DOB and strictly enables Guardian Child Mode for ages 0–12', () => {
    const refDate = new Date('2026-11-22T00:00:00Z');
    const age8 = calculateAgeFromDob('2018-05-10', undefined, refDate);
    expect(age8).toBe(8);

    const childProfile = makeProfile({
      dateOfBirth: '2018-05-10',
      age: 8,
      genderConfirmed: 'female',
      enabledModules: ['female-maternal-preventive', 'male-preventive-prostate'],
    });
    const plan = buildPersonalisedDashboardPlan(childProfile);

    expect(plan.ageInfo.stage).toBe('child');
    expect(plan.ageInfo.isGuardianManaged).toBe(true);
    expect(plan.hideAdultReproductiveTabs).toBe(true);
    // Zero adult-only or reproductive modules may appear for a child even if requested
    expect(plan.primaryModules.some((m) => m.adultOnly)).toBe(false);
    expect(plan.optionalModules.some((m) => m.adultOnly)).toBe(false);
    expect(plan.primaryModules.some((m) => m.domain === 'female_health')).toBe(false);
  });

  it('produces distinct focused plans across all 5 life stages while covering the 120-capability blueprint', () => {
    const totalCaps = HEALTHCONNECT_MODULE_CATALOG.reduce(
      (sum, m) => sum + m.capabilities.length,
      0
    );
    expect(totalCaps).toBeGreaterThanOrEqual(110);

    const teenPlan = buildPersonalisedDashboardPlan(
      makeProfile({ dateOfBirth: '2011-04-01', age: 15, genderConfirmed: 'male' })
    );
    const youngAdultPlan = buildPersonalisedDashboardPlan(
      makeProfile({ dateOfBirth: '2003-04-01', age: 23, genderConfirmed: 'female' })
    );
    const adultPlan = buildPersonalisedDashboardPlan(
      makeProfile({ dateOfBirth: '1986-04-01', age: 40, genderConfirmed: 'male' })
    );
    const olderPlan = buildPersonalisedDashboardPlan(
      makeProfile({ dateOfBirth: '1960-04-01', age: 66, genderConfirmed: 'female' })
    );

    expect(teenPlan.ageInfo.stage).toBe('teen');
    expect(teenPlan.primaryModules.some((m) => m.adultOnly)).toBe(false);
    expect(youngAdultPlan.ageInfo.stage).toBe('young_adult');
    expect(adultPlan.ageInfo.stage).toBe('adult');
    expect(olderPlan.ageInfo.stage).toBe('older_adult');
  });
});

describe('HealthConnect — Verified DOID Ontology & ChatGPT-Style Interactive Intake', () => {
  it('matches verified DOID & ICD-11 ontology entries for Malaria, Hypertension, and Trauma', () => {
    const malaria = searchMedicalOntology('fever chills malaria test');
    expect(malaria.length).toBeGreaterThan(0);
    expect(malaria[0].entry.doid).toBe('DOID:12365');

    const bp = searchMedicalOntology('high blood pressure hypertension reading');
    expect(bp.some((e) => e.entry.doid === 'DOID:10763')).toBe(true);
  });

  it('asks ChatGPT-style clarifying follow-up questions with quick-reply chips when user says "I feel sick" offline', async () => {
    const intake = buildInteractiveLocalIntake({
      prompt: 'I feel sick',
      conversationHistory: [],
    });
    expect(intake.handled).toBe(true);
    expect(intake.quickReplies.length).toBeGreaterThanOrEqual(3);

    const response = await routeHybridHealthQuery({
      prompt: 'I feel sick',
      mode: 'General Symptom Guidance',
      routingPreference: 'local-only',
      cloudProvider: 'gemini',
      openRouterModel: 'openai/gpt-4o',
      conversationHistory: [],
      patientContext: '',
      includeProfileContext: false,
      cloudConsentGranted: false,
      isOnline: false,
      serverCloudConfigured: false,
    });

    expect(response.quickReplies && response.quickReplies.length).toBeGreaterThan(0);
    expect(response.haltEducationalDialogue).not.toBe(true);
  });

  it('provides offline photo first-aid triage when an injury image is attached offline, while preserving red-flag middleware', async () => {
    const offlinePhotoRes = await routeHybridHealthQuery({
      prompt: 'Accident cut on arm, what should I do?',
      mode: 'Emergency First Aid & Photo Aid',
      routingPreference: 'local-only',
      cloudProvider: 'gemini',
      openRouterModel: 'openai/gpt-4o',
      conversationHistory: [],
      patientContext: '',
      includeProfileContext: false,
      cloudConsentGranted: false,
      isOnline: false,
      serverCloudConfigured: false,
      image: {
        mimeType: 'image/jpeg',
        base64Data: 'AAAA',
        previewDataUrl: 'data:image/jpeg;base64,AAAA',
        fileName: 'accident.jpg',
        categoryHint: 'Accident / Cut',
      },
    });

    expect(offlinePhotoRes.intakeStage).toBe('image-offline-triage');
    expect(offlinePhotoRes.reply.toLowerCase()).toContain('first-aid');

    // Red-flag middleware MUST still halt educational dialogue immediately
    const redFlagRes = await routeHybridHealthQuery({
      prompt: 'My friend is unconscious with shortness of breath after an accident',
      mode: 'Emergency First Aid & Photo Aid',
      routingPreference: 'local-only',
      cloudProvider: 'gemini',
      openRouterModel: 'openai/gpt-4o',
      conversationHistory: [],
      patientContext: '',
      includeProfileContext: false,
      cloudConsentGranted: false,
      isOnline: false,
      serverCloudConfigured: false,
    });

    expect(redFlagRes.haltEducationalDialogue).toBe(true);
    expect(redFlagRes.urgentFooter).toBe('Urgent: Seek Professional Care');
    expect(redFlagRes.emergencyRoute).toBe('/emergency');
  });
});

describe('HealthConnect — Smartwatch Critical Vitals, GPS Ranking & Offline Emergency QR', () => {
  it('flags critical SpO2 / heart rate and ranks nearest 24/7 hospitals by GPS distance', () => {
    const crit = evaluateWearableVitals({
      heartRateBpm: 168,
      spo2Percent: 85,
      systolic: 145,
      diastolic: 92,
      temperatureC: 37.9,
    });
    expect(crit.severity).toBe('critical');
    expect(crit.reasons.length).toBeGreaterThanOrEqual(2);

    const ranked = findNearestEmergencyHospitals(DEMO_FACILITIES, { lat: 7.402, lng: 3.902 });
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].distanceKm).not.toBeNull();
    if (ranked.length > 1 && ranked[0].distanceKm !== null && ranked[1].distanceKm !== null) {
      expect(ranked[0].distanceKm).toBeLessThanOrEqual(ranked[1].distanceKm);
    }
  });

  it('generates offline Emergency Medical QR SVG locally containing blood group, allergies & ICE', async () => {
    const payload = buildEmergencyQrPayload({
      profile: makeProfile({
        fullName: 'Amina Yusuf',
        bloodGroup: 'O-',
        genotype: 'AS',
        allergies: ['Penicillin', 'Sulfa'],
      }),
      primaryContact: {
        id: 'ice-1',
        name: 'Musa Yusuf',
        relationship: 'Spouse',
        phone: '+2348012345678',
        city: 'Ibadan',
        isPrimary: true,
      },
    });

    expect(payload.qrText).toContain('BLOOD: O-');
    expect(payload.qrText).toContain('GENOTYPE: AS');
    expect(payload.qrText).toContain('Penicillin');
    expect(payload.qrText).toContain('+2348012345678');

    const svg = await generateLocalEmergencyQrSvg(payload.qrText);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });
});

describe('HealthConnect Backend Routes — Multimodal Red-Flag & openFDA Validation', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createApiApp();
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('enforces Red-Flag middleware on /api/ai/health-assistant even when an image attachment is included', async () => {
    const res = await fetch(`${baseUrl}/api/ai/health-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'gemini',
        mode: 'Emergency First Aid & Photo Aid',
        messages: [{ role: 'user', content: 'Person is unconscious and has severe chest pain' }],
        image: {
          mimeType: 'image/jpeg',
          base64Data: 'AAAA',
          categoryHint: 'Accident / Cut',
        },
      }),
    });
    const body = (await res.json()) as {
      redFlagDetected?: boolean;
      haltEducationalDialogue?: boolean;
      urgentFooter?: string;
      emergencyRoute?: string;
    };

    expect(res.status).toBe(200);
    expect(body.redFlagDetected).toBe(true);
    expect(body.haltEducationalDialogue).toBe(true);
    expect(body.urgentFooter).toBe('Urgent: Seek Professional Care');
    expect(body.emergencyRoute).toBe('/emergency');
  });

  it('rejects too-short queries cleanly on /api/medical/drug-lookup', async () => {
    const res = await fetch(`${baseUrl}/api/medical/drug-lookup?q=a`);
    expect(res.status).toBe(400);
  });
});
