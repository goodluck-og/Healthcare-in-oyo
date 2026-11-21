import {
  OFFLINE_HEALTH_LIBRARY,
  OFFLINE_HEALTH_LIBRARY_VERSION,
  type OfflineHealthGuide,
} from '../data/offlineHealthLibrary';

export type HybridRoutingPreference = 'smart-hybrid' | 'local-only' | 'cloud-only';

export interface AiPrivacyPreferences {
  routingPreference: HybridRoutingPreference;
  cloudConsentGranted: boolean;
  cloudConsentTimestamp: string | null;
  cloudConsentVersion: string;
}

export const AI_CONSENT_POLICY_VERSION = 'ndpa-2026-v1';

const DB_NAME = 'healthconnect-oyo-public-v1';
const DB_VERSION = 1;
const STORE_GUIDES = 'publicHealthGuides';
const STORE_PREFS = 'nonSensitivePrefs';

const PREFS_KEY = 'ai_privacy_preferences';
const BOOKMARKS_KEY = 'bookmarked_guide_ids';
const LOCAL_STORAGE_PREFS_FALLBACK = 'hc_oyo_ai_prefs_v1';
const LOCAL_STORAGE_BOOKMARKS_FALLBACK = 'hc_oyo_guide_bookmarks_v1';

const DEFAULT_PREFS: AiPrivacyPreferences = {
  routingPreference: 'smart-hybrid',
  cloudConsentGranted: false,
  cloudConsentTimestamp: null,
  cloudConsentVersion: AI_CONSENT_POLICY_VERSION,
};

function hasIndexedDb(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openPublicDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_GUIDES)) {
        db.createObjectStore(STORE_GUIDES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PREFS)) {
        db.createObjectStore(STORE_PREFS, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openPublicDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(storeName: string, value: unknown): Promise<void> {
  const db = await openPublicDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Syncs the public, non-sensitive WHO/Nigeria offline health reference library
 * into IndexedDB so it remains searchable offline across reloads.
 *
 * SECURITY BOUNDARY: Never store patient medical records, vitals, or personal PII here.
 */
export async function syncPublicHealthLibraryToIndexedDb(): Promise<{
  storedCount: number;
  version: string;
  storageBackend: 'indexeddb' | 'memory';
}> {
  if (!hasIndexedDb()) {
    return {
      storedCount: OFFLINE_HEALTH_LIBRARY.length,
      version: OFFLINE_HEALTH_LIBRARY_VERSION,
      storageBackend: 'memory',
    };
  }
  try {
    const db = await openPublicDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_GUIDES, STORE_PREFS], 'readwrite');
      const guideStore = tx.objectStore(STORE_GUIDES);
      for (const guide of OFFLINE_HEALTH_LIBRARY) {
        guideStore.put(guide);
      }
      tx.objectStore(STORE_PREFS).put({
        key: 'library_version',
        value: OFFLINE_HEALTH_LIBRARY_VERSION,
        updatedAt: new Date().toISOString(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return {
      storedCount: OFFLINE_HEALTH_LIBRARY.length,
      version: OFFLINE_HEALTH_LIBRARY_VERSION,
      storageBackend: 'indexeddb',
    };
  } catch {
    return {
      storedCount: OFFLINE_HEALTH_LIBRARY.length,
      version: OFFLINE_HEALTH_LIBRARY_VERSION,
      storageBackend: 'memory',
    };
  }
}

export async function loadPublicHealthGuides(): Promise<OfflineHealthGuide[]> {
  if (!hasIndexedDb()) return OFFLINE_HEALTH_LIBRARY;
  try {
    const db = await openPublicDb();
    const guides = await new Promise<OfflineHealthGuide[]>((resolve, reject) => {
      const tx = db.transaction(STORE_GUIDES, 'readonly');
      const req = tx.objectStore(STORE_GUIDES).getAll();
      req.onsuccess = () => resolve((req.result as OfflineHealthGuide[]) || []);
      req.onerror = () => reject(req.error);
    });
    return guides.length >= OFFLINE_HEALTH_LIBRARY.length ? guides : OFFLINE_HEALTH_LIBRARY;
  } catch {
    return OFFLINE_HEALTH_LIBRARY;
  }
}

export async function loadAiPrivacyPreferences(): Promise<AiPrivacyPreferences> {
  if (hasIndexedDb()) {
    try {
      const record = await idbGet<{ key: string; value: AiPrivacyPreferences }>(
        STORE_PREFS,
        PREFS_KEY
      );
      if (record?.value) {
        return { ...DEFAULT_PREFS, ...record.value };
      }
    } catch {
      // Fallback to localStorage below
    }
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_PREFS_FALLBACK);
      if (raw) {
        return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<AiPrivacyPreferences>) };
      }
    } catch {
      // Ignore parse errors
    }
  }
  return { ...DEFAULT_PREFS };
}

export async function saveAiPrivacyPreferences(
  prefs: AiPrivacyPreferences
): Promise<AiPrivacyPreferences> {
  const safePrefs: AiPrivacyPreferences = {
    routingPreference: prefs.routingPreference,
    cloudConsentGranted: Boolean(prefs.cloudConsentGranted),
    cloudConsentTimestamp: prefs.cloudConsentTimestamp,
    cloudConsentVersion: AI_CONSENT_POLICY_VERSION,
  };
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_PREFS_FALLBACK, JSON.stringify(safePrefs));
    } catch {
      // Ignore storage quota errors
    }
  }
  if (hasIndexedDb()) {
    try {
      await idbPut(STORE_PREFS, { key: PREFS_KEY, value: safePrefs });
    } catch {
      // Ignore IndexedDB failure in private windows
    }
  }
  return safePrefs;
}

export async function loadBookmarkedGuideIds(): Promise<string[]> {
  if (hasIndexedDb()) {
    try {
      const record = await idbGet<{ key: string; value: string[] }>(STORE_PREFS, BOOKMARKS_KEY);
      if (Array.isArray(record?.value)) return record.value;
    } catch {
      // Fallback below
    }
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_BOOKMARKS_FALLBACK);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string');
      }
    } catch {
      // Ignore
    }
  }
  return [];
}

export async function saveBookmarkedGuideIds(ids: string[]): Promise<string[]> {
  const unique = Array.from(new Set(ids));
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_BOOKMARKS_FALLBACK, JSON.stringify(unique));
    } catch {
      // Ignore
    }
  }
  if (hasIndexedDb()) {
    try {
      await idbPut(STORE_PREFS, { key: BOOKMARKS_KEY, value: unique });
    } catch {
      // Ignore
    }
  }
  return unique;
}
