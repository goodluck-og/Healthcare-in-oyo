import {
  collection,
  deleteDoc,
  doc,
  enableNetwork,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  auth,
  BLUEPRINT_LIMITS,
  db,
  handleFirestoreError,
  isFirestoreOfflineError,
  OperationType,
  sanitizeString,
} from '../firebaseConfig';
import type {
  AiConsultation,
  Appointment,
  AuditLogEntry,
  BloodPressureReading,
  CycleLog,
  EmergencyContact,
  EmergencyRequest,
  FamilyProfile,
  FlowIntensity,
  GlucoseReading,
  MedicalDocument,
  MedicationReminder,
  RehabBodyArea,
  RehabSession,
  ReminderCategory,
  ReminderFrequency,
  RoleRequest,
  TransactionRecord,
  UserAccount,
  UserPrivateInfo,
  UserRole,
  VaccinationRecord,
  VaccineAgeGroup,
  VaccineStatus,
  WalletTransaction,
  WalletTransactionSource,
  WearableReading,
} from '../types/healthcare';

const ADMIN_BOOTSTRAP_EMAIL = 'amesinlolagoodluck@gmail.com';

function tsToIso(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function makeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${rand}`;
}

async function withOfflineRetry<T>(operation: () => Promise<T>, retries = 1): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt < retries && isFirestoreOfflineError(error)) {
        attempt += 1;
        await enableNetwork(db).catch(() => undefined);
        await new Promise((resolve) => setTimeout(resolve, 900));
        continue;
      }
      throw error;
    }
  }
}

export async function writeAuditLog(params: {
  actorUid: string;
  actorRole: UserRole;
  action: string;
  targetPath: string;
  summary: string;
}): Promise<void> {
  if (!auth.currentUser?.emailVerified) return;
  const id = makeDocId('audit');
  const path = `auditLogs/${id}`;
  try {
    await setDoc(doc(db, 'auditLogs', id), {
      actorUid: params.actorUid,
      actorRole: params.actorRole,
      action: sanitizeString(params.action, BLUEPRINT_LIMITS.auditActionMaxLength) || 'EVENT',
      targetPath: sanitizeString(params.targetPath, BLUEPRINT_LIMITS.auditTargetPathMaxLength) || '/',
      summary: sanitizeString(params.summary, BLUEPRINT_LIMITS.auditSummaryMaxLength) || 'Audit event',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function ensureUserAccountRecords(params: {
  uid: string;
  email: string;
  displayName: string;
  city: string;
  emailVerified: boolean;
}): Promise<{ account: UserAccount; privateInfo: UserPrivateInfo }> {
  const userPath = `users/${params.uid}`;
  const privatePath = `users/${params.uid}/private/contact`;
  const isBootstrappedAdmin =
    params.email.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL && params.emailVerified;

  let account: UserAccount | null = null;

  try {
    const snap = await withOfflineRetry(() => getDoc(doc(db, 'users', params.uid)));
    if (snap.exists()) {
      const data = snap.data() as Omit<UserAccount, 'uid'> & { uid: string };
      account = {
        uid: data.uid,
        displayName: data.displayName,
        role: isBootstrappedAdmin ? 'administrator' : data.role,
        verifiedRoleStatus: data.verifiedRoleStatus,
        city: data.city,
        facilityOrSpecialty: data.facilityOrSpecialty,
        medicalHistory: data.medicalHistory,
      };
      if (isBootstrappedAdmin && data.role !== 'administrator') {
        await updateDoc(doc(db, 'users', params.uid), {
          role: 'administrator',
          verifiedRoleStatus: 'active',
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      const initialRole: UserRole = isBootstrappedAdmin ? 'administrator' : 'patient';
      const safeName = sanitizeString(params.displayName || 'HealthConnect Member', BLUEPRINT_LIMITS.displayNameMaxLength);
      const safeCity = sanitizeString(params.city || 'Ibadan', BLUEPRINT_LIMITS.cityMaxLength);
      await setDoc(doc(db, 'users', params.uid), {
        uid: params.uid,
        displayName: safeName,
        role: initialRole,
        verifiedRoleStatus: 'active',
        city: safeCity,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      account = {
        uid: params.uid,
        displayName: safeName,
        role: initialRole,
        verifiedRoleStatus: 'active',
        city: safeCity,
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  let privateInfo: UserPrivateInfo;
  try {
    const privSnap = await withOfflineRetry(() =>
      getDoc(doc(db, 'users', params.uid, 'private', 'contact'))
    );
    if (privSnap.exists()) {
      const p = privSnap.data() as UserPrivateInfo;
      privateInfo = {
        uid: params.uid,
        email: p.email || params.email,
        phone: p.phone,
        address: p.address,
        emailVerified: params.emailVerified,
        smsVerified: Boolean(p.smsVerified),
      };
      if (p.emailVerified !== params.emailVerified) {
        await updateDoc(doc(db, 'users', params.uid, 'private', 'contact'), {
          emailVerified: params.emailVerified,
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      const payload = {
        uid: params.uid,
        email: sanitizeString(params.email, BLUEPRINT_LIMITS.emailMaxLength),
        emailVerified: params.emailVerified,
        smsVerified: false,
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', params.uid, 'private', 'contact'), payload);
      privateInfo = {
        uid: params.uid,
        email: payload.email,
        emailVerified: params.emailVerified,
        smsVerified: false,
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }

  return { account: account!, privateInfo };
}

export async function updateUserPrivateContact(
  uid: string,
  updates: { phone?: string; address?: string; smsVerified?: boolean }
): Promise<void> {
  const path = `users/${uid}/private/contact`;
  try {
    const docRef = doc(db, 'users', uid, 'private', 'contact');
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.phone !== undefined) {
      payload.phone = sanitizeString(updates.phone, BLUEPRINT_LIMITS.phoneMaxLength);
    }
    if (updates.address !== undefined) {
      payload.address = sanitizeString(updates.address, BLUEPRINT_LIMITS.addressMaxLength);
    }
    if (updates.smsVerified !== undefined) {
      payload.smsVerified = updates.smsVerified;
    }

    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      await updateDoc(docRef, payload);
    } else {
      await setDoc(docRef, {
        uid,
        email: sanitizeString(auth.currentUser?.email || 'user@healthconnect.africa', BLUEPRINT_LIMITS.emailMaxLength),
        emailVerified: Boolean(auth.currentUser?.emailVerified),
        smsVerified: Boolean(updates.smsVerified),
        ...payload,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserAccountDoc(
  uid: string,
  updates: {
    displayName?: string;
    city?: string;
    facilityOrSpecialty?: string;
    medicalHistory?: string;
  }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.displayName !== undefined) {
      payload.displayName =
        sanitizeString(updates.displayName, BLUEPRINT_LIMITS.displayNameMaxLength) ||
        'HealthConnect Member';
    }
    if (updates.city !== undefined) {
      payload.city = sanitizeString(updates.city, BLUEPRINT_LIMITS.cityMaxLength) || 'Ibadan';
    }
    if (updates.facilityOrSpecialty !== undefined) {
      payload.facilityOrSpecialty = sanitizeString(
        updates.facilityOrSpecialty,
        BLUEPRINT_LIMITS.facilityOrSpecialtyMaxLength
      );
    }
    if (updates.medicalHistory !== undefined) {
      payload.medicalHistory = sanitizeString(
        updates.medicalHistory,
        BLUEPRINT_LIMITS.medicalHistoryMaxLength
      );
    }

    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      await updateDoc(docRef, payload);
    } else {
      await setDoc(docRef, {
        uid,
        displayName:
          (payload.displayName as string | undefined) ||
          sanitizeString(auth.currentUser?.displayName || 'HealthConnect Member', BLUEPRINT_LIMITS.displayNameMaxLength),
        role: 'patient',
        verifiedRoleStatus: 'active',
        city: (payload.city as string | undefined) || 'Ibadan',
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeUserDocuments(
  uid: string,
  callbacks: {
    onAccount: (account: UserAccount) => void;
    onPrivateInfo: (info: UserPrivateInfo) => void;
  }
): Unsubscribe {
  const unsubAccount = onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as UserAccount;
      callbacks.onAccount({
        uid: data.uid || uid,
        displayName: data.displayName,
        role: data.role,
        verifiedRoleStatus: data.verifiedRoleStatus,
        city: data.city,
        facilityOrSpecialty: data.facilityOrSpecialty,
        medicalHistory: data.medicalHistory,
      });
    },
    (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
  );

  const unsubPrivate = onSnapshot(
    doc(db, 'users', uid, 'private', 'contact'),
    (snap) => {
      if (!snap.exists()) return;
      const p = snap.data() as UserPrivateInfo;
      callbacks.onPrivateInfo({
        uid: p.uid || uid,
        email: p.email || auth.currentUser?.email || '',
        phone: p.phone,
        address: p.address,
        emailVerified: Boolean(p.emailVerified),
        smsVerified: Boolean(p.smsVerified),
      });
    },
    (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}/private/contact`)
  );

  return () => {
    unsubAccount();
    unsubPrivate();
  };
}

