import React from 'react';
import { WifiOff, Wifi, BookOpen } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useApp } from '../../context/AppContext';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, justReconnected } = useOnlineStatus();
  const { navigate, route } = useApp();

  if (isOnline && !justReconnected) {
    return null;
  }

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="w-full bg-[#78350F] text-white border-b border-amber-400/30"
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-200" />
            <p className="leading-snug">
              <strong>Offline Mode:</strong> Local AI &amp; 6 WHO/Nigeria Health Guides remain
              available. Cloud AI, doctor sync, and payments resume automatically when back online.
            </p>
          </div>
          {route !== '/ai-assistant' && (
            <button
              type="button"
              onClick={() => navigate('/ai-assistant')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Open Offline AI &amp; Guides</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-[#14532D] text-white border-b border-emerald-400/30"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-2 flex items-center gap-2 text-xs sm:text-sm">
        <Wifi className="w-4 h-4 shrink-0 text-emerald-200" />
        <span>Back online — Hybrid Cloud AI and HealthConnect Oyo State sync restored.</span>
      </div>
    </div>
  );
};
