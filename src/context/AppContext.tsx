import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  browserPopupRedirectResolver,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, isFirestoreOfflineError } from '../firebaseConfig';
import {
  INITIAL_APPOINTMENTS,
  INITIAL_BP_READINGS,
  INITIAL_DOCUMENTS,
  INITIAL_EMERGENCY_CONTACTS,
  INITIAL_FAMILY_PROFILES,
  INITIAL_GLUCOSE_READINGS,
  INITIAL_LAB_RESULTS,
  INITIAL_PRESCRIPTIONS,
  INITIAL_TRANSACTIONS,
  OYO_SUBSCRIPTION_PLANS,
} from '../data/mockNigeriaData';
import {
  adminListAllUsers,
  bootstrapPrimaryProfileIfMissing,
  cancelAppointmentWithWalletRefund,
  createAiConsultationDoc,
  createAppointmentDoc,
  createBpReadingDoc,
  createCycleLogDoc,
  createEmergencyContactDoc,
  createEmergencyRequestDoc,
  createFamilyProfileDoc,
  createGlucoseReadingDoc,
  createMedicalDocumentDoc,
  createMedicationReminderDoc,
  createRehabSessionDoc,
  createTransactionDoc,
  createVaccinationRecordDoc,
  createWalletTransactionDoc,
  deleteAiConsultationDoc,
  deleteCycleLogDoc,
  deleteMedicationReminderDoc,
  deleteRehabSessionDoc,
  deleteVaccinationRecordDoc,
  ensureUserAccountRecords,
  markMedicationReminderTakenDoc,
  resolveEmergencyByPatient,
  reviewRoleRequestAsAdmin,
  shareBpReadingWithDoctor,
  shareGlucoseReadingWithDoctor,
  shareMedicalDocumentWithDoctor,
  shareRehabSessionWithDoctor,
  submitRoleVerificationRequest,
  subscribePatientWorkspace,
  subscribeRolePortalStreams,
  subscribeUserDocuments,
  updateAppointmentByPatient,
  updateAppointmentStatusByClinician,
  updateEmergencyStageByHospital,
  updateFamilyProfileDoc,
  updateMedicationReminderStatusDoc,
  updateUserAccountDoc,
  updateUserPrivateContact,
  updateVaccinationRecordDoc,
  writeAuditLog,
} from '../services/firestoreService';
import { fetchIntegrationStatus, initializeInterswitchCheckout } from '../services/apiClient';
import type {
  ActiveSubscription,
  AiConsultation,
  Appointment,
  AppRoute,
  AuditLogEntry,
  BloodPressureReading,
  CheckoutDraft,
  Coordinates,
  CycleLog,
  EmergencyContact,
  EmergencyRequest,
  FamilyProfile,
  FlowIntensity,
  GlucoseReading,
  IntegrationStatus,
  LabResult,
  MedicalDocument,
  MedicationReminder,
  Prescription,
  RehabBodyArea,
  RehabSession,
  ReminderCategory,
  ReminderFrequency,
  RoleRequest,
  SubscriptionPlanId,
  TransactionRecord,
  UserAccount,
  UserPrivateInfo,
  UserRole,
  VaccinationRecord,
  VaccineAgeGroup,
  VaccineStatus,
  WalletTransaction,
  WalletTransactionSource,
} from '../types/healthcare';

interface SessionUserSummary {
  uid: string | null;
  name: string;
  email: string;
  city: string;
  signedIn: boolean;
  emailVerified: boolean;
  role: UserRole;
  verifiedRoleStatus: 'active' | 'pending_verification' | 'suspended';
}

interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  read: boolean;
}

interface NewReminderInput {
  profileId?: string;
  title: string;
  dosage?: string;
  category?: ReminderCategory;
  type?: ReminderCategory;
  timeOfDay?: string;
  frequency?: ReminderFrequency;
  schedule?: string;
  notes?: string;
}

interface AppContextValue {
  route: AppRoute;
  navigate: (to: AppRoute, hash?: string) => void;
  authLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  authNotice: string | null;
  clearAuthNotice: () => void;
  pendingPostLoginRoute: AppRoute | null;
  firebaseUser: FirebaseUser | null;
  userProfile: UserAccount | null;
  privateInfo: UserPrivateInfo | null;
  user: SessionUserSummary;
  isGuestDemo: boolean;
  integrationStatus: IntegrationStatus;
  googleSignInPending: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string, city: string) => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  resendVerificationEmail: () => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
  updatePrivateDetails: (updates: { phone?: string; address?: string; smsVerified?: boolean }) => Promise<void>;
  updateMyAccount: (updates: {
    displayName?: string;
    city?: string;
    facilityOrSpecialty?: string;
    medicalHistory?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  activeProfileId: string;
  setActiveProfileId: (id: string) => void;
  familyProfiles: FamilyProfile[];
  addFamilyProfile: (profile: Omit<FamilyProfile, 'id' | 'demoMemberId'>) => Promise<void>;
  updateFamilyProfile: (
    profileId: string,
    updates: Partial<Omit<FamilyProfile, 'id' | 'ownerUid' | 'demoMemberId'>>
  ) => Promise<void>;
  appointments: Appointment[];
  bookOnlineConsultation: (meta: {
    doctorId: string;
    doctorName: string;
    specialty: string;
    facilityName: string;
    city: string;
    date: string;
    time: string;
    reason?: string;
  }) => Promise<Appointment>;
  bookPhysicalExamFollowUp: (params: {
    parentAppointment: Appointment;
    facilityName: string;
    city: string;
    date: string;
    time: string;
    notes?: string;
  }) => Promise<Appointment>;
  rescheduleOrCancelAppointment: (
    appointmentId: string,
    status: 'Rescheduled' | 'Cancelled',
    date: string,
    time: string
  ) => Promise<{ refundedAmountNgn: number; walletReference?: string }>;
  bpReadings: BloodPressureReading[];
  addBpReading: (reading: Omit<BloodPressureReading, 'id'>) => Promise<void>;
  glucoseReadings: GlucoseReading[];
  addGlucoseReading: (reading: Omit<GlucoseReading, 'id'>) => Promise<void>;
  prescriptions: Prescription[];
  labResults: LabResult[];
  documents: MedicalDocument[];
  addMedicalDocument: (doc: Omit<MedicalDocument, 'id'>) => Promise<void>;
  aiConsultations: AiConsultation[];
  saveAiConsultation: (
    consultation: Omit<AiConsultation, 'id' | 'ownerUid' | 'createdAt'>
  ) => Promise<AiConsultation>;
  deleteAiConsultation: (consultationId: string) => Promise<void>;
  shareRecordWithDoctor: (
    kind: 'bp' | 'glucose' | 'document',
    recordId: string,
    doctorUid: string
  ) => Promise<void>;
  emergencyContacts: EmergencyContact[];
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<void>;
  transactions: TransactionRecord[];
  walletTransactions: WalletTransaction[];
  walletBalanceNgn: number;
  rehabSessions: RehabSession[];
  addRehabSession: (input: {
    profileId?: string;
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
  }) => Promise<void>;
  shareRehabWithDoctor: (sessionId: string, doctorUid: string) => Promise<void>;
  deleteRehabSession: (sessionId: string) => Promise<void>;
  cycleLogs: CycleLog[];
  addCycleLog: (input: {
    profileId?: string;
    startDate: string;
    cycleLengthDays: number;
    flowIntensity: FlowIntensity;
    symptoms: string[];
    notes?: string;
  }) => Promise<void>;
  deleteCycleLog: (logId: string) => Promise<void>;
  vaccinationRecords: VaccinationRecord[];
  addVaccinationRecord: (input: {
    profileId?: string;
    vaccineName: string;
    ageGroup: VaccineAgeGroup;
    doseLabel: string;
    status: VaccineStatus;
    date: string;
    facilityName?: string;
    notes?: string;
  }) => Promise<void>;
  updateVaccinationRecord: (
    recordId: string,
    updates: { status: VaccineStatus; date: string; facilityName?: string; notes?: string }
  ) => Promise<void>;
  deleteVaccinationRecord: (recordId: string) => Promise<void>;
  notifications: NotificationItem[];
  markAllNotificationsRead: () => void;
  reminders: MedicationReminder[];
  toggleReminder: (id: string) => Promise<void>;
  addReminder: (reminder: NewReminderInput) => Promise<void>;
  markReminderTaken: (id: string, dateIso: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  activeSubscription: ActiveSubscription;
  selectedCheckoutPlanId: SubscriptionPlanId;
  setSelectedCheckoutPlanId: (planId: SubscriptionPlanId) => void;
  openSubscriptionCheckout: (planId?: SubscriptionPlanId) => void;
  recordSubscriptionPayment: (params: {
    planId: SubscriptionPlanId;
    reference: string;
    method: TransactionRecord['method'];
    amountNgn: number;
    status: 'Verified' | 'Pending Verification' | 'Paid via Wallet';
  }) => Promise<TransactionRecord>;
  paySubscriptionWithWallet: (planId: SubscriptionPlanId) => Promise<TransactionRecord>;
  checkoutDraft: CheckoutDraft | null;
  openCheckout: (draft: CheckoutDraft) => void;
  closeCheckout: () => void;
  completeDemoPayment: (
    method: TransactionRecord['method']
  ) => Promise<{ transaction: TransactionRecord; appointment?: Appointment; paymentMessage: string }>;
  recordVerifiedInterswitchPayment: (params: {
    reference: string;
    method: TransactionRecord['method'];
    amountNgn: number;
    paymentMessage: string;
  }) => Promise<{ transaction: TransactionRecord; appointment?: Appointment; paymentMessage: string }>;
  userLocation: { label: string; coordinates: Coordinates | null; source: 'gps' | 'manual' | 'default' };
  setUserLocation: (loc: { label: string; coordinates: Coordinates | null; source: 'gps' | 'manual' | 'default' }) => void;
  activeEmergency: EmergencyRequest | null;
  emergencies: EmergencyRequest[];
  submitEmergencyRequest: (payload: Omit<EmergencyRequest, 'id' | 'stage' | 'createdAt'>) => Promise<void>;
  advanceEmergencyStage: (stage: EmergencyRequest['stage']) => Promise<void>;
  clearEmergencyRequest: () => void;
  seedDemoWorkspaceForUser: () => Promise<void>;
  // Role workflows & portals
  roleRequests: RoleRequest[];
  submitRoleRequest: (payload: {
    requestedRole: 'doctor' | 'hospital';
    licenseRef: string;
    organization: string;
  }) => Promise<void>;
  auditLogs: AuditLogEntry[];
  doctorAppointments: Appointment[];
  doctorSharedBp: BloodPressureReading[];
  doctorSharedGlucose: GlucoseReading[];
  doctorSharedDocs: MedicalDocument[];
  updateAppointmentClinician: (
    appointmentId: string,
    status: 'Confirmed' | 'Completed' | 'Rescheduled' | 'Cancelled',
    clinicalNotes?: string
  ) => Promise<void>;
  hospitalAppointments: Appointment[];
  hospitalEmergencies: EmergencyRequest[];
  hospitalUpdateEmergency: (
    requestId: string,
    stage: 'accepted' | 'dispatched' | 'resolved',
    partnerUnit?: string,
    etaMinutes?: number
  ) => Promise<void>;
  adminRoleRequests: RoleRequest[];
  adminAuditLogs: AuditLogEntry[];
  adminUsers: UserAccount[];
  loadAdminUsers: () => Promise<void>;
  adminReviewRoleRequest: (request: RoleRequest, decision: 'approved' | 'rejected') => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const VALID_ROUTES: AppRoute[] = [
  '/',
  '/find-healthcare',
  '/dashboard',
  '/ai-assistant',
  '/emergency',
  '/monitoring',
  '/payments',
  '/checkout',
  '/payment-response',
  '/about',
  '/login',
  '/register',
];

const SUBSCRIPTION_STORAGE_KEY = 'hc_oyo_active_subscription_v1';

function computeRenewalDateIso(fromIso?: string): string {
  const base = fromIso ? new Date(fromIso) : new Date();
  if (Number.isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 30);
    return fallback.toISOString().slice(0, 10);
  }
  base.setDate(base.getDate() + 30);
  return base.toISOString().slice(0, 10);
}

function getPlanById(planId: SubscriptionPlanId) {
  return (
    OYO_SUBSCRIPTION_PLANS.find((p) => p.id === planId) || OYO_SUBSCRIPTION_PLANS[0]
  );
}

const GUEST_DEFAULT_SUBSCRIPTION: ActiveSubscription = {
  planId: 'plan-oyo-family-monthly',
  planName: 'Family Plan (Up to 5 Profiles) — Oyo State',
  monthlyPriceNgn: 50000,
  maxProfiles: 5,
  status: 'Active',
  renewsOn: '2026-12-15',
  lastPaymentRef: 'ISW-OYO-20261115-5042',
};

const INACTIVE_SUBSCRIPTION: ActiveSubscription = {
  planId: null,
  planName: 'No Active Monthly Plan',
  monthlyPriceNgn: 0,
  maxProfiles: 1,
  status: 'Inactive',
  renewsOn: '—',
};

function parseRoute(pathname: string): AppRoute {
  if (VALID_ROUTES.includes(pathname as AppRoute)) {
    return pathname as AppRoute;
  }
  return '/';
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

function mapFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  const message = err instanceof Error ? err.message : String(err);

  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password sign-in is not yet enabled in Firebase Console. Use Google Sign-In below, or enable Email/Password under Firebase Console > Authentication > Sign-in method.';
  }
  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    message.includes('Pending promise was never set')
  ) {
    return 'Google Sign-In popup was closed or interrupted before finishing. Please try again.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Browser blocked the sign-in popup. Allow popups for this site and try again.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Incorrect email or password. Please check your credentials and try again.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Please use a stronger password (at least 6 characters).';
  }
  return message;
}