export async function bootstrapPrimaryProfileIfMissing(params: {
  uid: string;
  displayName: string;
  city: string;
}): Promise<FamilyProfile | null> {
  const colPath = 'familyProfiles';
  try {
    const existing = await withOfflineRetry(() =>
      getDocs(query(collection(db, 'familyProfiles'), where('ownerUid', '==', params.uid)))
    );
    if (!existing.empty) {
      return null;
    }
    return await createFamilyProfileDoc(params.uid, {
      fullName: params.displayName || 'HealthConnect Member',
      relationship: 'Self (Primary)',
      age: 0,
      gender: 'Not specified',
      city: params.city || 'Ibadan',
      bloodGroup: 'Unknown',
      genotype: 'Unknown',
      allergies: ['None recorded'],
      hmoProvider: 'HealthConnect Oyo State',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}

export async function createFamilyProfileDoc(
  ownerUid: string,
  profile: Omit<FamilyProfile, 'id' | 'demoMemberId' | 'ownerUid'>
): Promise<FamilyProfile> {
  const id = makeDocId('prof');
  const demoMemberId = `HCA-NG-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const path = `familyProfiles/${id}`;
  const clean: FamilyProfile = {
    id,
    ownerUid,
    fullName: sanitizeString(profile.fullName, BLUEPRINT_LIMITS.fullNameMaxLength) || 'Family Member',
    relationship: profile.relationship,
    age: Math.max(0, Math.min(120, Math.round(Number(profile.age) || 0))),
    gender: sanitizeString(profile.gender || 'Not specified', 32),
    city: sanitizeString(profile.city || 'Ibadan', BLUEPRINT_LIMITS.cityMaxLength),
    bloodGroup: sanitizeString(profile.bloodGroup || 'Unknown', BLUEPRINT_LIMITS.bloodGroupMaxLength),
    genotype: sanitizeString(profile.genotype || 'Unknown', BLUEPRINT_LIMITS.genotypeMaxLength),
    allergies: (profile.allergies || ['None recorded'])
      .map((a) => sanitizeString(a, 60))
      .filter(Boolean)
      .slice(0, 10),
    hmoProvider: sanitizeString(profile.hmoProvider || 'Self-Pay', BLUEPRINT_LIMITS.hmoMaxLength),
    ...(profile.dateOfBirth ? { dateOfBirth: sanitizeString(profile.dateOfBirth, 16) } : {}),
    ...(profile.genderConfirmed ? { genderConfirmed: profile.genderConfirmed } : {}),
    ...(profile.countryCode ? { countryCode: sanitizeString(profile.countryCode, 8) } : {}),
    ...(profile.emergencyNumber ? { emergencyNumber: sanitizeString(profile.emergencyNumber, 16) } : {}),
    ...(profile.chronicConditions
      ? {
          chronicConditions: profile.chronicConditions
            .map((c) => sanitizeString(c, 60))
            .filter(Boolean)
            .slice(0, 12),
        }
      : {}),
    ...(profile.currentMedications
      ? {
          currentMedications: profile.currentMedications
            .map((m) => sanitizeString(m, 60))
            .filter(Boolean)
            .slice(0, 15),
        }
      : {}),
    ...(typeof profile.isGuardianManaged === 'boolean'
      ? { isGuardianManaged: profile.isGuardianManaged }
      : {}),
    ...(typeof profile.onboardingCompleted === 'boolean'
      ? { onboardingCompleted: profile.onboardingCompleted }
      : {}),
    ...(profile.enabledModules
      ? {
          enabledModules: profile.enabledModules
            .map((m) => sanitizeString(m, 60))
            .filter(Boolean)
            .slice(0, 20),
        }
      : {}),
    ...(profile.qrSharedFields
      ? {
          qrSharedFields: profile.qrSharedFields
            .map((f) => sanitizeString(f, 32))
            .filter(Boolean)
            .slice(0, 10),
        }
      : {}),
    ...(profile.healthNeedPreferences ? { healthNeedPreferences: profile.healthNeedPreferences } : {}),
    demoMemberId,
  };
  try {
    const docPayload: Record<string, unknown> = {
      ownerUid: clean.ownerUid,
      fullName: clean.fullName,
      relationship: clean.relationship,
      age: clean.age,
      gender: clean.gender,
      city: clean.city,
      bloodGroup: clean.bloodGroup,
      genotype: clean.genotype,
      allergies: clean.allergies,
      hmoProvider: clean.hmoProvider,
      demoMemberId: clean.demoMemberId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (clean.dateOfBirth) docPayload.dateOfBirth = clean.dateOfBirth;
    if (clean.genderConfirmed) docPayload.genderConfirmed = clean.genderConfirmed;
    if (clean.countryCode) docPayload.countryCode = clean.countryCode;
    if (clean.emergencyNumber) docPayload.emergencyNumber = clean.emergencyNumber;
    if (clean.chronicConditions) docPayload.chronicConditions = clean.chronicConditions;
    if (clean.currentMedications) docPayload.currentMedications = clean.currentMedications;
    if (typeof clean.isGuardianManaged === 'boolean') docPayload.isGuardianManaged = clean.isGuardianManaged;
    if (typeof clean.onboardingCompleted === 'boolean') docPayload.onboardingCompleted = clean.onboardingCompleted;
    if (clean.enabledModules) docPayload.enabledModules = clean.enabledModules;
    if (clean.qrSharedFields) docPayload.qrSharedFields = clean.qrSharedFields;
    if (clean.healthNeedPreferences) docPayload.healthNeedPreferences = clean.healthNeedPreferences;

    await setDoc(doc(db, 'familyProfiles', id), docPayload);
    return clean;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateFamilyProfileDoc(
  profileId: string,
  updates: Partial<Omit<FamilyProfile, 'id' | 'ownerUid' | 'demoMemberId'>>
): Promise<void> {
  const path = `familyProfiles/${profileId}`;
  try {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.fullName !== undefined) {
      payload.fullName =
        sanitizeString(updates.fullName, BLUEPRINT_LIMITS.fullNameMaxLength) || 'Health Member';
    }
    if (updates.relationship !== undefined) {
      payload.relationship = updates.relationship;
    }
    if (updates.dateOfBirth !== undefined) {
      payload.dateOfBirth = sanitizeString(updates.dateOfBirth, 16);
    }
    if (updates.age !== undefined) {
      payload.age = Math.max(0, Math.min(120, Math.round(Number(updates.age) || 0)));
    }
    if (updates.gender !== undefined) {
      payload.gender = sanitizeString(updates.gender || 'Not specified', 32);
    }
    if (updates.genderConfirmed !== undefined) {
      payload.genderConfirmed = updates.genderConfirmed;
    }
    if (updates.city !== undefined) {
      payload.city = sanitizeString(updates.city || 'Ibadan', BLUEPRINT_LIMITS.cityMaxLength);
    }
    if (updates.countryCode !== undefined) {
      payload.countryCode = sanitizeString(updates.countryCode, 8);
    }
    if (updates.emergencyNumber !== undefined) {
      payload.emergencyNumber = sanitizeString(updates.emergencyNumber, 16);
    }
    if (updates.bloodGroup !== undefined) {
      payload.bloodGroup =
        sanitizeString(updates.bloodGroup, BLUEPRINT_LIMITS.bloodGroupMaxLength) || 'Unknown';
    }
    if (updates.genotype !== undefined) {
      payload.genotype =
        sanitizeString(updates.genotype, BLUEPRINT_LIMITS.genotypeMaxLength) || 'Unknown';
    }
    if (updates.allergies !== undefined) {
      const cleaned = updates.allergies
        .map((a) => sanitizeString(a, 60))
        .filter(Boolean)
        .slice(0, 10);
      payload.allergies = cleaned.length > 0 ? cleaned : ['None recorded'];
    }
    if (updates.chronicConditions !== undefined) {
      payload.chronicConditions = updates.chronicConditions
        .map((c) => sanitizeString(c, 60))
        .filter(Boolean)
        .slice(0, 12);
    }
    if (updates.currentMedications !== undefined) {
      payload.currentMedications = updates.currentMedications
        .map((m) => sanitizeString(m, 60))
        .filter(Boolean)
        .slice(0, 15);
    }
    if (updates.isGuardianManaged !== undefined) {
      payload.isGuardianManaged = Boolean(updates.isGuardianManaged);
    }
    if (updates.onboardingCompleted !== undefined) {
      payload.onboardingCompleted = Boolean(updates.onboardingCompleted);
    }
    if (updates.enabledModules !== undefined) {
      payload.enabledModules = updates.enabledModules
        .map((m) => sanitizeString(m, 60))
        .filter(Boolean)
        .slice(0, 20);
    }
    if (updates.qrSharedFields !== undefined) {
      payload.qrSharedFields = updates.qrSharedFields
        .map((f) => sanitizeString(f, 32))
        .filter(Boolean)
        .slice(0, 10);
    }
    if (updates.healthNeedPreferences !== undefined) {
      payload.healthNeedPreferences = updates.healthNeedPreferences;
    }
    if (updates.hmoProvider !== undefined) {
      payload.hmoProvider =
        sanitizeString(updates.hmoProvider, BLUEPRINT_LIMITS.hmoMaxLength) || 'Self-Pay';
    }
    await updateDoc(doc(db, 'familyProfiles', profileId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createWearableReadingDoc(
  ownerUid: string,
  reading: Omit<WearableReading, 'id' | 'ownerUid'>
): Promise<WearableReading> {
  const id = makeDocId('wear');
  const path = `wearableReadings/${id}`;
  const heartRateBpm = Math.max(20, Math.min(260, Math.round(reading.heartRateBpm)));
  const spo2Percent = Math.max(50, Math.min(100, Math.round(reading.spo2Percent)));
  const deviceName = sanitizeString(reading.deviceName || 'Companion Watch', 100) || 'Companion Watch';
  const recordedAt = sanitizeString(reading.recordedAt || new Date().toISOString().slice(0, 16), 40);

  const payload: Record<string, unknown> = {
    ownerUid,
    profileId: sanitizeString(reading.profileId || 'default', 128) || 'default',
    source: reading.source,
    deviceName,
    heartRateBpm,
    spo2Percent,
    recordedAt,
    createdAt: serverTimestamp(),
  };
  if (typeof reading.systolic === 'number') {
    payload.systolic = Math.max(50, Math.min(280, Math.round(reading.systolic)));
  }
  if (typeof reading.diastolic === 'number') {
    payload.diastolic = Math.max(30, Math.min(180, Math.round(reading.diastolic)));
  }
  if (typeof reading.temperatureC === 'number') {
    payload.temperatureC = Math.max(30, Math.min(45, Number(reading.temperatureC.toFixed(1))));
  }
  if (typeof reading.steps === 'number') {
    payload.steps = Math.max(0, Math.min(200000, Math.round(reading.steps)));
  }
  if (typeof reading.sleepHours === 'number') {
    payload.sleepHours = Math.max(0, Math.min(24, Number(reading.sleepHours.toFixed(1))));
  }
  if (typeof reading.criticalAlertTriggered === 'boolean') {
    payload.criticalAlertTriggered = reading.criticalAlertTriggered;
  }
  if (reading.alertReason) {
    payload.alertReason = sanitizeString(reading.alertReason, 240);
  }

  try {
    await setDoc(doc(db, 'wearableReadings', id), payload);
    return {
      ...reading,
      id,
      ownerUid,
      deviceName,
      heartRateBpm,
      spo2Percent,
      recordedAt,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createBpReadingDoc(
  ownerUid: string,
  reading: Omit<BloodPressureReading, 'id' | 'ownerUid'>
): Promise<BloodPressureReading> {
  const id = makeDocId('bp');
  const path = `bpReadings/${id}`;
  const systolic = Math.max(50, Math.min(280, Math.round(reading.systolic)));
  const diastolic = Math.max(30, Math.min(180, Math.round(reading.diastolic)));
  const pulse = Math.max(30, Math.min(240, Math.round(reading.pulse)));
  const note = sanitizeString(reading.note || 'Manual entry', BLUEPRINT_LIMITS.noteMaxLength);
  const deviceType = sanitizeString(reading.deviceType || 'Upper-Arm Cuff', BLUEPRINT_LIMITS.deviceTypeMaxLength);
  const recordedAt = sanitizeString(reading.recordedAt || new Date().toISOString().slice(0, 16), 40);

  try {
    const payload: Record<string, unknown> = {
      ownerUid,
      profileId: reading.profileId,
      systolic,
      diastolic,
      pulse,
      recordedAt,
      note,
      deviceType,
      createdAt: serverTimestamp(),
    };
    if (reading.sharedWithDoctorUid) {
      payload.sharedWithDoctorUid = reading.sharedWithDoctorUid;
    }
    await setDoc(doc(db, 'bpReadings', id), payload);
    return { ...reading, id, ownerUid, systolic, diastolic, pulse, note, deviceType, recordedAt };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function shareBpReadingWithDoctor(
  readingId: string,
  doctorUid: string
): Promise<void> {
  const path = `bpReadings/${readingId}`;
  try {
    await updateDoc(doc(db, 'bpReadings', readingId), {
      sharedWithDoctorUid: doctorUid,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createGlucoseReadingDoc(
  ownerUid: string,
  reading: Omit<GlucoseReading, 'id' | 'ownerUid'>
): Promise<GlucoseReading> {
  const id = makeDocId('glu');
  const path = `glucoseReadings/${id}`;
  const valueMgDl = Math.max(20, Math.min(800, Math.round(reading.valueMgDl)));
  const note = sanitizeString(reading.note || 'Manual entry', BLUEPRINT_LIMITS.noteMaxLength);
  const deviceType = sanitizeString(reading.deviceType || 'Blood Glucometer', BLUEPRINT_LIMITS.deviceTypeMaxLength);
  const recordedAt = sanitizeString(reading.recordedAt || new Date().toISOString().slice(0, 16), 40);

  try {
    const payload: Record<string, unknown> = {
      ownerUid,
      profileId: reading.profileId,
      valueMgDl,
      context: reading.context,
      recordedAt,
      note,
      deviceType,
      createdAt: serverTimestamp(),
    };
    if (reading.sharedWithDoctorUid) {
      payload.sharedWithDoctorUid = reading.sharedWithDoctorUid;
    }
    await setDoc(doc(db, 'glucoseReadings', id), payload);
    return { ...reading, id, ownerUid, valueMgDl, note, deviceType, recordedAt };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function shareGlucoseReadingWithDoctor(
  readingId: string,
  doctorUid: string
): Promise<void> {
  const path = `glucoseReadings/${readingId}`;
  try {
    await updateDoc(doc(db, 'glucoseReadings', readingId), {
      sharedWithDoctorUid: doctorUid,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

const IMAGE_DATA_URL_REGEX = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export async function createMedicalDocumentDoc(
  ownerUid: string,
  docInput: Omit<MedicalDocument, 'id' | 'ownerUid'>
): Promise<MedicalDocument> {
  const id = makeDocId('doc');
  const path = `medicalDocuments/${id}`;
  const title = sanitizeString(docInput.title, 160);
  const issuer = sanitizeString(docInput.issuer || 'Patient Uploaded Record', 140) || 'Patient Uploaded Record';
  const plainSummary = sanitizeString(docInput.plainSummary, BLUEPRINT_LIMITS.summaryMaxLength);
  const date = sanitizeString(docInput.date || new Date().toISOString().slice(0, 10), 32);

  if (title.length < 2 || plainSummary.length < 2) {
    throw new Error('Title and clinical summary must each be at least 2 characters.');
  }

  let attachmentDataUrl: string | undefined;
  let attachmentName: string | undefined;

  if (docInput.attachmentDataUrl) {
    const trimmedUrl = docInput.attachmentDataUrl.trim();
    if (
      !IMAGE_DATA_URL_REGEX.test(trimmedUrl) ||
      trimmedUrl.length > BLUEPRINT_LIMITS.attachmentDataUrlMaxLength
    ) {
      throw new Error(
        'Attached image must be a valid JPEG, PNG, or WebP photo within the Firestore size limit.'
      );
    }
    attachmentDataUrl = trimmedUrl;
    if (docInput.attachmentName) {
      const cleanedName = sanitizeString(docInput.attachmentName, BLUEPRINT_LIMITS.attachmentNameMaxLength);
      if (cleanedName) attachmentName = cleanedName;
    }
  }

  try {
    const payload: Record<string, unknown> = {
      ownerUid,
      profileId: docInput.profileId,
      title,
      category: docInput.category,
      date,
      issuer,
      plainSummary,
      createdAt: serverTimestamp(),
    };
    if (attachmentDataUrl) {
      payload.attachmentDataUrl = attachmentDataUrl;
    }
    if (attachmentName) {
      payload.attachmentName = attachmentName;
    }
    if (docInput.sharedWithDoctorUid) {
      payload.sharedWithDoctorUid = docInput.sharedWithDoctorUid;
    }
    await setDoc(doc(db, 'medicalDocuments', id), payload);
    return {
      ...docInput,
      id,
      ownerUid,
      title,
      issuer,
      plainSummary,
      date,
      ...(attachmentDataUrl ? { attachmentDataUrl } : {}),
      ...(attachmentName ? { attachmentName } : {}),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function shareMedicalDocumentWithDoctor(
  docId: string,
  doctorUid: string
): Promise<void> {
  const path = `medicalDocuments/${docId}`;
  try {
    await updateDoc(doc(db, 'medicalDocuments', docId), {
      sharedWithDoctorUid: doctorUid,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createAppointmentDoc(
  patientUid: string,
  appointment: Omit<Appointment, 'id' | 'patientUid'>
): Promise<Appointment> {
  const id = makeDocId('apt');
  const path = `appointments/${id}`;
  try {
    const payload: Record<string, unknown> = {
      patientUid,
      profileId: appointment.profileId,
      doctorId: sanitizeString(appointment.doctorId, 80),
      doctorName: sanitizeString(appointment.doctorName, 120),
      specialty: sanitizeString(appointment.specialty, 100),
      facilityName: sanitizeString(appointment.facilityName, 140),
      city: sanitizeString(appointment.city, 60),
      date: sanitizeString(appointment.date, 32),
      time: sanitizeString(appointment.time, 32),
      mode: appointment.mode,
      status: appointment.status === 'Pending Payment' ? 'Pending Payment' : 'Confirmed',
      feeNgn: Math.max(0, Math.min(5000000, Number(appointment.feeNgn) || 0)),
      reference: sanitizeString(appointment.reference, 64),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (appointment.doctorUid) payload.doctorUid = appointment.doctorUid;
    if (appointment.hospitalUid) payload.hospitalUid = appointment.hospitalUid;
    if (appointment.clinicalNotes) {
      payload.clinicalNotes = sanitizeString(
        appointment.clinicalNotes,
        BLUEPRINT_LIMITS.clinicalNotesMaxLength
      );
    }

    await setDoc(doc(db, 'appointments', id), payload);
    return { ...appointment, id, patientUid };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateAppointmentStatusByClinician(
  appointmentId: string,
  status: 'Confirmed' | 'Completed' | 'Rescheduled' | 'Cancelled',
  clinicalNotes?: string
): Promise<void> {
  const path = `appointments/${appointmentId}`;
  try {
    const payload: Record<string, unknown> = {
      status,
      updatedAt: serverTimestamp(),
    };
    if (clinicalNotes !== undefined) {
      payload.clinicalNotes = sanitizeString(clinicalNotes, BLUEPRINT_LIMITS.clinicalNotesMaxLength);
    }
    await updateDoc(doc(db, 'appointments', appointmentId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateAppointmentByPatient(
  appointmentId: string,
  status: 'Rescheduled' | 'Cancelled',
  date: string,
  time: string
): Promise<void> {
  const path = `appointments/${appointmentId}`;
  try {
    await updateDoc(doc(db, 'appointments', appointmentId), {
      status,
      date: sanitizeString(date, 32),
      time: sanitizeString(time, 32),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createTransactionDoc(
  patientUid: string,
  tx: Omit<TransactionRecord, 'id' | 'patientUid'>
): Promise<TransactionRecord> {
  const id = makeDocId('tx');
  const path = `transactions/${id}`;
  const allowedStatuses: TransactionRecord['status'][] = [
    'Verified',
    'Paid via Wallet',
    'Pending Verification',
    'Paid (Demo Sandbox)',
  ];
  const safeStatus: TransactionRecord['status'] = allowedStatuses.includes(tx.status)
    ? tx.status
    : 'Pending Verification';
  try {
    await setDoc(doc(db, 'transactions', id), {
      patientUid,
      reference: sanitizeString(tx.reference, 64),
      description: sanitizeString(tx.description, 200),
      category: tx.category,
      amountNgn: Math.max(0, Math.min(10000000, Number(tx.amountNgn) || 0)),
      date: sanitizeString(tx.date, 32),
      method: tx.method,
      status: safeStatus,
      createdAt: serverTimestamp(),
    });
    return { ...tx, status: safeStatus, id, patientUid };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createEmergencyContactDoc(
  ownerUid: string,
  contact: Omit<EmergencyContact, 'id' | 'ownerUid'>
): Promise<EmergencyContact> {
  const id = makeDocId('ec');
  const path = `emergencyContacts/${id}`;
  try {
    await setDoc(doc(db, 'emergencyContacts', id), {
      ownerUid,
      name: sanitizeString(contact.name, 100),
      relationship: sanitizeString(contact.relationship, 60),
      phone: sanitizeString(contact.phone, 40),
      city: sanitizeString(contact.city, 60),
      isPrimary: Boolean(contact.isPrimary),
      createdAt: serverTimestamp(),
    });
    return { ...contact, id, ownerUid };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteEmergencyContactDoc(contactId: string): Promise<void> {
  const path = `emergencyContacts/${contactId}`;
  try {
    await deleteDoc(doc(db, 'emergencyContacts', contactId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createEmergencyRequestDoc(
  patientUid: string,
  req: Omit<EmergencyRequest, 'id' | 'stage' | 'createdAt' | 'patientUid'>
): Promise<EmergencyRequest> {
  const id = makeDocId('EMG');
  const path = `emergencyRequests/${id}`;
  try {
    const payload: Record<string, unknown> = {
      patientUid,
      type: req.type,
      stage: 'submitted',
      patientName: sanitizeString(req.patientName, 120),
      locationLabel: sanitizeString(req.locationLabel, BLUEPRINT_LIMITS.locationLabelMaxLength),
      notes: sanitizeString(req.notes || 'Urgent triage requested', BLUEPRINT_LIMITS.emergencyNotesMaxLength),
      assignedHospital: sanitizeString(req.assignedHospital, 140),
      partnerUnit: sanitizeString(req.partnerUnit || 'EMS Coordination Unit', 140),
      etaMinutes: Math.max(1, Math.min(240, Math.round(req.etaMinutes || 14))),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (req.hospitalUid) payload.hospitalUid = req.hospitalUid;

    await setDoc(doc(db, 'emergencyRequests', id), payload);
    return {
      ...req,
      id,
      patientUid,
      stage: 'submitted',
      createdAt: new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateEmergencyStageByHospital(
  requestId: string,
  hospitalUid: string,
  stage: 'accepted' | 'dispatched' | 'resolved',
  partnerUnit?: string,
  etaMinutes?: number
): Promise<void> {
  const path = `emergencyRequests/${requestId}`;
  try {
    const payload: Record<string, unknown> = {
      stage,
      hospitalUid,
      updatedAt: serverTimestamp(),
    };
    if (partnerUnit) payload.partnerUnit = sanitizeString(partnerUnit, 140);
    if (etaMinutes !== undefined) payload.etaMinutes = Math.max(1, Math.min(240, Math.round(etaMinutes)));
    await updateDoc(doc(db, 'emergencyRequests', requestId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function resolveEmergencyByPatient(requestId: string): Promise<void> {
  const path = `emergencyRequests/${requestId}`;
  try {
    await updateDoc(doc(db, 'emergencyRequests', requestId), {
      stage: 'resolved',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function submitRoleVerificationRequest(params: {
  uid: string;
  applicantName: string;
  requestedRole: 'doctor' | 'hospital';
  licenseRef: string;
  organization: string;
}): Promise<RoleRequest> {
  const id = makeDocId('rolereq');
  const path = `roleRequests/${id}`;
  const clean = {
    uid: params.uid,
    applicantName: sanitizeString(params.applicantName, 100),
    requestedRole: params.requestedRole,
    licenseRef: sanitizeString(params.licenseRef, BLUEPRINT_LIMITS.licenseRefMaxLength),
    organization: sanitizeString(params.organization, BLUEPRINT_LIMITS.organizationMaxLength),
    status: 'pending' as const,
  };
  try {
    await setDoc(doc(db, 'roleRequests', id), {
      ...clean,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { ...clean, id };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function reviewRoleRequestAsAdmin(
  request: RoleRequest,
  decision: 'approved' | 'rejected'
): Promise<void> {
  const reqPath = `roleRequests/${request.id}`;
  const userPath = `users/${request.uid}`;
  try {
    await updateDoc(doc(db, 'roleRequests', request.id), {
      status: decision,
      updatedAt: serverTimestamp(),
    });
    if (decision === 'approved') {
      await updateDoc(doc(db, 'users', request.uid), {
        role: request.requestedRole,
        verifiedRoleStatus: 'active',
        facilityOrSpecialty: sanitizeString(request.organization, 120),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${reqPath} -> ${userPath}`);
  }
}

export async function adminListAllUsers(): Promise<UserAccount[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => {
      const data = d.data() as UserAccount;
      return { ...data, uid: d.id };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }
}

export async function createAiConsultationDoc(
  ownerUid: string,
  input: Omit<AiConsultation, 'id' | 'ownerUid' | 'createdAt'>
): Promise<AiConsultation> {
  const id = makeDocId('aicon');
  const path = `aiConsultations/${id}`;
  const ensureMin2 = (val: string, fallback: string) => {
    const trimmed = val.trim();
    if (trimmed.length >= 2) return trimmed;
    return trimmed.length === 1 ? `${trimmed}.` : fallback;
  };
  const clean = {
    ownerUid,
    profileId: sanitizeString(input.profileId || 'default', 128) || 'default',
    mode: ensureMin2(
      sanitizeString(input.mode, BLUEPRINT_LIMITS.aiModeMaxLength),
      'General Symptom Guidance'
    ),
    topic: ensureMin2(
      sanitizeString(input.topic, BLUEPRINT_LIMITS.aiTopicMaxLength),
      'AI Health Consultation'
    ),
    userPrompt: ensureMin2(
      sanitizeString(input.userPrompt, BLUEPRINT_LIMITS.aiPromptMaxLength),
      'Health question'
    ),
    assistantSummary: ensureMin2(
      sanitizeString(input.assistantSummary, BLUEPRINT_LIMITS.aiSummaryMaxLength),
      'Health guidance summary recorded.'
    ),
    provider: (input.provider === 'openrouter' ? 'openrouter' : 'gemini') as 'gemini' | 'openrouter',
    model: ensureMin2(
      sanitizeString(input.model, BLUEPRINT_LIMITS.aiModelMaxLength),
      input.provider === 'openrouter' ? 'openrouter-model' : 'gemini'
    ),
    messageCount: Math.max(2, Math.min(200, Math.round(input.messageCount || 2))),
  };
  try {
    await setDoc(doc(db, 'aiConsultations', id), {
      ...clean,
      createdAt: serverTimestamp(),
    });
    return {
      ...clean,
      id,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteAiConsultationDoc(consultationId: string): Promise<void> {
  const path = `aiConsultations/${consultationId}`;
  try {
    await deleteDoc(doc(db, 'aiConsultations', consultationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

const VALID_REMINDER_CATEGORIES: ReminderCategory[] = [
  'Medication',
  'BP Check',
  'Glucose Check',
  'Hydration & Wellness',
  'Appointment',
];

const VALID_REMINDER_FREQUENCIES: ReminderFrequency[] = [
  'Daily',
  'Twice Daily',
  'Weekdays',
  'Weekends',
  'Weekly',
];

export async function createMedicationReminderDoc(
  ownerUid: string,
  input: {
    profileId: string;
    title: string;
    dosage?: string;
    category: ReminderCategory;
    timeOfDay: string;
    frequency: ReminderFrequency;
    schedule: string;
    notes?: string;
    enabled?: boolean;
  }
): Promise<MedicationReminder> {
  const id = makeDocId('rem');
  const path = `medicationReminders/${id}`;
  const ensureMin2 = (val: string, fallback: string) => {
    const trimmed = val.trim();
    if (trimmed.length >= 2) return trimmed;
    return trimmed.length === 1 ? `${trimmed}.` : fallback;
  };

  const category: ReminderCategory = VALID_REMINDER_CATEGORIES.includes(input.category)
    ? input.category
    : 'Medication';
  const frequency: ReminderFrequency = VALID_REMINDER_FREQUENCIES.includes(input.frequency)
    ? input.frequency
    : 'Daily';
  const timeOfDay =
    sanitizeString(input.timeOfDay || '08:00', BLUEPRINT_LIMITS.reminderTimeMaxLength).length >= 4
      ? sanitizeString(input.timeOfDay || '08:00', BLUEPRINT_LIMITS.reminderTimeMaxLength)
      : '08:00';
  const title = ensureMin2(
    sanitizeString(input.title, BLUEPRINT_LIMITS.reminderTitleMaxLength),
    'Health Reminder'
  );
  const schedule = ensureMin2(
    sanitizeString(
      input.schedule || `${frequency} · ${timeOfDay} WAT`,
      BLUEPRINT_LIMITS.reminderScheduleMaxLength
    ),
    `${frequency} · ${timeOfDay} WAT`
  );
  const dosage = input.dosage
    ? sanitizeString(input.dosage, BLUEPRINT_LIMITS.reminderDosageMaxLength)
    : '';
  const notes = input.notes
    ? sanitizeString(input.notes, BLUEPRINT_LIMITS.reminderNotesMaxLength)
    : '';
  const enabled = input.enabled !== undefined ? Boolean(input.enabled) : true;
  const profileId = sanitizeString(input.profileId || 'default', 128) || 'default';

  const payload: Record<string, unknown> = {
    ownerUid,
    profileId,
    title,
    category,
    timeOfDay,
    frequency,
    schedule,
    enabled,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (dosage) payload.dosage = dosage;
  if (notes) payload.notes = notes;

  try {
    await setDoc(doc(db, 'medicationReminders', id), payload);
    return {
      id,
      ownerUid,
      profileId,
      title,
      ...(dosage ? { dosage } : {}),
      category,
      type: category,
      timeOfDay,
      frequency,
      schedule,
      ...(notes ? { notes } : {}),
      enabled,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateMedicationReminderStatusDoc(
  reminderId: string,
  enabled: boolean
): Promise<void> {
  const path = `medicationReminders/${reminderId}`;
  try {
    await updateDoc(doc(db, 'medicationReminders', reminderId), {
      enabled: Boolean(enabled),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markMedicationReminderTakenDoc(
  reminderId: string,
  lastTakenDate: string
): Promise<void> {
  const path = `medicationReminders/${reminderId}`;
  try {
    await updateDoc(doc(db, 'medicationReminders', reminderId), {
      lastTakenDate: sanitizeString(lastTakenDate, BLUEPRINT_LIMITS.reminderLastTakenDateMaxLength),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteMedicationReminderDoc(reminderId: string): Promise<void> {
  const path = `medicationReminders/${reminderId}`;
  try {
    await deleteDoc(doc(db, 'medicationReminders', reminderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createWalletTransactionDoc(
  ownerUid: string,
  input: {
    type: 'credit' | 'debit';
    source: Exclude<WalletTransactionSource, 'Appointment Refund'>;
    amountNgn: number;
    description: string;
    reference: string;
    date?: string;
  }
): Promise<WalletTransaction> {
  const id = makeDocId('wal');
  const path = `walletTransactions/${id}`;
  const amountNgn = Math.max(1, Math.min(10000000, Math.round(input.amountNgn)));
  const description =
    sanitizeString(input.description, BLUEPRINT_LIMITS.walletDescriptionMaxLength) ||
    'HealthConnect Wallet Transaction';
  const reference =
    sanitizeString(input.reference, BLUEPRINT_LIMITS.walletReferenceMaxLength) ||
    `WAL-${Date.now().toString().slice(-8)}`;
  const date = sanitizeString(input.date || new Date().toISOString().slice(0, 10), 32);

  try {
    await setDoc(doc(db, 'walletTransactions', id), {
      ownerUid,
      type: input.type,
      source: input.source,
      amountNgn,
      description,
      reference,
      date,
      createdAt: serverTimestamp(),
    });
    return {
      id,
      ownerUid,
      type: input.type,
      source: input.source,
      amountNgn,
      description,
      reference,
      date,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function cancelAppointmentWithWalletRefund(
  ownerUid: string,
  appointment: Appointment,
  date: string,
  time: string
): Promise<{ refundedAmountNgn: number; walletEntry?: WalletTransaction }> {
  const appointmentPath = `appointments/${appointment.id}`;
  const isRefundEligible =
    (appointment.status === 'Confirmed' || appointment.status === 'Rescheduled') &&
    appointment.feeNgn > 0;

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'appointments', appointment.id), {
      status: 'Cancelled',
      date: sanitizeString(date, 32),
      time: sanitizeString(time, 32),
      updatedAt: serverTimestamp(),
    });

    let walletEntry: WalletTransaction | undefined;

    if (isRefundEligible) {
      const entryId = `wref-${appointment.id}`;
      const amountNgn = Math.max(1, Math.min(10000000, Math.round(appointment.feeNgn)));
      const cleanRefTail = appointment.reference.replace(/[^a-zA-Z0-9-]/g, '').slice(-14);
      const reference = sanitizeString(
        `WAL-REF-${cleanRefTail || Date.now().toString().slice(-8)}`,
        BLUEPRINT_LIMITS.walletReferenceMaxLength
      );
      const description = sanitizeString(
        `Refund for cancelled consultation · ${appointment.doctorName} (${appointment.reference})`,
        BLUEPRINT_LIMITS.walletDescriptionMaxLength
      );
      const todayIso = new Date().toISOString().slice(0, 10);

      batch.set(doc(db, 'walletTransactions', entryId), {
        ownerUid,
        type: 'credit',
        source: 'Appointment Refund',
        amountNgn,
        description,
        reference,
        relatedAppointmentId: appointment.id,
        date: todayIso,
        createdAt: serverTimestamp(),
      });

      walletEntry = {
        id: entryId,
        ownerUid,
        type: 'credit',
        source: 'Appointment Refund',
        amountNgn,
        description,
        reference,
        relatedAppointmentId: appointment.id,
        date: todayIso,
        createdAt: new Date().toISOString(),
      };
    }

    await batch.commit();
    return {
      refundedAmountNgn: walletEntry?.amountNgn || 0,
      walletEntry,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, appointmentPath);
  }
}

export async function createRehabSessionDoc(
  ownerUid: string,
  input: {
    profileId: string;
    exerciseName: string;
    bodyArea: RehabBodyArea;
    assignedByClinician: string;
    targetPrescription: string;
    durationMinutes: number;
    painScore: number;
    mobilityScore: number;
    completedDate: string;
    notes?: string;
    sharedWithDoctorUid?: string;
  }
): Promise<RehabSession> {
  const id = makeDocId('rehab');
  const path = `rehabSessions/${id}`;
  const exerciseName = sanitizeString(input.exerciseName, BLUEPRINT_LIMITS.rehabExerciseMaxLength);
  const assignedByClinician =
    sanitizeString(input.assignedByClinician, BLUEPRINT_LIMITS.rehabClinicianMaxLength) ||
    'Assigned Physiotherapist';
  const targetPrescription =
    sanitizeString(input.targetPrescription, BLUEPRINT_LIMITS.rehabPrescriptionMaxLength) ||
    '3 sets × 10 reps';
  if (exerciseName.length < 2) {
    throw new Error('Exercise name must be at least 2 characters.');
  }
  const durationMinutes = Math.max(1, Math.min(240, Math.round(Number(input.durationMinutes) || 15)));
  const painScore = Math.max(0, Math.min(10, Math.round(Number(input.painScore) || 0)));
  const mobilityScore = Math.max(1, Math.min(10, Math.round(Number(input.mobilityScore) || 5)));
  const completedDate = sanitizeString(input.completedDate || new Date().toISOString().slice(0, 10), 32);
  const profileId = sanitizeString(input.profileId || 'default', 128) || 'default';
  const notes = input.notes ? sanitizeString(input.notes, BLUEPRINT_LIMITS.rehabNotesMaxLength) : '';
  const sharedWithDoctorUid =
    input.sharedWithDoctorUid && BLUEPRINT_LIMITS.idPattern.test(input.sharedWithDoctorUid.trim())
      ? input.sharedWithDoctorUid.trim().slice(0, BLUEPRINT_LIMITS.idMaxLength)
      : '';

  const payload: Record<string, unknown> = {
    ownerUid,
    profileId,
    exerciseName,
    bodyArea: input.bodyArea,
    assignedByClinician,
    targetPrescription,
    durationMinutes,
    painScore,
    mobilityScore,
    completedDate,
    createdAt: serverTimestamp(),
  };
  if (notes) payload.notes = notes;
  if (sharedWithDoctorUid) payload.sharedWithDoctorUid = sharedWithDoctorUid;

  try {
    await setDoc(doc(db, 'rehabSessions', id), payload);
    return {
      id,
      ownerUid,
      profileId,
      exerciseName,
      bodyArea: input.bodyArea,
      assignedByClinician,
      targetPrescription,
      durationMinutes,
      painScore,
      mobilityScore,
      completedDate,
      ...(notes ? { notes } : {}),
      ...(sharedWithDoctorUid ? { sharedWithDoctorUid } : {}),
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function shareRehabSessionWithDoctor(
  sessionId: string,
  doctorUid: string
): Promise<void> {
  const path = `rehabSessions/${sessionId}`;
  const cleaned = doctorUid.trim();
  if (!BLUEPRINT_LIMITS.idPattern.test(cleaned)) {
    throw new Error('Clinician UID must contain only letters, numbers, underscores, or hyphens.');
  }
  try {
    await updateDoc(doc(db, 'rehabSessions', sessionId), {
      sharedWithDoctorUid: cleaned.slice(0, BLUEPRINT_LIMITS.idMaxLength),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteRehabSessionDoc(sessionId: string): Promise<void> {
  const path = `rehabSessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'rehabSessions', sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createCycleLogDoc(
  ownerUid: string,
  input: {
    profileId: string;
    startDate: string;
    cycleLengthDays: number;
    flowIntensity: FlowIntensity;
    symptoms: string[];
    notes?: string;
  }
): Promise<CycleLog> {
  const id = makeDocId('cyc');
  const path = `cycleLogs/${id}`;
  const profileId = sanitizeString(input.profileId || 'default', 128) || 'default';
  const startDate = sanitizeString(input.startDate || new Date().toISOString().slice(0, 10), 32);
  const cycleLengthDays = Math.max(15, Math.min(90, Math.round(Number(input.cycleLengthDays) || 28)));
  const symptoms = (input.symptoms || [])
    .map((s) => sanitizeString(s, 60))
    .filter(Boolean)
    .slice(0, 10);
  const notes = input.notes ? sanitizeString(input.notes, BLUEPRINT_LIMITS.cycleNotesMaxLength) : '';

  const payload: Record<string, unknown> = {
    ownerUid,
    profileId,
    startDate,
    cycleLengthDays,
    flowIntensity: input.flowIntensity,
    symptoms,
    createdAt: serverTimestamp(),
  };
  if (notes) payload.notes = notes;

  try {
    await setDoc(doc(db, 'cycleLogs', id), payload);
    return {
      id,
      ownerUid,
      profileId,
      startDate,
      cycleLengthDays,
      flowIntensity: input.flowIntensity,
      symptoms,
      ...(notes ? { notes } : {}),
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteCycleLogDoc(logId: string): Promise<void> {
  const path = `cycleLogs/${logId}`;
  try {
    await deleteDoc(doc(db, 'cycleLogs', logId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createVaccinationRecordDoc(
  ownerUid: string,
  input: {
    profileId: string;
    vaccineName: string;
    ageGroup: VaccineAgeGroup;
    doseLabel: string;
    status: VaccineStatus;
    date: string;
    facilityName?: string;
    notes?: string;
  }
): Promise<VaccinationRecord> {
  const id = makeDocId('vax');
  const path = `vaccinationRecords/${id}`;
  const profileId = sanitizeString(input.profileId || 'default', 128) || 'default';
  const vaccineName = sanitizeString(input.vaccineName, BLUEPRINT_LIMITS.vaccineNameMaxLength);
  if (vaccineName.length < 2) {
    throw new Error('Vaccine name must be at least 2 characters.');
  }
  const doseLabel = sanitizeString(input.doseLabel || 'Dose 1', BLUEPRINT_LIMITS.vaccineDoseMaxLength) || 'Dose 1';
  const date = sanitizeString(input.date || new Date().toISOString().slice(0, 10), 32);
  const facilityName = input.facilityName
    ? sanitizeString(input.facilityName, BLUEPRINT_LIMITS.vaccineFacilityMaxLength)
    : '';
  const notes = input.notes ? sanitizeString(input.notes, BLUEPRINT_LIMITS.vaccineNotesMaxLength) : '';

  const payload: Record<string, unknown> = {
    ownerUid,
    profileId,
    vaccineName,
    ageGroup: input.ageGroup,
    doseLabel,
    status: input.status,
    date,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (facilityName) payload.facilityName = facilityName;
  if (notes) payload.notes = notes;

  try {
    await setDoc(doc(db, 'vaccinationRecords', id), payload);
    return {
      id,
      ownerUid,
      profileId,
      vaccineName,
      ageGroup: input.ageGroup,
      doseLabel,
      status: input.status,
      date,
      ...(facilityName ? { facilityName } : {}),
      ...(notes ? { notes } : {}),
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateVaccinationRecordDoc(
  recordId: string,
  updates: {
    status: VaccineStatus;
    date: string;
    facilityName?: string;
    notes?: string;
  }
): Promise<void> {
  const path = `vaccinationRecords/${recordId}`;
  const payload: Record<string, unknown> = {
    status: updates.status,
    date: sanitizeString(updates.date || new Date().toISOString().slice(0, 10), 32),
    updatedAt: serverTimestamp(),
  };
  if (updates.facilityName !== undefined) {
    payload.facilityName = sanitizeString(updates.facilityName, BLUEPRINT_LIMITS.vaccineFacilityMaxLength);
  }
  if (updates.notes !== undefined) {
    payload.notes = sanitizeString(updates.notes, BLUEPRINT_LIMITS.vaccineNotesMaxLength);
  }
  try {
    await updateDoc(doc(db, 'vaccinationRecords', recordId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteVaccinationRecordDoc(recordId: string): Promise<void> {
  const path = `vaccinationRecords/${recordId}`;
  try {
    await deleteDoc(doc(db, 'vaccinationRecords', recordId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribePatientWorkspace(
  uid: string,
  callbacks: {
    onProfiles: (items: FamilyProfile[]) => void;
    onBp: (items: BloodPressureReading[]) => void;
    onGlucose: (items: GlucoseReading[]) => void;
    onDocs: (items: MedicalDocument[]) => void;
    onAiConsultations: (items: AiConsultation[]) => void;
    onReminders: (items: MedicationReminder[]) => void;
    onWalletTransactions: (items: WalletTransaction[]) => void;
    onRehabSessions: (items: RehabSession[]) => void;
    onCycleLogs: (items: CycleLog[]) => void;
    onVaccinationRecords: (items: VaccinationRecord[]) => void;
    onAppointments: (items: Appointment[]) => void;
    onTransactions: (items: TransactionRecord[]) => void;
    onContacts: (items: EmergencyContact[]) => void;
    onEmergencies: (items: EmergencyRequest[]) => void;
    onRoleRequests: (items: RoleRequest[]) => void;
    onAuditLogs: (items: AuditLogEntry[]) => void;
    onWearableReadings?: (items: WearableReading[]) => void;
  }
): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  if (callbacks.onWearableReadings) {
    const onWearable = callbacks.onWearableReadings;
    unsubs.push(
      onSnapshot(
        query(collection(db, 'wearableReadings'), where('ownerUid', '==', uid)),
        (snap) => {
          const list = snap.docs.map((d) => ({
            ...(d.data() as Omit<WearableReading, 'id'>),
            id: d.id,
          }));
          list.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
          onWearable(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'wearableReadings')
      )
    );
  }

  unsubs.push(
    onSnapshot(
      query(collection(db, 'familyProfiles'), where('ownerUid', '==', uid)),
      (snap) => {
        callbacks.onProfiles(
          snap.docs.map((d) => ({ ...(d.data() as Omit<FamilyProfile, 'id'>), id: d.id }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'familyProfiles')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'bpReadings'), where('ownerUid', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as Omit<BloodPressureReading, 'id'>), id: d.id }));
        list.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
        callbacks.onBp(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bpReadings')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'glucoseReadings'), where('ownerUid', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as Omit<GlucoseReading, 'id'>), id: d.id }));
        list.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
        callbacks.onGlucose(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'glucoseReadings')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'medicalDocuments'), where('ownerUid', '==', uid)),
      (snap) => {
        callbacks.onDocs(
          snap.docs.map((d) => ({ ...(d.data() as Omit<MedicalDocument, 'id'>), id: d.id }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'medicalDocuments')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'aiConsultations'), where('ownerUid', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() as Omit<AiConsultation, 'id'>;
          return {
            ...data,
            id: d.id,
            createdAt: tsToIso(data.createdAt),
          };
        });
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        callbacks.onAiConsultations(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'aiConsultations')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'medicationReminders'), where('ownerUid', '==', uid)),
      (snap) => {
        const list: MedicationReminder[] = snap.docs.map((d) => {
          const data = d.data() as Omit<MedicationReminder, 'id' | 'type'>;
          return {
            ...data,
            id: d.id,
            type: data.category,
          };
        });
        list.sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));
        callbacks.onReminders(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'medicationReminders')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'walletTransactions'), where('ownerUid', '==', uid)),
      (snap) => {
        const list: WalletTransaction[] = snap.docs.map((d) => {
          const data = d.data() as Omit<WalletTransaction, 'id'>;
          return {
            ...data,
            id: d.id,
            createdAt: tsToIso(data.createdAt),
          };
        });
        list.sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));
        callbacks.onWalletTransactions(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'walletTransactions')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'appointments'), where('patientUid', '==', uid)),
      (snap) => {
        callbacks.onAppointments(
          snap.docs.map((d) => ({ ...(d.data() as Omit<Appointment, 'id'>), id: d.id }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'appointments')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'transactions'), where('patientUid', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as Omit<TransactionRecord, 'id'>), id: d.id }));
        list.sort((a, b) => b.date.localeCompare(a.date));
        callbacks.onTransactions(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'transactions')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'emergencyContacts'), where('ownerUid', '==', uid)),
      (snap) => {
        callbacks.onContacts(
          snap.docs.map((d) => ({ ...(d.data() as Omit<EmergencyContact, 'id'>), id: d.id }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'emergencyContacts')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'emergencyRequests'), where('patientUid', '==', uid)),
      (snap) => {
        callbacks.onEmergencies(
          snap.docs.map((d) => {
            const raw = d.data() as Omit<EmergencyRequest, 'id' | 'coordinates'>;
            return {
              ...raw,
              id: d.id,
              coordinates: null,
              createdAt: tsToIso(raw.createdAt),
            };
          })
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'emergencyRequests')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'roleRequests'), where('uid', '==', uid)),
      (snap) => {
        callbacks.onRoleRequests(
          snap.docs.map((d) => {
            const data = d.data() as Omit<RoleRequest, 'id'>;
            return { ...data, id: d.id, createdAt: tsToIso(data.createdAt) };
          })
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'roleRequests')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'auditLogs'), where('actorUid', '==', uid)),
      (snap) => {
        const logs = snap.docs.map((d) => {
          const data = d.data() as Omit<AuditLogEntry, 'id'>;
          return { ...data, id: d.id, createdAt: tsToIso(data.createdAt) };
        });
        logs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        callbacks.onAuditLogs(logs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'rehabSessions'), where('ownerUid', '==', uid)),
      (snap) => {
        const list: RehabSession[] = snap.docs.map((d) => {
          const data = d.data() as Omit<RehabSession, 'id'>;
          return { ...data, id: d.id, createdAt: tsToIso(data.createdAt) };
        });
        list.sort((a, b) => (b.completedDate || b.createdAt || '').localeCompare(a.completedDate || a.createdAt || ''));
        callbacks.onRehabSessions(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'rehabSessions')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'cycleLogs'), where('ownerUid', '==', uid)),
      (snap) => {
        const list: CycleLog[] = snap.docs.map((d) => {
          const data = d.data() as Omit<CycleLog, 'id'>;
          return {
            ...data,
            id: d.id,
            symptoms: Array.isArray(data.symptoms) ? data.symptoms : [],
            createdAt: tsToIso(data.createdAt),
          };
        });
        list.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
        callbacks.onCycleLogs(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'cycleLogs')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'vaccinationRecords'), where('ownerUid', '==', uid)),
      (snap) => {
        const list: VaccinationRecord[] = snap.docs.map((d) => {
          const data = d.data() as Omit<VaccinationRecord, 'id'>;
          return { ...data, id: d.id, createdAt: tsToIso(data.createdAt) };
        });
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        callbacks.onVaccinationRecords(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'vaccinationRecords')
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}

export function subscribeRolePortalStreams(
  uid: string,
  role: UserRole,
  callbacks: {
    onDoctorAppointments?: (items: Appointment[]) => void;
    onSharedBp?: (items: BloodPressureReading[]) => void;
    onSharedGlucose?: (items: GlucoseReading[]) => void;
    onSharedDocs?: (items: MedicalDocument[]) => void;
    onHospitalAppointments?: (items: Appointment[]) => void;
    onHospitalEmergencies?: (items: EmergencyRequest[]) => void;
    onAdminRoleRequests?: (items: RoleRequest[]) => void;
    onAdminAuditLogs?: (items: AuditLogEntry[]) => void;
  }
): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  if (role === 'doctor') {
    unsubs.push(
      onSnapshot(
        query(collection(db, 'appointments'), where('doctorUid', '==', uid)),
        (snap) => callbacks.onDoctorAppointments?.(snap.docs.map((d) => ({ ...(d.data() as Omit<Appointment, 'id'>), id: d.id }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'appointments(doctor)')
      )
    );
    unsubs.push(
      onSnapshot(
        query(collection(db, 'bpReadings'), where('sharedWithDoctorUid', '==', uid)),
        (snap) => callbacks.onSharedBp?.(snap.docs.map((d) => ({ ...(d.data() as Omit<BloodPressureReading, 'id'>), id: d.id }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'bpReadings(shared)')
      )
    );
    unsubs.push(
      onSnapshot(
        query(collection(db, 'glucoseReadings'), where('sharedWithDoctorUid', '==', uid)),
        (snap) => callbacks.onSharedGlucose?.(snap.docs.map((d) => ({ ...(d.data() as Omit<GlucoseReading, 'id'>), id: d.id }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'glucoseReadings(shared)')
      )
    );
    unsubs.push(
      onSnapshot(
        query(collection(db, 'medicalDocuments'), where('sharedWithDoctorUid', '==', uid)),
        (snap) => callbacks.onSharedDocs?.(snap.docs.map((d) => ({ ...(d.data() as Omit<MedicalDocument, 'id'>), id: d.id }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'medicalDocuments(shared)')
      )
    );
  }

  if (role === 'hospital') {
    let submittedList: EmergencyRequest[] = [];
    let assignedList: EmergencyRequest[] = [];
    const emitMerged = () => {
      const map = new Map<string, EmergencyRequest>();
      [...assignedList, ...submittedList].forEach((item) => map.set(item.id, item));
      callbacks.onHospitalEmergencies?.(Array.from(map.values()));
    };

    unsubs.push(
      onSnapshot(
        query(collection(db, 'appointments'), where('hospitalUid', '==', uid)),
        (snap) => callbacks.onHospitalAppointments?.(snap.docs.map((d) => ({ ...(d.data() as Omit<Appointment, 'id'>), id: d.id }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'appointments(hospital)')
      )
    );
    unsubs.push(
      onSnapshot(
        query(collection(db, 'emergencyRequests'), where('stage', '==', 'submitted')),
        (snap) => {
          submittedList = snap.docs.map((d) => {
            const raw = d.data() as Omit<EmergencyRequest, 'id' | 'coordinates'>;
            return { ...raw, id: d.id, coordinates: null, createdAt: tsToIso(raw.createdAt) };
          });
          emitMerged();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'emergencyRequests(submitted)')
      )
    );
    unsubs.push(
      onSnapshot(
        query(collection(db, 'emergencyRequests'), where('hospitalUid', '==', uid)),
        (snap) => {
          assignedList = snap.docs.map((d) => {
            const raw = d.data() as Omit<EmergencyRequest, 'id' | 'coordinates'>;
            return { ...raw, id: d.id, coordinates: null, createdAt: tsToIso(raw.createdAt) };
          });
          emitMerged();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'emergencyRequests(hospital)')
      )
    );
  }

  if (role === 'administrator') {
    unsubs.push(
      onSnapshot(
        query(collection(db, 'roleRequests'), orderBy('createdAt', 'desc')),
        (snap) => {
          callbacks.onAdminRoleRequests?.(
            snap.docs.map((d) => {
              const data = d.data() as Omit<RoleRequest, 'id'>;
              return { ...data, id: d.id, createdAt: tsToIso(data.createdAt) };
            })
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'roleRequests(admin)')
      )
    );
    unsubs.push(
      onSnapshot(
        query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc')),
        (snap) => {
          callbacks.onAdminAuditLogs?.(
            snap.docs.map((d) => {
              const data = d.data() as Omit<AuditLogEntry, 'id'>;
              return { ...data, id: d.id, createdAt: tsToIso(data.createdAt) };
            })
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs(admin)')
      )
    );
  }

  return () => {
    unsubs.forEach((u) => u());
  };
}
