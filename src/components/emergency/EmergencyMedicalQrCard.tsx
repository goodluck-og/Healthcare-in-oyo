import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Eye,
  Lock,
  QrCode,
  ShieldAlert,
  Smartphone,
  Watch,
} from 'lucide-react';
import {
  buildEmergencyQrPayload,
  DEFAULT_QR_SHARED_FIELDS,
  generateLocalEmergencyQrPngDataUrl,
  generateLocalEmergencyQrSvg,
  type QrFieldKey,
} from '../../services/emergencyQrService';
import type { EmergencyContact, FamilyProfile } from '../../types/healthcare';

interface EmergencyMedicalQrCardProps {
  profile: Partial<FamilyProfile>;
  primaryContact?: EmergencyContact | null;
  darkTheme?: boolean;
  onUpdateSharedFields?: (fields: QrFieldKey[]) => Promise<void> | void;
}

const FIELD_OPTIONS: Array<{ key: QrFieldKey; label: string }> = [
  { key: 'name', label: 'Full Name' },
  { key: 'dob_age', label: 'DOB, Age & Sex' },
  { key: 'blood_genotype', label: 'Blood Group & Genotype' },
  { key: 'allergies', label: 'Allergies' },
  { key: 'conditions', label: 'Chronic Conditions' },
  { key: 'medications', label: 'Current Medications' },
  { key: 'emergency_contact', label: 'Emergency Contact (ICE)' },
];

