import React, { useState } from 'react';
import { Download, Share, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'drawer' | 'banner';
  onAction?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'navbar',
  onAction,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Suppress button automatically when already running as an installed standalone PWA
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      try {
        await install();
      } finally {
        setInstalling(false);
        onAction?.();
      }
      return;
    }
    setShowGuide(true);
  };

  const buttonClasses =
    variant === 'drawer'
      ? 'w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl border border-[#272757]/20 bg-[#F5F6FC] text-sm font-semibold text-[#0F0E47] hover:bg-[#EAEBF8] transition-colors cursor-pointer'
      : variant === 'banner'
      ? 'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-white text-[#0F0E47] hover:bg-[#EAEBF8] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer'
      : 'inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 rounded-lg border border-[#272757]/20 text-xs sm:text-sm font-medium text-[#0F0E47] hover:bg-[#F5F6FC] transition-colors whitespace-nowrap shrink-0 cursor-pointer';

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={installing}
        aria-label="Install HealthConnect Oyo State app"
        className={buttonClasses}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>
          {installing
            ? 'Installing...'
            : isInstallable
            ? 'Install App'
            : isIOS
            ? 'Install on iPhone'
            : 'Install App'}
        </span>
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0B0A33]/70 backdrop-blur-sm p-0 sm:p-4"
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white text-[#0F0E47] border border-[#272757]/15 p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/pwa-192x192.png"
                  alt="HealthConnect Oyo State icon"
                  className="w-12 h-12 rounded-xl border border-[#272757]/10 shrink-0"
                />
                <div>
                  <h3 id="pwa-install-guide-title" className="text-base font-bold text-[#0F0E47]">
                    Install HealthConnect Oyo State
                  </h3>
                  <p className="text-xs text-[#505081]">
                    Launch from your home screen with offline health guides & Local AI.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close installation guide"
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-[#505081] hover:bg-[#F5F6FC] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-3 text-sm text-[#272757]">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#F5F6FC] border border-[#272757]/15 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Open this page in <strong>Safari</strong> and tap the{' '}
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <Share className="w-3.5 h-3.5" /> Share
                    </span>{' '}
                    button in the browser toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#F5F6FC] border border-[#272757]/15 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#F5F6FC] border border-[#272757]/15 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Tap <strong>Add</strong> — <strong>HealthOyo</strong> will open full-screen like
                    a native app.
                  </span>
                </li>
              </ol>
            ) : (
              <div className="space-y-3 text-sm text-[#272757]">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-[#4B50D6] shrink-0 mt-0.5" />
                  <p>
                    <strong>Android (Chrome / Edge):</strong> Tap the browser menu (<strong>⋮</strong>)
                    and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
                  <p>
                    <strong>Desktop (Chrome / Edge):</strong> Click the install icon in the address
                    bar to launch HealthConnect Oyo State in its own window.
                  </p>
                </div>
                <p className="text-xs text-[#505081] pt-1">
                  Note: Inside embedded preview frames, open the direct app URL in a full browser tab
                  to trigger one-tap installation.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full min-h-[44px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
