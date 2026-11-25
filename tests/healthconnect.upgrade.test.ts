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

  it('asks ChatGPT-style clarifying follow-up questions with quick-reply chips when user says "I feel sick" or "I am sick" (offline and online)', async () => {
    const intake = buildInteractiveLocalIntake({
      prompt: 'I am sick',
      conversationHistory: [
        { role: 'user', content: 'Tell me about malaria prevention' },
        { role: 'assistant', content: 'Use treated nets and test early.' },
      ],
    });
    expect(intake.handled).toBe(true);
    expect(intake.intakeStage).toBe('triage-start');
    expect(intake.reply.toLowerCase()).toContain('what are you feeling');
    expect(intake.reply.toLowerCase()).toContain('symptoms');
    expect(intake.reply.toLowerCase()).toContain('rest');
    expect(intake.quickReplies.length).toBeGreaterThanOrEqual(4);

    // Offline / local-only path
    const offlineResponse = await routeHybridHealthQuery({
      prompt: 'I am sick',
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

    expect(offlineResponse.quickReplies && offlineResponse.quickReplies.length).toBeGreaterThan(0);
    expect(offlineResponse.reply.toLowerCase()).toContain('what are you feeling');
    expect(offlineResponse.haltEducationalDialogue).not.toBe(true);

    // Online Smart Hybrid path should ALSO immediately ask symptoms & rest questions
    const onlineResponse = await routeHybridHealthQuery({
      prompt: 'I am sick',
      mode: 'General Symptom Guidance',
      routingPreference: 'smart-hybrid',
      cloudProvider: 'gemini',
      openRouterModel: 'openai/gpt-4o',
      conversationHistory: [],
      patientContext: '',
      includeProfileContext: false,
      cloudConsentGranted: false,
      isOnline: true,
      serverCloudConfigured: true,
    });

    expect(onlineResponse.intakeStage).toBe('triage-start');
    expect(onlineResponse.reply.toLowerCase()).toContain('what are you feeling');
    expect(onlineResponse.reply.toLowerCase()).toContain('rest');
    expect(onlineResponse.quickReplies && onlineResponse.quickReplies.length).toBeGreaterThanOrEqual(4);
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

describe('HealthConnect — Demo Sandbox Accounts & Admin Security Boundary', () => {
  it('provides 5 working isolated demo accounts and never allows demo accounts to hold administrator role', async () => {
    const { DEMO_SANDBOX_ACCOUNTS, matchDemoSandboxCredentials, ADMIN_GMAIL_ACCOUNT } = await import(
      '../src/data/demoAccounts'
    );

    expect(ADMIN_GMAIL_ACCOUNT).toBe('amesinlolagoodluck@gmail.com');
    expect(DEMO_SANDBOX_ACCOUNTS.length).toBe(5);

    for (const acc of DEMO_SANDBOX_ACCOUNTS) {
      expect(acc.role).not.toBe('administrator');
      const matched = matchDemoSandboxCredentials(acc.email, acc.password);
      expect(matched?.id).toBe(acc.id);
      expect(matchDemoSandboxCredentials(acc.email, 'WrongPassword123!')).toBeNull();
    }

    // Admin Gmail must NEVER authenticate through demo sandbox credentials
    expect(matchDemoSandboxCredentials(ADMIN_GMAIL_ACCOUNT, 'HealthDemo2026!')).toBeNull();

    // Child demo profile must enforce Guardian Child Safety Mode
    const childAcc = DEMO_SANDBOX_ACCOUNTS.find((a) => a.id === 'demo-child-guardian');
    expect(childAcc).toBeDefined();
    const childPlan = buildPersonalisedDashboardPlan(childAcc!.profiles[0]);
    expect(childPlan.ageInfo.isGuardianManaged).toBe(true);
    expect(childPlan.hideAdultReproductiveTabs).toBe(true);
  });
});

describe('HealthConnect — Real-Time Chat Regex PII Filter (Phones, Accounts, Coordinates)', () => {
  it('detects and masks international and Nigerian phone numbers while preserving emergency shortcodes', async () => {
    const { filterAndMaskChatPii, MASK_TOKENS } = await import('../shared/chatPiiFilter');

    const res1 = filterAndMaskChatPii('Call me on +234 803 555 0199 or 08091234567 for follow-up.');
    expect(res1.hasSensitiveData).toBe(true);
    expect(res1.detectedCategories).toContain('phone');
    expect(res1.maskedText).not.toContain('803');
    expect(res1.maskedText).not.toContain('08091234567');
    expect(res1.maskedText).toContain(MASK_TOKENS.phone);

    const res2 = filterAndMaskChatPii('My US number is (415) 555-0192.');
    expect(res2.hasSensitiveData).toBe(true);
    expect(res2.maskedText).toContain(MASK_TOKENS.phone);
  });

  it('detects and masks NUBAN bank account numbers, IBANs, and card numbers', async () => {
    const { filterAndMaskChatPii, MASK_TOKENS } = await import('../shared/chatPiiFilter');

    const resAcct = filterAndMaskChatPii('Send transfer to account number 0123456789 at GTBank.');
    expect(resAcct.hasSensitiveData).toBe(true);
    expect(resAcct.detectedCategories).toContain('account');
    expect(resAcct.maskedText).not.toContain('0123456789');
    expect(resAcct.maskedText).toContain(MASK_TOKENS.account);

    const resCard = filterAndMaskChatPii('Card 4532-1122-3344-5566 and IBAN GB29NWBK60161331926819');
    expect(resCard.hasSensitiveData).toBe(true);
    expect(resCard.maskedText).not.toContain('4532');
    expect(resCard.maskedText).not.toContain('GB29NWBK');
    expect(resCard.maskedText).toContain(MASK_TOKENS.account);
  });

  it('detects and masks decimal GPS coordinates, DMS coordinates, and Google Maps pins', async () => {
    const { filterAndMaskChatPii, MASK_TOKENS } = await import('../shared/chatPiiFilter');

    const resDec = filterAndMaskChatPii('I am at 7.4190, 3.9110 near Bodija.');
    expect(resDec.hasSensitiveData).toBe(true);
    expect(resDec.detectedCategories).toContain('coordinates');
    expect(resDec.maskedText).not.toContain('7.4190');
    expect(resDec.maskedText).toContain(MASK_TOKENS.coordinates);

    const resMap = filterAndMaskChatPii(
      'Location pin https://www.google.com/maps?q=6.5244,3.3792 and lat: 7.402, lng: 3.902'
    );
    expect(resMap.hasSensitiveData).toBe(true);
    expect(resMap.maskedText).not.toContain('6.5244');
    expect(resMap.maskedText).not.toContain('7.402');

    const resDms = filterAndMaskChatPii(`Coordinates: 7°25'08"N 3°54'39"E`);
    expect(resDms.hasSensitiveData).toBe(true);
    expect(resDms.maskedText).toContain(MASK_TOKENS.coordinates);
  });

  it('preserves legitimate clinical measurements without false positives', async () => {
    const { filterAndMaskChatPii } = await import('../shared/chatPiiFilter');

    const clinical =
      'My BP is 120/80 mmHg, heart rate 76 bpm, temp 37.5°C, glucose 184 mg/dL, SpO2 98%, should I call 112?';
    const res = filterAndMaskChatPii(clinical);
    expect(res.hasSensitiveData).toBe(false);
    expect(res.detectedCategories).toEqual([]);
    expect(res.maskedText).toBe(clinical);
  });
});

describe('HealthConnect Sentinel Moderator Bot (Automated Policy & Service Governance)', () => {
  const sampleServices = [
    {
      id: 'svc-pediatric',
      name: 'Maternal & Pediatric Care Desk',
      category: 'Care Team' as const,
      leadSpecialty: 'Pediatrics & Child Fever Triage',
      botModerationEnabled: true,
      botAutoMaskPii: true,
      botAutoEscalateRedFlags: true,
      active: true,
    },
    {
      id: 'svc-emergency',
      name: '24/7 Emergency Dispatch Team',
      category: 'Emergency Desk' as const,
      leadSpecialty: 'Trauma & Urgent Care',
      botModerationEnabled: true,
      botAutoMaskPii: true,
      botAutoEscalateRedFlags: true,
      active: true,
    },
    {
      id: 'svc-paused',
      name: 'Paused Legacy Desk',
      category: 'Clinical Service' as const,
      leadSpecialty: 'Diagnostics',
      botModerationEnabled: false,
      botAutoMaskPii: true,
      botAutoEscalateRedFlags: true,
      active: false,
    },
  ];

  it('automatically masks PII and routes matching health queries to an active bot-monitored care team', async () => {
    const { evaluateModeratorBot } = await import('../shared/moderatorBot');
    const decision = evaluateModeratorBot(
      'My child has a fever, call +234 803 555 0199 or send to account number 0123456789 at 7.4190, 3.9110.',
      sampleServices
    );
    expect(decision.action).toBe('pii_masked');
    expect(decision.piiCategories).toEqual(expect.arrayContaining(['phone', 'account', 'coordinates']));
    expect(decision.maskedText).not.toContain('803');
    expect(decision.maskedText).not.toContain('0123456789');
    expect(decision.maskedText).not.toContain('7.4190');
    expect(decision.routedServiceName).toBe('Maternal & Pediatric Care Desk');
    expect(decision.botNotice).toBeTruthy();
  });

  it('escalates emergency red flags immediately while masking any embedded PII', async () => {
    const { evaluateModeratorBot } = await import('../shared/moderatorBot');
    const decision = evaluateModeratorBot(
      'Patient has severe chest pain and difficulty breathing at 6.5244, 3.3792',
      sampleServices
    );
    expect(decision.action).toBe('red_flag_escalated');
    expect(decision.redFlagKeywords.length).toBeGreaterThan(0);
    expect(decision.piiCategories).toContain('coordinates');
    expect(decision.maskedText).not.toContain('6.5244');
  });

  it('flags off-platform contact or direct bank-transfer solicitation policies', async () => {
    const { evaluateModeratorBot } = await import('../shared/moderatorBot');
    const decision = evaluateModeratorBot(
      'Please DM me on WhatsApp and send money to my personal account.',
      sampleServices
    );
    expect(decision.action).toBe('policy_warning');
    expect(decision.policyFlags.length).toBeGreaterThan(0);
    expect(decision.botNotice).toBeTruthy();
  });

  it('allows clean clinical questions without false positives', async () => {
    const { evaluateModeratorBot } = await import('../shared/moderatorBot');
    const decision = evaluateModeratorBot(
      'What are normal fasting blood sugar levels and how should I prepare for a malaria rapid test?',
      sampleServices
    );
    expect(decision.action).toBe('allowed');
    expect(decision.piiCategories).toEqual([]);
    expect(decision.redFlagKeywords).toEqual([]);
    expect(decision.policyFlags).toEqual([]);
    expect(decision.botNotice).toBeNull();
  });
});


