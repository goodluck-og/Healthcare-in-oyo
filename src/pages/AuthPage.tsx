import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Globe,
  HeartPulse,
  Info,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { NIGERIA_CITY_PRESETS } from '../data/mockNigeriaData';
import { useApp, type HealthOnboardingPayload } from '../context/AppContext';
import { DnaHelix3D } from '../components/auth/DnaHelix3D';
import {
  calculateAgeFromDob,
  GLOBAL_EMERGENCY_PRESETS,
  resolveAgeStage,
} from '../services/personalisationEngine';
import {
  ADMIN_GMAIL_ACCOUNT,
  DEMO_SANDBOX_ACCOUNTS,
} from '../data/demoAccounts';
import type { AppRoute, ConfirmedGender } from '../types/healthcare';

const BLOOD_GROUPS = ['Unknown', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const GENOTYPES = ['Unknown', 'AA', 'AS', 'AC', 'SS', 'SC', 'CC'];

function parseCsv(val: string): string[] {
  return val
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function AuthPage({
  mode,
  gateRoute,
}: {
  mode: 'login' | 'register';
  gateRoute?: AppRoute;
}) {
  const {
    signInWithGoogle,
    signInAsDemoAccount,
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

  // Step 1: Account Credentials
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Ibadan');
  const [password, setPassword] = useState('');
  const [forgotMode, setForgotMode] = useState(false);

  // Step 2 (Register): Pre-Account Lifesaving Health Profile & Safety Gating
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [dateOfBirth, setDateOfBirth] = useState('1996-05-15');
  const [genderConfirmed, setGenderConfirmed] = useState<ConfirmedGender>('not_specified');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [genotype, setGenotype] = useState('AA');
  const [allergiesText, setAllergiesText] = useState('');
  const [conditionsText, setConditionsText] = useState('');
  const [medicationsText, setMedicationsText] = useState('');
  const [countryCode, setCountryCode] = useState('NG');
  const [emergencyNumber, setEmergencyNumber] = useState('112');
  const [iceName, setIceName] = useState('');
  const [icePhone, setIcePhone] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const calculatedAge = useMemo(() => calculateAgeFromDob(dateOfBirth), [dateOfBirth]);
  const ageStage = useMemo(() => resolveAgeStage(calculatedAge), [calculatedAge]);

  useEffect(() => {
    setForgotMode(false);
    setRegisterStep(1);
    setLocalError(null);
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

  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    const preset = GLOBAL_EMERGENCY_PRESETS.find((p) => p.countryCode === code);
    if (preset) setEmergencyNumber(preset.emergencyNumber);
  };

  const handleGoogleSignIn = async (loginHintEmail?: string, onboarding?: HealthOnboardingPayload) => {
    clearAuthError();
    clearAuthNotice();
    setLocalError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle(loginHintEmail, onboarding);
    } finally {
      setSubmitting(false);
    }
  };

  const buildOnboardingPayload = (): HealthOnboardingPayload => ({
    fullName: fullName.trim() || 'HealthConnect Member',
    dateOfBirth,
    genderConfirmed,
    bloodGroup,
    genotype,
    allergies: parseCsv(allergiesText),
    chronicConditions: parseCsv(conditionsText),
    currentMedications: parseCsv(medicationsText),
    countryCode,
    emergencyNumber: emergencyNumber.trim() || '112',
    city,
    emergencyContactName: iceName.trim() || undefined,
    emergencyContactPhone: icePhone.trim() || undefined,
    emergencyContactRelation: 'Emergency Contact',
  });

  const handleGoogleRegisterStep2 = async () => {
    clearAuthError();
    clearAuthNotice();
    setLocalError(null);
    if (!dateOfBirth) {
      setLocalError('Please enter your Date of Birth so HealthConnect can tailor safe age-appropriate tools.');
      return;
    }
    if (genderConfirmed === 'not_specified') {
      setLocalError('Please confirm Male or Female before creating your account.');
      return;
    }
    await handleGoogleSignIn(email.trim() || undefined, buildOnboardingPayload());
  };

  const handleAdvanceToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setLocalError(null);
    if (!fullName.trim() || !email.trim()) {
      setLocalError('Please enter your full name and email address to continue.');
      return;
    }
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      setLocalError(
        'Password must be at least 8 characters and include uppercase, lowercase, and a number.'
      );
      return;
    }
    setRegisterStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    clearAuthNotice();
    setLocalError(null);

    if (mode === 'register' && !forgotMode) {
      if (registerStep === 1) {
        handleAdvanceToStep2(e);
        return;
      }
      if (!dateOfBirth) {
        setLocalError('Please enter your Date of Birth so HealthConnect can tailor safe age-appropriate tools.');
        return;
      }
      if (genderConfirmed === 'not_specified') {
        setLocalError('Please confirm Male or Female before creating your account.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (forgotMode) {
        await resetPassword(email);
      } else if (mode === 'register') {
        const onboarding = buildOnboardingPayload();
        await signUpWithEmail(
          fullName.trim() || 'HealthConnect Member',
          email,
          password,
          city,
          onboarding
        );
      } else {
        await signInWithEmail(email, password);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const displayedError = localError || authError;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0B0A33] py-8 sm:py-12 px-4 sm:px-6 lg:px-10 flex items-center">
      <div className="max-w-[1280px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        {/* Left Column: Blue Eclipse Midnight Auth Card */}
        <div className="lg:col-span-5 rounded-3xl bg-[#13124A] border border-white/10 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-2xl">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-[#A6A8D6] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#FFB585]" />
                HealthConnect Universal Workspace · Firebase Auth
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2 tracking-tight">
                {forgotMode
                  ? 'Reset your password'
                  : mode === 'login'
                    ? 'Sign in to HealthConnect'
                    : registerStep === 1
                      ? 'Create your HealthConnect account'
                      : 'Essential Health & Safety Profile'}
              </h1>
              <p className="text-xs text-[#C7C8E6] mt-1.5 leading-relaxed">
                {mode === 'register' && !forgotMode
                  ? registerStep === 1
                    ? 'Step 1 of 2: Set up your secure login. Next, confirm age, gender, and emergency details so your dashboard and QR Medical ID are tailored safely.'
                    : 'Step 2 of 2: Confirms age-appropriate safety gating (protecting minors 0–12 automatically) and populates your offline Emergency Medical QR Code.'
                  : 'Access your personalised health dashboard, Hybrid AI symptom & photo guidance, smartwatch GPS alerts, and offline Emergency Medical QR.'}
              </p>
            </div>

            {mode === 'register' && !forgotMode && (
              <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                <div
                  className={`rounded-xl px-3 py-2 border ${
                    registerStep === 1
                      ? 'bg-[#272757] border-[#FFB585]/60 text-white'
                      : 'bg-[#0B0A33] border-emerald-400/30 text-emerald-300'
                  }`}
                >
                  1. Account Login
                </div>
                <div
                  className={`rounded-xl px-3 py-2 border ${
                    registerStep === 2
                      ? 'bg-[#272757] border-[#FFB585]/60 text-white'
                      : 'bg-[#0B0A33] border-white/10 text-[#8686AC]'
                  }`}
                >
                  2. Age, Gender &amp; Vital Data
                </div>
              </div>
            )}

            {user.signedIn && (
              <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/30 p-3.5 flex items-start justify-between gap-3 text-xs text-emerald-100">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Signed in as {user.name}</p>
                    <p className="text-emerald-200/90 mt-0.5">Opening your personalised dashboard...</p>
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
                    'Sign in to your HealthConnect account to access this section, manage family care, or persist records.'}
                </p>
              </div>
            )}

            {displayedError && (
              <div className="rounded-xl bg-[#E5484D]/18 border border-[#E5484D]/45 p-3.5 space-y-2.5 text-xs text-[#FFD6D8]">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#FF8A8E]" />
                  <p className="leading-relaxed">{displayedError}</p>
                </div>
                {displayedError.includes('Email/Password sign-in is not enabled') && (
                  <div className="pl-6 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={submitting || googleSignInPending}
                      onClick={() =>
                        void (mode === 'register' && registerStep === 2
                          ? handleGoogleRegisterStep2()
                          : handleGoogleSignIn(email.trim() || undefined))
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Continue with Google Instead
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* One-Click Google Sign-In (shown on Login & Register Step 1) */}
            {(mode === 'login' || registerStep === 1) && !forgotMode && (
              <>
                <div className="space-y-2.5">
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

                  {mode === 'login' && (
                    <button
                      type="button"
                      disabled={submitting || googleSignInPending}
                      onClick={() => void handleGoogleSignIn(ADMIN_GMAIL_ACCOUNT)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 min-h-[42px] rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 disabled:opacity-60 text-emerald-200 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                      <span>Admin Sign-In (Google · {ADMIN_GMAIL_ACCOUNT})</span>
                    </button>
                  )}

                  <p className="text-[11px] text-[#A6A8D6] text-center">
                    Verified Google sign-in unlocks live Firestore persistence &amp; Admin Governance.
                  </p>
                </div>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-white/12" />
                  <span className="shrink-0 mx-3 text-[11px] text-[#8686AC] font-medium">
                    {mode === 'login' ? 'OR DEMO / EMAIL SIGN-IN' : 'OR SET UP HEALTH PROFILE FIRST'}
                  </span>
                  <div className="flex-grow border-t border-white/12" />
                </div>
              </>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3.5">
              {/* Step 1 or Login / Forgot */}
              {(mode === 'login' || forgotMode || registerStep === 1) && (
                <>
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
                        City / Primary Care Hub
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
                        <option value="International / Other" className="bg-[#0F0E47]">
                          International / Other City
                        </option>
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
                    className="w-full inline-flex items-center justify-center gap-2 py-3 min-h-[46px] rounded-xl bg-[#272757] hover:bg-[#353574] border border-white/15 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <span>
                      {submitting
                        ? 'Please wait...'
                        : forgotMode
                          ? 'Send Password Reset Email'
                          : mode === 'login'
                            ? 'Sign In with Email'
                            : 'Next: Age, Gender & Emergency Details'}
                    </span>
                    {mode === 'register' && !forgotMode && <ArrowRight className="w-4 h-4" />}
                  </button>
                </>
              )}

              {/* Step 2 (Register): Pre-Account Health & Safety Onboarding */}
              {mode === 'register' && !forgotMode && registerStep === 2 && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="reg-dob" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                        Date of Birth (Required)
                      </label>
                      <input
                        id="reg-dob"
                        type="date"
                        required
                        max={new Date().toISOString().slice(0, 10)}
                        min="1905-01-01"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-country" className="block text-xs font-semibold text-[#D7D8EE] mb-1 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-[#FFB585]" />
                        Region Emergency Line
                      </label>
                      <select
                        id="reg-country"
                        value={countryCode}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white"
                      >
                        {GLOBAL_EMERGENCY_PRESETS.map((p) => (
                          <option key={p.countryCode} value={p.countryCode} className="bg-[#0F0E47]">
                            {p.countryName} ({p.emergencyNumber})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Live Age Stage & Minor Safety Indicator */}
                  <div
                    className={`rounded-xl p-3 border text-xs flex items-start gap-2.5 ${
                      ageStage.isGuardianManaged
                        ? 'bg-amber-500/15 border-amber-400/40 text-amber-100'
                        : 'bg-[#0B0A33] border-white/12 text-[#D7D8EE]'
                    }`}
                  >
                    {ageStage.isGuardianManaged ? (
                      <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                    ) : (
                      <HeartPulse className="w-4 h-4 text-[#6EE7B7] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold text-white">
                        Age <span className="tabular-nums">{calculatedAge}</span> · {ageStage.label}
                      </p>
                      <p className="text-[11px] mt-0.5 leading-snug">
                        {ageStage.isGuardianManaged
                          ? 'Guardian Child Safety Lock active: adult reproductive & adult-only content will remain hidden.'
                          : ageStage.guidanceNote}
                      </p>
                    </div>
                  </div>

                  {/* Gender Confirmation */}
                  <div>
                    <span className="block text-xs font-semibold text-[#D7D8EE] mb-1.5">
                      Confirm Gender (Required)
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(['female', 'male'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGenderConfirmed(g)}
                          className={`py-2.5 px-3 min-h-[44px] rounded-xl border text-xs font-bold capitalize cursor-pointer transition-colors ${
                            genderConfirmed === g
                              ? 'bg-[#E8702A] border-[#FFB585] text-white'
                              : 'bg-[#0B0A33] border-white/15 text-[#D7D8EE]'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Blood Group & Genotype */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="reg-blood" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                        Blood Group
                      </label>
                      <select
                        id="reg-blood"
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white"
                      >
                        {BLOOD_GROUPS.map((bg) => (
                          <option key={bg} value={bg} className="bg-[#0F0E47]">
                            {bg}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="reg-geno" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                        Genotype
                      </label>
                      <select
                        id="reg-geno"
                        value={genotype}
                        onChange={(e) => setGenotype(e.target.value)}
                        className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white"
                      >
                        {GENOTYPES.map((g) => (
                          <option key={g} value={g} className="bg-[#0F0E47]">
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="reg-allergies" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                        Allergies (Optional)
                      </label>
                      <input
                        id="reg-allergies"
                        type="text"
                        placeholder="e.g. Penicillin, Peanuts"
                        value={allergiesText}
                        onChange={(e) => setAllergiesText(e.target.value)}
                        className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white placeholder:text-[#8686AC]"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-conds" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                        Conditions / Meds (Optional)
                      </label>
                      <input
                        id="reg-conds"
                        type="text"
                        placeholder="e.g. Asthma, Metformin"
                        value={conditionsText}
                        onChange={(e) => setConditionsText(e.target.value)}
                        className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white placeholder:text-[#8686AC]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="reg-ice-name" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                        Emergency Contact Name
                      </label>
                      <input
                        id="reg-ice-name"
                        type="text"
                        placeholder="Parent / Next of kin"
                        value={iceName}
                        onChange={(e) => setIceName(e.target.value)}
                        className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white placeholder:text-[#8686AC]"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-ice-phone" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                        Emergency Phone
                      </label>
                      <input
                        id="reg-ice-phone"
                        type="tel"
                        placeholder="+234 800 000 0000"
                        value={icePhone}
                        onChange={(e) => setIcePhone(e.target.value)}
                        className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white font-mono placeholder:text-[#8686AC]"
                      />
                    </div>
                  </div>

                  {/* Hidden optional current meds input for completeness */}
                  <input
                    type="hidden"
                    value={medicationsText}
                    onChange={(e) => setMedicationsText(e.target.value)}
                  />

                  <div className="space-y-2.5 pt-1">
                    <button
                      type="button"
                      disabled={submitting || googleSignInPending}
                      onClick={() => void handleGoogleRegisterStep2()}
                      className="w-full py-3 min-h-[46px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] disabled:opacity-60 text-white text-sm font-bold transition-colors cursor-pointer"
                    >
                      {submitting || googleSignInPending
                        ? 'Signing in with Google...'
                        : 'Continue with Google & Save Health Profile'}
                    </button>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setRegisterStep(1)}
                        className="px-4 py-2.5 min-h-[42px] rounded-xl bg-white/8 hover:bg-white/15 text-xs font-semibold text-[#D7D8EE] cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 py-2.5 min-h-[42px] rounded-xl bg-[#272757] hover:bg-[#353574] border border-white/15 disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {submitting ? 'Creating Account...' : 'Or Create with Email & Password'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

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

            {/* Interactive Demo Sandbox Accounts (Isolated — Zero Real Firestore / Admin Access) */}
            {mode === 'login' && !forgotMode && (
              <div className="rounded-2xl bg-[#0B0A33] border border-white/12 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-white">
                    Demo Sandbox Accounts (Instant Evaluation)
                  </p>
                  <span className="text-[10px] font-mono text-[#FFB585]">Isolated Sandbox</span>
                </div>
                <p className="text-[11px] text-[#A6A8D6] leading-snug">
                  Enter any demo email &amp; password above or tap a card to test age safety, wearables, doctor, and hospital portals without touching live patient records.
                </p>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {DEMO_SANDBOX_ACCOUNTS.map((acc) => (
                    <div
                      key={acc.id}
                      className="rounded-xl bg-[#161554] border border-white/10 p-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{acc.label}</p>
                        <p className="text-[10px] font-mono text-[#C7C8E6] truncate">
                          {acc.email} · {acc.password}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(acc.email);
                          setPassword(acc.password);
                          signInAsDemoAccount(acc.id);
                        }}
                        className="shrink-0 px-2.5 py-1.5 rounded-lg bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Log In
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/10 text-center text-xs text-[#B8BADB] space-y-2.5">
            <div>
              {mode === 'login' ? (
                <>
                  New to HealthConnect?{' '}
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
