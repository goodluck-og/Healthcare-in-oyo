import React from 'react';
import {
  LayoutDashboard,
  Stethoscope,
  Sparkles,
  CreditCard,
  PhoneCall,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AppRoute } from '../../types/healthcare';

interface BottomTab {
  label: string;
  route: AppRoute;
  icon: React.ComponentType<{ className?: string }>;
  isEmergency?: boolean;
}

const MOBILE_TABS: BottomTab[] = [
  { label: 'Dashboard', route: '/dashboard', icon: LayoutDashboard },
  { label: 'Care', route: '/find-healthcare', icon: Stethoscope },
  { label: 'Hybrid AI', route: '/ai-assistant', icon: Sparkles },
  { label: 'Vitals', route: '/monitoring', icon: CreditCard },
  { label: 'Emergency', route: '/emergency', icon: PhoneCall, isEmergency: true },
];

/**
 * Fixed mobile thumb-zone navigation bar (visible below md breakpoint).
 * Compact 60px bar keeps combined header + bottom nav ergonomic on mobile viewports.
 */
export const MobileBottomNav: React.FC = () => {
  const { route, navigate, user } = useApp();

  if (!user.signedIn && route !== '/ai-assistant') {
    return null;
  }

  return (
    <nav
      aria-label="Mobile quick navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#272757]/12 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-15">
        {MOBILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = route === tab.route;
          return (
            <button
              key={tab.route}
              type="button"
              onClick={() => navigate(tab.route)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-h-[44px] gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                tab.isEmergency
                  ? active
                    ? 'text-[#C9363B] bg-[#FEF2F2]'
                    : 'text-[#E5484D]'
                  : active
                  ? 'text-[#0F0E47]'
                  : 'text-[#6B6B99] hover:text-[#0F0E47]'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.4]' : 'stroke-[1.9]'}`} />
              <span className="truncate max-w-full px-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
