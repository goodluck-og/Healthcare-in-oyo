export type AppRoute =
  | '/'
  | '/find-healthcare'
  | '/dashboard'
  | '/ai-assistant'
  | '/emergency'
  | '/monitoring'
  | '/payments'
  | '/checkout'
  | '/payment-response'
  | '/about'
  | '/login'
  | '/register';

export type UserRole = 'patient' | 'doctor' | 'hospital' | 'administrator';
export type VerifiedRoleStatus = 'active' | 'pending_verification' | 'suspended';

export interface UserAccount {
  uid: string;
  displayName: string;
  role: UserRole;
  verifiedRoleStatus: VerifiedRoleStatus;
  city: string;
  facilityOrSpecialty?: string;
  medicalHistory?: string;
}

export interface UserPrivateInfo {
  uid: string;
  email: string;
  phone?: string;
  address?: string;
  emailVerified: boolean;
  smsVerified: boolean;
}

export interface RoleRequest {
  id: string;
  uid: string;
  applicantName: string;
  requestedRole: 'doctor' | 'hospital';
  licenseRef: string;
  organization: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
}

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  actorRole: UserRole;
  action: string;
  targetPath: string;
  summary: string;
  createdAt?: string;
}

export interface IntegrationStatus {
  geminiConfigured: boolean;
  openrouterConfigured: boolean;
  googleMapsConfigured: boolean;
  interswitchConfigured: boolean;
  interswitchEnvironment?: 'sandbox' | 'production';
  interswitchWebhookConfigured?: boolean;
  interswitchMissingCount?: number;
  interswitchUsingPublicSandboxDefaults?: boolean;
  smsConfigured: boolean;
  firebaseProjectId: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  credentials: string;
  mdcnStatus: string;
  hospital: string;
  city: string;
  state: string;
  consultationFeeNgn: number;
  languages: string[];
  nextAvailable: string;
  experienceYears: number;
  supportsTelehealth: boolean;
  rating: number;
  reviewCount: number;
  bio: string;
  avatarVariant: 'adewale' | 'chioma' | 'ibrahim' | 'ngozi' | 'tunde' | 'amina';
  coordinates: Coordinates;
}

export interface Facility {
  id: string;
  name: string;
  type: 'Hospital' | 'Clinic' | 'Pharmacy' | 'Laboratory';
  city: string;
  state: string;
  address: string;
  accreditedBy: string;
  emergency24h: boolean;
  specialties: string[];
  nhiaAccepted: boolean;
  phoneNote: string;
  coordinates: Coordinates;
  baseFeeNgn?: number;
}

export interface HealthcareService {
  id: string;
  index: string;
  title: string;
  summary: string;
  typicalTurnaround: string;
  startingFeeNgn: number;
  targetRoute: AppRoute;
  sectionAnchor?: string;
}

export interface BloodPressureReading {
  id: string;
  ownerUid?: string;
  profileId: string;
  systolic: number;
  diastolic: number;
  pulse: number;
  recordedAt: string;
  note: string;
  deviceType: string;
  sharedWithDoctorUid?: string;
}

export interface GlucoseReading {
  id: string;
  ownerUid?: string;
  profileId: string;
  valueMgDl: number;
  context: 'Fasting' | 'Before Meal' | 'Post-Meal (2h)' | 'Random';
  recordedAt: string;
  note: string;
  deviceType: string;
  sharedWithDoctorUid?: string;
}

export interface Appointment {
  id: string;
  patientUid?: string;
  doctorUid?: string;
  hospitalUid?: string;
  profileId: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  facilityName: string;
  city: string;
  date: string;
  time: string;
  mode: 'In-Person' | 'Video Telehealth';
  status: 'Confirmed' | 'Pending Payment' | 'Completed' | 'Rescheduled' | 'Cancelled';
  feeNgn: number;
  reference: string;
  clinicalNotes?: string;
}

export interface Prescription {
  id: string;
  profileId: string;
  medication: string;
  dosage: string;
  frequency: string;
  prescriber: string;
  issuedDate: string;
  refillsRemaining: number;
  nafdacVerified: boolean;
  instructions: string;
}

export interface LabResult {
  id: string;
  profileId: string;
  testName: string;
  labName: string;
  city: string;
  date: string;
  summary: string;
  status: 'Reviewed' | 'Normal Range' | 'Follow-Up Suggested';
  metrics: Array<{ label: string; value: string; reference: string }>;
}

