import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: Must pass firestoreDatabaseId as the database target for the provisioned Enterprise Firestore database.
// Auto-detect long-polling so fast WebChannel streaming is used by default while automatically falling back
// behind strict proxies or embedded iframes without forcing slow XHR polling that can time out.
function createFirestoreInstance(): Firestore {
  if (typeof window === 'undefined') {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

export const db = createFirestoreInstance();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIREBASE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;

export function isFirestoreOfflineError(error: unknown): boolean {
  const code = (error as { code?: string })?.code || '';
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return (
    code === 'unavailable' ||
    code === 'failed-precondition' ||
    lower.includes('client is offline') ||
    lower.includes('could not reach cloud firestore backend') ||
    lower.includes('backend didn\'t respond') ||
    lower.includes('network error')
  );
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

if (typeof window !== 'undefined') {
  void testConnection();
  // Guard against known upstream @firebase/auth PopupOperation.onAuthEvent race when a
  // popup closes right as the OAuth token exchange completes.
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : String(reason || '');
    const stack = reason instanceof Error ? reason.stack || '' : '';
    if (
      msg.includes('INTERNAL ASSERTION FAILED: Pending promise was never set') &&
      (stack.includes('PopupOperation') || stack.includes('firebase_auth') || stack.includes('@firebase/auth'))
    ) {
      event.preventDefault();
    }
  });
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    const filename = event.filename || '';
    if (
      msg.includes('ResizeObserver loop completed with undelivered notifications') ||
      msg.includes('ResizeObserver loop limit exceeded')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (
      msg.includes('INTERNAL ASSERTION FAILED: Pending promise was never set') &&
      (filename.includes('firebase_auth') || filename.includes('@firebase/auth') || msg.includes('PopupOperation'))
    ) {
      event.preventDefault();
    }
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Synchronized validation bounds from firebase-blueprint.json
export const BLUEPRINT_LIMITS = {
  idPattern: /^[a-zA-Z0-9_-]+$/,
  idMaxLength: 128,
  displayNameMaxLength: 100,
  cityMaxLength: 60,
  facilityOrSpecialtyMaxLength: 120,
  medicalHistoryMaxLength: 1000,
  emailMaxLength: 160,
  phoneMaxLength: 32,
  addressMaxLength: 240,
  licenseRefMaxLength: 80,
  organizationMaxLength: 120,
  fullNameMaxLength: 120,
  bloodGroupMaxLength: 8,
  genotypeMaxLength: 8,
  hmoMaxLength: 120,
  noteMaxLength: 240,
  deviceTypeMaxLength: 100,
  summaryMaxLength: 600,
  attachmentDataUrlMaxLength: 400000,
  attachmentNameMaxLength: 140,
  clinicalNotesMaxLength: 600,
  emergencyNotesMaxLength: 500,
  locationLabelMaxLength: 200,
  auditActionMaxLength: 80,
  auditTargetPathMaxLength: 160,
  auditSummaryMaxLength: 300,
  aiModeMaxLength: 100,
  aiTopicMaxLength: 160,
  aiPromptMaxLength: 600,
  aiSummaryMaxLength: 1800,
  aiModelMaxLength: 80,
  reminderTitleMaxLength: 120,
  reminderDosageMaxLength: 80,
  reminderTimeMaxLength: 16,
  reminderScheduleMaxLength: 80,
  reminderNotesMaxLength: 240,
  reminderLastTakenDateMaxLength: 20,
  walletDescriptionMaxLength: 200,
  walletReferenceMaxLength: 64,
  rehabExerciseMaxLength: 120,
  rehabClinicianMaxLength: 120,
  rehabPrescriptionMaxLength: 120,
  rehabNotesMaxLength: 300,
  cycleNotesMaxLength: 300,
  vaccineNameMaxLength: 120,
  vaccineDoseMaxLength: 60,
  vaccineFacilityMaxLength: 120,
  vaccineNotesMaxLength: 240,
} as const;

export function sanitizeString(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}
