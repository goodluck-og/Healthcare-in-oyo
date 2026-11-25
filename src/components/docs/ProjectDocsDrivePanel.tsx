import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  Download,
  ExternalLink,
  FileText,
  Images,
  Loader2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ADMIN_GMAIL_ACCOUNT } from '../../data/demoAccounts';
import {
  PROJECT_FEATURE_SCREENSHOTS,
} from '../../services/projectDocumentationContent';
import {
  clearCachedDriveAccessToken,
  connectGoogleDriveForDocs,
  downloadProjectDocLocally,
  ensureDriveAuthListener,
  getCachedDriveAccessToken,
  getCachedDriveUserEmail,
  saveProjectDocToGoogleDrive,
  type SavedDriveDocResult,
} from '../../services/googleDriveDocsService';

export function ProjectDocsDrivePanel() {
  const [driveConnected, setDriveConnected] = useState<boolean>(
    Boolean(getCachedDriveAccessToken())
  );
  const [driveEmail, setDriveEmail] = useState<string | null>(
    getCachedDriveUserEmail()
  );
  const [docTitle, setDocTitle] = useState(
    'HealthConnect — Complete Project Documentation & Feature Screenshots'
  );
  const [docFormat, setDocFormat] = useState<'google-doc' | 'word-doc'>('google-doc');
  const [includeScreenshots, setIncludeScreenshots] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedDriveResult, setSavedDriveResult] = useState<SavedDriveDocResult | null>(
    null
  );
  const [localDownloadNotice, setLocalDownloadNotice] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [expandedImage, setExpandedImage] = useState<{
    src: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = ensureDriveAuthListener(() => {
      setDriveConnected(false);
      setDriveEmail(null);
    });
    return () => unsubscribe();
  }, []);

  const handleConnectGoogleDrive = async () => {
    setErrorMsg(null);
    setConnecting(true);
    try {
      const res = await connectGoogleDriveForDocs(ADMIN_GMAIL_ACCOUNT);
      setDriveConnected(Boolean(res.accessToken));
      setDriveEmail(res.email);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to connect Google Drive. Please try again.'
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectDrive = () => {
    clearCachedDriveAccessToken();
    setDriveConnected(false);
    setDriveEmail(null);
    setSavedDriveResult(null);
  };

  const handleConfirmedSaveToDrive = async () => {
    setShowConfirmModal(false);
    setErrorMsg(null);
    setSavedDriveResult(null);
    setBusyMessage('Preparing documentation & screenshots...');
    try {
      const result = await saveProjectDocToGoogleDrive({
        title: docTitle,
        format: docFormat,
        includeScreenshots,
        onProgress: (msg) => setBusyMessage(msg),
      });
      setSavedDriveResult(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save document to Google Drive.';
      setErrorMsg(message);
      if (!getCachedDriveAccessToken()) {
        setDriveConnected(false);
      }
    } finally {
      setBusyMessage(null);
    }
  };

  const handleLocalDownload = async () => {
    setErrorMsg(null);
    setLocalDownloadNotice(null);
    setBusyMessage('Building standalone Word (.doc) file...');
    try {
      const result = await downloadProjectDocLocally({
        title: docTitle,
        includeScreenshots,
        onProgress: (msg) => setBusyMessage(msg),
      });
      setLocalDownloadNotice(
        `Downloaded "${result.fileName}" with ${result.screenshotCount} embedded feature screenshots.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to download local .doc file.'
      );
    } finally {
      setBusyMessage(null);
    }
  };

  return (
    <section
      id="project-documentation"
      className="rounded-3xl bg-white border border-[#272757]/12 shadow-sm overflow-hidden"
    >
      {/* Header Banner */}
      <div className="bg-[#0F0E47] text-white p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#FFB585] flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            Complete Project Documentation · Google Drive &amp; Word Export
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Save Complete HealthConnect Documentation (20 Screenshots + Admin Guide) to Google Drive
          </h2>
          <p className="text-xs sm:text-sm text-[#D7D8EE] leading-relaxed">
            Generates a complete, formatted documentation file covering every HealthConnect
            feature, all 20 live website screenshots, the verified Administrator Account (
            <span className="font-mono text-[#FFB585]">{ADMIN_GMAIL_ACCOUNT}</span>), Demo
            Sandbox accounts, Hybrid AI architecture, and Firestore security model—ready to
            save straight into your Google Drive or download as a <code className="text-white">.doc</code> file.
          </p>
        </div>

        <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-2.5">
          {!driveConnected ? (
            <button
              type="button"
              disabled={connecting}
              onClick={() => void handleConnectGoogleDrive()}
              className="inline-flex items-center justify-center gap-3 px-5 py-3 min-h-[46px] rounded-xl bg-white hover:bg-[#F5F6FC] text-[#1F1F1F] text-sm font-semibold border border-[#747775]/40 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              <svg
                className="w-5 h-5 shrink-0"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>
                {connecting ? 'Connecting Google Drive...' : 'Sign in with Google'}
              </span>
            </button>
          ) : (
            <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/40 px-4 py-2.5 flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-white">Google Drive Connected</p>
                <p className="text-emerald-200 font-mono text-[11px]">
                  {driveEmail || 'Signed in with Google'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDisconnectDrive}
                className="text-[11px] font-semibold text-emerald-100 hover:text-white underline ml-1 cursor-pointer"
              >
                Switch
              </button>
            </div>
          )}
          <p className="text-[11px] text-[#A6A8D6] text-left sm:text-right">
            Creates only this documentation file in your Google Drive.
          </p>
        </div>
      </div>

      {/* Controls & Admin Summary */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* Administrator Account Callout */}
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Included Section: Verified Administrator Account &amp; Least-Privilege Rules
            </p>
            <p className="text-sm text-emerald-950 leading-relaxed">
              The generated document explicitly documents{' '}
              <code className="px-1.5 py-0.5 rounded bg-emerald-100 font-mono text-xs font-bold">
                {ADMIN_GMAIL_ACCOUNT}
              </code>{' '}
              as the sole Administrator account (via verified Google Sign-In), detailing its
              exact permissions: registering partner hospitals &amp; doctors and read-only
              monitoring of the chat moderation feed—while strictly blocked by Firestore
              security rules from viewing, listing, or modifying regular user accounts,
              private PII, medical records, or payments.
            </p>
          </div>
          <span className="shrink-0 self-start text-[11px] font-mono font-bold px-3 py-1 rounded-lg bg-emerald-700 text-white">
            20 Feature Screenshots Included
          </span>
        </div>

        {/* Export Configuration Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-5">
            <label
              htmlFor="drive-doc-title"
              className="block text-xs font-bold text-[#0F0E47] mb-1.5"
            >
              Document Title
            </label>
            <input
              id="drive-doc-title"
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm text-[#0F0E47] focus:outline-none focus:border-[#0F0E47]"
            />
          </div>

          <div className="lg:col-span-3">
            <label
              htmlFor="drive-doc-format"
              className="block text-xs font-bold text-[#0F0E47] mb-1.5"
            >
              Google Drive File Format
            </label>
            <select
              id="drive-doc-format"
              value={docFormat}
              onChange={(e) =>
                setDocFormat(e.target.value as 'google-doc' | 'word-doc')
              }
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm text-[#0F0E47] bg-white"
            >
              <option value="google-doc">Native Google Doc (Editable in Docs)</option>
              <option value="word-doc">Microsoft Word File (.doc in Drive)</option>
            </select>
          </div>

          <div className="lg:col-span-4 flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={Boolean(busyMessage)}
              onClick={() => {
                setErrorMsg(null);
                if (!driveConnected) {
                  void handleConnectGoogleDrive();
                  return;
                }
                setShowConfirmModal(true);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] disabled:opacity-60 text-white text-sm font-bold transition-colors cursor-pointer"
            >
              <CloudUpload className="w-4 h-4 shrink-0" />
              <span>
                {driveConnected ? 'Save to Google Drive' : 'Connect & Save to Drive'}
              </span>
            </button>

            <button
              type="button"
              disabled={Boolean(busyMessage)}
              onClick={() => void handleLocalDownload()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#0F0E47] hover:bg-[#1E1D6B] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Download .doc</span>
            </button>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-[#505081] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeScreenshots}
            onChange={(e) => setIncludeScreenshots(e.target.checked)}
            className="rounded border-[#272757]/30 accent-[#E8702A]"
          />
          <span>
            Embed all {PROJECT_FEATURE_SCREENSHOTS.length} high-resolution website feature
            screenshots directly inside the document
          </span>
        </label>

        {/* Progress Banner */}
        {busyMessage && (
          <div className="rounded-xl bg-[#0F0E47]/5 border border-[#0F0E47]/15 p-4 flex items-center gap-3 text-sm text-[#0F0E47]">
            <Loader2 className="w-4 h-4 animate-spin text-[#E8702A] shrink-0" />
            <span className="font-medium">{busyMessage}</span>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-2.5 text-xs sm:text-sm text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Google Drive Saved Success Card */}
        {savedDriveResult && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-emerald-950">
                  Saved to Google Drive: {savedDriveResult.name}
                </p>
                <p className="text-xs text-emerald-800">
                  Includes {savedDriveResult.screenshotCount} embedded feature screenshots
                  and the full Admin Account ({ADMIN_GMAIL_ACCOUNT}) specification.
                </p>
              </div>
            </div>
            <a
              href={savedDriveResult.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shrink-0"
            >
              <span>Open in Google Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Local Download Success Notice */}
        {localDownloadNotice && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 flex items-center gap-2.5 text-xs text-blue-900">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{localDownloadNotice}</span>
          </div>
        )}

        {/* Feature Screenshots Preview Grid */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-[#0F0E47] flex items-center gap-2">
              <Images className="w-4 h-4 text-[#E8702A]" />
              Document Contents — All {PROJECT_FEATURE_SCREENSHOTS.length} Captured Feature Screenshots
            </h3>
            <span className="text-xs text-[#505081]">
              Also synced into GitHub <code className="font-mono">README.md</code>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PROJECT_FEATURE_SCREENSHOTS.map((feat) => (
              <button
                key={feat.id}
                type="button"
                onClick={() =>
                  setExpandedImage({ src: feat.imagePath, title: `${feat.number}. ${feat.title}` })
                }
                className="group text-left rounded-2xl border border-[#272757]/12 overflow-hidden bg-[#F8F9FD] hover:border-[#E8702A]/60 transition-colors cursor-pointer flex flex-col"
              >
                <div className="aspect-[16/10] bg-[#0F0E47] overflow-hidden">
                  <img
                    src={feat.imagePath}
                    alt={feat.title}
                    loading="lazy"
                    className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform"
                  />
                </div>
                <div className="p-3 space-y-1 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#E8702A]">
                    {feat.number} · {feat.category}
                  </p>
                  <p className="text-xs font-bold text-[#0F0E47] line-clamp-2">
                    {feat.title}
                  </p>
                  <p className="text-[11px] text-[#505081] line-clamp-2 leading-snug">
                    {feat.summary}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog Before Saving to Google Drive */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 bg-[#0B0A33]/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-drive-save-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#272757]/15 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3
                  id="confirm-drive-save-title"
                  className="text-lg font-bold text-[#0F0E47]"
                >
                  Confirm Save to Google Drive
                </h3>
                <p className="text-xs text-[#505081]">
                  Please confirm before creating this file in your Google Drive.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                aria-label="Close confirmation modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-4 space-y-2 text-xs text-[#0F0E47]">
              <p>
                <strong>File Name:</strong> {docTitle}
              </p>
              <p>
                <strong>Format:</strong>{' '}
                {docFormat === 'google-doc'
                  ? 'Google Doc (application/vnd.google-apps.document)'
                  : 'Microsoft Word (.doc)'}
              </p>
              <p>
                <strong>Destination Account:</strong> {driveEmail || 'Connected Google Account'}
              </p>
              <p>
                <strong>Contents:</strong> Complete HealthConnect project guide, Admin
                Account ({ADMIN_GMAIL_ACCOUNT}) section, Demo Accounts table, and{' '}
                {includeScreenshots
                  ? `${PROJECT_FEATURE_SCREENSHOTS.length} embedded screenshots`
                  : 'text specification only'}
                .
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs font-semibold text-[#505081] hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmedSaveToDrive()}
                className="px-4 py-2.5 min-h-[42px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-bold cursor-pointer"
              >
                Confirm &amp; Save to Google Drive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Lightbox */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-[#0B0A33]/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div
            className="max-w-5xl w-full max-h-[90vh] rounded-2xl bg-[#0F0E47] border border-white/15 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-white truncate">{expandedImage.title}</p>
              <button
                type="button"
                onClick={() => setExpandedImage(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-auto p-4 bg-[#0B0A33]">
              <img
                src={expandedImage.src}
                alt={expandedImage.title}
                className="w-full h-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
