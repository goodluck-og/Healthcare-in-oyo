import React, { useEffect, useState } from 'react';
import { Menu, X, PhoneCall, User, LogOut } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AppRoute } from '../../types/healthcare';

interface NavLinkItem {
  label: string;
  route: AppRoute;
  hash?: string;
}

const DESKTOP_LINKS: NavLinkItem[] = [
  { label: 'Home', route: '/' },
  { label: 'Oyo Care Directory', route: '/find-healthcare' },
  { label: 'Plans & History', route: '/payments' },
  { label: 'AI Assistant', route: '/ai-assistant' },
  { label: 'Emergency', route: '/emergency' },
  { label: 'About', route: '/about' },
];

export function Navbar() {
  const { route, navigate, user, signInWithGoogle, googleSignInPending, signOut } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleNav = (item: NavLinkItem) => {
    setDrawerOpen(false);
    navigate(item.route, item.hash);
  };

  const roleLabel =
    user.role === 'administrator'
      ? 'Admin'
      : user.role === 'doctor'
      ? 'Doctor'
      : user.role === 'hospital'
      ? 'Hospital'
      : 'Patient';

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 border-b border-[#272757]/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNav({ label: 'Home', route: '/' })}
          className="text-left text-base sm:text-lg font-bold tracking-tight text-[#0F0E47] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#272757] rounded-md px-1 py-1 cursor-pointer"
        >
          <span className="hidden sm:inline">HealthConnect Oyo State</span>
          <span className="sm:hidden">HealthConnect Oyo</span>
        </button>

        {/* Zone 2: Desktop Links (Only Home visible until signed in; full app links once signed in) */}
        <nav aria-label="Primary navigation" className="hidden xl:flex items-center gap-6">
          {(user.signedIn ? DESKTOP_LINKS : DESKTOP_LINKS.slice(0, 1)).map((item) => {
            const isActive =
              item.hash === undefined && route === item.route;
            const isEmergency = item.route === '/emergency';
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleNav(item)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#272757] rounded-t-sm ${
                  isEmergency
                    ? route === '/emergency'
                      ? 'text-[#E5484D] border-[#E5484D]'
                      : 'text-[#E5484D] border-transparent hover:border-[#E5484D]'
                    : isActive
                    ? 'text-[#0F0E47] border-[#272757]'
                    : 'text-[#505081] border-transparent hover:text-[#0F0E47] hover:border-[#8686AC]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Desktop Actions & Mobile Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Desktop Account Controls */}
          <div className="hidden md:flex items-center gap-3">
            {user.signedIn ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#272757] hover:text-[#0F0E47] px-3 py-2 rounded-lg hover:bg-[#F5F6FC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>{roleLabel} Dashboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#272757] hover:bg-[#0F0E47] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-sm font-medium text-[#272757] hover:text-[#0F0E47] px-3 py-2 rounded-lg hover:bg-[#F5F6FC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Login
                </button>
                <button
                  type="button"
                  disabled={googleSignInPending}
                  onClick={() => void signInWithGoogle()}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#272757] hover:bg-[#0F0E47] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {googleSignInPending ? 'Signing in...' : 'Sign in with Google'}
                </button>
              </>
            )}
          </div>

          {/* Mobile Prominent Emergency Button (visible once signed in) */}
          {user.signedIn && (
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                navigate('/emergency');
              }}
              className="xl:hidden inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-[#E5484D] hover:bg-[#C9363B] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Emergency</span>
            </button>
          )}

          {/* Hamburger Button for Tablet/Mobile */}
          <button
            type="button"
            aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setDrawerOpen((o) => !o)}
            className="xl:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[#272757]/15 text-[#0F0E47] hover:bg-[#F5F6FC] transition-colors cursor-pointer"
          >
            {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Accessible Mobile / Tablet Drawer */}
      {drawerOpen && (
        <div
          id="mobile-nav-drawer"
          role="dialog"
          aria-label="Mobile Navigation"
          className="xl:hidden border-t border-[#272757]/10 bg-white px-4 py-5 space-y-4 shadow-xl"
        >
          <nav aria-label="Mobile menu links" className="grid grid-cols-1 gap-1.5">
            {(user.signedIn ? DESKTOP_LINKS : DESKTOP_LINKS.slice(0, 1)).map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleNav(item)}
                className={`w-full text-left px-3.5 py-3 min-h-[44px] rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  item.route === '/emergency'
                    ? 'text-[#E5484D] bg-[#E5484D]/8 hover:bg-[#E5484D]/15'
                    : route === item.route && !item.hash
                    ? 'text-[#0F0E47] bg-[#F5F6FC] font-semibold'
                    : 'text-[#272757] hover:bg-[#F5F6FC]'
                }`}
              >
                {item.label}
              </button>
            ))}
            {user.signedIn && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate('/dashboard');
                  }}
                  className="w-full text-left px-3.5 py-3 min-h-[44px] rounded-xl text-sm font-medium text-[#272757] hover:bg-[#F5F6FC] cursor-pointer"
                >
                  {`${roleLabel} Workspace`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate('/monitoring');
                  }}
                  className="w-full text-left px-3.5 py-3 min-h-[44px] rounded-xl text-sm font-medium text-[#272757] hover:bg-[#F5F6FC] cursor-pointer"
                >
                  BP & Glucose Tracking
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate('/payments');
                  }}
                  className="w-full text-left px-3.5 py-3 min-h-[44px] rounded-xl text-sm font-medium text-[#272757] hover:bg-[#F5F6FC] cursor-pointer"
                >
                  Payments & Receipts
                </button>
              </>
            )}
          </nav>

          {user.signedIn ? (
            <div className="pt-3 border-t border-[#272757]/10">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  void signOut();
                }}
                className="w-full py-3 min-h-[44px] rounded-xl bg-[#272757] text-white text-sm font-medium hover:bg-[#0F0E47] cursor-pointer"
              >
                Sign Out ({user.name})
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-[#272757]/10 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  navigate('/login');
                }}
                className="w-full py-3 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm font-medium text-[#0F0E47] hover:bg-[#F5F6FC] cursor-pointer"
              >
                Login
              </button>
              <button
                type="button"
                disabled={googleSignInPending}
                onClick={() => {
                  setDrawerOpen(false);
                  void signInWithGoogle();
                }}
                className="w-full py-3 min-h-[44px] rounded-xl bg-[#272757] text-white text-sm font-medium hover:bg-[#0F0E47] disabled:opacity-60 cursor-pointer"
              >
                {googleSignInPending ? 'Signing in...' : 'Sign in with Google'}
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
