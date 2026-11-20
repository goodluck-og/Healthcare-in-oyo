import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Info,
  Lock,
  Mail,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { NIGERIA_CITY_PRESETS } from '../data/mockNigeriaData';
import { useApp } from '../context/AppContext';
import { DnaHelix3D } from '../components/auth/DnaHelix3D';
import type { AppRoute } from '../types/healthcare';

export function AuthPage({
  mode,
  gateRoute,
}: {
  mode: 'login' | 'register';
  gateRoute?: AppRoute;
}) {
  const {
    signInWithGoogle,
    googleSignInPending,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    authLoading,
    authError,
    clearAuthError,
    authNotice,
    clearAuthNotice,
    pendingPostLoginRoute,
    navigate,
    user,
  } = useApp();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Ibadan');
  const [password, setPassword] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForgotMode(false);
  }, [mode]);

  useEffect(() => {
    if (!authLoading && user.signedIn) {
      const target =
        pendingPostLoginRoute ||
        (gateRoute && gateRoute !== '/login' && gateRoute !== '/register'
          ? gateRoute
          : '/dashboard');
      navigate(target);
    }
  }, [authLoading, user.signedIn, pendingPostLoginRoute, gateRoute, navigate]);

  const handleGoogleSignIn = async () => {
    clearAuthError();
    clearAuthNotice();
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    clearAuthNotice();
    setSubmitting(true);
    try {
      if (forgotMode) {
        await resetPassword(email);
      } else if (mode === 'register') {
        await signUpWithEmail(fullName.trim() || 'HealthConnect Member', email, password, city);
      } else {
        await signInWithEmail(email, password);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0B0A33] py-8 sm:py-12 px-4 sm:px-6 lg:px-10 flex items-center">
      <div className="max-w-[1280px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        {/* Left Column: Blue Eclipse Midnight Auth Card */}
        <div className="lg:col-span-5 rounded-3xl bg-[#13124A] border border-white/10 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-2xl">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-[#A6A8D6] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#FFB585]" />
                Oyo State Clinical Workspace · Firebase Auth
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2 tracking-tight">
                {forgotMode
                  ? 'Reset your password'
                  : mode === 'login'
                    ? 'Sign in to HealthConnect'
                    : 'Create your HealthConnect account'}
              </h1>
              <p className="text-xs text-[#C7C8E6] mt-1.5 leading-relaxed">
                Access your unified personal timeline, family profiles, rehabilitation progress, wallet refunds, and Oyo State bookings.
              </p>
            </div>

            {user.signedIn && (
              <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/30 p-3.5 flex items-start justify-between gap-3 text-xs text-emerald-100">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Signed in as {user.name}</p>
                    <p className="text-emerald-200/90 mt-0.5">Opening your midnight dashboard...</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="font-semibold underline shrink-0 cursor-pointer"
                >
                  Open Now
                </button>
              </div>
            )}

            {(authNotice || gateRoute) && (
              <div className="rounded-xl bg-[#272757] border border-white/15 p-3.5 flex items-start gap-2.5 text-xs text-[#ECEEFB]">
                <Info className="w-4 h-4 text-[#FFB585] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {authNotice ||
                    'Sign in to your HealthConnect Oyo State account to access this section, manage family care, or persist records.'}
                </p>
              </div>
            )}

            {authError && (
              <div className="rounded-xl bg-[#E5484D]/18 border border-[#E5484D]/45 p-3.5 flex items-start gap-2.5 text-xs text-[#FFD6D8]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#FF8A8E]" />
                <p className="leading-relaxed">{authError}</p>
              </div>
            )}

            {/* One-Click Google Sign-In */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={submitting || googleSignInPending}
                onClick={() => void handleGoogleSignIn()}
                className="w-full flex items-center justify-center gap-2.5 py-3 min-h-[46px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#FFFFFF"
                    d="M21.35 11.1H12v3.2h5.35c-.25 1.35-1.02 2.49-2.18 3.25v2.7h3.52c2.06-1.9 3.25-4.7 3.25-8.02 0-.7-.06-1.4-.19-2.13z"
                  />
                  <path
                    fill="#FFE5D4"
                    d="M12 22c2.95 0 5.42-.98 7.23-2.65l-3.52-2.7c-.98.66-2.23 1.05-3.71 1.05-2.85 0-5.27-1.92-6.13-4.5H2.23v2.82C4.03 19.6 7.72 22 12 22z"
                  />
                  <path
                    fill="#FFD3B6"
                    d="M5.87 13.2A6.01 6.01 0 0 1 5.55 12c0-.42.08-.83.2-1.2V7.98H2.23A9.98 9.98 0 0 0 1.2 12c0 1.61.39 3.14 1.03 4.02l3.64-2.82z"
                  />
                  <path
                    fill="#FFFFFF"
                    d="M12 6.3c1.6 0 3.04.55 4.17 1.63l3.13-3.13C17.41 3.04 14.94 2 12 2 7.72 2 4.03 4.4 2.23 7.98l3.64 2.82C6.73 8.22 9.15 6.3 12 6.3z"
                  />
                </svg>
                <span>
                  {submitting || googleSignInPending
                    ? 'Signing in with Google...'
                    : 'Continue with Google'}
                </span>
              </button>
              <p className="text-[11px] text-[#A6A8D6] text-center">
                Instant one-click sign-in directly into your Cloud Firestore dashboard.
              </p>
            </div>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-white/12" />
              <span className="shrink-0 mx-3 text-[11px] text-[#8686AC] font-medium">
                OR EMAIL &amp; PASSWORD
              </span>
              <div className="flex-grow border-t border-white/12" />
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3.5">
              {!forgotMode && mode === 'register' && (
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-[#8686AC] absolute left-3.5 top-3.5" />
                    <input
                      id="auth-name"
                      type="text"
                      required
                      maxLength={100}
                      placeholder="e.g. Toluwanimi Adeyemi"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-sm text-white placeholder:text-[#8686AC] focus:outline-none focus:border-[#8A8EF5]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8686AC] absolute left-3.5 top-3.5" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    maxLength={160}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-sm text-white placeholder:text-[#8686AC] focus:outline-none focus:border-[#8A8EF5]"
                  />
                </div>
              </div>

              {!forgotMode && mode === 'register' && (
                <div>
                  <label htmlFor="auth-city" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                    Oyo State Town / Primary Hub
                  </label>
                  <select
                    id="auth-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-sm text-white focus:outline-none focus:border-[#8A8EF5]"
                  >
                    {Object.keys(NIGERIA_CITY_PRESETS).map((c) => (
                      <option key={c} value={c} className="bg-[#0F0E47]">
                        {c} ({NIGERIA_CITY_PRESETS[c].state})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!forgotMode && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="auth-pass" className="block text-xs font-semibold text-[#D7D8EE]">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          clearAuthError();
                          clearAuthNotice();
                          setForgotMode(true);
                        }}
                        className="text-[11px] font-semibold text-[#FFB585] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    id="auth-pass"
                    type="password"
                    required
                    minLength={mode === 'register' ? 8 : 6}
                    placeholder={
                      mode === 'register'
                        ? 'Min 8 chars (upper, lower & number)'
                        : 'Enter your password'
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-sm text-white placeholder:text-[#8686AC] focus:outline-none focus:border-[#8A8EF5]"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 min-h-[46px] rounded-xl bg-[#272757] hover:bg-[#353574] border border-white/15 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {submitting
                  ? 'Please wait...'
                  : forgotMode
                    ? 'Send Password Reset Email'
                    : mode === 'login'
                      ? 'Sign In with Email'
                      : 'Create Account & Verify Email'}
              </button>

              {forgotMode && (
                <button
                  type="button"
                  onClick={() => {
                    clearAuthError();
                    clearAuthNotice();
                    setForgotMode(false);
                  }}
                  className="w-full text-center text-xs font-semibold text-[#C7C8E6] hover:text-white cursor-pointer"
                >
                  Back to Sign In
                </button>
              )}
            </form>
          </div>

          <div className="pt-4 border-t border-white/10 text-center text-xs text-[#B8BADB] space-y-2.5">
            <div>
              {mode === 'login' ? (
                <>
                  New to HealthConnect Oyo State?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      clearAuthError();
                      navigate('/register');
                    }}
                    className="font-semibold text-[#FFB585] hover:underline cursor-pointer"
                  >
                    Create Account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      clearAuthError();
                      navigate('/login');
                    }}
                    className="font-semibold text-[#FFB585] hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
            <p className="text-[11px] text-[#8686AC] flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#8A8EF5] shrink-0" />
              Sensitive health records are protected by owner-only Firestore rules.
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D7D8EE] hover:text-white pt-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Home Page
            </button>
          </div>
        </div>

        {/* Right Column: Interactive 3D DNA Double Helix Showcase */}
        <div className="lg:col-span-7 flex flex-col">
          <DnaHelix3D className="flex-1 min-h-[460px] lg:min-h-[620px]" />
        </div>
      </div>
    </div>
  );
}
