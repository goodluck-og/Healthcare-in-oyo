import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BLUEPRINT_LIMITS, sanitizeString } from '../src/firebaseConfig';
import {
  buildGoogleMapsDirectionsUrl,
  computeDistanceKm,
  getMapsReadinessSummary,
} from '../src/services/mapsService';
import {
  buildMonthCalendarCells,
  buildWeekCalendarDays,
  detectOverlappingAppointmentIds,
  extractAppointmentTimeWindow,
  filterHospitalOwnedDoctors,
  groupPhysicalAppointmentsByDay,
} from '../src/components/portals/DoctorPhysicalCalendar';
import type { Appointment } from '../src/types/healthcare';

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

  it('strictly restricts administrator to partner hospitals and read-only chat moderation (no access to other user accounts or private medical records)', () => {
    // Users collection: owner-only get, no list, no delete, and no admin override on private PII
    const usersBlock = rulesText.slice(
      rulesText.indexOf('match /users/{userId}'),
      rulesText.indexOf('match /admins/{adminId}')
    );
    expect(usersBlock).toContain('allow get: if isValidId(userId) && isOwner(userId);');
    expect(usersBlock).toContain('allow list: if false;');
    expect(usersBlock).toContain('allow delete: if false;');
    const privateBlock = usersBlock.slice(usersBlock.indexOf('match /private/{docId}'));
    expect(privateBlock).not.toContain('isAdmin()');

    // Personal medical collections must NEVER include isAdmin() bypass
    for (const col of [
      'familyProfiles',
      'bpReadings',
      'glucoseReadings',
      'medicalDocuments',
      'aiConsultations',
      'wearableReadings',
      'cycleLogs',
      'payments',
    ]) {
      const start = rulesText.indexOf(`match /${col}/`);
      expect(start).toBeGreaterThan(-1);
      const nextMatch = rulesText.indexOf('match /', start + 10);
      const block = rulesText.slice(start, nextMatch > -1 ? nextMatch : undefined);
      expect(block).not.toContain('isAdmin()');
    }

    // Hospitals directory: public get/list, admin-only create/update/delete
    expect(rulesText).toContain('function isValidPartnerHospital(data)');
    expect(rulesText).toMatch(/match \/hospitals\/\{hospitalId\}[\s\S]*allow get, list: if true;/);
    expect(rulesText).toMatch(
      /match \/hospitals\/\{hospitalId\}[\s\S]*isAdmin\(\) && isValidPartnerHospital\(incoming\(\)\)/
    );

    // Partner Doctors directory: public get/list; Admin manages all; Verified Hospital manages ONLY its own hospitalOwnerUid doctors
    expect(rulesText).toContain('function isValidPartnerDoctor(data)');
    const partnerDoctorsBlock = rulesText.slice(
      rulesText.indexOf('match /partnerDoctors/{doctorId}'),
      rulesText.indexOf('match /platformServices/{serviceId}')
    );
    expect(partnerDoctorsBlock).toContain('allow get, list: if true;');
    expect(partnerDoctorsBlock).toContain('isValidPartnerDoctor(incoming())');
    expect(partnerDoctorsBlock).toContain('isAdmin()');
    expect(partnerDoctorsBlock).toContain('isVerifiedHospital()');
    expect(partnerDoctorsBlock).toContain('incoming().hospitalOwnerUid == request.auth.uid');
    expect(partnerDoctorsBlock).toContain('existing().hospitalOwnerUid == request.auth.uid');

    // Appointments schema & rules support patientName, startTime, endTime and doctor-blocked physical slots
    expect(rulesText).toContain("'patientName'");
    expect(rulesText).toContain("'startTime'");
    expect(rulesText).toContain("'endTime'");
    expect(rulesText).toContain("incoming().mode == 'In-Person'");

    // Website Care Teams & Platform Services: public get/list, admin-only create/update/delete
    expect(rulesText).toContain('function isValidPlatformService(data)');
    expect(rulesText).toMatch(/match \/platformServices\/\{serviceId\}[\s\S]*allow get, list: if true;/);
    expect(rulesText).toMatch(
      /match \/platformServices\/\{serviceId\}[\s\S]*isAdmin\(\) && isValidPlatformService\(incoming\(\)\)/
    );

    // Chat moderation feed: admin read-only monitoring, immutable (no update/delete), supports Sentinel Bot policy warnings
    expect(rulesText).toContain('function isValidChatModerationEvent(data)');
    expect(rulesText).toContain("'bot_policy_warning'");
    expect(rulesText).toMatch(
      /match \/chatModerationEvents\/\{eventId\}[\s\S]*allow list: if isAdmin\(\);/
    );
    expect(rulesText).toMatch(
      /match \/chatModerationEvents\/\{eventId\}[\s\S]*allow update, delete: if false;/
    );
  });
});

