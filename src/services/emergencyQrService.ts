import QRCode from 'qrcode';
import type { EmergencyContact, FamilyProfile } from '../types/healthcare';
import { calculateAgeFromDob } from './personalisationEngine';

export type QrFieldKey =
  | 'name'
  | 'dob_age'
  | 'blood_genotype'
  | 'allergies'
  | 'conditions'
  | 'medications'
  | 'emergency_contact';

export const DEFAULT_QR_SHARED_FIELDS: QrFieldKey[] = [
  'name',
  'dob_age',
  'blood_genotype',
  'allergies',
  'conditions',
  'medications',
  'emergency_contact',
];

export interface EmergencyQrSummaryInput {
  profile: Partial<FamilyProfile>;
  primaryContact?: EmergencyContact | null;
  sharedFields?: QrFieldKey[];
}

export interface EmergencyQrPayload {
  /** Compact human-readable text readable by ANY standard phone/hospital QR scanner offline */
  qrText: string;
  /** Structured preview lines for the "What First Responders See" card */
  lines: Array<{ label: string; value: string; critical?: boolean }>;
  byteLength: number;
}

/**
 * Formats a compact, universally readable emergency medical payload string.
 * Designed so ANY paramedic, ER nurse, or first responder with a regular smartphone
 * camera can scan it offline—without needing the HealthConnect app or internet.
 */
export function buildEmergencyQrPayload(input: EmergencyQrSummaryInput): EmergencyQrPayload {
  const fields = new Set<QrFieldKey>(
    input.sharedFields && input.sharedFields.length > 0
      ? input.sharedFields
      : (input.profile.qrSharedFields as QrFieldKey[] | undefined) || DEFAULT_QR_SHARED_FIELDS
  );

  const lines: Array<{ label: string; value: string; critical?: boolean }> = [];
  const rawParts: string[] = ['HEALTHCONNECT EMERGENCY MEDICAL ID'];

  const fullName = (input.profile.fullName || 'Patient').trim();
  const age = calculateAgeFromDob(input.profile.dateOfBirth, input.profile.age);
  const dobText = input.profile.dateOfBirth
    ? `${input.profile.dateOfBirth} (Age ${age})`
    : `Age ${age}`;

  if (fields.has('name')) {
    lines.push({ label: 'Patient', value: fullName });
    rawParts.push(`NAME: ${fullName}`);
  }

  if (fields.has('dob_age')) {
    const sexTag =
      input.profile.genderConfirmed === 'female'
        ? 'Female'
        : input.profile.genderConfirmed === 'male'
        ? 'Male'
        : input.profile.gender || 'Not specified';
    lines.push({ label: 'DOB / Sex', value: `${dobText} · ${sexTag}` });
    rawParts.push(`DOB/AGE: ${dobText} | SEX: ${sexTag}`);
  }

  if (fields.has('blood_genotype')) {
    const blood = (input.profile.bloodGroup || 'Unknown').trim();
    const geno = (input.profile.genotype || 'Unknown').trim();
    lines.push({
      label: 'Blood & Genotype',
      value: `Blood ${blood} · Genotype ${geno}`,
      critical: true,
    });
    rawParts.push(`BLOOD: ${blood} | GENOTYPE: ${geno}`);
  }

  if (fields.has('allergies')) {
    const allergies =
      input.profile.allergies && input.profile.allergies.length > 0
        ? input.profile.allergies.join(', ')
        : 'None recorded';
    lines.push({
      label: 'Allergies',
      value: allergies,
      critical: allergies.toLowerCase() !== 'none recorded',
    });
    rawParts.push(`ALLERGIES: ${allergies}`);
  }

  if (fields.has('conditions')) {
    const conds =
      input.profile.chronicConditions && input.profile.chronicConditions.length > 0
        ? input.profile.chronicConditions.join(', ')
        : 'None recorded';
    lines.push({ label: 'Conditions', value: conds });
    rawParts.push(`CONDITIONS: ${conds}`);
  }

  if (fields.has('medications')) {
    const meds =
      input.profile.currentMedications && input.profile.currentMedications.length > 0
        ? input.profile.currentMedications.join(', ')
        : 'None recorded';
    lines.push({ label: 'Medications', value: meds });
    rawParts.push(`MEDS: ${meds}`);
  }

  if (fields.has('emergency_contact')) {
    const contactVal = input.primaryContact
      ? `${input.primaryContact.name} (${input.primaryContact.relationship}) ${input.primaryContact.phone}`
      : `Local Emergency: ${input.profile.emergencyNumber || '112'}`;
    lines.push({ label: 'ICE Contact', value: contactVal, critical: true });
    rawParts.push(`ICE: ${contactVal}`);
  }

  const qrText = rawParts.join('\n').slice(0, 620);

  return {
    qrText,
    lines,
    byteLength: new TextEncoder().encode(qrText).length,
  };
}

/**
 * Generates a high-contrast QR Code SVG string 100% locally in-browser.
 * Never transmits patient medical data to any external QR API.
 */
export async function generateLocalEmergencyQrSvg(qrText: string): Promise<string> {
  return await QRCode.toString(qrText, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: {
      dark: '#0F0E47',
      light: '#FFFFFF',
    },
  });
}

/**
 * Generates a downloadable PNG Data URL 100% locally in-browser for phone lock screens
 * or smartwatch gallery sync.
 */
export async function generateLocalEmergencyQrPngDataUrl(qrText: string): Promise<string> {
  return await QRCode.toDataURL(qrText, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
    color: {
      dark: '#0F0E47',
      light: '#FFFFFF',
    },
  });
}