export interface MedicalDocument {
  id: string;
  ownerUid?: string;
  profileId: string;
  title: string;
  category:
    | 'Condition'
    | 'Lab Report'
    | 'Imaging'
    | 'Immunization'
    | 'Discharge Summary'
    | 'Prescription';
  date: string;
  issuer: string;
  plainSummary: string;
  attachmentDataUrl?: string;
  attachmentName?: string;
  sharedWithDoctorUid?: string;
}

export interface AiConsultation {
  id: string;
  ownerUid?: string;
  profileId: string;
  mode: string;
  topic: string;
  userPrompt: string;
  assistantSummary: string;
  provider: 'gemini' | 'openrouter';
  model: string;
  messageCount: number;
  createdAt: string;
}

export type ReminderCategory =
  | 'Medication'
  | 'BP Check'
  | 'Glucose Check'
  | 'Hydration & Wellness'
  | 'Appointment';

export type ReminderFrequency =
  | 'Daily'
  | 'Twice Daily'
  | 'Weekdays'
  | 'Weekends'
  | 'Weekly';

export interface MedicationReminder {
  id: string;
  ownerUid?: string;
  profileId: string;
  title: string;
  dosage?: string;
  category: ReminderCategory;
  /** Alias kept for compatibility with MonitoringPage */
  type: ReminderCategory;
  timeOfDay: string;
  frequency: ReminderFrequency;
  schedule: string;
  notes?: string;
  enabled: boolean;
  lastTakenDate?: string;
}

export type AgeLifeStage =
  | 'child'
  | 'teen'
  | 'young_adult'
  | 'adult'
  | 'older_adult';

export type ConfirmedGender = 'female' | 'male' | 'not_specified';

export interface HealthNeedPreferences {
  includeFemaleHealth: boolean;
  includeMaleHealth: boolean;
  includeChronicCare: boolean;
  includeFitnessAndNutrition: boolean;
  includeWearableMonitoring: boolean;
  includeCaregiverTools: boolean;
}

export interface FamilyProfile {
  id: string;
  ownerUid?: string;
  fullName: string;
  relationship: 'Self (Primary)' | 'Child Dependent' | 'Parent';
  /** ISO date string YYYY-MM-DD — single source of truth for DOB-calculated age */
  dateOfBirth?: string;
  age: number;
  gender: string;
  genderConfirmed?: ConfirmedGender;
  city: string;
  countryCode?: string;
  emergencyNumber?: string;
  bloodGroup: string;
  genotype: string;
  allergies: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  isGuardianManaged?: boolean;
  onboardingCompleted?: boolean;
  healthNeedPreferences?: HealthNeedPreferences;
  enabledModules?: string[];
  qrSharedFields?: string[];
  hmoProvider: string;
  demoMemberId: string;
}

export type WearableReadingSource = 'web_bluetooth' | 'manual' | 'simulator';

export interface WearableReading {
  id: string;
  ownerUid?: string;
  profileId: string;
  source: WearableReadingSource;
  deviceName: string;
  heartRateBpm: number;
  spo2Percent: number;
  systolic?: number;
  diastolic?: number;
  temperatureC?: number;
  steps?: number;
  sleepHours?: number;
  recordedAt: string;
  criticalAlertTriggered?: boolean;
  alertReason?: string;
}

export interface WearableThresholds {
  minHeartRateBpm: number;
  maxHeartRateBpm: number;
  minSpo2Percent: number;
  maxSystolicMmHg: number;
  maxDiastolicMmHg: number;
  maxTemperatureC: number;
}

export interface ChatImageAttachment {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  base64Data: string;
  previewDataUrl: string;
  fileName: string;
  categoryHint?: string;
}

export interface EmergencyContact {
  id: string;
  ownerUid?: string;
  name: string;
  relationship: string;
  phone: string;
  city: string;
  isPrimary: boolean;
}

export type SubscriptionPlanId =
  | 'plan-oyo-individual-monthly'
  | 'plan-oyo-family-monthly';

