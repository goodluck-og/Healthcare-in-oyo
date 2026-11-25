import {
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import {
  PROJECT_FEATURE_SCREENSHOTS,
  buildProjectDocumentationHtml,
} from './projectDocumentationContent';

export const WORKSPACE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
] as const;

// In-memory access token cache ONLY (never stored in localStorage or sessionStorage).
let cachedDriveAccessToken: string | null = null;
let cachedDriveUserEmail: string | null = null;
let authListenerInitialized = false;

export function ensureDriveAuthListener(onCleared?: () => void): () => void {
  if (!authListenerInitialized) {
    authListenerInitialized = true;
  }
  return onAuthStateChanged(auth, (user: User | null) => {
    if (!user) {
      cachedDriveAccessToken = null;
      cachedDriveUserEmail = null;
      onCleared?.();
    }
  });
}

export function getCachedDriveAccessToken(): string | null {
  return cachedDriveAccessToken;
}

export function getCachedDriveUserEmail(): string | null {
  return cachedDriveUserEmail;
}

export function clearCachedDriveAccessToken(): void {
  cachedDriveAccessToken = null;
  cachedDriveUserEmail = null;
}

/**
 * Authenticates via Firebase GoogleAuthProvider with the minimal Google Drive
 * `drive.file` permission and caches the access token strictly in memory.
 */
export async function connectGoogleDriveForDocs(
  loginHintEmail?: string
): Promise<{ accessToken: string; email: string | null; displayName: string | null }> {
  const provider = new GoogleAuthProvider();
  for (const scope of WORKSPACE_DRIVE_SCOPES) {
    provider.addScope(scope);
  }
  const params: Record<string, string> = {
    prompt: 'consent select_account',
  };
  if (loginHintEmail?.trim()) {
    params.login_hint = loginHintEmail.trim();
  }
  provider.setCustomParameters(params);

  const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error(
      'Google Drive permission token was not returned. Please sign in with Google and allow Drive file saving.'
    );
  }

  cachedDriveAccessToken = credential.accessToken;
  cachedDriveUserEmail = result.user.email || null;
  return {
    accessToken: cachedDriveAccessToken,
    email: result.user.email,
    displayName: result.user.displayName,
  };
}

/**
 * Fetches a screenshot asset and downscales/encodes it to a compact JPEG data URI
 * so all 20 embedded feature screenshots stay crisp and well under Google Docs'
 * multipart import payload size limits.
 */
async function fetchCompressedScreenshotDataUrl(
  imagePath: string,
  maxWidth = 960,
  quality = 0.78
): Promise<string | null> {
  try {
    const res = await fetch(imagePath);
    if (!res.ok) return null;
    const blob = await res.blob();

    if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    const bitmap = await createImageBitmap(blob);
    const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
    const targetW = Math.max(1, Math.round(bitmap.width * scale));
    const targetH = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.fillStyle = '#0F0E47';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return null;
  }
}

export async function collectEmbeddedScreenshots(
  onProgress?: (loaded: number, total: number, title: string) => void
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const total = PROJECT_FEATURE_SCREENSHOTS.length;
  for (let i = 0; i < total; i += 1) {
    const item = PROJECT_FEATURE_SCREENSHOTS[i];
    onProgress?.(i + 1, total, item.title);
    const dataUrl = await fetchCompressedScreenshotDataUrl(item.imagePath);
    if (dataUrl) {
      map[item.imagePath] = dataUrl;
    }
  }
  return map;
}

export interface SavedDriveDocResult {
  id: string;
  name: string;
  webViewLink: string;
  mimeType: string;
  screenshotCount: number;
}

/**
 * Uploads the complete HealthConnect documentation (with all 20 embedded feature
 * screenshots and the Administrator Account section) directly into the user's
 * Google Drive as either a native Google Doc or a Microsoft Word `.doc` file.
 */
export async function saveProjectDocToGoogleDrive(options: {
  title: string;
  format: 'google-doc' | 'word-doc';
  includeScreenshots: boolean;
  onProgress?: (message: string) => void;
}): Promise<SavedDriveDocResult> {
  const accessToken = getCachedDriveAccessToken();
  if (!accessToken) {
    throw new Error('Please connect your Google account first to save files to Google Drive.');
  }

  let screenshotDataUrls: Record<string, string> = {};
  if (options.includeScreenshots) {
    screenshotDataUrls = await collectEmbeddedScreenshots((loaded, total, title) => {
      options.onProgress?.(`Embedding screenshot ${loaded}/${total}: ${title}...`);
    });
  }

  options.onProgress?.('Building complete HealthConnect project documentation...');
  const htmlContent = buildProjectDocumentationHtml({
    screenshotDataUrls,
  });

  const cleanBaseName =
    options.title.trim() || 'HealthConnect — Complete Project Documentation & Screenshots';
  const fileName =
    options.format === 'word-doc' && !cleanBaseName.toLowerCase().endsWith('.doc')
      ? `${cleanBaseName}.doc`
      : cleanBaseName;

  const targetMimeType =
    options.format === 'google-doc'
      ? 'application/vnd.google-apps.document'
      : 'application/msword';

  const metadata = {
    name: fileName,
    mimeType: targetMimeType,
    description:
      'Complete HealthConnect project documentation with 20 feature screenshots, Admin Account governance (amesinlolagoodluck@gmail.com), and technical architecture.',
  };

  const boundary = `healthconnect_drive_boundary_${Date.now()}`;
  const multipartBody = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlContent,
    `--${boundary}--`,
  ].join('\r\n');

  options.onProgress?.(
    options.format === 'google-doc'
      ? 'Saving as Google Doc into your Google Drive...'
      : 'Saving .doc file into your Google Drive...'
  );

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearCachedDriveAccessToken();
      throw new Error(
        'Your Google Drive session expired or permission was declined. Please click "Sign in with Google" to reconnect Google Drive and try again.'
      );
    }
    const errText = await response.text();
    throw new Error(`Google Drive upload failed (${response.status}): ${errText.slice(0, 220)}`);
  }

  const saved = (await response.json()) as {
    id: string;
    name: string;
    webViewLink?: string;
    mimeType?: string;
  };

  const fallbackLink =
    options.format === 'google-doc'
      ? `https://docs.google.com/document/d/${saved.id}/edit`
      : `https://drive.google.com/file/d/${saved.id}/view`;

  return {
    id: saved.id,
    name: saved.name || fileName,
    webViewLink: saved.webViewLink || fallbackLink,
    mimeType: saved.mimeType || targetMimeType,
    screenshotCount: Object.keys(screenshotDataUrls).length,
  };
}

/**
 * Generates and downloads a standalone Microsoft Word (.doc) file with all 20
 * embedded screenshots directly to the user's computer (works offline too).
 */
export async function downloadProjectDocLocally(options: {
  title: string;
  includeScreenshots: boolean;
  onProgress?: (message: string) => void;
}): Promise<{ fileName: string; screenshotCount: number }> {
  let screenshotDataUrls: Record<string, string> = {};
  if (options.includeScreenshots) {
    screenshotDataUrls = await collectEmbeddedScreenshots((loaded, total, title) => {
      options.onProgress?.(`Bundling screenshot ${loaded}/${total}: ${title}...`);
    });
  }

  options.onProgress?.('Preparing Word (.doc) download...');
  const htmlContent = buildProjectDocumentationHtml({
    screenshotDataUrls,
  });

  const safeFileName = `${(options.title.trim() || 'HealthConnect_Complete_Project_Documentation')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')}.doc`;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  return {
    fileName: safeFileName,
    screenshotCount: Object.keys(screenshotDataUrls).length,
  };
}