function formatWorkspaceLoadError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  let extracted = raw;
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    if (parsed && typeof parsed.error === 'string') {
      extracted = parsed.error;
    }
  } catch {
    // Non-JSON error message
  }
  if (isFirestoreOfflineError(err) || isFirestoreOfflineError(extracted)) {
    return 'Unable to reach Cloud Firestore right now. Check your internet connection — your health workspace will reconnect automatically when online.';
  }
  return extracted || 'Unable to load Firebase profile.';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window !== 'undefined' ? parseRoute(window.location.pathname) : '/'
  );

  const [authLoading, setAuthLoading] = useState(true);
  const [googleSignInPending, setGoogleSignInPending] = useState(false);
  const googleSignInInFlightRef = useRef<Promise<void> | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [pendingPostLoginRoute, setPendingPostLoginRoute] = useState<AppRoute | null>(null);
  const pendingPostLoginRouteRef = useRef<AppRoute | null>(null);
  const pendingCheckoutDraftRef = useRef<CheckoutDraft | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [emailVerifiedFlag, setEmailVerifiedFlag] = useState(false);
  const [userProfile, setUserProfile] = useState<UserAccount | null>(null);
  const [privateInfo, setPrivateInfo] = useState<UserPrivateInfo | null>(null);
  const pendingCityRef = useRef<string>('Ibadan');
  const loginFailureTrackerRef = useRef<{ count: number; lockedUntil: number }>({
    count: 0,
    lockedUntil: 0,
  });

  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    geminiConfigured: false,
    openrouterConfigured: false,
    googleMapsConfigured: Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY),
    interswitchConfigured: false,
    interswitchEnvironment: 'sandbox',
    interswitchWebhookConfigured: false,
    interswitchMissingCount: 2,
    smsConfigured: false,
    firebaseProjectId: 'amped-imprint-mghtt',
  });

  // Workspace data (defaults to guest demonstration data when signed out)
  const [familyProfiles, setFamilyProfiles] = useState<FamilyProfile[]>(INITIAL_FAMILY_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState<string>(INITIAL_FAMILY_PROFILES[0].id);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [bpReadings, setBpReadings] = useState<BloodPressureReading[]>(INITIAL_BP_READINGS);
  const [glucoseReadings, setGlucoseReadings] = useState<GlucoseReading[]>(INITIAL_GLUCOSE_READINGS);
  const [prescriptions] = useState<Prescription[]>(INITIAL_PRESCRIPTIONS);
  const [labResults] = useState<LabResult[]>(INITIAL_LAB_RESULTS);
  const [documents, setDocuments] = useState<MedicalDocument[]>(INITIAL_DOCUMENTS);
  const [aiConsultations, setAiConsultations] = useState<AiConsultation[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(INITIAL_EMERGENCY_CONTACTS);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(INITIAL_TRANSACTIONS);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [rehabSessions, setRehabSessions] = useState<RehabSession[]>([
    {
      id: 'rehab-demo-1',
      profileId: 'prof-chidi',
      exerciseName: 'Seated Knee Extension & Quad Strengthening',
      bodyArea: 'Knee & Lower Limb',
      assignedByClinician: 'PT Chinedu Okafor, BMR (MRTBN)',
      targetPrescription: '3 sets × 12 reps · 15 min',
      durationMinutes: 15,
      painScore: 4,
      mobilityScore: 6,
      completedDate: '2026-11-12',
      notes: 'Mild stiffness on first set; smoother extension by set 3.',
    },
    {
      id: 'rehab-demo-2',
      profileId: 'prof-chidi',
      exerciseName: 'Lumbar Pelvic Tilts & Core Stabilization',
      bodyArea: 'Back & Spine',
      assignedByClinician: 'PT Chinedu Okafor, BMR (MRTBN)',
      targetPrescription: '3 sets × 10 reps · 12 min',
      durationMinutes: 14,
      painScore: 3,
      mobilityScore: 7,
      completedDate: '2026-11-15',
      notes: 'Completed with steady breathing and reduced lower back tension.',
    },
    {
      id: 'rehab-demo-3',
      profileId: 'prof-chidi',
      exerciseName: 'Seated Knee Extension & Quad Strengthening',
      bodyArea: 'Knee & Lower Limb',
      assignedByClinician: 'PT Chinedu Okafor, BMR (MRTBN)',
      targetPrescription: '3 sets × 12 reps · 15 min',
      durationMinutes: 16,
      painScore: 2,
      mobilityScore: 8,
      completedDate: '2026-11-18',
      notes: 'Pain reduced from 4/10 to 2/10; improved range of motion.',
    },
  ]);
  const [cycleLogs, setCycleLogs] = useState<CycleLog[]>([
    {
      id: 'cyc-demo-1',
      profileId: 'prof-chidi',
      startDate: '2026-10-25',
      cycleLengthDays: 29,
      flowIntensity: 'Moderate',
      symptoms: ['Mild Cramps', 'Fatigue'],
      notes: 'Regular 29-day cycle logged for private tracking.',
    },
  ]);
  const [vaccinationRecords, setVaccinationRecords] = useState<VaccinationRecord[]>([
    {
      id: 'vax-demo-1',
      profileId: 'prof-zara',
      vaccineName: 'Pentavalent (DPT-HepB-Hib)',
      ageGroup: '0-5',
      doseLabel: 'Dose 3 (14 weeks)',
      status: 'Completed',
      date: '2024-06-18',
      facilityName: 'Oyo State Primary Health Care Hub, Ibadan North',
    },
    {
      id: 'vax-demo-2',
      profileId: 'prof-zara',
      vaccineName: 'HPV (Human Papillomavirus)',
      ageGroup: '10-15',
      doseLabel: 'Single Dose (9–14 yrs)',
      status: 'Scheduled',
      date: '2027-02-15',
      facilityName: 'Adeoyo Maternity Teaching Hospital, Ibadan',
    },
    {
      id: 'vax-demo-3',
      profileId: 'prof-chidi',
      vaccineName: 'Hepatitis B Adult Series',
      ageGroup: '15+',
      doseLabel: 'Booster Dose',
      status: 'Completed',
      date: '2026-04-10',
      facilityName: 'University College Hospital (UCH) Ibadan',
    },
  ]);
  const [emergencies, setEmergencies] = useState<EmergencyRequest[]>([]);
  const [activeEmergency, setActiveEmergency] = useState<EmergencyRequest | null>(null);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Role portal streams
  const [doctorAppointments, setDoctorAppointments] = useState<Appointment[]>([]);
  const [doctorSharedBp, setDoctorSharedBp] = useState<BloodPressureReading[]>([]);
  const [doctorSharedGlucose, setDoctorSharedGlucose] = useState<GlucoseReading[]>([]);
  const [doctorSharedDocs, setDoctorSharedDocs] = useState<MedicalDocument[]>([]);
  const [hospitalAppointments, setHospitalAppointments] = useState<Appointment[]>([]);
  const [hospitalEmergencies, setHospitalEmergencies] = useState<EmergencyRequest[]>([]);
  const [adminRoleRequests, setAdminRoleRequests] = useState<RoleRequest[]>([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState<AuditLogEntry[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserAccount[]>([]);

  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft | null>(null);
  const [selectedCheckoutPlanId, setSelectedCheckoutPlanId] = useState<SubscriptionPlanId>(
    'plan-oyo-individual-monthly'
  );
  const [storedSubscription, setStoredSubscription] = useState<ActiveSubscription | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as ActiveSubscription;
    } catch {
      return null;
    }
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'not-1',
      title: 'Cardiology appointment confirmed',
      detail: 'Dr. Adewale Ogunleye · 22 Nov at 10:30 WAT (UCH Ibadan).',
      time: '2h ago',
      read: false,
    },
    {
      id: 'not-2',
      title: 'Lab report ready for review',
      detail: 'Comprehensive Metabolic & Lipid Panel posted to your Health Records.',
      time: '2 days ago',
      read: false,
    },
    {
      id: 'not-3',
      title: 'Morning BP check reminder',
      detail: 'Log your seated morning reading from your validated upper-arm monitor.',
      time: 'Today · 07:30 WAT',
      read: true,
    },
  ]);

  const DEFAULT_DEMO_REMINDERS: MedicationReminder[] = [
    {
      id: 'rem-1',
      profileId: 'prof-chidi',
      title: 'Amlodipine Besylate 5mg',
      dosage: '1 tablet with water',
      category: 'Medication',
      type: 'Medication',
      timeOfDay: '08:00',
      frequency: 'Daily',
      schedule: 'Daily · 08:00 WAT',
      notes: 'Take at the same time each morning.',
      enabled: true,
    },
    {
      id: 'rem-2',
      profileId: 'prof-chidi',
      title: 'Morning Seated Blood Pressure Log',
      dosage: 'Rest 5 mins before reading',
      category: 'BP Check',
      type: 'BP Check',
      timeOfDay: '07:30',
      frequency: 'Daily',
      schedule: 'Daily · 07:30 WAT',
      notes: 'Use validated upper-arm cuff.',
      enabled: true,
    },
    {
      id: 'rem-3',
      profileId: 'prof-chidi',
      title: 'Fasting Blood Glucose Check',
      dosage: 'Before breakfast',
      category: 'Glucose Check',
      type: 'Glucose Check',
      timeOfDay: '07:00',
      frequency: 'Weekdays',
      schedule: 'Weekdays · 07:00 WAT',
      notes: 'Overnight fast 8–10 hours.',
      enabled: true,
    },
  ];

  const [reminders, setReminders] = useState<MedicationReminder[]>(DEFAULT_DEMO_REMINDERS);

  const [userLocation, setUserLocation] = useState<{
    label: string;
    coordinates: Coordinates | null;
    source: 'gps' | 'manual' | 'default';
  }>({
    label: 'Bodija & UCH Corridor, Ibadan (Oyo State Hub)',
    coordinates: { lat: 7.419, lng: 3.911 },
    source: 'default',
  });

  useEffect(() => {
    void fetchIntegrationStatus()
      .then((status) => setIntegrationStatus(status))
      .catch(() => {
        // Keep honest defaults when server status cannot be reached
      });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseRoute(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Auth & Firestore workspace synchronization
  useEffect(() => {
    let unsubUserDocs: (() => void) | undefined;
    let unsubWorkspace: (() => void) | undefined;
    let unsubRole: (() => void) | undefined;
    let removeOnlineListener: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      unsubUserDocs?.();
      unsubWorkspace?.();
      unsubRole?.();
      removeOnlineListener?.();
      removeOnlineListener = undefined;

      if (!fbUser) {
        setFirebaseUser(null);
        setEmailVerifiedFlag(false);
        setUserProfile(null);
        setPrivateInfo(null);
        setFamilyProfiles(INITIAL_FAMILY_PROFILES);
        setActiveProfileId(INITIAL_FAMILY_PROFILES[0].id);
        setAppointments(INITIAL_APPOINTMENTS);
        setBpReadings(INITIAL_BP_READINGS);
        setGlucoseReadings(INITIAL_GLUCOSE_READINGS);
        setDocuments(INITIAL_DOCUMENTS);
        setAiConsultations([]);
        setReminders(DEFAULT_DEMO_REMINDERS);
        setWalletTransactions([]);
        setRehabSessions([]);
        setCycleLogs([]);
        setVaccinationRecords([]);
        setEmergencyContacts(INITIAL_EMERGENCY_CONTACTS);
        setTransactions(INITIAL_TRANSACTIONS);
        setEmergencies([]);
        setActiveEmergency(null);
        setRoleRequests([]);
        setAuditLogs([]);
        setDoctorAppointments([]);
        setDoctorSharedBp([]);
        setDoctorSharedGlucose([]);
        setDoctorSharedDocs([]);
        setHospitalAppointments([]);
        setHospitalEmergencies([]);
        setAdminRoleRequests([]);
        setAdminAuditLogs([]);
        setAdminUsers([]);
        setAuthLoading(false);
        return;
      }

      setFirebaseUser(fbUser);
      setEmailVerifiedFlag(Boolean(fbUser.emailVerified));

      // Attach live listeners immediately so Firestore reconnects and syncs automatically
      // even if an initial network check or bootstrap read experiences a transient offline blip.
      unsubUserDocs = subscribeUserDocuments(fbUser.uid, {
        onAccount: (acct) => {
          setUserProfile(acct);
          setAuthError((prev) =>
            prev && prev.includes('Cloud Firestore') ? null : prev
          );
        },
        onPrivateInfo: setPrivateInfo,
      });

      unsubWorkspace = subscribePatientWorkspace(fbUser.uid, {
        onProfiles: (items) => {
          if (items.length > 0) {
            setFamilyProfiles(items);
            setActiveProfileId((prev) =>
              items.some((i) => i.id === prev) ? prev : items[0].id
            );
          } else {
            setFamilyProfiles([]);
          }
        },
        onBp: setBpReadings,
        onGlucose: setGlucoseReadings,
        onDocs: setDocuments,
        onAiConsultations: setAiConsultations,
        onReminders: setReminders,
        onWalletTransactions: setWalletTransactions,
        onRehabSessions: setRehabSessions,
        onCycleLogs: setCycleLogs,
        onVaccinationRecords: setVaccinationRecords,
        onAppointments: setAppointments,
        onTransactions: setTransactions,
        onContacts: setEmergencyContacts,
        onEmergencies: (items) => {
          setEmergencies(items);
          const active = items.find((e) => e.stage !== 'resolved') || null;
          setActiveEmergency(active);
        },
        onRoleRequests: setRoleRequests,
        onAuditLogs: setAuditLogs,
      });

      const syncUserBootstrap = async () => {
        const { account, privateInfo: priv } = await ensureUserAccountRecords({
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'HealthConnect Member',
          city: pendingCityRef.current,
          emailVerified: fbUser.emailVerified,
        });
        setUserProfile(account);
        setPrivateInfo(priv);
        setAuthError(null);

        if (fbUser.emailVerified) {
          await bootstrapPrimaryProfileIfMissing({
            uid: fbUser.uid,
            displayName: account.displayName,
            city: account.city,
          });
        }

        if (fbUser.emailVerified && account.verifiedRoleStatus === 'active') {
          unsubRole?.();
          unsubRole = subscribeRolePortalStreams(fbUser.uid, account.role, {
            onDoctorAppointments: setDoctorAppointments,
            onSharedBp: setDoctorSharedBp,
            onSharedGlucose: setDoctorSharedGlucose,
            onSharedDocs: setDoctorSharedDocs,
            onHospitalAppointments: setHospitalAppointments,
            onHospitalEmergencies: setHospitalEmergencies,
            onAdminRoleRequests: setAdminRoleRequests,
            onAdminAuditLogs: setAdminAuditLogs,
          });
        }
      };

      try {
        await syncUserBootstrap();
      } catch (err) {
        setAuthError(formatWorkspaceLoadError(err));
        if (typeof window !== 'undefined' && isFirestoreOfflineError(err)) {
          const handleReconnect = () => {
            void syncUserBootstrap().catch(() => undefined);
          };
          window.addEventListener('online', handleReconnect, { once: true });
          removeOnlineListener = () => window.removeEventListener('online', handleReconnect);
        }
      } finally {
        setAuthLoading(false);
        if (
          typeof window !== 'undefined' &&
          (window.location.pathname === '/login' || window.location.pathname === '/register')
        ) {
          if (pendingCheckoutDraftRef.current) {
            setCheckoutDraft(pendingCheckoutDraftRef.current);
            pendingCheckoutDraftRef.current = null;
          }
          const target = pendingPostLoginRouteRef.current || '/dashboard';
          pendingPostLoginRouteRef.current = null;
          setPendingPostLoginRoute(null);
          window.history.replaceState({}, '', target);
          setRoute(target);
        }
      }
    });

    return () => {
      unsubAuth();
      unsubUserDocs?.();
      unsubWorkspace?.();
      unsubRole?.();
      removeOnlineListener?.();
    };
  }, []);

  const isPublicRoute = (target: AppRoute) =>
    target === '/' ||
    target === '/login' ||
    target === '/register' ||
    target === '/payment-response';

  const navigate = (to: AppRoute, hash?: string) => {
    let resolvedTarget: AppRoute = to;
    if (!auth.currentUser && !firebaseUser && !isPublicRoute(to)) {
      pendingPostLoginRouteRef.current = to;
      setPendingPostLoginRoute(to);
      setAuthNotice('Sign in to your HealthConnect account to access this section.');
      resolvedTarget = '/login';
    } else if (to === '/') {
      setAuthNotice(null);
      pendingPostLoginRouteRef.current = null;
      setPendingPostLoginRoute(null);
    }

    if (typeof window !== 'undefined') {
      const targetUrl =
        resolvedTarget === to && hash ? `${resolvedTarget}#${hash}` : resolvedTarget;
      if (window.location.pathname !== resolvedTarget) {
        window.history.pushState({}, '', targetUrl);
      }
    }
    setRoute(resolvedTarget);
    if (resolvedTarget === to && hash) {
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    } else if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const requireVerifiedSession = () => {
    if (!firebaseUser) return false;
    if (!firebaseUser.emailVerified) {
      throw new Error(
        'Email verification is required before saving clinical or account records to Firestore. Check your inbox and click Refresh Verification Status.'
      );
    }
    return true;
  };

  const completePostLoginRedirect = () => {
    setAuthNotice(null);
    if (pendingCheckoutDraftRef.current) {
      setCheckoutDraft(pendingCheckoutDraftRef.current);
      pendingCheckoutDraftRef.current = null;
    }
    const currentPath =
      typeof window !== 'undefined' ? parseRoute(window.location.pathname) : '/';
    const destination =
      pendingPostLoginRouteRef.current ||
      (!isPublicRoute(currentPath) ? currentPath : '/dashboard');
    pendingPostLoginRouteRef.current = null;
    setPendingPostLoginRoute(null);
    if (typeof window !== 'undefined' && window.location.pathname !== destination) {
      window.history.pushState({}, '', destination);
    }
    setRoute(destination);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const signInWithGoogle = async () => {
    // Prevent concurrent signInWithPopup calls, which cancel the active Firebase
    // PopupOperation and can trigger "Pending promise was never set".
    if (googleSignInInFlightRef.current) {
      return googleSignInInFlightRef.current;
    }

    const runSignIn = (async () => {
      setAuthError(null);
      setGoogleSignInPending(true);
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const credential = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
        setFirebaseUser(credential.user);
        completePostLoginRedirect();
      } catch (err) {
        // If the popup closed right as OAuth token exchange succeeded, Firebase Auth may
        // still complete sign-in via onAuthStateChanged; check briefly before surfacing error.
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('Pending promise was never set') || (err as { code?: string })?.code === 'auth/cancelled-popup-request') {
          await new Promise((resolve) => setTimeout(resolve, 200));
          if (auth.currentUser) {
            setFirebaseUser(auth.currentUser);
            completePostLoginRedirect();
            return;
          }
        }
        setAuthError(mapFirebaseAuthError(err));
      } finally {
        googleSignInInFlightRef.current = null;
        setGoogleSignInPending(false);
      }
    })();

    googleSignInInFlightRef.current = runSignIn;
    return runSignIn;
  };

  const signInWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    const now = Date.now();
    if (loginFailureTrackerRef.current.lockedUntil > now) {
      const waitSec = Math.ceil((loginFailureTrackerRef.current.lockedUntil - now) / 1000);
      setAuthError(
        `Too many failed sign-in attempts. Please wait ${waitSec} seconds before trying again.`
      );
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      loginFailureTrackerRef.current = { count: 0, lockedUntil: 0 };
      completePostLoginRedirect();
    } catch (err) {
      const nextCount = loginFailureTrackerRef.current.count + 1;
      loginFailureTrackerRef.current = {
        count: nextCount,
        lockedUntil: nextCount >= 5 ? Date.now() + 30_000 : 0,
      };
      setAuthError(mapFirebaseAuthError(err));
    }
  };

  const signUpWithEmail = async (name: string, email: string, password: string, city: string) => {
    setAuthError(null);
    // Enforce strong password policy (min 8 chars, upper, lower, digit)
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      setAuthError(
        'Please choose a strong password: at least 8 characters including uppercase, lowercase, and a number.'
      );
      return;
    }
    pendingCityRef.current = city || 'Ibadan';
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      await sendEmailVerification(cred.user);
      completePostLoginRedirect();
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    setAuthError(null);
    setAuthNotice(null);
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setAuthError('Enter a valid email address to receive a password reset link.');
      return false;
    }
    try {
      await sendPasswordResetEmail(auth, trimmed);
      setAuthNotice(
        `If an account exists for ${trimmed}, a password reset link has been sent. Check your inbox or spam folder.`
      );
      return true;
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      // Avoid user enumeration by returning the same neutral notice for user-not-found
      if (code === 'auth/user-not-found') {
        setAuthNotice(
          `If an account exists for ${trimmed}, a password reset link has been sent. Check your inbox or spam folder.`
        );
        return true;
      }
      setAuthError(mapFirebaseAuthError(err));
      return false;
    }
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) return;
    setAuthError(null);
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
    }
  };

  const refreshVerificationStatus = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    const verified = auth.currentUser.emailVerified;
    setEmailVerifiedFlag(verified);
    if (verified && userProfile) {
      const refreshed = await ensureUserAccountRecords({
        uid: auth.currentUser.uid,
        email: auth.currentUser.email || '',
        displayName: auth.currentUser.displayName || userProfile.displayName,
        city: userProfile.city,
        emailVerified: true,
      });
      setUserProfile(refreshed.account);
      setPrivateInfo(refreshed.privateInfo);
      setFirebaseUser(auth.currentUser);
    }
    return verified;
  };

  const updatePrivateDetails = async (updates: {
    phone?: string;
    address?: string;
    smsVerified?: boolean;
  }) => {
    if (!firebaseUser) return;
    await updateUserPrivateContact(firebaseUser.uid, updates);
    setPrivateInfo((prev) =>
      prev
        ? {
            ...prev,
            phone: updates.phone ?? prev.phone,
            address: updates.address ?? prev.address,
            smsVerified: updates.smsVerified ?? prev.smsVerified,
          }
        : prev
    );
    if (firebaseUser.emailVerified && userProfile) {
      await writeAuditLog({
        actorUid: firebaseUser.uid,
        actorRole: userProfile.role,
        action: 'UPDATE_PRIVATE_CONTACT',
        targetPath: `users/${firebaseUser.uid}/private/contact`,
        summary: 'Updated private phone or address contact details.',
      });
    }
  };

  const signOut = async () => {
    setAuthError(null);
    setAuthNotice(null);
    setCheckoutDraft(null);
    pendingCheckoutDraftRef.current = null;
    pendingPostLoginRouteRef.current = null;
    setPendingPostLoginRoute(null);
    await firebaseSignOut(auth);
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    setRoute('/');
  };

  const seedDemoWorkspaceForUser = async () => {
    if (!requireVerifiedSession() || !firebaseUser || !userProfile) return;
    const primary = await createFamilyProfileDoc(firebaseUser.uid, {
      fullName: userProfile.displayName,
      relationship: 'Self (Primary)',
      age: 34,
      gender: 'Not specified',
      city: userProfile.city,
      bloodGroup: 'O+',
      genotype: 'AA',
      allergies: ['Penicillin (Mild)'],
      hmoProvider: 'OYSHIA · HealthConnect Oyo State',
    });
    setActiveProfileId(primary.id);
    await createBpReadingDoc(firebaseUser.uid, {
      profileId: primary.id,
      systolic: 120,
      diastolic: 78,
      pulse: 72,
      recordedAt: new Date().toISOString().slice(0, 16),
      note: 'Starter demonstration baseline reading',
      deviceType: 'Omron M3 Upper-Arm Cuff',
    });
    await createGlucoseReadingDoc(firebaseUser.uid, {
      profileId: primary.id,
      valueMgDl: 94,
      context: 'Fasting',
      recordedAt: new Date().toISOString().slice(0, 16),
      note: 'Starter demonstration fasting check',
      deviceType: 'Accu-Chek Active Glucometer',
    });
    await writeAuditLog({
      actorUid: firebaseUser.uid,
      actorRole: userProfile.role,
      action: 'SEED_DEMO_RECORDS',
      targetPath: `familyProfiles/${primary.id}`,
      summary: 'Initialized starter Nigerian health profile and demonstration vitals.',
    });
  };

  const updateMyAccount = async (updates: {
    displayName?: string;
    city?: string;
    facilityOrSpecialty?: string;
    medicalHistory?: string;
  }) => {
    if (!firebaseUser) return;
    await updateUserAccountDoc(firebaseUser.uid, updates);
    setUserProfile((prev) =>
      prev
        ? {
            ...prev,
            displayName: updates.displayName ?? prev.displayName,
            city: updates.city ?? prev.city,
            facilityOrSpecialty: updates.facilityOrSpecialty ?? prev.facilityOrSpecialty,
            medicalHistory: updates.medicalHistory ?? prev.medicalHistory,
          }
        : prev
    );
    if (firebaseUser.emailVerified && userProfile) {
      await writeAuditLog({
        actorUid: firebaseUser.uid,
        actorRole: userProfile.role,
        action: 'UPDATE_USER_ACCOUNT',
        targetPath: `users/${firebaseUser.uid}`,
        summary: 'Updated personal account details or medical history.',
      });
    }
  };

  const updateFamilyProfile = async (
    profileId: string,
    updates: Partial<Omit<FamilyProfile, 'id' | 'ownerUid' | 'demoMemberId'>>
  ) => {
    if (!firebaseUser) {
      setFamilyProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, ...updates } : p))
      );
      return;
    }
    requireVerifiedSession();
    await updateFamilyProfileDoc(profileId, updates);
    const target = familyProfiles.find((p) => p.id === profileId);
    if (target?.relationship === 'Self (Primary)' && (updates.fullName || updates.city)) {
      await updateMyAccount({
        displayName: updates.fullName ?? undefined,
        city: updates.city ?? undefined,
      });
    }
    if (userProfile) {
      await writeAuditLog({
        actorUid: firebaseUser.uid,
        actorRole: userProfile.role,
        action: 'UPDATE_FAMILY_PROFILE',
        targetPath: `familyProfiles/${profileId}`,
        summary: `Updated health profile details${updates.fullName ? ` for ${updates.fullName}` : ''}.`,
      });
    }
  };

  const derivedSubscription: ActiveSubscription = (() => {
    if (!firebaseUser) {
      return storedSubscription || GUEST_DEFAULT_SUBSCRIPTION;
    }
    const latestPaidSub = transactions.find(
      (tx) =>
        tx.category === 'Subscription' &&
        (tx.status === 'Verified' ||
          tx.status === 'Paid via Wallet' ||
          tx.status === 'Paid (Demo Sandbox)')
    );
    if (latestPaidSub) {
      const isFamily =
        latestPaidSub.amountNgn >= 50000 ||
        latestPaidSub.description.toLowerCase().includes('family');
      const plan = getPlanById(
        isFamily ? 'plan-oyo-family-monthly' : 'plan-oyo-individual-monthly'
      );
      return {
        planId: plan.id,
        planName: plan.name,
        monthlyPriceNgn: plan.priceNgn,
        maxProfiles: plan.maxProfiles,
        status: 'Active',
        renewsOn: computeRenewalDateIso(latestPaidSub.date),
        lastPaymentRef: latestPaidSub.reference,
      };
    }
    if (storedSubscription && storedSubscription.status === 'Active') {
      return storedSubscription;
    }
    const latestPendingSub = transactions.find(
      (tx) => tx.category === 'Subscription' && tx.status === 'Pending Verification'
    );
    if (latestPendingSub) {
      const isFamily =
        latestPendingSub.amountNgn >= 50000 ||
        latestPendingSub.description.toLowerCase().includes('family');
      const plan = getPlanById(
        isFamily ? 'plan-oyo-family-monthly' : 'plan-oyo-individual-monthly'
      );
      return {
        planId: plan.id,
        planName: plan.name,
        monthlyPriceNgn: plan.priceNgn,
        maxProfiles: plan.maxProfiles,
        status: 'Pending',
        renewsOn: computeRenewalDateIso(latestPendingSub.date),
        lastPaymentRef: latestPendingSub.reference,
      };
    }
    return INACTIVE_SUBSCRIPTION;
  })();

  const persistSubscriptionLocal = (sub: ActiveSubscription) => {
    setStoredSubscription(sub);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(sub));
      } catch {
        // Ignore storage quota errors
      }
    }
  };

  const addFamilyProfile = async (profile: Omit<FamilyProfile, 'id' | 'demoMemberId'>) => {
    const seatLimit = derivedSubscription.maxProfiles;
    if (familyProfiles.length >= 5) {
      throw new Error(
        'Maximum of 5 family profiles reached on the HealthConnect Oyo State Family Plan.'
      );
    }
    if (firebaseUser && seatLimit < 5 && familyProfiles.length >= seatLimit) {
      throw new Error(
        'Your current plan supports 1 profile. Upgrade to the Family Plan (₦50,000/month) on the Subscription Checkout page to unlock up to 5 Netflix-style family profiles.'
      );
    }
    if (!firebaseUser) {
      const nextId = `prof-${Date.now()}`;
      const num = Math.floor(1000 + Math.random() * 9000);
      setFamilyProfiles((prev) => [
        ...prev,
        { ...profile, id: nextId, demoMemberId: `HC-OYO-2026-${num}` },
      ]);
      setActiveProfileId(nextId);
      return;
    }
    requireVerifiedSession();
    const created = await createFamilyProfileDoc(firebaseUser.uid, profile);
    setActiveProfileId(created.id);
    if (userProfile) {
      await writeAuditLog({
        actorUid: firebaseUser.uid,
        actorRole: userProfile.role,
        action: 'CREATE_FAMILY_PROFILE',
        targetPath: `familyProfiles/${created.id}`,
        summary: `Added family profile (${created.relationship}).`,
      });
    }
  };

  const bookOnlineConsultation = async (meta: {
    doctorId: string;
    doctorName: string;
    specialty: string;
    facilityName: string;
    city: string;
    date: string;
    time: string;
    reason?: string;
  }): Promise<Appointment> => {
    const ref = `OYO-ONL-${Date.now().toString().slice(-5)}`;
    const notes = meta.reason?.trim()
      ? `Online doctor consultation (included in Oyo subscription). Concern: ${meta.reason.trim()}. Doctor and patient will decide if an in-person physical exam is needed.`
      : 'Online doctor consultation (included in HealthConnect Oyo State subscription). Doctor and patient decide together when to schedule an in-person physical exam.';

    const base: Omit<Appointment, 'id' | 'patientUid'> = {
      profileId: activeProfileId || familyProfiles[0]?.id || 'default',
      doctorId: meta.doctorId,
      doctorName: meta.doctorName,
      specialty: meta.specialty,
      facilityName: meta.facilityName,
      city: meta.city || 'Ibadan',
      date: meta.date,
      time: meta.time,
      mode: 'Video Telehealth',
      status: 'Confirmed',
      feeNgn: 0,
      reference: ref,
      clinicalNotes: notes,
    };

    let created: Appointment;
    if (firebaseUser && firebaseUser.emailVerified) {
      created = await createAppointmentDoc(firebaseUser.uid, base);
      if (userProfile) {
        await writeAuditLog({
          actorUid: firebaseUser.uid,
          actorRole: userProfile.role,
          action: 'BOOK_ONLINE_CONSULTATION',
          targetPath: `appointments/${created.id}`,
          summary: `Booked subscription-included online consultation with ${created.doctorName} (${ref}).`,
        });
      }
    } else {
      created = { ...base, id: `apt-${Date.now()}` };
      setAppointments((prev) => [created, ...prev]);
    }

    setNotifications((prev) => [
      {
        id: `not-${Date.now()}`,
        title: 'Online Doctor Consultation Confirmed',
        detail: `${created.doctorName} · ${created.date} at ${created.time} (Included in Oyo subscription).`,
        time: 'Just now',
        read: false,
      },
      ...prev,
    ]);
    return created;
  };

  const bookPhysicalExamFollowUp = async (params: {
    parentAppointment: Appointment;
    facilityName: string;
    city: string;
    date: string;
    time: string;
    notes?: string;
  }): Promise<Appointment> => {
    const ref = `OYO-PHY-${Date.now().toString().slice(-5)}`;
    const clinicalNotes = [
      `Doctor-booked physical examination at ${params.facilityName} following online consultation (${params.parentAppointment.reference}).`,
      params.notes?.trim() ? `Exam notes: ${params.notes.trim()}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const base: Omit<Appointment, 'id' | 'patientUid'> = {
      profileId: params.parentAppointment.profileId || activeProfileId || 'default',
      doctorId: params.parentAppointment.doctorId,
      doctorName: params.parentAppointment.doctorName,
      specialty: params.parentAppointment.specialty,
      facilityName: params.facilityName,
      city: params.city || 'Ibadan',
      date: params.date,
      time: params.time,
      mode: 'In-Person',
      status: 'Confirmed',
      feeNgn: 0,
      reference: ref,
      clinicalNotes,
    };

    let created: Appointment;
    if (firebaseUser && firebaseUser.emailVerified) {
      created = await createAppointmentDoc(firebaseUser.uid, base);
      if (userProfile) {
        await writeAuditLog({
          actorUid: firebaseUser.uid,
          actorRole: userProfile.role,
          action: 'BOOK_PHYSICAL_EXAM_FOLLOWUP',
          targetPath: `appointments/${created.id}`,
          summary: `Scheduled in-person physical exam at ${created.facilityName} with ${created.doctorName} (${ref}).`,
        });
      }
    } else {
      created = { ...base, id: `apt-${Date.now()}` };
      setAppointments((prev) => [created, ...prev]);
    }

    setNotifications((prev) => [
      {
        id: `not-${Date.now()}`,
        title: 'Physical Examination Scheduled',
        detail: `${created.facilityName} with ${created.doctorName} · ${created.date} at ${created.time}.`,
        time: 'Just now',
        read: false,
      },
      ...prev,
    ]);
    return created;
  };

  const addBpReading = async (reading: Omit<BloodPressureReading, 'id'>) => {
    if (!firebaseUser) {
      setBpReadings((prev) => [{ ...reading, id: `bp-${Date.now()}` }, ...prev]);
      return;
    }
    requireVerifiedSession();
    const created = await createBpReadingDoc(firebaseUser.uid, reading);
    if (userProfile) {
      await writeAuditLog({
        actorUid: firebaseUser.uid,
        actorRole: userProfile.role,
        action: 'LOG_BLOOD_PRESSURE',
        targetPath: `bpReadings/${created.id}`,
        summary: `Logged BP ${created.systolic}/${created.diastolic} mmHg.`,
      });
    }
  };

  const addGlucoseReading = async (reading: Omit<GlucoseReading, 'id'>) => {
    if (!firebaseUser) {
      setGlucoseReadings((prev) => [{ ...reading, id: `glu-${Date.now()}` }, ...prev]);
      return;
    }
    requireVerifiedSession();
    const created = await createGlucoseReadingDoc(firebaseUser.uid, reading);
    if (userProfile) {
      await writeAuditLog({
        actorUid: firebaseUser.uid,
        actorRole: userProfile.role,
        action: 'LOG_GLUCOSE',
        targetPath: `glucoseReadings/${created.id}`,
        summary: `Logged glucose ${created.valueMgDl} mg/dL (${created.context}).`,
      });
    }
  };

  const addMedicalDocument = async (docInput: Omit<MedicalDocument, 'id'>) => {
    if (!firebaseUser) {
      setDocuments((prev) => [{ ...docInput, id: `doc-${Date.now()}` }, ...prev]);
      return;
    }
    requireVerifiedSession();
    const created = await createMedicalDocumentDoc(firebaseUser.uid, docInput);
    if (userProfile) {
      await writeAuditLog({
        actorUid: firebaseUser.uid,
        actorRole: userProfile.role,
        action: 'ADD_MEDICAL_DOCUMENT',
        targetPath: `medicalDocuments/${created.id}`,
        summary: `Added ${created.category}: ${created.title}.`,
      });
    }
  };

  const saveAiConsultation = async (
    consultation: Omit<AiConsultation, 'id' | 'ownerUid' | 'createdAt'>
  ): Promise<AiConsultation> => {
    if (!firebaseUser) {
      const localRecord: AiConsultation = {
        ...consultation,
        id: `aicon-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setAiConsultations((prev) => [localRecord, ...prev]);
      return localRecord;
    }
    requireVerifiedSession();
    const created = await createAiConsultationDoc(firebaseUser.uid, consultation);
    if (userProfile) {
      await writeAuditLog({
        actorUid: firebaseUser.uid,
        actorRole: userProfile.role,
        action: 'SAVE_AI_CONSULTATION',
        targetPath: `aiConsultations/${created.id}`,
        summary: `Saved AI consultation summary: ${created.topic}.`,
      });
    }
    return created;
  };

  const deleteAiConsultation = async (consultationId: string) => {
    if (!firebaseUser) {
      setAiConsultations((prev) => prev.filter((item) => item.id !== consultationId));
      return;
    }
    requireVerifiedSession();
    await deleteAiConsultationDoc(consultationId);
    if (userProfile) {
      await writeAuditLog({
        actorUid: firebaseUser.uid,
        actorRole: userProfile.role,
        action: 'DELETE_AI_CONSULTATION',
        targetPath: `aiConsultations/${consultationId}`,
        summary: 'Removed AI consultation summary from history.',
      });
    }
  };

  const shareRecordWithDoctor = async (
    kind: 'bp' | 'glucose' | 'document',
    recordId: string,
    doctorUid: string
  ) => {
    if (!requireVerifiedSession() || !firebaseUser || !userProfile) return;
    if (kind === 'bp') {
      await shareBpReadingWithDoctor(recordId, doctorUid);
    } else if (kind === 'glucose') {
      await shareGlucoseReadingWithDoctor(recordId, doctorUid);
    } else {
      await shareMedicalDocumentWithDoctor(recordId, doctorUid);
    }
    await writeAuditLog({
      actorUid: firebaseUser.uid,
      actorRole: userProfile.role,
      action: 'SHARE_RECORD_WITH_DOCTOR',
      targetPath: `${kind}/${recordId}`,
      summary: `Granted read consent for ${kind} record to doctor UID ${doctorUid}.`,
    });
  };

  const addEmergencyContact = async (contact: Omit<EmergencyContact, 'id'>) => {
    if (!firebaseUser) {
      setEmergencyContacts((prev) => [...prev, { ...contact, id: `ec-${Date.now()}` }]);
      return;
    }
    requireVerifiedSession();
    const created = await createEmergencyContactDoc(firebaseUser.uid, contact);
    if (userProfile) {
      await writeAuditLog({
        actorUid: firebaseUser.uid,
        actorRole: userProfile.role,
        action: 'ADD_EMERGENCY_CONTACT',
        targetPath: `emergencyContacts/${created.id}`,
        summary: `Saved emergency contact ${created.name}.`,
      });
    }
  };

  const walletBalanceNgn = walletTransactions.reduce(
    (sum, entry) => (entry.type === 'credit' ? sum + entry.amountNgn : sum - entry.amountNgn),
    0
  );

  const rescheduleOrCancelAppointment = async (
    appointmentId: string,
    status: 'Rescheduled' | 'Cancelled',
    date: string,
    time: string
  ): Promise<{ refundedAmountNgn: number; walletReference?: string }> => {
    const targetAppointment = appointments.find((a) => a.id === appointmentId);

    if (!firebaseUser) {
      let refundedAmountNgn = 0;
      let walletReference: string | undefined;

      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status, date, time } : a))
      );

      if (
        status === 'Cancelled' &&
        targetAppointment &&
        (targetAppointment.status === 'Confirmed' || targetAppointment.status === 'Rescheduled') &&
        targetAppointment.feeNgn > 0 &&
        !walletTransactions.some((w) => w.relatedAppointmentId === appointmentId)
      ) {
        refundedAmountNgn = Math.round(targetAppointment.feeNgn);
        walletReference = `WAL-REF-${targetAppointment.reference.slice(-8)}`;
        const entry: WalletTransaction = {
          id: `wref-${appointmentId}`,
          type: 'credit',
          source: 'Appointment Refund',
          amountNgn: refundedAmountNgn,
          description: `Refund for cancelled consultation · ${targetAppointment.doctorName} (${targetAppointment.reference})`,
          reference: walletReference,
          relatedAppointmentId: appointmentId,
          date: new Date().toISOString().slice(0, 10),
          createdAt: new Date().toISOString(),
        };
        setWalletTransactions((prev) => [entry, ...prev]);
      }

      return { refundedAmountNgn, walletReference };
    }

    requireVerifiedSession();

    if (status === 'Cancelled' && targetAppointment) {
      const { refundedAmountNgn, walletEntry } = await cancelAppointmentWithWalletRefund(
        firebaseUser.uid,
        targetAppointment,
        date,
        time
      );

      if (refundedAmountNgn > 0) {
        setNotifications((prev) => [
          {
            id: `not-${Date.now()}`,
            title: 'Appointment Refund Credited to Wallet',
            detail: `${formatNaira(refundedAmountNgn)} refunded for cancelled visit with ${targetAppointment.doctorName} (${walletEntry?.reference || targetAppointment.reference}).`,
            time: 'Just now',
            read: false,
          },
          ...prev,
        ]);
      }

      if (userProfile) {
        await writeAuditLog({
          actorUid: firebaseUser.uid,
          actorRole: userProfile.role,
          action: refundedAmountNgn > 0 ? 'APPOINTMENT_CANCELLED_WALLET_REFUND' : 'PATIENT_UPDATE_APPOINTMENT',
          targetPath: `appointments/${appointmentId}`,
          summary:
            refundedAmountNgn > 0
              ? `Cancelled appointment and refunded ${formatNaira(refundedAmountNgn)} to wallet (${walletEntry?.reference}).`
              : `Patient cancelled unpaid appointment (${date} ${time}).`,
        });
      }

      return { refundedAmountNgn, walletReference: walletEntry?.reference };
    }

    await updateAppointmentByPatient(appointmentId, status, date, time);
    if (userProfile) {
      await writeAuditLog({
        actorUid: firebaseUser.uid,
        actorRole: userProfile.role,
        action: 'PATIENT_UPDATE_APPOINTMENT',
        targetPath: `appointments/${appointmentId}`,
        summary: `Patient marked appointment ${status} (${date} ${time}).`,
      });
    }
    return { refundedAmountNgn: 0 };
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleReminder = async (id: string) => {
    const target = reminders.find((r) => r.id === id);
    if (!target) return;
    const nextEnabled = !target.enabled;
    if (!firebaseUser) {
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled: nextEnabled } : r))
      );
      return;
    }
    requireVerifiedSession();
    await updateMedicationReminderStatusDoc(id, nextEnabled);
    if (userProfile) {
      await writeAuditLog({
        actorUid: firebaseUser.uid,
        actorRole: userProfile.role,
        action: 'TOGGLE_MEDICATION_REMINDER',
        targetPath: `medicationReminders/${id}`,
        summary: `${nextEnabled ? 'Enabled' : 'Paused'} reminder: ${target.title}.`,
      });
    }
  };

  const addReminder = async (reminder: NewReminderInput) => {
    const category: ReminderCategory = reminder.category || reminder.type || 'Medication';
    const frequency: ReminderFrequency = reminder.frequency || 'Daily';
    const extractedTime =
      reminder.timeOfDay ||
      reminder.schedule?.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/)?.[0] ||
      '08:00';
    const timeOfDay = extractedTime.length === 4 ? `0${extractedTime}` : extractedTime;
    const schedule = reminder.schedule?.trim() || `${frequency} · ${timeOfDay} WAT`;
    const profileId = reminder.profileId || activeProfileId || familyProfiles[0]?.id || 'default';

    if (!firebaseUser) {
      const localItem: MedicationReminder = {
        id: `rem-${Date.now()}`,
        profileId,
        title: reminder.title.trim(),
        dosage: reminder.dosage?.trim() || undefined,
        category,
        type: category,
        timeOfDay,
        frequency,
        schedule,
        notes: reminder.notes?.trim() || undefined,
        enabled: true,
      };
      setReminders((prev) =>
        [...prev, localItem].sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay))
      );
      return;
    }

    requireVerifiedSession();
    const created = await createMedicationReminderDoc(firebaseUser.uid, {
      profileId,
      title: reminder.title.trim(),
      dosage: reminder.dosage?.trim(),
      category,
      timeOfDay,
      frequency,
      schedule,
      notes: reminder.notes?.trim(),
      enabled: true,
    });
    if (userProfile) {
      await writeAuditLog({
        actorUid: firebaseUser.uid,
        actorRole: userProfile.role,
        action: 'CREATE_MEDICATION_REMINDER',
        targetPath: `medicationReminders/${created.id}`,
        summary: `Scheduled ${created.category} reminder: ${created.title} (${created.schedule}).`,
      });
    }
  };

  const markReminderTaken = async (id: string, dateIso: string) => {
    const target = reminders.find((r) => r.id === id);
    if (!target) return;
    const nextDate = target.lastTakenDate === dateIso ? '' : dateIso;
    if (!firebaseUser) {
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, lastTakenDate: nextDate } : r))
      );
      return;
    }
    requireVerifiedSession();
    await markMedicationReminderTakenDoc(id, nextDate);
  };

  const deleteReminder = async (id: string) => {
    const target = reminders.find((r) => r.id === id);
    if (!firebaseUser) {
      setReminders((prev) => prev.filter((r) => r.id !== id));
      return;
    }
    requireVerifiedSession();
    await deleteMedicationReminderDoc(id);
    if (userProfile) {
      await writeAuditLog({
        actorUid: firebaseUser.uid,
        actorRole: userProfile.role,
        action: 'DELETE_MEDICATION_REMINDER',
        targetPath: `medicationReminders/${id}`,
        summary: `Deleted reminder: ${target?.title || id}.`,
      });
    }
  };

  const openSubscriptionCheckout = (planId?: SubscriptionPlanId) => {
    if (planId) {
      setSelectedCheckoutPlanId(planId);
    }
    navigate('/checkout');
  };

  const recordSubscriptionPayment = async (params: {
    planId: SubscriptionPlanId;
    reference: string;
    method: TransactionRecord['method'];
    amountNgn: number;
    status: 'Verified' | 'Pending Verification' | 'Paid via Wallet';
  }): Promise<TransactionRecord> => {
    const existing = transactions.find((tx) => tx.reference === params.reference);
    const plan = getPlanById(params.planId);
    const todayIso = new Date().toISOString().slice(0, 10);

    if (params.status === 'Verified' || params.status === 'Paid via Wallet') {
      persistSubscriptionLocal({
        planId: plan.id,
        planName: plan.name,
        monthlyPriceNgn: plan.priceNgn,
        maxProfiles: plan.maxProfiles,
        status: 'Active',
        renewsOn: computeRenewalDateIso(todayIso),
        lastPaymentRef: params.reference,
      });
    }

    if (existing) {
      return existing;
    }

    const txBase: Omit<TransactionRecord, 'id'> = {
      reference: params.reference,
      description: `${plan.name} — Monthly Subscription`,
      category: 'Subscription',
      amountNgn: params.amountNgn,
      date: todayIso,
      method: params.method,
      status: params.status,
    };

    let transaction: TransactionRecord;
    if (firebaseUser && firebaseUser.emailVerified) {
      transaction = await createTransactionDoc(firebaseUser.uid, txBase);
      if (userProfile) {
        await writeAuditLog({
          actorUid: firebaseUser.uid,
          actorRole: userProfile.role,
          action: 'SUBSCRIPTION_PAYMENT_RECORDED',
          targetPath: `transactions/${transaction.id}`,
          summary: `${plan.shortName} · ${formatNaira(params.amountNgn)} (${params.reference}) [${params.status}].`,
        });
      }
    } else {
      transaction = { ...txBase, id: `tx-${Date.now()}` };
      setTransactions((prev) => [transaction, ...prev]);
    }

    setNotifications((prev) => [
      {
        id: `not-${Date.now()}`,
        title:
          params.status === 'Pending Verification'
            ? 'Subscription Payment Pending Confirmation'
            : `${plan.shortName} Activated`,
        detail: `${plan.name} · ${formatNaira(params.amountNgn)} (${params.reference})`,
        time: 'Just now',
        read: false,
      },
      ...prev,
    ]);

    return transaction;
  };

  const paySubscriptionWithWallet = async (
    planId: SubscriptionPlanId
  ): Promise<TransactionRecord> => {
    const plan = getPlanById(planId);
    if (walletBalanceNgn < plan.priceNgn) {
      throw new Error(
        `Insufficient wallet balance (${formatNaira(walletBalanceNgn)} available; ${formatNaira(plan.priceNgn)} required). Use Interswitch Checkout instead.`
      );
    }
    const ref = `WAL-SUB-${Date.now().toString().slice(-8)}`;
    const todayIso = new Date().toISOString().slice(0, 10);

    if (firebaseUser && firebaseUser.emailVerified) {
      await createWalletTransactionDoc(firebaseUser.uid, {
        type: 'debit',
        source: 'Subscription Payment',
        amountNgn: plan.priceNgn,
        description: `${plan.name} — Monthly Subscription`,
        reference: ref,
        date: todayIso,
      });
    } else {
      setWalletTransactions((prev) => [
        {
          id: `wal-${Date.now()}`,
          type: 'debit',
          source: 'Subscription Payment',
          amountNgn: plan.priceNgn,
          description: `${plan.name} — Monthly Subscription`,
          reference: ref,
          date: todayIso,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    }

    return await recordSubscriptionPayment({
      planId,
      reference: ref,
      method: 'HealthConnect Wallet',
      amountNgn: plan.priceNgn,
      status: 'Paid via Wallet',
    });
  };

  // Subscription-only policy: route any legacy checkout triggers straight to the dedicated /checkout page
  const openCheckout = (draft: CheckoutDraft) => {
    const inferredPlan: SubscriptionPlanId =
      draft.orderId === 'plan-oyo-family-monthly' ||
      draft.amountNgn >= 50000 ||
      draft.title.toLowerCase().includes('family')
        ? 'plan-oyo-family-monthly'
        : 'plan-oyo-individual-monthly';
    openSubscriptionCheckout(inferredPlan);
  };
  const closeCheckout = () => setCheckoutDraft(null);

  const completeDemoPayment = async (method: TransactionRecord['method']) => {
    if (!auth.currentUser && !firebaseUser) {
      throw new Error('Please sign in to your HealthConnect account before making a payment.');
    }
    if (!checkoutDraft) {
      throw new Error('No active checkout item');
    }

    const isWalletPayment = method === 'HealthConnect Wallet';
    const isWalletTopUp = checkoutDraft.category === 'Wallet Top-Up';

    if (isWalletPayment && isWalletTopUp) {
      throw new Error('Select an Interswitch card, bank transfer, or USSD channel to top up your wallet.');
    }
    if (isWalletPayment && walletBalanceNgn < checkoutDraft.amountNgn) {
      throw new Error(
        `Insufficient HealthConnect Wallet balance (${formatNaira(walletBalanceNgn)} available; ${formatNaira(checkoutDraft.amountNgn)} required).`
      );
    }

    let ref = isWalletPayment
      ? `WAL-PAY-${Date.now().toString().slice(-8)}`
      : `ISW-NG-${Date.now().toString().slice(-8)}`;
    let paymentMessage = isWalletPayment
      ? `Paid ${formatNaira(checkoutDraft.amountNgn)} instantly using your HealthConnect Wallet balance.`
      : isWalletTopUp
        ? `${formatNaira(checkoutDraft.amountNgn)} credited to your HealthConnect Wallet for future bookings.`
        : 'Interswitch sandbox transaction recorded locally (merchant keys not configured).';

    if (firebaseUser && method !== 'HealthConnect Wallet') {
      try {
        const initRes = await initializeInterswitchCheckout({
          amountNgn: checkoutDraft.amountNgn,
          category: checkoutDraft.category,
          description: checkoutDraft.title,
          method,
        });
        ref = initRes.reference;
        if (!isWalletTopUp) {
          paymentMessage = initRes.message;
        }
      } catch (err) {
        if (!isWalletTopUp) {
          paymentMessage =
            err instanceof Error
              ? err.message
              : 'Interswitch backend unavailable; recorded sandbox reference.';
        }
      }
    }

    const txBase: Omit<TransactionRecord, 'id'> = {
      reference: ref,
      description: checkoutDraft.title,
      category: checkoutDraft.category,
      amountNgn: checkoutDraft.amountNgn,
      date: new Date().toISOString().slice(0, 10),
      method,
      status: isWalletPayment
        ? 'Paid via Wallet'
        : integrationStatus.interswitchConfigured
          ? 'Pending Verification'
          : 'Paid (Demo Sandbox)',
    };

    const walletDebitSourceMap: Record<
      Exclude<TransactionRecord['category'], 'Wallet Top-Up'>,
      Exclude<WalletTransactionSource, 'Appointment Refund' | 'Wallet Top-Up'>
    > = {
      Subscription: 'Subscription Payment',
      Consultation: 'Consultation Payment',
      Laboratory: 'Laboratory Payment',
      Pharmacy: 'Pharmacy Payment',
      'Equipment Rental': 'Equipment Rental Payment',
    };

    let transaction: TransactionRecord;
    let createdAppointment: Appointment | undefined;

    if (firebaseUser && firebaseUser.emailVerified) {
      if (isWalletPayment && checkoutDraft.category !== 'Wallet Top-Up') {
        await createWalletTransactionDoc(firebaseUser.uid, {
          type: 'debit',
          source: walletDebitSourceMap[checkoutDraft.category],
          amountNgn: checkoutDraft.amountNgn,
          description: checkoutDraft.title,
          reference: ref,
          date: txBase.date,
        });
      } else if (isWalletTopUp) {
        await createWalletTransactionDoc(firebaseUser.uid, {
          type: 'credit',
          source: 'Wallet Top-Up',
          amountNgn: checkoutDraft.amountNgn,
          description: `Wallet top-up via ${method}`,
          reference: ref,
          date: txBase.date,
        });
      }

      transaction = await createTransactionDoc(firebaseUser.uid, txBase);
      if (checkoutDraft.appointmentMeta) {
        createdAppointment = await createAppointmentDoc(firebaseUser.uid, {
          profileId: activeProfileId || 'default',
          ...checkoutDraft.appointmentMeta,
          status:
            isWalletPayment || !integrationStatus.interswitchConfigured
              ? 'Confirmed'
              : 'Pending Payment',
          feeNgn: checkoutDraft.amountNgn,
          reference: `HCA-APT-${Date.now().toString().slice(-5)}`,
        });
      }
      if (userProfile) {
        await writeAuditLog({
          actorUid: firebaseUser.uid,
          actorRole: userProfile.role,
          action: isWalletPayment
            ? 'WALLET_PAYMENT_RECORDED'
            : isWalletTopUp
              ? 'WALLET_TOPUP_RECORDED'
              : 'CHECKOUT_RECORDED',
          targetPath: `transactions/${transaction.id}`,
          summary: `${checkoutDraft.title} · ${formatNaira(checkoutDraft.amountNgn)} (${ref}).`,
        });
      }
    } else {
      if (isWalletPayment && checkoutDraft.category !== 'Wallet Top-Up') {
        setWalletTransactions((prev) => [
          {
            id: `wal-${Date.now()}`,
            type: 'debit',
            source: walletDebitSourceMap[checkoutDraft.category as Exclude<TransactionRecord['category'], 'Wallet Top-Up'>],
            amountNgn: checkoutDraft.amountNgn,
            description: checkoutDraft.title,
            reference: ref,
            date: txBase.date,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      } else if (isWalletTopUp) {
        setWalletTransactions((prev) => [
          {
            id: `wal-${Date.now()}`,
            type: 'credit',
            source: 'Wallet Top-Up',
            amountNgn: checkoutDraft.amountNgn,
            description: `Wallet top-up via ${method}`,
            reference: ref,
            date: txBase.date,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }

      transaction = { ...txBase, id: `tx-${Date.now()}` };
      setTransactions((prev) => [transaction, ...prev]);
      if (checkoutDraft.appointmentMeta) {
        createdAppointment = {
          id: `apt-${Date.now()}`,
          profileId: activeProfileId || 'default',
          ...checkoutDraft.appointmentMeta,
          status: 'Confirmed',
          feeNgn: checkoutDraft.amountNgn,
          reference: `HCA-APT-${Date.now().toString().slice(-5)}`,
        };
        setAppointments((prev) => [createdAppointment!, ...prev]);
      }
    }

    setNotifications((prev) => [
      {
        id: `not-${Date.now()}`,
        title: isWalletPayment
          ? 'Paid via HealthConnect Wallet'
          : isWalletTopUp
            ? 'Wallet Top-Up Credited'
            : integrationStatus.interswitchConfigured
              ? 'Interswitch Checkout Initiated'
              : 'Demo Sandbox Payment Recorded',
        detail: `${checkoutDraft.title} · ${formatNaira(checkoutDraft.amountNgn)} (${ref})`,
        time: 'Just now',
        read: false,
      },
      ...prev,
    ]);

    return { transaction, appointment: createdAppointment, paymentMessage };
  };

  const recordVerifiedInterswitchPayment = async (params: {
    reference: string;
    method: TransactionRecord['method'];
    amountNgn: number;
    paymentMessage: string;
  }): Promise<{ transaction: TransactionRecord; appointment?: Appointment; paymentMessage: string }> => {
    if (!checkoutDraft) {
      throw new Error('No active checkout draft.');
    }
    const isWalletTopUp = checkoutDraft.category === 'Wallet Top-Up';
    const txBase: Omit<TransactionRecord, 'id'> = {
      reference: params.reference,
      description: checkoutDraft.title,
      category: checkoutDraft.category,
      amountNgn: params.amountNgn,
      date: new Date().toISOString().slice(0, 10),
      method: params.method,
      status: 'Verified',
    };

    let transaction: TransactionRecord;
    let createdAppointment: Appointment | undefined;

    if (firebaseUser && firebaseUser.emailVerified) {
      if (isWalletTopUp) {
        await createWalletTransactionDoc(firebaseUser.uid, {
          type: 'credit',
          source: 'Wallet Top-Up',
          amountNgn: params.amountNgn,
          description: `Verified Interswitch wallet top-up (${params.reference})`,
          reference: params.reference,
          date: txBase.date,
        });
      }
      transaction = await createTransactionDoc(firebaseUser.uid, txBase);
      if (checkoutDraft.appointmentMeta) {
        createdAppointment = await createAppointmentDoc(firebaseUser.uid, {
          profileId: activeProfileId || 'default',
          ...checkoutDraft.appointmentMeta,
          status: 'Confirmed',
          feeNgn: params.amountNgn,
          reference: `HCA-OYO-${Date.now().toString().slice(-5)}`,
        });
      }
      if (userProfile) {
        await writeAuditLog({
          actorUid: firebaseUser.uid,
          actorRole: userProfile.role,
          action: 'INTERSWITCH_PAYMENT_VERIFIED',
          targetPath: `transactions/${transaction.id}`,
          summary: `Verified Interswitch payment ${params.reference} for ${formatNaira(params.amountNgn)}.`,
        });
      }
    } else {
      transaction = { ...txBase, id: `tx-${Date.now()}` };
      setTransactions((prev) => [transaction, ...prev]);
      if (isWalletTopUp) {
        setWalletTransactions((prev) => [
          {
            id: `wal-${Date.now()}`,
            type: 'credit',
            source: 'Wallet Top-Up',
            amountNgn: params.amountNgn,
            description: `Verified Interswitch wallet top-up (${params.reference})`,
            reference: params.reference,
            date: txBase.date,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      if (checkoutDraft.appointmentMeta) {
        createdAppointment = {
          id: `apt-${Date.now()}`,
          profileId: activeProfileId || 'default',
          ...checkoutDraft.appointmentMeta,
          status: 'Confirmed',
          feeNgn: params.amountNgn,
          reference: `HCA-OYO-${Date.now().toString().slice(-5)}`,
        };
        setAppointments((prev) => [createdAppointment!, ...prev]);
      }
    }

    setNotifications((prev) => [
      {
        id: `not-${Date.now()}`,
        title: 'Interswitch Payment Verified',
        detail: `${checkoutDraft.title} · ${formatNaira(params.amountNgn)} (${params.reference})`,
        time: 'Just now',
        read: false,
      },
      ...prev,
    ]);

    return {
      transaction,
      appointment: createdAppointment,
      paymentMessage: params.paymentMessage,
    };
  };

  const submitEmergencyRequest = async (
    payload: Omit<EmergencyRequest, 'id' | 'stage' | 'createdAt'>
  ) => {
    if (!firebaseUser) {
      setActiveEmergency({
        ...payload,
        id: `EMG-${Date.now().toString().slice(-6)}`,
        stage: 'submitted',
        createdAt: new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }),
      });
      return;
    }
    requireVerifiedSession();
    const created = await createEmergencyRequestDoc(firebaseUser.uid, payload);
    setActiveEmergency(created);
    if (userProfile) {
      await writeAuditLog({
        actorUid: firebaseUser.uid,
        actorRole: userProfile.role,
        action: 'EMERGENCY_SUBMITTED',
        targetPath: `emergencyRequests/${created.id}`,
        summary: `${created.type} routed to ${created.assignedHospital}.`,
      });
    }
  };

  const advanceEmergencyStage = async (stage: EmergencyRequest['stage']) => {
    if (!activeEmergency) return;
    if (!firebaseUser) {
      setActiveEmergency((prev) => (prev ? { ...prev, stage } : null));
      return;
    }
    requireVerifiedSession();
    if (stage === 'resolved') {
      await resolveEmergencyByPatient(activeEmergency.id);
      if (userProfile) {
        await writeAuditLog({
          actorUid: firebaseUser.uid,
          actorRole: userProfile.role,
          action: 'EMERGENCY_RESOLVED_BY_PATIENT',
          targetPath: `emergencyRequests/${activeEmergency.id}`,
          summary: 'Patient marked submitted emergency request as resolved.',
        });
      }
      return;
    }
    // Only verified hospitals/admins can advance to accepted/dispatched in Firestore
    if (userProfile?.role === 'hospital' || userProfile?.role === 'administrator') {
      await updateEmergencyStageByHospital(activeEmergency.id, firebaseUser.uid, stage as 'accepted' | 'dispatched');
    } else {
      throw new Error(
        'Only a verified partner Hospital account or Administrator can confirm hospital triage acceptance or dispatch in Firestore.'
      );
    }
  };

  const clearEmergencyRequest = () => setActiveEmergency(null);

  const submitRoleRequest = async (payload: {
    requestedRole: 'doctor' | 'hospital';
    licenseRef: string;
    organization: string;
  }) => {
    if (!requireVerifiedSession() || !firebaseUser || !userProfile) {
      throw new Error('Sign in with a verified account to submit a professional verification request.');
    }
    const req = await submitRoleVerificationRequest({
      uid: firebaseUser.uid,
      applicantName: userProfile.displayName,
      requestedRole: payload.requestedRole,
      licenseRef: payload.licenseRef,
      organization: payload.organization,
    });
    await writeAuditLog({
      actorUid: firebaseUser.uid,
      actorRole: userProfile.role,
      action: 'SUBMIT_ROLE_REQUEST',
      targetPath: `roleRequests/${req.id}`,
      summary: `Applied for ${payload.requestedRole} role (${payload.licenseRef}).`,
    });
  };

  const updateAppointmentClinician = async (
    appointmentId: string,
    status: 'Confirmed' | 'Completed' | 'Rescheduled' | 'Cancelled',
    clinicalNotes?: string
  ) => {
    if (!requireVerifiedSession() || !firebaseUser || !userProfile) return;
    await updateAppointmentStatusByClinician(appointmentId, status, clinicalNotes);
    await writeAuditLog({
      actorUid: firebaseUser.uid,
      actorRole: userProfile.role,
      action: 'CLINICIAN_UPDATE_APPOINTMENT',
      targetPath: `appointments/${appointmentId}`,
      summary: `Updated appointment status to ${status}.`,
    });
  };

  const hospitalUpdateEmergency = async (
    requestId: string,
    stage: 'accepted' | 'dispatched' | 'resolved',
    partnerUnit?: string,
    etaMinutes?: number
  ) => {
    if (!requireVerifiedSession() || !firebaseUser || !userProfile) return;
    await updateEmergencyStageByHospital(requestId, firebaseUser.uid, stage, partnerUnit, etaMinutes);
    await writeAuditLog({
      actorUid: firebaseUser.uid,
      actorRole: userProfile.role,
      action: 'HOSPITAL_DISPATCH_UPDATE',
      targetPath: `emergencyRequests/${requestId}`,
      summary: `Hospital updated emergency stage to ${stage}.`,
    });
  };

  const loadAdminUsers = async () => {
    if (!firebaseUser || userProfile?.role !== 'administrator') return;
    const usersList = await adminListAllUsers();
    setAdminUsers(usersList);
  };

  const adminReviewRoleRequest = async (request: RoleRequest, decision: 'approved' | 'rejected') => {
    if (!requireVerifiedSession() || !firebaseUser || userProfile?.role !== 'administrator') {
      throw new Error('Administrator privileges required.');
    }
    await reviewRoleRequestAsAdmin(request, decision);
    await writeAuditLog({
      actorUid: firebaseUser.uid,
      actorRole: 'administrator',
      action: `ROLE_REQUEST_${decision.toUpperCase()}`,
      targetPath: `roleRequests/${request.id}`,
      summary: `${decision} ${request.requestedRole} verification for ${request.applicantName} (${request.uid}).`,
    });
    await loadAdminUsers();
  };

  const addRehabSession = async (input: {
    profileId?: string;
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
  }) => {
    const profileId = input.profileId || activeProfileId || familyProfiles[0]?.id || 'default';
    if (!firebaseUser) {
      const local: RehabSession = {
        id: `rehab-${Date.now()}`,
        profileId,
        exerciseName: input.exerciseName.trim(),
        bodyArea: input.bodyArea,
        assignedByClinician: input.assignedByClinician.trim() || 'Assigned Physiotherapist',
        targetPrescription: input.targetPrescription.trim() || '3 sets × 10 reps',
        durationMinutes: Math.max(1, Math.min(240, Math.round(input.durationMinutes || 15))),
        painScore: Math.max(0, Math.min(10, Math.round(input.painScore))),
        mobilityScore: Math.max(1, Math.min(10, Math.round(input.mobilityScore))),
        completedDate: input.completedDate || new Date().toISOString().slice(0, 10),
        notes: input.notes?.trim() || undefined,
        sharedWithDoctorUid: input.sharedWithDoctorUid?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      setRehabSessions((prev) => [local, ...prev]);
      return;
    }
    if (!requireVerifiedSession()) return;
    const saved = await createRehabSessionDoc(firebaseUser.uid, { ...input, profileId });
    await writeAuditLog({
      actorUid: firebaseUser.uid,
      actorRole: userProfile?.role || 'patient',
      action: 'REHAB_SESSION_LOGGED',
      targetPath: `rehabSessions/${saved.id}`,
      summary: `Logged rehab session "${saved.exerciseName}" (${saved.durationMinutes} min, mobility ${saved.mobilityScore}/10, pain ${saved.painScore}/10).`,
    });
  };

  const shareRehabWithDoctor = async (sessionId: string, doctorUid: string) => {
    if (!firebaseUser) {
      setRehabSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, sharedWithDoctorUid: doctorUid.trim() } : s))
      );
      return;
    }
    if (!requireVerifiedSession()) return;
    await shareRehabSessionWithDoctor(sessionId, doctorUid);
    await writeAuditLog({
      actorUid: firebaseUser.uid,
      actorRole: userProfile?.role || 'patient',
      action: 'REHAB_SESSION_SHARED',
      targetPath: `rehabSessions/${sessionId}`,
      summary: `Shared rehabilitation session progress with physiotherapist UID ${doctorUid.trim()}.`,
    });
  };

  const deleteRehabSession = async (sessionId: string) => {
    if (!firebaseUser) {
      setRehabSessions((prev) => prev.filter((s) => s.id !== sessionId));
      return;
    }
    if (!requireVerifiedSession()) return;
    await deleteRehabSessionDoc(sessionId);
  };

  const addCycleLog = async (input: {
    profileId?: string;
    startDate: string;
    cycleLengthDays: number;
    flowIntensity: FlowIntensity;
    symptoms: string[];
    notes?: string;
  }) => {
    const profileId = input.profileId || activeProfileId || familyProfiles[0]?.id || 'default';
    if (!firebaseUser) {
      const local: CycleLog = {
        id: `cyc-${Date.now()}`,
        profileId,
        startDate: input.startDate || new Date().toISOString().slice(0, 10),
        cycleLengthDays: Math.max(15, Math.min(90, Math.round(input.cycleLengthDays || 28))),
        flowIntensity: input.flowIntensity,
        symptoms: input.symptoms.slice(0, 10),
        notes: input.notes?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      setCycleLogs((prev) => [local, ...prev]);
      return;
    }
    if (!requireVerifiedSession()) return;
    const saved = await createCycleLogDoc(firebaseUser.uid, { ...input, profileId });
    await writeAuditLog({
      actorUid: firebaseUser.uid,
      actorRole: userProfile?.role || 'patient',
      action: 'CYCLE_LOG_RECORDED',
      targetPath: `cycleLogs/${saved.id}`,
      summary: `Recorded private cycle log starting ${saved.startDate}.`,
    });
  };

  const deleteCycleLog = async (logId: string) => {
    if (!firebaseUser) {
      setCycleLogs((prev) => prev.filter((c) => c.id !== logId));
      return;
    }
    if (!requireVerifiedSession()) return;
    await deleteCycleLogDoc(logId);
  };

  const addVaccinationRecord = async (input: {
    profileId?: string;
    vaccineName: string;
    ageGroup: VaccineAgeGroup;
    doseLabel: string;
    status: VaccineStatus;
    date: string;
    facilityName?: string;
    notes?: string;
  }) => {
    const profileId = input.profileId || activeProfileId || familyProfiles[0]?.id || 'default';
    if (!firebaseUser) {
      const local: VaccinationRecord = {
        id: `vax-${Date.now()}`,
        profileId,
        vaccineName: input.vaccineName.trim(),
        ageGroup: input.ageGroup,
        doseLabel: input.doseLabel.trim() || 'Dose 1',
        status: input.status,
        date: input.date || new Date().toISOString().slice(0, 10),
        facilityName: input.facilityName?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      setVaccinationRecords((prev) => [local, ...prev]);
      return;
    }
    if (!requireVerifiedSession()) return;
    const saved = await createVaccinationRecordDoc(firebaseUser.uid, { ...input, profileId });
    await writeAuditLog({
      actorUid: firebaseUser.uid,
      actorRole: userProfile?.role || 'patient',
      action: 'VACCINATION_RECORDED',
      targetPath: `vaccinationRecords/${saved.id}`,
      summary: `Recorded ${saved.vaccineName} (${saved.ageGroup} yrs · ${saved.status}).`,
    });
  };

  const updateVaccinationRecord = async (
    recordId: string,
    updates: { status: VaccineStatus; date: string; facilityName?: string; notes?: string }
  ) => {
    if (!firebaseUser) {
      setVaccinationRecords((prev) =>
        prev.map((v) => (v.id === recordId ? { ...v, ...updates } : v))
      );
      return;
    }
    if (!requireVerifiedSession()) return;
    await updateVaccinationRecordDoc(recordId, updates);
  };

  const deleteVaccinationRecord = async (recordId: string) => {
    if (!firebaseUser) {
      setVaccinationRecords((prev) => prev.filter((v) => v.id !== recordId));
      return;
    }
    if (!requireVerifiedSession()) return;
    await deleteVaccinationRecordDoc(recordId);
  };

  const userSummary: SessionUserSummary = firebaseUser
    ? {
        uid: firebaseUser.uid,
        name: userProfile?.displayName || firebaseUser.displayName || 'HealthConnect Member',
        email: firebaseUser.email || privateInfo?.email || '',
        city: userProfile?.city || 'Ibadan',
        signedIn: true,
        emailVerified: emailVerifiedFlag || Boolean(firebaseUser.emailVerified),
        role: userProfile?.role || 'patient',
        verifiedRoleStatus: userProfile?.verifiedRoleStatus || 'active',
      }
    : {
        uid: null,
        name: 'Guest Preview (Demo)',
        email: '',
        city: 'Ibadan',
        signedIn: false,
        emailVerified: false,
        role: 'patient',
        verifiedRoleStatus: 'active',
      };

  return (
    <AppContext.Provider
      value={{
        route,
        navigate,
        authLoading,
        authError,
        clearAuthError: () => setAuthError(null),
        authNotice,
        clearAuthNotice: () => setAuthNotice(null),
        pendingPostLoginRoute,
        firebaseUser,
        userProfile,
        privateInfo,
        user: userSummary,
        isGuestDemo: !firebaseUser,
        integrationStatus,
        googleSignInPending,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        resendVerificationEmail,
        refreshVerificationStatus,
        updatePrivateDetails,
        updateMyAccount,
        signOut,
        activeProfileId,
        setActiveProfileId,
        familyProfiles,
        addFamilyProfile,
        updateFamilyProfile,
        appointments,
        bookOnlineConsultation,
        bookPhysicalExamFollowUp,
        rescheduleOrCancelAppointment,
        bpReadings,
        addBpReading,
        glucoseReadings,
        addGlucoseReading,
        prescriptions,
        labResults,
        documents,
        addMedicalDocument,
        aiConsultations,
        saveAiConsultation,
        deleteAiConsultation,
        shareRecordWithDoctor,
        emergencyContacts,
        addEmergencyContact,
        transactions,
        walletTransactions,
        walletBalanceNgn,
        rehabSessions,
        addRehabSession,
        shareRehabWithDoctor,
        deleteRehabSession,
        cycleLogs,
        addCycleLog,
        deleteCycleLog,
        vaccinationRecords,
        addVaccinationRecord,
        updateVaccinationRecord,
        deleteVaccinationRecord,
        notifications,
        markAllNotificationsRead,
        reminders,
        toggleReminder,
        addReminder,
        markReminderTaken,
        deleteReminder,
        activeSubscription: derivedSubscription,
        selectedCheckoutPlanId,
        setSelectedCheckoutPlanId,
        openSubscriptionCheckout,
        recordSubscriptionPayment,
        paySubscriptionWithWallet,
        checkoutDraft,
        openCheckout,
        closeCheckout,
        completeDemoPayment,
        recordVerifiedInterswitchPayment,
        userLocation,
        setUserLocation,
        activeEmergency,
        emergencies,
        submitEmergencyRequest,
        advanceEmergencyStage,
        clearEmergencyRequest,
        seedDemoWorkspaceForUser,
        roleRequests,
        submitRoleRequest,
        auditLogs,
        doctorAppointments,
        doctorSharedBp,
        doctorSharedGlucose,
        doctorSharedDocs,
        updateAppointmentClinician,
        hospitalAppointments,
        hospitalEmergencies,
        hospitalUpdateEmergency,
        adminRoleRequests,
        adminAuditLogs,
        adminUsers,
        loadAdminUsers,
        adminReviewRoleRequest,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