describe('Doctor Physical Appointment Calendar & Hospital-Only Doctor Isolation', () => {
  it('groups only In-Person physical appointments by day and sorts chronologically by From -> To time', () => {
    const sample: Appointment[] = [
      {
        id: 'apt-video',
        profileId: 'p1',
        patientName: 'Video Patient',
        doctorId: 'doc-1',
        doctorName: 'Dr. Adewale',
        specialty: 'Cardiology',
        facilityName: 'UCH Ibadan',
        city: 'Ibadan',
        date: '2026-11-25',
        time: '08:00 - 08:30 WAT',
        startTime: '08:00',
        endTime: '08:30',
        mode: 'Video Telehealth',
        status: 'Confirmed',
        feeNgn: 0,
        reference: 'VID-001',
      },
      {
        id: 'apt-phy-late',
        profileId: 'p2',
        patientName: 'Amina Adeyemi',
        doctorId: 'doc-1',
        doctorName: 'Dr. Adewale',
        specialty: 'Cardiology',
        facilityName: 'UCH Ibadan',
        city: 'Ibadan',
        date: '2026-11-25',
        time: '14:00 - 14:45 WAT',
        startTime: '14:00',
        endTime: '14:45',
        mode: 'In-Person',
        status: 'Confirmed',
        feeNgn: 16000,
        reference: 'PHY-002',
      },
      {
        id: 'apt-phy-early',
        profileId: 'p3',
        patientName: 'Chief Babatunde Alabi',
        doctorId: 'doc-1',
        doctorName: 'Dr. Adewale',
        specialty: 'Cardiology',
        facilityName: 'UCH Ibadan',
        city: 'Ibadan',
        date: '2026-11-25',
        time: '09:00 - 09:30 WAT',
        startTime: '09:00',
        endTime: '09:30',
        mode: 'In-Person',
        status: 'Confirmed',
        feeNgn: 16000,
        reference: 'PHY-001',
      },
      {
        id: 'apt-phy-nextday',
        profileId: 'p4',
        patientName: 'Ngozi Eze',
        doctorId: 'doc-1',
        doctorName: 'Dr. Adewale',
        specialty: 'Cardiology',
        facilityName: 'UCH Ibadan',
        city: 'Ibadan',
        date: '2026-11-26',
        time: '10:15 - 11:00 WAT',
        startTime: '10:15',
        endTime: '11:00',
        mode: 'In-Person',
        status: 'Confirmed',
        feeNgn: 16000,
        reference: 'PHY-003',
      },
    ];

    const groups = groupPhysicalAppointmentsByDay(sample);
    expect(groups).toHaveLength(2);
    expect(groups[0].date).toBe('2026-11-25');
    expect(groups[0].appointments.map((a) => a.id)).toEqual(['apt-phy-early', 'apt-phy-late']);
    expect(groups[1].date).toBe('2026-11-26');

    const w1 = extractAppointmentTimeWindow(groups[0].appointments[0]);
    expect(w1.startLabel).toBe('09:00 AM');
    expect(w1.endLabel).toBe('09:30 AM');
    expect(w1.durationMinutes).toBe(30);

    const w2 = extractAppointmentTimeWindow(groups[0].appointments[1]);
    expect(w2.startLabel).toBe('02:00 PM');
    expect(w2.endLabel).toBe('02:45 PM');
    expect(w2.durationMinutes).toBe(45);
  });

  it('filters hospital doctor rosters strictly to doctors owned by that hospital UID', () => {
    const all = [
      { id: 'd1', name: 'Dr. UCH One', hospitalOwnerUid: 'hosp-uch-uid' },
      { id: 'd2', name: 'Dr. Other Hospital', hospitalOwnerUid: 'hosp-other-uid' },
      { id: 'd3', name: 'Dr. Admin Global' },
    ];
    const uchOnly = filterHospitalOwnedDoctors(all, 'hosp-uch-uid');
    expect(uchOnly.map((d) => d.id)).toEqual(['d1']);
    expect(filterHospitalOwnedDoctors(all, '')).toEqual([]);
  });

  it('builds a valid Mon-Sun month calendar grid and marks today accurately', () => {
    const cells = buildMonthCalendarCells(2026, 10, '2026-11-24'); // November 2026 (0-indexed month 10)
    expect([35, 42]).toContain(cells.length);
    const todayCell = cells.find((c) => c.isoDate === '2026-11-24');
    expect(todayCell).toBeDefined();
    expect(todayCell?.isToday).toBe(true);
    expect(todayCell?.inCurrentMonth).toBe(true);
    expect(cells.filter((c) => c.inCurrentMonth)).toHaveLength(30);
    expect(cells.filter((c) => c.isToday)).toHaveLength(1);
  });

  it('builds a 7-day Monday-through-Sunday week grid around any anchor date', () => {
    const week = buildWeekCalendarDays('2026-11-24', '2026-11-24'); // Tuesday Nov 24, 2026
    expect(week).toHaveLength(7);
    expect(week[0].isoDate).toBe('2026-11-23'); // Monday
    expect(week[1].isoDate).toBe('2026-11-24'); // Tuesday (today)
    expect(week[1].isToday).toBe(true);
    expect(week[6].isoDate).toBe('2026-11-29'); // Sunday
  });

  it('detects overlapping In-Person consultation slots while ignoring non-overlapping and cancelled slots', () => {
    const base: Omit<Appointment, 'id' | 'startTime' | 'endTime' | 'time' | 'status'> = {
      profileId: 'p1',
      patientName: 'Test Patient',
      doctorId: 'doc-adewale',
      doctorName: 'Dr. Adewale Ogunleye',
      specialty: 'Cardiology',
      facilityName: 'UCH Ibadan',
      city: 'Ibadan',
      date: '2026-11-25',
      mode: 'In-Person',
      feeNgn: 16000,
      reference: 'PHY-REF',
    };

    const appointments: Appointment[] = [
      { ...base, id: 'a1', startTime: '09:00', endTime: '09:45', time: '09:00 - 09:45 WAT', status: 'Confirmed' },
      { ...base, id: 'a2', startTime: '09:30', endTime: '10:15', time: '09:30 - 10:15 WAT', status: 'Confirmed' },
      { ...base, id: 'a3', startTime: '10:15', endTime: '10:45', time: '10:15 - 10:45 WAT', status: 'Confirmed' },
      { ...base, id: 'a4', startTime: '09:15', endTime: '09:45', time: '09:15 - 09:45 WAT', status: 'Cancelled' },
    ];

    const conflicts = detectOverlappingAppointmentIds(appointments);
    expect(conflicts.has('a1')).toBe(true);
    expect(conflicts.has('a2')).toBe(true);
    expect(conflicts.has('a3')).toBe(false);
    expect(conflicts.has('a4')).toBe(false);
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
