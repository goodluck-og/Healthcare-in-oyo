import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  MapPin,
  PhoneCall,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NIGERIA_CITY_PRESETS } from '../../data/mockNigeriaData';
import { DnaHelix3D } from '../auth/DnaHelix3D';

type AuthPanelMode = 'login' | 'register' | 'forgot';

export function HeroSection() {
  const {
    navigate,
    user,
    signInWithGoogle,
    googleSignInPending,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    authError,
    authNotice,
    clearAuthError,
    clearAuthNotice,
  } = useApp();

  const [panelMode, setPanelMode] = useState<AuthPanelMode>('login');
  const [fullName, setFullName] = useState('');
  const [contactInput, setContactInput] = useState('');
  const [city, setCity] = useState('Ibadan');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next: AuthPanelMode) => {
    clearAuthError();
    clearAuthNotice();
    setPanelMode(next);
  };

  const handleGoogleLogin = async () => {
    clearAuthError();
    clearAuthNotice();
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    clearAuthNotice();
    setSubmitting(true);
    try {
      if (panelMode === 'forgot') {
        await resetPassword(contactInput);
      } else if (panelMode === 'register') {
        await signUpWithEmail(
          fullName.trim() || 'HealthConnect Member',
          contactInput,
          password,
          city
        );
      } else {
        await signInWithEmail(contactInput, password);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="hero"
      className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#0B0A33] text-white flex items-center"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#2A296B_0%,_#121145_48%,_#0B0A33_100%)]"
      />

      <div className="relative z-10 max-w-[1380px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* LEFT: Clean HealthConnect Oyo State Branding + Login / Registration Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 flex flex-col justify-between rounded-3xl bg-[#13124A] border border-white/12 p-6 sm:p-8 shadow-[0_24px_60px_rgba(5,5,28,0.55)]"
          >
            <div className="space-y-6">
              {/* Brand Header */}
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-[#FFB585] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  Connected healthcare for Oyo State · All 27 Oyo Cities &amp; Towns
                </p>
                <h1 className="text-3xl sm:text-[2.15rem] font-bold tracking-tight leading-[1.12] text-white">
                  HealthConnect Oyo State
                </h1>
                <p className="text-sm text-[#C7C8E6] leading-relaxed">
                  Talk to verified Oyo State doctors online first, then decide together when to book
                  a physical exam. Individual plan ₦16,000/mo or Netflix-style Family of 5 plan ₦50,000/mo.
                </p>
              </div>

              {user.signedIn ? (
                /* Signed-in Clean Launchpad */
                <div className="space-y-5 pt-2">
                  <div className="rounded-2xl bg-[#0B0A33] border border-emerald-400/30 p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <p className="font-semibold text-white text-sm">
                        Welcome back, {user.name}
                      </p>
                      <p className="text-[#C7C8E6]">
                        Signed in · {user.city || 'Ibadan'}, Oyo State · Role:{' '}
                        <span className="uppercase text-[#FFB585] font-semibold">{user.role}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 min-h-[46px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <span>Open My Health Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/find-healthcare')}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 min-h-[46px] rounded-xl bg-[#272757] hover:bg-[#353574] border border-white/15 text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <span>Talk to an Oyo State Doctor Online</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/payments')}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 min-h-[46px] rounded-xl bg-white/10 hover:bg-white/16 border border-white/15 text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <span>Monthly Plans (₦16k / ₦50k) &amp; Payment History</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/emergency')}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 min-h-[46px] rounded-xl bg-[#E5484D] hover:bg-[#C9363B] text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>24/7 Oyo Emergency Triage</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Signed-out Split-Screen Auth Form matching notebook sketch */
                <div className="space-y-4">
                  {/* Segmented Login / Register switcher */}
                  <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#0B0A33] p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        panelMode === 'login' || panelMode === 'forgot'
                          ? 'bg-[#272757] text-white'
                          : 'text-[#A6A8D6] hover:text-white'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        panelMode === 'register'
                          ? 'bg-[#272757] text-white'
                          : 'text-[#A6A8D6] hover:text-white'
                      }`}
                    >
                      Create Account
                    </button>
                  </div>

                  {authNotice && (
                    <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/35 p-3 flex items-start gap-2 text-xs text-emerald-100">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-300" />
                      <span>{authNotice}</span>
                    </div>
                  )}

                  {authError && (
                    <div className="rounded-xl bg-[#E5484D]/18 border border-[#E5484D]/45 p-3 flex items-start gap-2 text-xs text-[#FFD6D8]">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#FF8A8E]" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {/* Primary Google Sign-In */}
                  <button
                    type="button"
                    disabled={submitting || googleSignInPending}
                    onClick={() => void handleGoogleLogin()}
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
                        ? 'Signing in...'
                        : 'Continue with Google'}
                    </span>
                  </button>

                  <div className="relative flex items-center py-0.5">
                    <div className="flex-grow border-t border-white/12" />
                    <span className="shrink-0 mx-3 text-[11px] text-[#8686AC] font-medium">
                      OR EMAIL ACCESS
                    </span>
                    <div className="flex-grow border-t border-white/12" />
                  </div>

                  <form onSubmit={(e) => void handleFormSubmit(e)} className="space-y-3">
                    {panelMode === 'register' && (
                      <div>
                        <label
                          htmlFor="hero-fullname"
                          className="block text-xs font-semibold text-[#D7D8EE] mb-1"
                        >
                          Full Name
                        </label>
                        <div className="relative">
                          <UserIcon className="w-4 h-4 text-[#8686AC] absolute left-3.5 top-3.5" />
                          <input
                            id="hero-fullname"
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
                      <label
                        htmlFor="hero-email"
                        className="block text-xs font-semibold text-[#D7D8EE] mb-1"
                      >
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#8686AC] absolute left-3.5 top-3.5" />
                        <input
                          id="hero-email"
                          type="email"
                          required
                          maxLength={160}
                          placeholder="you@example.com"
                          value={contactInput}
                          onChange={(e) => setContactInput(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-sm text-white placeholder:text-[#8686AC] focus:outline-none focus:border-[#8A8EF5]"
                        />
                      </div>
                    </div>

                    {panelMode === 'register' && (
                      <div>
                        <label
                          htmlFor="hero-city"
                          className="block text-xs font-semibold text-[#D7D8EE] mb-1"
                        >
                          Oyo State Town / Hub
                        </label>
                        <select
                          id="hero-city"
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

                    {panelMode !== 'forgot' && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label
                            htmlFor="hero-password"
                            className="block text-xs font-semibold text-[#D7D8EE]"
                          >
                            Password
                          </label>
                          {panelMode === 'login' && (
                            <button
                              type="button"
                              onClick={() => switchMode('forgot')}
                              className="text-[11px] font-semibold text-[#FFB585] hover:underline cursor-pointer"
                            >
                              Forgot password?
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-[#8686AC] absolute left-3.5 top-3.5" />
                          <input
                            id="hero-password"
                            type="password"
                            required
                            minLength={panelMode === 'register' ? 8 : 6}
                            placeholder={
                              panelMode === 'register'
                                ? '8+ chars with upper, lower & number'
                                : 'Enter your password'
                            }
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-sm text-white placeholder:text-[#8686AC] focus:outline-none focus:border-[#8A8EF5]"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 min-h-[46px] rounded-xl bg-[#272757] hover:bg-[#353574] border border-white/15 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      {submitting
                        ? 'Please wait...'
                        : panelMode === 'forgot'
                          ? 'Send Password Reset Link'
                          : panelMode === 'register'
                            ? 'Create Account'
                            : 'Sign In'}
                    </button>

                    {panelMode === 'forgot' && (
                      <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className="w-full text-center text-xs font-semibold text-[#C7C8E6] hover:text-white pt-1 cursor-pointer"
                      >
                        Back to Sign In
                      </button>
                    )}
                  </form>
                </div>
              )}
            </div>

            <div className="pt-5 mt-6 border-t border-white/10 flex items-center justify-between gap-3 text-[11px] text-[#A6A8D6]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#8A8EF5] shrink-0" />
                MDCN, PCN &amp; MLSCN verified architecture
              </span>
              <button
                type="button"
                onClick={() => navigate('/emergency')}
                className="font-semibold text-[#FF8A8E] hover:underline shrink-0 cursor-pointer"
              >
                Emergency SOS →
              </button>
            </div>
          </motion.div>

          {/* RIGHT: Interactive 3D DNA-Inspired Tree & Medical Tech Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 flex flex-col"
          >
            <DnaHelix3D className="flex-1 min-h-[460px] lg:min-h-[600px]" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
