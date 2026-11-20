import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BLUEPRINT_LIMITS, sanitizeString } from '../src/firebaseConfig';
import {
  buildGoogleMapsDirectionsUrl,
  computeDistanceKm,
  getMapsReadinessSummary,
} from '../src/services/mapsService';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');

describe('Firestore Security Rules, RBAC & Blueprint Validation', () => {
  const rulesText = fs.readFileSync(rulesPath, 'utf-8');
  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8')) as {
    entities: Record<string, { properties: Record<string, { maxLength?: number }> }>;
  };

  it('enforces global default deny and zero unrestricted wildcard permissions in firestore.rules', () => {
    expect(rulesText).toContain('match /{document=**} {\n      allow read, write: if false;\n    }');
    expect(rulesText).not.toMatch(/allow\s+(read|write)\s*:\s*if\s+true\s*;/);
  });

  it('defines multi-role RBAC helpers for patient ownership, verified email, doctor, hospital, and administrator', () => {
    expect(rulesText).toContain('function isVerifiedUser()');
    expect(rulesText).toContain('request.auth.token.email_verified == true');
    expect(rulesText).toContain("amesinlolagoodluck@gmail.com");
    expect(rulesText).toContain('function isVerifiedDoctor()');
    expect(rulesText).toContain("data.role == 'doctor'");
    expect(rulesText).toContain('function isVerifiedHospital()');
    expect(rulesText).toContain("data.role == 'hospital'");
  });

  it('isolates PII under /users/{userId}/private/{docId} and keeps auditLogs strictly append-only', () => {
    expect(rulesText).toContain('match /users/{userId}');
    expect(rulesText).toContain('match /private/{docId}');
    expect(rulesText).toContain('match /auditLogs/{logId}');
    expect(rulesText).toMatch(/match \/auditLogs\/\{logId\}[\s\S]*allow update, delete: if false;/);
  });

  it('restricts patient health records to owner, explicit consented doctor, or admin', () => {
    expect(rulesText).toMatch(
      /match \/bpReadings\/\{readingId\}[\s\S]*existing\(\)\.sharedWithDoctorUid == request\.auth\.uid/
    );
    expect(rulesText).toMatch(
      /match \/glucoseReadings\/\{readingId\}[\s\S]*existing\(\)\.sharedWithDoctorUid == request\.auth\.uid/
    );
    expect(rulesText).toMatch(
      /match \/medicalDocuments\/\{docId\}[\s\S]*existing\(\)\.sharedWithDoctorUid == request\.auth\.uid/
    );
    expect(rulesText).toMatch(
      /match \/emergencyRequests\/\{requestId\}[\s\S]*isVerifiedHospital\(\)/
    );
  });

  it('synchronizes client BLUEPRINT_LIMITS and sanitizeString with firebase-blueprint.json constraints', () => {
    expect(BLUEPRINT_LIMITS.displayNameMaxLength).toBe(
      blueprint.entities.UserAccount.properties.displayName.maxLength
    );
    expect(BLUEPRINT_LIMITS.summaryMaxLength).toBe(
      blueprint.entities.MedicalDocument.properties.plainSummary.maxLength
    );
    expect(BLUEPRINT_LIMITS.emergencyNotesMaxLength).toBe(
      blueprint.entities.EmergencyRequestRecord.properties.notes.maxLength
    );
    expect(BLUEPRINT_LIMITS.medicalHistoryMaxLength).toBe(
      blueprint.entities.UserAccount.properties.medicalHistory.maxLength
    );
    expect(BLUEPRINT_LIMITS.attachmentDataUrlMaxLength).toBe(
      blueprint.entities.MedicalDocument.properties.attachmentDataUrl.maxLength
    );
    expect(BLUEPRINT_LIMITS.attachmentNameMaxLength).toBe(
      blueprint.entities.MedicalDocument.properties.attachmentName.maxLength
    );
    expect(BLUEPRINT_LIMITS.aiModeMaxLength).toBe(
      blueprint.entities.AiConsultation.properties.mode.maxLength
    );
    expect(BLUEPRINT_LIMITS.aiTopicMaxLength).toBe(
      blueprint.entities.AiConsultation.properties.topic.maxLength
    );
    expect(BLUEPRINT_LIMITS.aiPromptMaxLength).toBe(
      blueprint.entities.AiConsultation.properties.userPrompt.maxLength
    );
    expect(BLUEPRINT_LIMITS.aiSummaryMaxLength).toBe(
      blueprint.entities.AiConsultation.properties.assistantSummary.maxLength
    );
    expect(BLUEPRINT_LIMITS.aiModelMaxLength).toBe(
      blueprint.entities.AiConsultation.properties.model.maxLength
    );
    expect(BLUEPRINT_LIMITS.reminderTitleMaxLength).toBe(
      blueprint.entities.MedicationReminder.properties.title.maxLength
    );
    expect(BLUEPRINT_LIMITS.reminderDosageMaxLength).toBe(
      blueprint.entities.MedicationReminder.properties.dosage.maxLength
    );
    expect(BLUEPRINT_LIMITS.reminderNotesMaxLength).toBe(
      blueprint.entities.MedicationReminder.properties.notes.maxLength
    );
    expect(BLUEPRINT_LIMITS.walletDescriptionMaxLength).toBe(
      blueprint.entities.WalletTransaction.properties.description.maxLength
    );
    expect(BLUEPRINT_LIMITS.walletReferenceMaxLength).toBe(
      blueprint.entities.WalletTransaction.properties.reference.maxLength
    );
    expect(BLUEPRINT_LIMITS.rehabExerciseMaxLength).toBe(
      blueprint.entities.RehabSession.properties.exerciseName.maxLength
    );
    expect(BLUEPRINT_LIMITS.rehabNotesMaxLength).toBe(
      blueprint.entities.RehabSession.properties.notes.maxLength
    );
    expect(BLUEPRINT_LIMITS.cycleNotesMaxLength).toBe(
      blueprint.entities.CycleLog.properties.notes.maxLength
    );
    expect(BLUEPRINT_LIMITS.vaccineNameMaxLength).toBe(
      blueprint.entities.VaccinationRecord.properties.vaccineName.maxLength
    );
    expect(rulesText).toContain('medicalHistory');
    expect(rulesText).toContain('attachmentDataUrl');
    expect(rulesText).toContain("'Condition'");
    expect(rulesText).toContain("'Prescription'");
    expect(rulesText).toContain('function isValidAiConsultation(data)');
    expect(rulesText).toContain('match /aiConsultations/{consultationId}');
    expect(rulesText).toContain('function isValidMedicationReminder(data)');
    expect(rulesText).toContain('match /medicationReminders/{reminderId}');
    expect(rulesText).toContain('function isValidWalletTransaction(data)');
    expect(rulesText).toContain('match /walletTransactions/{entryId}');
    expect(rulesText).toMatch(/match \/walletTransactions\/\{entryId\}[\s\S]*allow update, delete: if false;/);
    expect(rulesText).toContain('function isValidRehabSession(data)');
    expect(rulesText).toContain('match /rehabSessions/{sessionId}');
    expect(rulesText).toMatch(
      /match \/rehabSessions\/\{sessionId\}[\s\S]*existing\(\)\.sharedWithDoctorUid == request\.auth\.uid/
    );
    expect(rulesText).toContain('function isValidCycleLog(data)');
    expect(rulesText).toContain('match /cycleLogs/{logId}');
    expect(rulesText).toMatch(/match \/cycleLogs\/\{logId\}[\s\S]*allow update: if false;/);
    expect(rulesText).toContain('function isValidVaccinationRecord(data)');
    expect(rulesText).toContain('match /vaccinationRecords/{recordId}');
    expect(rulesText).toContain('function isValidPaymentRecord(data)');
    expect(rulesText).toContain('match /payments/{paymentId}');
    expect(rulesText).toContain('match /webhookEvents/{eventId}');
    expect(rulesText).toMatch(/match \/webhookEvents\/\{eventId\}[\s\S]*allow create, update, delete: if false;/);

    const longInput = `   ${'A'.repeat(150)}   `;
    const sanitized = sanitizeString(longInput, BLUEPRINT_LIMITS.displayNameMaxLength);
    expect(sanitized.length).toBe(100);
  });
});

describe('Google Maps Readiness & Distance Utilities', () => {
  it('computes accurate Haversine distance between Lagos Island and Abuja Wuse hubs', () => {
    const lagos = { lat: 6.4281, lng: 3.4219 };
    const abuja = { lat: 9.0765, lng: 7.3986 };
    const km = computeDistanceKm(lagos, abuja);
    expect(km).toBeGreaterThan(500);
    expect(km).toBeLessThan(560);
  });

  it('builds valid Google Maps directions URLs and reports unconfigured key state honestly', () => {
    const url = buildGoogleMapsDirectionsUrl(
      { lat: 6.4281, lng: 3.4219 },
      { lat: 6.5244, lng: 3.3792 }
    );
    expect(url).toContain('https://www.google.com/maps/dir/?api=1');
    expect(url).toContain('destination=6.428100%2C3.421900');

    const summary = getMapsReadinessSummary({
      geminiConfigured: false,
      openrouterConfigured: false,
      googleMapsConfigured: false,
      interswitchConfigured: false,
      smsConfigured: false,
      firebaseProjectId: 'amped-imprint-mghtt',
    });
    expect(summary.mode).toBe('unconfigured-preparation');
  });
});