export interface SubscriptionPlanDefinition {
  id: SubscriptionPlanId;
  name: string;
  shortName: string;
  priceNgn: number;
  billingCycle: 'monthly';
  maxProfiles: 1 | 5;
  tagline: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export interface ActiveSubscription {
  planId: SubscriptionPlanId | null;
  planName: string;
  monthlyPriceNgn: number;
  maxProfiles: 1 | 5;
  status: 'Active' | 'Pending' | 'Inactive';
  renewsOn: string;
  lastPaymentRef?: string;
}

export interface TransactionRecord {
  id: string;
  patientUid?: string;
  reference: string;
  description: string;
  category:
    | 'Subscription'
    | 'Consultation'
    | 'Laboratory'
    | 'Pharmacy'
    | 'Equipment Rental'
    | 'Wallet Top-Up';
  amountNgn: number;
  date: string;
  method:
    | 'Interswitch Card'
    | 'Interswitch Bank Transfer'
    | 'Interswitch USSD'
    | 'HealthConnect Wallet';
  status:
    | 'Paid (Demo Sandbox)'
    | 'Paid via Wallet'
    | 'Pending Verification'
    | 'Verified'
    | 'Refunded to Wallet';
}

export type WalletTransactionSource =
  | 'Appointment Refund'
  | 'Wallet Top-Up'
  | 'Subscription Payment'
  | 'Consultation Payment'
  | 'Laboratory Payment'
  | 'Pharmacy Payment'
  | 'Equipment Rental Payment';

export interface WalletTransaction {
  id: string;
  ownerUid?: string;
  type: 'credit' | 'debit';
  source: WalletTransactionSource;
  amountNgn: number;
  description: string;
  reference: string;
  relatedAppointmentId?: string;
  date: string;
  createdAt?: string;
}

export interface LabPackage {
  id: string;
  name: string;
  category: 'Laboratory' | 'Pharmacy';
  turnaround: string;
  homeCollection: boolean;
  priceNgn: number;
  details: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  dailyRateNgn: number;
  weeklyRateNgn: number;
  depositNgn: number;
  calibrationNote: string;
}

export interface BloodHub {
  id: string;
  name: string;
  city: string;
  state: string;
  neededGroups: string[];
  availableGroups: string[];
  screeningHours: string;
}

export type EmergencyStage = 'idle' | 'submitted' | 'accepted' | 'dispatched' | 'resolved';

export interface EmergencyRequest {
  id: string;
  patientUid?: string;
  hospitalUid?: string;
  stage: EmergencyStage;
  type: 'SOS Medical Triage' | 'Ambulance Dispatch Request';
  patientName: string;
  locationLabel: string;
  coordinates: Coordinates | null;
  notes: string;
  assignedHospital: string;
  partnerUnit: string;
  etaMinutes: number;
  createdAt: string;
}

export interface CheckoutDraft {
  orderId?: string;
  title: string;
  subtitle: string;
  category: TransactionRecord['category'];
  amountNgn: number;
  appointmentMeta?: {
    doctorId: string;
    doctorName: string;
    specialty: string;
    facilityName: string;
    city: string;
    date: string;
    time: string;
    mode: 'In-Person' | 'Video Telehealth';
    doctorUid?: string;
    hospitalUid?: string;
  };
}

export type RehabBodyArea =
  | 'Knee & Lower Limb'
  | 'Back & Spine'
  | 'Shoulder & Arm'
  | 'Post-Stroke Mobility'
  | 'Pelvic & Postpartum'
  | 'Cardiopulmonary';

export interface RehabSession {
  id: string;
  ownerUid?: string;
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
  createdAt?: string;
}

export type FlowIntensity = 'Spotting' | 'Light' | 'Moderate' | 'Heavy';

export interface CycleLog {
  id: string;
  ownerUid?: string;
  profileId: string;
  startDate: string;
  cycleLengthDays: number;
  flowIntensity: FlowIntensity;
  symptoms: string[];
  notes?: string;
  createdAt?: string;
}

export type VaccineAgeGroup = '0-5' | '10-15' | '15+';
export type VaccineStatus = 'Completed' | 'Scheduled' | 'Due Soon';

export interface VaccinationRecord {
  id: string;
  ownerUid?: string;
  profileId: string;
  vaccineName: string;
  ageGroup: VaccineAgeGroup;
  doseLabel: string;
  status: VaccineStatus;
  date: string;
  facilityName?: string;
  notes?: string;
  createdAt?: string;
}
