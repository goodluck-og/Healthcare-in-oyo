import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApiApp } from '../server/createApp';
import type { TokenVerifier } from '../server/middleware/auth';
import type { FetchLike } from '../server/services/paymentService';
import {
  buildEmergencySmsBody,
  normalizePhoneToE164,
} from '../server/services/twilioEmergencyService';
import {
  computeVaccineScheduleProgress,
  resolveAgeGroupFromAge,
} from '../src/components/dashboard/VaccineScheduleTracker';
import {
  classifyHeartRateZone,
  generateNextHeartRateSample,
  SIMULATED_WATCH_MODES,
} from '../src/components/monitoring/SimulatedWatchHeartRateChart';
import type { VaccinationRecord } from '../src/types/healthcare';

describe('Twilio Automated Emergency SMS, Age-Based Vaccine Tracker & Simulated Watch Stream', () => {
  let server: Server;
  let baseUrl: string;
  const capturedTwilioRequests: Array<{ url: string; init?: RequestInit }> = [];

  const mockTokenVerifier: TokenVerifier = async (idToken: string) => {
    if (idToken === 'valid-emergency-token') {
      return {
        uid: 'patient-emg-001',
        email: 'patient@healthconnect.africa',
        emailVerified: true,
      };
    }
    throw new Error('Invalid token');
  };

  const mockTwilioFetch: FetchLike = async (url, init) => {
    capturedTwilioRequests.push({ url: String(url), init });
    return new Response(
      JSON.stringify({
        sid: 'SM999888777666555444333222111000',
        status: 'queued',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  };

  beforeAll(async () => {
    const app = createApiApp({
      tokenVerifier: mockTokenVerifier,
      fetchImpl: mockTwilioFetch,
      rateLimits: { emergencySmsMax: 50 },
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
    capturedTwilioRequests.length = 0;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_FROM_NUMBER;
  });

  it('rejects unauthenticated POST /api/emergency/sms/dispatch requests with 401', async () => {
    const res = await fetch(`${baseUrl}/api/emergency/sms/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientName: 'Amina Adeyemi',
        locationLabel: 'Bodija, Ibadan',
        coordinates: { lat: 7.4214, lng: 3.9112 },
        contacts: [{ name: 'Tunde Adeyemi', phone: '+2348031234567' }],
      }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects malformed coordinates or invalid phone numbers with 400', async () => {
    const res = await fetch(`${baseUrl}/api/emergency/sms/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-emergency-token',
      },
      body: JSON.stringify({
        patientName: 'Amina Adeyemi',
        locationLabel: 'Ibadan',
        coordinates: { lat: 145, lng: 3.9 }, // Invalid latitude > 90
        contacts: [{ name: 'Tunde', phone: 'not-a-phone!' }],
      }),
    });
    expect(res.status).toBe(400);
  });

  it('returns honest 503 with missingCredentials and GPS preview when Twilio env vars are unset', async () => {
    const res = await fetch(`${baseUrl}/api/emergency/sms/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-emergency-token',
      },
      body: JSON.stringify({
        patientName: 'Amina Adeyemi',
        emergencyType: 'Ambulance Dispatch Request',
        locationLabel: 'Bodija, Ibadan',
        coordinates: { lat: 7.42145, lng: 3.91123 },
        bloodGroup: 'O+',
        contacts: [{ name: 'Tunde Adeyemi', phone: '08031234567' }],
      }),
    });

    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      ok: boolean;
      configured: boolean;
      missingCredentials: string[];
      messageBody: string;
    };
    expect(body.ok).toBe(false);
    expect(body.configured).toBe(false);
    expect(body.missingCredentials).toEqual([
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_FROM_NUMBER',
    ]);
    expect(body.messageBody).toContain('EMERGENCY');
    expect(body.messageBody).toContain('7.42145, 3.91123');
    expect(body.messageBody).toContain('https://maps.google.com/?q=7.42145,3.91123');
    expect(capturedTwilioRequests).toHaveLength(0);
  });

  it('dispatches Emergency SMS with GPS coordinates via Twilio REST API when credentials are configured', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC_TEST_ACCOUNT_SID_123';
    process.env.TWILIO_AUTH_TOKEN = 'test_auth_token_secret';
    process.env.TWILIO_FROM_NUMBER = '+15551234567';

    const res = await fetch(`${baseUrl}/api/emergency/sms/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-emergency-token',
      },
      body: JSON.stringify({
        patientName: 'Amina Adeyemi',
        emergencyType: 'SOS Medical Triage',
        locationLabel: 'UCH Road, Ibadan',
        coordinates: { lat: 7.40182, lng: 3.90124 },
        bloodGroup: 'A+',
        allergies: 'Penicillin',
        notes: 'Sudden severe dizziness',
        contacts: [
          { name: 'Tunde Adeyemi', phone: '08031234567' },
          { name: 'Dr. Femi', phone: '+2348099876543' },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      configured: boolean;
      dispatchedCount: number;
      failedCount: number;
      results: Array<{ name: string; to: string; sent: boolean; sid?: string }>;
    };
    expect(body.ok).toBe(true);
    expect(body.configured).toBe(true);
    expect(body.dispatchedCount).toBe(2);
    expect(body.failedCount).toBe(0);
    expect(body.results[0].to).toBe('+2348031234567');
    expect(body.results[1].to).toBe('+2348099876543');

    expect(capturedTwilioRequests).toHaveLength(2);
    expect(capturedTwilioRequests[0].url).toBe(
      'https://api.twilio.com/2010-04-01/Accounts/AC_TEST_ACCOUNT_SID_123/Messages.json'
    );
    const authHeader = (capturedTwilioRequests[0].init?.headers as Record<string, string>)
      .Authorization;
    expect(authHeader).toBe(
      `Basic ${Buffer.from('AC_TEST_ACCOUNT_SID_123:test_auth_token_secret').toString('base64')}`
    );

    const sentParams = new URLSearchParams(String(capturedTwilioRequests[0].init?.body || ''));
    expect(sentParams.get('From')).toBe('+15551234567');
    expect(sentParams.get('To')).toBe('+2348031234567');
    expect(sentParams.get('Body')).toContain('EMERGENCY');
    expect(sentParams.get('Body')).toContain('7.40182, 3.90124');
    expect(sentParams.get('Body')).toContain('Penicillin');
  });

  it('normalizes Nigerian local and E.164 phone numbers accurately', () => {
    expect(normalizePhoneToE164('0803 123 4567')).toBe('+2348031234567');
    expect(normalizePhoneToE164('+234 (809) 555-1212')).toBe('+2348095551212');
    expect(
      buildEmergencySmsBody({
        patientName: 'Chidi',
        emergencyType: 'Watch Critical Alert',
        locationLabel: 'Ring Road, Ibadan',
        coordinates: null,
        contacts: [],
      })
    ).toContain('Location: Ring Road, Ibadan');
  });

  it('resolves age-based vaccine brackets and computes progress accurately', () => {
    expect(resolveAgeGroupFromAge(3)).toBe('0-5');
    expect(resolveAgeGroupFromAge(12)).toBe('10-15');
    expect(resolveAgeGroupFromAge(34)).toBe('15+');
    expect(resolveAgeGroupFromAge(undefined)).toBe('15+');

    const records: VaccinationRecord[] = [
      {
        id: 'v1',
        profileId: 'p1',
        vaccineName: 'BCG & Hepatitis B (Birth Dose)',
        ageGroup: '0-5',
        doseLabel: 'At Birth',
        status: 'Completed',
        date: '2026-01-12',
      },
      {
        id: 'v2',
        profileId: 'p1',
        vaccineName: 'Pentavalent (DPT-HepB-Hib)',
        ageGroup: '0-5',
        doseLabel: '6, 10 & 14 Weeks',
        status: 'Scheduled',
        date: '2026-03-01',
      },
    ];

    const summary = computeVaccineScheduleProgress('0-5', records);
    expect(summary.totalMilestones).toBe(4);
    expect(summary.completedCount).toBe(1);
    expect(summary.scheduledCount).toBe(1);
    expect(summary.unloggedCount).toBe(2);
    expect(summary.completionPercent).toBe(25);
    expect(summary.scheduledPercent).toBe(25);
  });

  it('generates bounded simulated watch heart rate samples and classifies critical zones', () => {
    const restingMode = SIMULATED_WATCH_MODES[0];
    const alertMode = SIMULATED_WATCH_MODES[3];

    const sample = generateNextHeartRateSample(null, restingMode, 1, 45, 155);
    expect(sample.bpm).toBeGreaterThanOrEqual(38);
    expect(sample.bpm).toBeLessThanOrEqual(205);
    expect(sample.spo2).toBeGreaterThanOrEqual(88);
    expect(sample.timeLabel).toMatch(/^\d{2}:\d{2}:\d{2}$/);

    const highZone = classifyHeartRateZone(168, 45, 155);
    expect(highZone.isCritical).toBe(true);
    expect(highZone.label).toBe('Critical High');

    const normalZone = classifyHeartRateZone(74, 45, 155);
    expect(normalZone.isCritical).toBe(false);
    expect(normalZone.label).toBe('Resting Normal');

    const alertSample = generateNextHeartRateSample(162, alertMode, 5, 45, 155);
    expect(alertSample.bpm).toBeGreaterThan(140);
  });
});
