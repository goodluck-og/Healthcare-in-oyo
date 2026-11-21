import React from 'react';
import { ShieldCheck, Lock, Cloud, X } from 'lucide-react';

interface AiConsentModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const AiConsentModal: React.FC<AiConsentModalProps> = ({
  open,
  onAccept,
  onDecline,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-consent-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0B0A33]/75 backdrop-blur-sm p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white text-[#0F0E47] border border-[#272757]/15 p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#F5F6FC] border border-[#272757]/15 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#272757]" />
            </div>
            <div>
              <h3 id="ai-consent-modal-title" className="text-base font-bold text-[#0F0E47]">
                Health AI Privacy &amp; Consent Notice
              </h3>
              <p className="text-xs text-[#505081]">
                Informed by Nigeria Data Protection Act (NDPA) data-minimization principles
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDecline}
            aria-label="Close privacy consent notice"
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-[#505081] hover:bg-[#F5F6FC] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-sm text-[#272757] leading-relaxed">
          <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-[#0F0E47] text-xs uppercase tracking-wide">
              <Lock className="w-3.5 h-3.5 text-[#15803D]" />
              <span>What Stays Local on Your Device</span>
            </div>
            <p className="text-xs sm:text-sm text-[#505081]">
              Offline Health Library lookups and on-device Gemini Nano prompts stay on your device.
              Sensitive patient records are never cached in browser Cache Storage or unrestricted
              IndexedDB.
            </p>
          </div>

          <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-[#0F0E47] text-xs uppercase tracking-wide">
              <Cloud className="w-3.5 h-3.5 text-[#4B50D6]" />
              <span>Optional Cloud AI Profile Context</span>
            </div>
            <p className="text-xs sm:text-sm text-[#505081]">
              When you turn on <strong>Include Profile Context</strong> for online Cloud AI, only a
              minimized clinical summary (age group, town, blood group, latest BP/glucose/lab values)
              is sent over HTTPS through our secure server—never your phone number, street address,
              password, or payment details. You can turn this off at any time.
            </p>
          </div>

          <p className="text-xs text-[#505081]">
            <strong>Important:</strong> AI responses provide general health education only and are
            not a confirmed medical diagnosis or prescription. In emergencies, call{' '}
            <strong>112</strong> immediately.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onDecline}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#272757]/20 text-sm font-semibold text-[#272757] hover:bg-[#F5F6FC] transition-colors cursor-pointer"
          >
            Keep Anonymized / Local Only
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            I Consent — Enable Context
          </button>
        </div>
      </div>
    </div>
  );
};
