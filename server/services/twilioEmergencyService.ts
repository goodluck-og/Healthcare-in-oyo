import { getServerConfig } from '../config/env.ts';
import type { FetchLike } from './paymentService.ts';

export interface EmergencySmsContactInput {
  id?: string;
  name: string;
  phone: string;
}

export interface EmergencySmsDispatchInput {
  patientName: string;
  emergencyType: 'SOS Medical Triage' | 'Ambulance Dispatch Request' | 'Watch Critical Alert';
  locationLabel: string;
  coordinates?: { lat: number; lng: number } | null;
  bloodGroup?: string;
  allergies?: string;
  notes?: string;
  contacts: EmergencySmsContactInput[];
}

export interface EmergencySmsRecipientResult {
  name: string;
  to: string;
  sent: boolean;
  sid?: string;
  status?: string;
  error?: string;
}

export interface EmergencySmsDispatchResult {
  ok: boolean;
  configured: boolean;
  httpStatus: number;
  provider: 'twilio';
  missingCredentials?: string[];
  messageBody: string;
  dispatchedCount: number;
  failedCount: number;
  results: EmergencySmsRecipientResult[];
  message: string;
}

/**
 * Normalizes Nigerian local numbers (e.g. 0803... -> +234803...) and strips formatting
 * so Twilio receives valid E.164 destination phone numbers.
 */
export function normalizePhoneToE164(raw: string): string {
  const cleaned = raw.replace(/[\s()-]/g, '').trim();
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (/^0[789][01]\d{8}$/.test(cleaned)) {
    return `+234${cleaned.slice(1)}`;
  }
  if (/^234\d{10}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  return cleaned.startsWith('00') ? `+${cleaned.slice(2)}` : `+${cleaned}`;
}

export function buildEmergencySmsBody(input: EmergencySmsDispatchInput): string {
  const parts: string[] = [
    `EMERGENCY (${input.emergencyType}) — HealthConnect Alert for ${input.patientName}.`,
  ];

  if (input.coordinates) {
    const lat = input.coordinates.lat.toFixed(5);
    const lng = input.coordinates.lng.toFixed(5);
    parts.push(`Last known GPS: ${lat}, ${lng} (https://maps.google.com/?q=${lat},${lng})`);
  } else {
    parts.push(`Location: ${input.locationLabel}`);
  }

  if (input.locationLabel && input.coordinates) {
    parts.push(`Area: ${input.locationLabel}`);
  }

  const clinicalBits: string[] = [];
  if (input.bloodGroup && input.bloodGroup !== 'Unknown') {
    clinicalBits.push(`Blood ${input.bloodGroup}`);
  }
  if (input.allergies && input.allergies.toLowerCase() !== 'none recorded') {
    clinicalBits.push(`Allergies: ${input.allergies}`);
  }
  if (clinicalBits.length > 0) {
    parts.push(clinicalBits.join(' | '));
  }

  if (input.notes && input.notes.trim()) {
    parts.push(`Note: ${input.notes.trim().slice(0, 140)}`);
  }

  return parts.join(' ');
}

export async function dispatchEmergencySmsViaTwilio(
  input: EmergencySmsDispatchInput,
  fetchImpl: FetchLike = fetch
): Promise<EmergencySmsDispatchResult> {
  const cfg = getServerConfig();
  const messageBody = buildEmergencySmsBody(input);

  const missing: string[] = [];
  if (!cfg.twilioAccountSid) missing.push('TWILIO_ACCOUNT_SID');
  if (!cfg.twilioAuthToken) missing.push('TWILIO_AUTH_TOKEN');
  if (!cfg.twilioFromNumber) missing.push('TWILIO_FROM_NUMBER');

  if (missing.length > 0) {
    return {
      ok: false,
      configured: false,
      httpStatus: 503,
      provider: 'twilio',
      missingCredentials: missing,
      messageBody,
      dispatchedCount: 0,
      failedCount: 0,
      results: [],
      message: `Twilio SMS is not configured on this server (${missing.join(', ')} missing). Add these server-side environment variables to enable live automated Emergency SMS dispatch, or use the direct device SMS fallback below.`,
    };
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
    cfg.twilioAccountSid
  )}/Messages.json`;
  const basicAuth = Buffer.from(`${cfg.twilioAccountSid}:${cfg.twilioAuthToken}`).toString(
    'base64'
  );

  const results: EmergencySmsRecipientResult[] = [];

  for (const contact of input.contacts) {
    const toNumber = normalizePhoneToE164(contact.phone);
    const form = new URLSearchParams();
    form.set('To', toNumber);
    form.set('From', cfg.twilioFromNumber);
    form.set('Body', messageBody);

    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });

      let parsed: { sid?: string; status?: string; message?: string } = {};
      try {
        parsed = (await response.json()) as { sid?: string; status?: string; message?: string };
      } catch {
        parsed = {};
      }

      if (response.ok) {
        results.push({
          name: contact.name,
          to: toNumber,
          sent: true,
          sid: parsed.sid,
          status: parsed.status || 'queued',
        });
      } else {
        results.push({
          name: contact.name,
          to: toNumber,
          sent: false,
          error: parsed.message || `Twilio rejected request (${response.status}).`,
        });
      }
    } catch {
      results.push({
        name: contact.name,
        to: toNumber,
        sent: false,
        error: 'Network error while contacting Twilio messaging gateway.',
      });
    }
  }

  const dispatchedCount = results.filter((r) => r.sent).length;
  const failedCount = results.length - dispatchedCount;

  return {
    ok: dispatchedCount > 0,
    configured: true,
    httpStatus: dispatchedCount > 0 ? 200 : 502,
    provider: 'twilio',
    messageBody,
    dispatchedCount,
    failedCount,
    results,
    message:
      dispatchedCount > 0
        ? `Dispatched automated Emergency SMS via Twilio to ${dispatchedCount} of ${results.length} contact${results.length === 1 ? '' : 's'}.`
        : 'Twilio could not deliver the Emergency SMS to any selected contact. Check recipient E.164 phone numbers and Twilio sender settings.',
  };
}
