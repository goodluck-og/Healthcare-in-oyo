import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type InterswitchEnvironment = 'sandbox' | 'production';

export interface ServerIntegrationConfig {
  geminiApiKey: string;
  openRouterApiKey: string;
  interswitchMerchantCode: string;
  interswitchPayItemId: string;
  interswitchClientId: string;
  interswitchSecretKey: string;
  interswitchEnvironment: InterswitchEnvironment;
  interswitchCallbackUrl: string;
  interswitchWebhookSecret: string;
  interswitchUsingPublicSandboxDefaults: boolean;
  smsProviderKey: string;
  googleMapsApiKey: string;
  appUrl: string;
  firebaseProjectId: string;
  adminEmails: string[];
  isProduction: boolean;
}

const DEFAULT_ADMIN_EMAIL = 'amesinlolagoodluck@gmail.com';
export const OFFICIAL_INTERSWITCH_SANDBOX_MERCHANT_CODE = 'MX6072';
export const OFFICIAL_INTERSWITCH_SANDBOX_PAY_ITEM_ID = '9405967';

function readFirebaseProjectId(): string {
  try {
    const configPath = path.resolve(__dirname, '../../firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as { projectId?: string };
      if (parsed.projectId && parsed.projectId !== 'remixed-project-id') {
        return parsed.projectId;
      }
    }
  } catch {
    // Ignore read error and fall back to env
  }
  return process.env.FIREBASE_PROJECT_ID || 'amped-imprint-mghtt';
}

function normalizeSecret(val: string | undefined, placeholders: string[] = []): string {
  const trimmed = (val || '').trim();
  if (!trimmed || placeholders.includes(trimmed)) {
    return '';
  }
  return trimmed;
}

function parseInterswitchEnvironment(raw: string | undefined): InterswitchEnvironment {
  return (raw || '').trim().toLowerCase() === 'production' ? 'production' : 'sandbox';
}

function parseAdminEmails(): string[] {
  const raw = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([DEFAULT_ADMIN_EMAIL, ...raw]));
}

export function getServerConfig(): ServerIntegrationConfig {
  const appUrl = normalizeSecret(process.env.APP_URL, ['MY_APP_URL']) || 'http://localhost:3000';
  const callbackUrl =
    normalizeSecret(process.env.INTERSWITCH_CALLBACK_URL) ||
    `${appUrl.replace(/\/$/, '')}/payment-response`;
  const interswitchEnvironment = parseInterswitchEnvironment(process.env.INTERSWITCH_ENVIRONMENT);
  const disableSandboxFallback =
    (process.env.INTERSWITCH_DISABLE_SANDBOX_FALLBACK || '').trim().toLowerCase() === 'true';

  const envMerchantCode = normalizeSecret(process.env.INTERSWITCH_MERCHANT_CODE);
  const envPayItemId = normalizeSecret(process.env.INTERSWITCH_PAY_ITEM_ID);
  const allowPublicSandboxDefaults =
    interswitchEnvironment === 'sandbox' && !disableSandboxFallback;

  const interswitchMerchantCode =
    envMerchantCode || (allowPublicSandboxDefaults ? OFFICIAL_INTERSWITCH_SANDBOX_MERCHANT_CODE : '');
  const interswitchPayItemId =
    envPayItemId || (allowPublicSandboxDefaults ? OFFICIAL_INTERSWITCH_SANDBOX_PAY_ITEM_ID : '');
  const interswitchUsingPublicSandboxDefaults =
    allowPublicSandboxDefaults && (!envMerchantCode || !envPayItemId);

  return {
    geminiApiKey: normalizeSecret(process.env.GEMINI_API_KEY, ['MY_GEMINI_API_KEY']),
    openRouterApiKey: normalizeSecret(process.env.OPENROUTER_API_KEY),
    interswitchMerchantCode,
    interswitchPayItemId,
    interswitchClientId: normalizeSecret(process.env.INTERSWITCH_CLIENT_ID),
    interswitchSecretKey: normalizeSecret(process.env.INTERSWITCH_SECRET_KEY),
    interswitchEnvironment,
    interswitchCallbackUrl: callbackUrl,
    interswitchWebhookSecret: normalizeSecret(process.env.INTERSWITCH_WEBHOOK_SECRET),
    interswitchUsingPublicSandboxDefaults,
    smsProviderKey: normalizeSecret(process.env.TERMII_API_KEY || process.env.TWILIO_ACCOUNT_SID),
    googleMapsApiKey: normalizeSecret(process.env.VITE_GOOGLE_MAPS_API_KEY),
    appUrl,
    firebaseProjectId: readFirebaseProjectId(),
    adminEmails: parseAdminEmails(),
    isProduction: process.env.NODE_ENV === 'production',
  };
}

export function getMissingInterswitchCredentials(cfg: ServerIntegrationConfig): string[] {
  const missing: string[] = [];
  if (!cfg.interswitchMerchantCode) missing.push('INTERSWITCH_MERCHANT_CODE');
  if (!cfg.interswitchPayItemId) missing.push('INTERSWITCH_PAY_ITEM_ID');
  if (cfg.interswitchEnvironment === 'production') {
    if (!cfg.interswitchClientId) missing.push('INTERSWITCH_CLIENT_ID');
    if (!cfg.interswitchSecretKey) missing.push('INTERSWITCH_SECRET_KEY');
    if (!cfg.interswitchWebhookSecret) missing.push('INTERSWITCH_WEBHOOK_SECRET');
  }
  return missing;
}

export function getPublicIntegrationStatus() {
  const cfg = getServerConfig();
  const missingInterswitch = getMissingInterswitchCredentials(cfg);
  return {
    geminiConfigured: Boolean(cfg.geminiApiKey),
    openrouterConfigured: Boolean(cfg.openRouterApiKey),
    googleMapsConfigured: Boolean(cfg.googleMapsApiKey),
    interswitchConfigured: Boolean(
      cfg.interswitchMerchantCode &&
        cfg.interswitchPayItemId &&
        (cfg.interswitchEnvironment === 'sandbox' ||
          (cfg.interswitchClientId && cfg.interswitchSecretKey))
    ),
    interswitchEnvironment: cfg.interswitchEnvironment,
    interswitchUsingPublicSandboxDefaults: cfg.interswitchUsingPublicSandboxDefaults,
    interswitchWebhookConfigured: Boolean(cfg.interswitchWebhookSecret),
    interswitchMissingCount: missingInterswitch.length,
    smsConfigured: Boolean(cfg.smsProviderKey),
    firebaseProjectId: cfg.firebaseProjectId,
  };
}