export function EmergencyMedicalQrCard({
  profile,
  primaryContact,
  darkTheme = false,
  onUpdateSharedFields,
}: EmergencyMedicalQrCardProps) {
  const [viewMode, setViewMode] = useState<'phone' | 'watch'>('phone');
  const [sharedFields, setSharedFields] = useState<QrFieldKey[]>(
    () =>
      (profile.qrSharedFields && profile.qrSharedFields.length > 0
        ? (profile.qrSharedFields as QrFieldKey[])
        : DEFAULT_QR_SHARED_FIELDS)
  );
  const [qrSvg, setQrSvg] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const payload = useMemo(
    () =>
      buildEmergencyQrPayload({
        profile,
        primaryContact,
        sharedFields,
      }),
    [profile, primaryContact, sharedFields]
  );

  useEffect(() => {
    let active = true;
    void generateLocalEmergencyQrSvg(payload.qrText)
      .then((svg) => {
        if (active) setQrSvg(svg);
      })
      .catch(() => {
        if (active) setQrSvg('');
      });
    return () => {
      active = false;
    };
  }, [payload.qrText]);

  const toggleField = (field: QrFieldKey) => {
    const next = sharedFields.includes(field)
      ? sharedFields.filter((f) => f !== field)
      : [...sharedFields, field];
    if (next.length === 0) return; // Always keep at least 1 field
    setSharedFields(next);
    void onUpdateSharedFields?.(next);
  };

  const handleDownloadPng = async () => {
    try {
      const dataUrl = await generateLocalEmergencyQrPngDataUrl(payload.qrText);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `healthconnect-emergency-qr-${(profile.fullName || 'patient')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}.png`;
      a.click();
    } catch {
      // Ignore download failure
    }
  };

  const handleCopyPayload = async () => {
    try {
      await navigator.clipboard.writeText(payload.qrText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Ignore clipboard failure
    }
  };

  const surfaceClass = darkTheme
    ? 'bg-[#13124A] border-white/12 text-white'
    : 'bg-white border-[#272757]/12 text-[#0F0E47]';
  const mutedText = darkTheme ? 'text-[#C7C8E6]' : 'text-[#505081]';
  const subtleBg = darkTheme ? 'bg-[#0B0A33] border-white/10' : 'bg-[#F5F6FC] border-[#272757]/10';

  return (
    <section className={`rounded-2xl border p-5 sm:p-6 space-y-5 ${surfaceClass}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold flex items-center gap-1.5 ${darkTheme ? 'text-[#FFB585]' : 'text-[#E5484D]'}`}>
            <QrCode className="w-4 h-4" />
            Offline First-Responder Medical ID · Zero Cloud Transfer
          </p>
          <h2 className="text-lg sm:text-xl font-bold mt-1">
            Emergency Medical QR Code (Phone &amp; Smartwatch)
          </h2>
          <p className={`text-xs mt-1 leading-relaxed ${mutedText}`}>
            Scannable offline by any paramedic, ER nurse, or bystander camera—even if you are unconscious or taken to an unfamiliar hospital.
          </p>
        </div>

        {/* Display Surface Switcher: Phone Lock Screen vs Smartwatch Face */}
        <div
          className={`inline-flex rounded-xl p-1 border shrink-0 self-start ${
            darkTheme ? 'bg-[#0B0A33] border-white/12' : 'bg-[#F5F6FC] border-[#272757]/12'
          }`}
        >
          <button
            type="button"
            onClick={() => setViewMode('phone')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              viewMode === 'phone'
                ? 'bg-[#272757] text-white'
                : darkTheme
                  ? 'text-[#C7C8E6]'
                  : 'text-[#505081]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Phone Wallet
          </button>
          <button
            type="button"
            onClick={() => setViewMode('watch')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              viewMode === 'watch'
                ? 'bg-[#272757] text-white'
                : darkTheme
                  ? 'text-[#C7C8E6]'
                  : 'text-[#505081]'
            }`}
          >
            <Watch className="w-3.5 h-3.5" />
            Smartwatch Face
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Phone or Smartwatch QR Preview */}
        <div className="lg:col-span-5 flex flex-col items-center space-y-4">
          {viewMode === 'phone' ? (
            <div className="w-full max-w-[300px] rounded-3xl bg-[#0F0E47] text-white p-5 border border-white/15 shadow-xl space-y-4">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#FF8A8E] flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  MEDICAL ID · ICE
                </span>
                <span className="font-mono text-[#C7C8E6] tabular-nums">
                  {profile.bloodGroup || 'Unknown'} · {profile.genotype || '—'}
                </span>
              </div>
              <div className="bg-white rounded-2xl p-3.5 flex items-center justify-center">
                {qrSvg ? (
                  <div
                    className="w-48 h-48 [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                    aria-label="Offline Emergency Medical QR Code"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-[#505081]">
                    Generating QR...
                  </div>
                )}
              </div>
              <div className="text-center space-y-0.5">
                <p className="text-sm font-bold text-white truncate">{profile.fullName || 'Patient'}</p>
                <p className="text-[11px] text-[#C7C8E6]">
                  Scan offline with any camera for blood group, allergies &amp; ICE
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-56 h-56 rounded-[2.6rem] bg-[#090826] border-[6px] border-[#2C2C5E] p-3.5 shadow-2xl flex flex-col items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-[#FF8A8E] uppercase">
                  ICE · {profile.bloodGroup || '?'}
                </span>
                <div className="bg-white rounded-xl p-1.5 w-36 h-36 flex items-center justify-center">
                  {qrSvg ? (
                    <div
                      className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                      aria-label="Smartwatch Emergency Medical QR Code"
                    />
                  ) : null}
                </div>
                <span className="text-[10px] text-[#C7C8E6] font-mono truncate max-w-full">
                  SOS {profile.emergencyNumber || '112'}
                </span>
              </div>
              <p className={`text-[11px] text-center ${mutedText}`}>
                High-contrast watch face QR for rapid wrist scan
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 w-full">
            <button
              type="button"
              onClick={() => void handleDownloadPng()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Save QR PNG (Lock Screen / Watch)
            </button>
            <button
              type="button"
              onClick={() => void handleCopyPayload()}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl border text-xs font-semibold cursor-pointer ${
                darkTheme
                  ? 'border-white/15 bg-white/6 hover:bg-white/12 text-white'
                  : 'border-[#272757]/15 bg-[#F5F6FC] hover:bg-[#ECEEF9] text-[#0F0E47]'
              }`}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied Text' : 'Copy Decoded Text'}
            </button>
          </div>
        </div>

        {/* Right: What First Responders See + Privacy Field Toggles */}
        <div className="lg:col-span-7 space-y-4">
          <div className={`rounded-xl border p-4 space-y-3 ${subtleBg}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-[#E8702A]" />
                What First Responders See When Scanned
              </p>
              <span className={`text-[11px] font-mono tabular-nums ${mutedText}`}>
                {payload.byteLength} bytes · Offline QR
              </span>
            </div>
            <div className="divide-y divide-[#272757]/10 dark:divide-white/10">
              {payload.lines.map((line) => (
                <div key={line.label} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className={`font-medium ${mutedText}`}>{line.label}</span>
                  <span
                    className={`font-semibold sm:text-right ${
                      line.critical
                        ? darkTheme
                          ? 'text-[#FFB585]'
                          : 'text-[#B91C1C]'
                        : darkTheme
                          ? 'text-white'
                          : 'text-[#0F0E47]'
                    }`}
                  >
                    {line.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              Choose Fields Included in Your Offline QR Code
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FIELD_OPTIONS.map((opt) => {
                const checked = sharedFields.includes(opt.key);
                return (
                  <label
                    key={opt.key}
                    className={`flex items-center gap-2.5 px-3 py-2 min-h-[40px] rounded-xl border text-xs cursor-pointer ${
                      checked
                        ? darkTheme
                          ? 'bg-white/10 border-white/25 text-white'
                          : 'bg-[#F5F6FC] border-[#272757]/25 text-[#0F0E47]'
                        : darkTheme
                          ? 'bg-transparent border-white/10 text-[#9A9CC7]'
                          : 'bg-white border-[#272757]/10 text-[#505081]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleField(opt.key)}
                      className="w-4 h-4 rounded accent-[#E8702A]"
                    />
                    <span className="font-medium">{opt.label}</span>
                  </label>
                );
              })}
            </div>
            <p className={`text-[11px] leading-relaxed ${mutedText}`}>
              Generated 100% locally in your browser using zero external QR servers. Only include what you want paramedics to read on your lock screen or smartwatch.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
