import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Bell,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Dumbbell,
  FileText,
  FlaskConical,
  Heart,
  HeartPulse,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  PhoneCall,
  Pill,
  QrCode,
  Search,
  Settings,
  Syringe,
  User as UserIcon,
  Users,
  Wallet,
  Watch,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNaira, useApp } from '../context/AppContext';
import { RolePortalsSection } from '../components/portals/RolePortalsSection';
import { UserProfile } from '../components/profile/UserProfile';
import { AppointmentHistory } from '../components/appointments/AppointmentHistory';
import { MedicalRecords } from '../components/records/MedicalRecords';
import {
  MedicationReminders,
  RemindersOverviewWidget,
} from '../components/reminders/MedicationReminders';
import { HealthWallet } from '../components/wallet/HealthWallet';
import { RehabilitationStudio } from '../components/rehab/RehabilitationStudio';
import { CycleTrackerCard } from '../components/wellness/CycleTrackerCard';
import { SpecialCareHub } from '../components/wellness/SpecialCareHub';
import { HealthTimeline } from '../components/timeline/HealthTimeline';
import { NetflixFamilyHub } from '../components/family/NetflixFamilyHub';
import { PersonalisedDashboardHub } from '../components/dashboard/PersonalisedDashboardHub';
import { SmartwatchHub } from '../components/monitoring/SmartwatchHub';
import { EmergencyMedicalQrCard } from '../components/emergency/EmergencyMedicalQrCard';
import { HealthOnboardingModal } from '../components/onboarding/HealthOnboardingModal';
import { buildPersonalisedDashboardPlan } from '../services/personalisationEngine';
import type { FamilyProfile } from '../types/healthcare';

type DashboardTab =
  | 'overview'
  | 'profile'
  | 'wearable'
  | 'qr'
  | 'records'
  | 'labs'
  | 'appointments'
  | 'vitals'
  | 'womens'
  | 'care'
  | 'rehab'
  | 'timeline'
  | 'wallet'
  | 'reminders'
  | 'family'
  | 'contacts'
  | 'portals';

function RadialProgressRing({
  percent,
  color,
  label,
}: {
  percent: number;
  color: string;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 52 52" aria-hidden="true">
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="4.5"
        />
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-white tabular-nums">{label}</span>
    </div>
  );
}

const NAV_ITEMS: Array<{
  id: DashboardTab;
  label: string;
  keywords: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Dashboard', keywords: 'summary home basic kpi overview personalised', icon: HeartPulse },
  { id: 'profile', label: 'Profile', keywords: 'blood group genotype allergies sickle cell dob', icon: UserIcon },
  { id: 'wearable', label: 'Smartwatch & GPS', keywords: 'watch wearable heart rate spo2 bluetooth sos gps', icon: Watch },
  { id: 'qr', label: 'Emergency QR ID', keywords: 'qr code first responder lock screen watch medical id', icon: QrCode },
  { id: 'records', label: 'Medical Records', keywords: 'documents prescriptions history', icon: FileText },
  { id: 'labs', label: 'Lab Results', keywords: 'blood test hba1c genotype ai test review', icon: FlaskConical },
  { id: 'appointments', label: 'Appointments', keywords: 'doctor clinic booking visits uch ibadan', icon: Calendar },
  { id: 'vitals', label: 'Health Tracking', keywords: 'blood pressure glucose sugar charts', icon: Activity },
  { id: 'womens', label: "Women's Health", keywords: 'pcos yeast cycle menstruation sensitive symptoms', icon: Heart },
  { id: 'care', label: 'Vaccines & Special Care', keywords: 'vaccination 0-5 10-15 15+ sickle cell family plan annual plan', icon: Syringe },
  { id: 'rehab', label: 'Rehab Studio', keywords: 'physiotherapy exercise mobility pain 13', icon: Dumbbell },
  { id: 'timeline', label: 'Personal Timeline', keywords: 'history chronological logs', icon: Clock },
  { id: 'wallet', label: 'Health Wallet', keywords: 'refund balance payment money interswitch', icon: Wallet },
  { id: 'reminders', label: 'Medication Reminders', keywords: 'pills schedule notifications', icon: Pill },
  { id: 'family', label: 'Family Profiles', keywords: 'children parents dependents', icon: Users },
  { id: 'contacts', label: 'Alerts & SOS', keywords: 'sos contacts notifications emergency', icon: Bell },
  { id: 'portals', label: 'Settings & Roles', keywords: 'settings verification doctor hospital admin payments', icon: Settings },
];

export function DashboardPage() {
  const {
    user,
    isGuestDemo,
    authLoading,
    googleSignInPending,
    signInWithGoogle,
    navigate,
    familyProfiles,
    activeProfileId,
    setActiveProfileId,
    updateFamilyProfile,
    needsOnboardingPrompt,
    dismissOnboardingPrompt,
    completeHealthOnboarding,
    seedDemoWorkspaceForUser,
    appointments,
    activeSubscription,
    bpReadings,
    glucoseReadings,
    labResults,
    rehabSessions,
    vaccinationRecords,
    emergencyContacts,
    addEmergencyContact,
    notifications,
    markAllNotificationsRead,
  } = useApp();

  const [tab, setTab] = useState<DashboardTab>('overview');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [profileEditRequested, setProfileEditRequested] = useState(false);
  const [manualOnboardingOpen, setManualOnboardingOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('Family Member');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activeProfile =
    familyProfiles.find((p) => p.id === activeProfileId) || familyProfiles[0] || null;

  const personalisationPlan = useMemo(
    () => buildPersonalisedDashboardPlan(activeProfile),
    [activeProfile]
  );

  // Enforce child safety: never stay on Women's Health tab if active profile is a child (0-12)
  React.useEffect(() => {
    if (personalisationPlan.hideAdultReproductiveTabs && tab === 'womens') {
      setTab('overview');
    }
  }, [personalisationPlan.hideAdultReproductiveTabs, tab]);

  const profileAppointments = useMemo(
    () =>
      activeProfile
        ? appointments.filter(
            (a) => a.profileId === activeProfile.id || a.profileId === 'default'
          )
        : appointments,
    [appointments, activeProfile]
  );

  const profileBp = useMemo(
    () => (activeProfile ? bpReadings.filter((b) => b.profileId === activeProfile.id) : bpReadings),
    [bpReadings, activeProfile]
  );

  const profileGlucose = useMemo(
    () =>
      activeProfile
        ? glucoseReadings.filter((g) => g.profileId === activeProfile.id)
        : glucoseReadings,
    [glucoseReadings, activeProfile]
  );

  const profileRehab = useMemo(
    () =>
      activeProfile
        ? rehabSessions.filter(
            (r) => r.profileId === activeProfile.id || r.profileId === 'default'
          )
        : rehabSessions,
    [rehabSessions, activeProfile]
  );

  const profileLabs = useMemo(
    () => (activeProfile ? labResults.filter((l) => l.profileId === activeProfile.id) : labResults),
    [labResults, activeProfile]
  );

  const selectDashboardTab = (nextTab: DashboardTab) => {
    if (nextTab !== 'profile') setProfileEditRequested(false);
    setTab(nextTab);
    setMobileDrawerOpen(false);
  };

  const filteredNavItems = useMemo(() => {
    const safeItems = personalisationPlan.hideAdultReproductiveTabs
      ? NAV_ITEMS.filter((item) => item.id !== 'womens')
      : NAV_ITEMS;
    const q = sidebarSearch.trim().toLowerCase();
    if (!q) return safeItems;
    return safeItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.keywords.toLowerCase().includes(q)
    );
  }, [sidebarSearch, personalisationPlan.hideAdultReproductiveTabs]);

  const vitalsChartData = useMemo(() => {
    const bpSorted = [...profileBp]
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
      .slice(-7);
    return bpSorted.map((b, idx) => ({
      label: b.recordedAt.slice(5, 10) || `Day ${idx + 1}`,
      systolic: b.systolic,
      diastolic: b.diastolic,
      pulse: b.pulse,
    }));
  }, [profileBp]);

  const avgMobility = useMemo(() => {
    if (profileRehab.length === 0) return 0;
    return profileRehab.reduce((acc, s) => acc + s.mobilityScore, 0) / profileRehab.length;
  }, [profileRehab]);

  const completedVaccinesCount = vaccinationRecords.filter((v) => v.status === 'Completed').length;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSeedStarter = async () => {
    setActionError(null);
    setSaving(true);
    try {
      await seedDemoWorkspaceForUser();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to initialize starter health profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  const openEditProfile = (profile: FamilyProfile) => {
    setActiveProfileId(profile.id);
    setProfileEditRequested(true);
    setTab('profile');
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;
    setActionError(null);
    setSaving(true);
    try {
      await addEmergencyContact({
        name: newContactName.trim(),
        phone: newContactPhone.trim(),
        relationship: newContactRelation,
        city: activeProfile?.city || user.city || 'Ibadan',
        isPrimary: emergencyContacts.length === 0,
      });
      setNewContactName('');
      setNewContactPhone('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to save emergency contact.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0A33] flex items-center justify-center p-10 text-sm text-[#C7C8E6]">
        Connecting to Firebase Authentication &amp; Cloud Firestore...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0A33] text-[#F4F5FC] py-6 sm:py-8">
      <div className="max-w-[1460px] mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        {/* Guest vs Email Verification Status Banner */}
        {isGuestDemo ? (
          <div className="rounded-2xl bg-[#161554] border border-white/12 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-bold text-sm text-white">Guest Demonstration Preview</p>
              <p className="text-[#C7C8E6] mt-0.5">
                Viewing sample Oyo State clinical data in browser memory. Sign in to persist your family profiles, online consultations, rehab sessions, private cycle logs, and subscription receipts in Cloud Firestore.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={googleSignInPending}
                onClick={() => void signInWithGoogle()}
                className="px-4 py-2.5 rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] disabled:opacity-60 text-white font-semibold cursor-pointer"
              >
                {googleSignInPending ? 'Signing in...' : 'Sign in with Google'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold cursor-pointer"
              >
                Email Login
              </button>
            </div>
          </div>
        ) : !user.emailVerified ? (
          <div className="rounded-2xl bg-[#E8702A]/18 border border-[#E8702A]/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#FFE5D4]">
            <div>
              <p className="font-bold text-white">Email Verification Required for Database Writes</p>
              <p className="mt-0.5">
                Open the Roles &amp; Audit tab to resend or refresh your email verification status.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTab('portals')}
              className="px-4 py-2 rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white font-semibold shrink-0 cursor-pointer"
            >
              Verify Account
            </button>
          </div>
        ) : null}

        {actionError && (
          <div className="rounded-xl bg-[#E5484D]/18 border border-[#E5484D]/45 p-4 flex items-start gap-2.5 text-xs text-[#FFD6D8]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#FF8A8E]" />
            <span>{actionError}</span>
          </div>
        )}

        {actionSuccess && (
          <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/35 p-4 flex items-start justify-between gap-2.5 text-xs text-emerald-100">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
              <span>{actionSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-emerald-200 hover:underline font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Command Header */}
        <header className="rounded-2xl bg-[#13124A] border border-white/10 p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              aria-label="Open dashboard menu"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden mt-1 p-2.5 rounded-xl bg-[#0B0A33] border border-white/15 text-white hover:bg-[#272757] cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#FFB585]">
                {isGuestDemo
                  ? `Oyo State Health Workspace · ${activeProfile?.demoMemberId || 'Guest'}`
                  : `Oyo State Clinical Workspace · ${user.role.toUpperCase()} (${activeProfile?.demoMemberId || 'Active'})`}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1 tracking-tight">
                Welcome back, {user.name.split(' ')[0]}
              </h1>
              <p className="text-xs text-[#C7C8E6] mt-1">
                {activeProfile
                  ? `${activeProfile.fullName} (${activeProfile.relationship}) · ${activeProfile.city}, Oyo Hub`
                  : 'Create your primary health profile or load starter Oyo State records.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Quick-Jump Top Strip */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#0B0A33] p-1 border border-white/10">
              {(
                [
                  { id: 'overview', label: 'Dashboard' },
                  { id: 'labs', label: 'Lab Results' },
                  { id: 'womens', label: "Women's Health" },
                  { id: 'care', label: 'Vaccines & Plans' },
                  { id: 'wallet', label: 'Wallet' },
                ] as const
              ).map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => selectDashboardTab(q.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    tab === q.id
                      ? 'bg-[#E8702A] text-white'
                      : 'text-[#C7C8E6] hover:text-white'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Family Profile Switcher */}
            <div className="flex flex-wrap items-center gap-1.5">
              {familyProfiles.map((prof) => (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => setActiveProfileId(prof.id)}
                  className={`px-3 py-2 min-h-[36px] rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    activeProfile && prof.id === activeProfile.id
                      ? 'bg-[#5E60CE] text-white'
                      : 'bg-[#0B0A33] border border-white/12 text-[#C7C8E6] hover:text-white'
                  }`}
                >
                  {prof.fullName.split(' ')[0]}
                </button>
              ))}
              {!isGuestDemo && user.emailVerified && familyProfiles.length === 0 && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSeedStarter()}
                  className="px-4 py-2 min-h-[36px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold cursor-pointer"
                >
                  {saving ? 'Initializing...' : 'Initialize Starter Profile'}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Mobile / Tablet Slide-Over Navigation Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-[#05051A]/75"
              onClick={() => setMobileDrawerOpen(false)}
              aria-hidden="true"
            />
            <div className="relative z-10 w-72 max-w-[85vw] bg-[#13124A] border-r border-white/15 h-full overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-sm font-bold text-white">Dashboard Navigation</span>
                <button
                  type="button"
                  aria-label="Close dashboard menu"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-2 rounded-lg text-[#C7C8E6] hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav aria-label="Mobile dashboard sections" className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectDashboardTab(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#272757] text-white border border-[#8A8EF5]/40'
                          : 'text-[#C7C8E6] hover:bg-white/6 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#FFB585]' : 'text-[#8686AC]'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    navigate('/ai-assistant');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-semibold text-[#FFB585] hover:bg-white/6 cursor-pointer"
                >
                  <Bot className="w-4 h-4 shrink-0" />
                  <span>AI Assistant</span>
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Main Workspace Grid (Collapsible Left Sidebar + Adaptive Main Workspace) */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Collapsible Navigation Sidebar */}
          <aside
            className={`hidden lg:block shrink-0 space-y-4 transition-all duration-200 ${
              sidebarCollapsed ? 'w-[76px]' : 'w-[272px]'
            }`}
          >
            <div className="rounded-2xl bg-[#13124A] border border-white/10 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2 px-1">
                {!sidebarCollapsed && (
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A6A8D6]">
                    Care Navigation
                  </span>
                )}
                <button
                  type="button"
                  aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  onClick={() => setSidebarCollapsed((c) => !c)}
                  className="p-2 rounded-lg bg-[#0B0A33] hover:bg-[#272757] text-[#C7C8E6] hover:text-white cursor-pointer mx-auto lg:mx-0"
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpen className="w-4 h-4" />
                  ) : (
                    <PanelLeftClose className="w-4 h-4" />
                  )}
                </button>
              </div>

              {!sidebarCollapsed && (
                <div className="relative">
                  <Search className="w-4 h-4 text-[#8686AC] absolute left-3 top-3" />
                  <input
                    type="search"
                    aria-label="Search dashboard sections"
                    placeholder="Search modules..."
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 min-h-[40px] rounded-xl bg-[#0B0A33] border border-white/12 text-xs text-white placeholder:text-[#8686AC] focus:outline-none focus:border-[#8A8EF5]"
                  />
                </div>
              )}

              <nav aria-label="Dashboard sections" className="space-y-1">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={item.label}
                      onClick={() => selectDashboardTab(item.id)}
                      className={`w-full flex items-center ${
                        sidebarCollapsed ? 'justify-center px-2' : 'gap-2.5 px-3'
                      } py-2.5 min-h-[40px] rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#272757] text-white border border-[#8A8EF5]/40'
                          : 'text-[#C7C8E6] hover:bg-white/6 hover:text-white'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-[#FFB585]' : 'text-[#8686AC]'
                        }`}
                      />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
                <button
                  type="button"
                  title="AI Assistant"
                  onClick={() => navigate('/ai-assistant')}
                  className={`w-full flex items-center ${
                    sidebarCollapsed ? 'justify-center px-2' : 'gap-2.5 px-3'
                  } py-2.5 min-h-[40px] rounded-xl text-xs font-semibold text-[#FFB585] hover:bg-white/6 transition-colors cursor-pointer`}
                >
                  <Bot className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">AI Assistant</span>}
                </button>
                {!sidebarCollapsed && filteredNavItems.length === 0 && (
                  <p className="text-[11px] text-[#8686AC] px-3 py-2">
                    No matching modules. Try &quot;labs&quot;, &quot;pcos&quot;, or &quot;vaccines&quot;.
                  </p>
                )}
              </nav>
            </div>

            {!sidebarCollapsed && activeProfile && (
              <div className="rounded-2xl bg-[#13124A] border border-white/10 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-white">Health Identity</p>
                  <button
                    type="button"
                    onClick={() => openEditProfile(activeProfile)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0B0A33] hover:bg-[#272757] text-[#D7D8EE] text-[11px] font-semibold cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-[#0B0A33] p-2.5">
                    <span className="text-[11px] text-[#A6A8D6]">Blood Group</span>
                    <p className="font-bold text-white text-sm mt-0.5">{activeProfile.bloodGroup}</p>
                  </div>
                  <div className="rounded-xl bg-[#0B0A33] p-2.5">
                    <span className="text-[11px] text-[#A6A8D6]">Genotype</span>
                    <p className="font-bold text-[#FFB585] text-sm mt-0.5">{activeProfile.genotype}</p>
                  </div>
                </div>
                <div className="text-[11px] text-[#C7C8E6] space-y-1 pt-1 border-t border-white/10">
                  <p>
                    <span className="text-[#8686AC]">Allergies:</span>{' '}
                    {activeProfile.allergies.join(', ')}
                  </p>
                  <p>
                    <span className="text-[#8686AC]">HMO:</span> {activeProfile.hmoProvider}
                  </p>
                </div>
              </div>
            )}

            {!sidebarCollapsed && (
              <div className="rounded-2xl bg-[#13124A] border border-white/10 p-4 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A6A8D6]">
                  Rapid Clinical Actions
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/ai-assistant')}
                  className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[40px] rounded-xl bg-[#272757] hover:bg-[#353574] text-xs font-semibold text-white cursor-pointer"
                >
                  <Bot className="w-4 h-4 text-[#FFB585]" />
                  AI Test &amp; Symptom Review
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/emergency')}
                  className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[40px] rounded-xl bg-[#E5484D] hover:bg-[#C9363B] text-xs font-semibold text-white cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  Oyo Emergency Desk
                </button>
              </div>
            )}
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            {/* Native Midnight Blue Eclipse Modules */}
            {tab === 'wearable' && <SmartwatchHub darkTheme />}
            {tab === 'qr' && (
              <EmergencyMedicalQrCard
                profile={activeProfile || {}}
                primaryContact={
                  emergencyContacts.find((c) => c.isPrimary) || emergencyContacts[0] || null
                }
                darkTheme
                onUpdateSharedFields={(fields) => {
                  if (activeProfile) {
                    void updateFamilyProfile(activeProfile.id, { qrSharedFields: fields }).catch(
                      () => undefined
                    );
                  }
                }}
              />
            )}
            {tab === 'timeline' && <HealthTimeline />}
            {tab === 'rehab' && <RehabilitationStudio />}
            {tab === 'care' && <SpecialCareHub />}

            {/* Dedicated LAB RESULTS Tab with direct AI Test Review action */}
            {tab === 'labs' && (
              <section className="rounded-2xl bg-[#13124A] border border-white/10 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4FD1C5]">
                      MLSCN Partner Diagnostics · Oyo Hub
                    </p>
                    <h2 className="text-xl font-bold text-white mt-0.5">
                      Laboratory Results &amp; AI Test Review
                    </h2>
                    <p className="text-xs text-[#C7C8E6] mt-0.5">
                      Inspect structured lab panels and open plain-language explanations in the AI Assistant.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/ai-assistant')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold cursor-pointer shrink-0"
                  >
                    <Bot className="w-4 h-4" />
                    Send to AI Test Review
                  </button>
                </div>

                {profileLabs.length === 0 ? (
                  <div className="rounded-xl bg-[#0B0A33] border border-white/10 p-6 text-xs text-[#A6A8D6]">
                    No laboratory panels recorded for this profile yet. Upload reports in Medical Records or book a Bodija/Jericho lab panel.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profileLabs.map((lab) => (
                      <article
                        key={lab.id}
                        className="rounded-xl bg-[#0B0A33] border border-white/10 p-5 space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base font-bold text-white">{lab.testName}</h3>
                            <p className="text-xs text-[#A6A8D6] mt-0.5">
                              {lab.labName} · {lab.city} · {lab.date}
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-[11px] font-semibold text-emerald-200">
                            {lab.status}
                          </span>
                        </div>
                        <p className="text-xs text-[#D7D8EE] leading-relaxed">{lab.summary}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                          {lab.metrics.map((m) => (
                            <div
                              key={m.label}
                              className="rounded-lg bg-[#13124A] border border-white/8 p-3 text-xs"
                            >
                              <span className="text-[11px] text-[#A6A8D6]">{m.label}</span>
                              <p className="font-bold text-white tabular-nums mt-0.5">{m.value}</p>
                              <p className="text-[10px] text-[#8686AC] mt-0.5">Ref: {m.reference}</p>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Dedicated WOMEN'S HEALTH Tab (Hidden automatically for Child Profiles ages 0-12) */}
            {tab === 'womens' && !personalisationPlan.hideAdultReproductiveTabs && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7">
                  <CycleTrackerCard />
                </div>
                <div className="lg:col-span-5 space-y-5">
                  <section className="rounded-2xl bg-[#13124A] border border-white/10 p-6 space-y-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#FFB585]">
                        Women&apos;s Health · Oyo Care Pathway
                      </p>
                      <h2 className="text-lg font-bold text-white mt-0.5">
                        PCOS, Yeast &amp; Sensitive Symptoms
                      </h2>
                    </div>
                    <div className="space-y-2.5 text-xs text-[#D7D8EE] leading-relaxed">
                      <div className="rounded-xl bg-[#0B0A33] border border-white/10 p-3.5">
                        <p className="font-semibold text-white">PCOS Cycle &amp; Metabolic Monitoring</p>
                        <p className="text-[#C7C8E6] mt-1">
                          Track irregular cycle lengths (greater than 35 days), pelvic pain, or glucose changes to prepare for OB-GYN visits at Adeoyo Maternity or Bodija partner clinics.
                        </p>
                      </div>
                      <div className="rounded-xl bg-[#0B0A33] border border-white/10 p-3.5">
                        <p className="font-semibold text-white">Recurrent Yeast &amp; Vaginal Wellness</p>
                        <p className="text-[#C7C8E6] mt-1">
                          Log recurring itching, discharge changes, or post-antibiotic yeast flares privately without stigma. Seek clinician review before repeating over-the-counter antifungals.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => navigate('/ai-assistant')}
                        className="w-full py-2.5 min-h-[42px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold cursor-pointer"
                      >
                        Ask Private AI About PCOS / Yeast Symptoms
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/find-healthcare')}
                        className="w-full py-2.5 min-h-[42px] rounded-xl bg-[#272757] hover:bg-[#353574] text-white text-xs font-semibold cursor-pointer"
                      >
                        Book Adeoyo / Ibadan OB-GYN Consultation
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {/* Existing Light Clinical Modules Framed Cleanly for Contrast */}
            {tab === 'profile' && (
              <div className="rounded-2xl bg-[#F5F6FC] text-[#0F0E47] p-4 sm:p-5">
                <UserProfile
                  startInEditMode={profileEditRequested}
                  onExitEditMode={() => setProfileEditRequested(false)}
                />
              </div>
            )}
            {tab === 'appointments' && (
              <div className="rounded-2xl bg-[#F5F6FC] text-[#0F0E47] p-4 sm:p-5">
                <AppointmentHistory
                  appointments={profileAppointments}
                  activeProfileName={activeProfile?.fullName}
                  onViewWallet={() => setTab('wallet')}
                />
              </div>
            )}
            {tab === 'wallet' && (
              <div className="rounded-2xl bg-[#F5F6FC] text-[#0F0E47] p-4 sm:p-5">
                <HealthWallet />
              </div>
            )}
            {tab === 'reminders' && (
              <div className="rounded-2xl bg-[#F5F6FC] text-[#0F0E47] p-4 sm:p-5">
                <MedicationReminders />
              </div>
            )}
            {tab === 'records' && (
              <div className="rounded-2xl bg-[#F5F6FC] text-[#0F0E47] p-4 sm:p-5">
                <MedicalRecords />
              </div>
            )}
            {tab === 'portals' && (
              <div className="rounded-2xl bg-[#F5F6FC] text-[#0F0E47] p-4 sm:p-5">
                <RolePortalsSection />
              </div>
            )}

            {/* OVERVIEW TAB — Midnight Blue Eclipse Analytics & Care Command Centre */}
            {tab === 'overview' && (
              <div className="space-y-6">
                {/* Adaptive HealthConnect Personalisation Engine Hub */}
                <PersonalisedDashboardHub
                  profile={activeProfile}
                  onNavigateRoute={navigate}
                  onOpenDashboardTab={(nextTab) => selectDashboardTab(nextTab as DashboardTab)}
                  onOpenOnboarding={() => setManualOnboardingOpen(true)}
                  onToggleOptionalModule={async (moduleId, currentlyEnabled) => {
                    if (!activeProfile) return;
                    const existing = activeProfile.enabledModules || [];
                    const next = currentlyEnabled
                      ? existing.filter((id) => id !== moduleId)
                      : [...existing, moduleId];
                    await updateFamilyProfile(activeProfile.id, { enabledModules: next });
                  }}
                />

                {/* 4-Column Radial KPI Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <button
                    type="button"
                    onClick={() => navigate('/payments')}
                    className="text-left rounded-2xl bg-[#13124A] hover:bg-[#19185F] border border-white/10 p-4 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#A6A8D6]">Oyo Monthly Plan</p>
                      <p className="text-xl font-bold text-white tabular-nums mt-1 truncate">
                        {activeSubscription.status === 'Active'
                          ? formatNaira(activeSubscription.monthlyPriceNgn)
                          : 'Not Active'}
                      </p>
                      <p className="text-[11px] text-[#FFB585] mt-0.5">
                        {familyProfiles.length}/{activeSubscription.maxProfiles} profiles · Plans →
                      </p>
                    </div>
                    <RadialProgressRing
                      percent={Math.min(
                        100,
                        Math.round((familyProfiles.length / activeSubscription.maxProfiles) * 100)
                      )}
                      color="#E8702A"
                      label={`${familyProfiles.length}/${activeSubscription.maxProfiles}`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab('vitals')}
                    className="text-left rounded-2xl bg-[#13124A] hover:bg-[#19185F] border border-white/10 p-4 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#A6A8D6]">Latest BP</p>
                      <p className="text-xl font-bold text-white tabular-nums mt-1">
                        {profileBp[0] ? `${profileBp[0].systolic}/${profileBp[0].diastolic}` : '—'}
                      </p>
                      <p className="text-[11px] text-[#C7C8E6] mt-0.5">
                        {profileBp[0] ? `Pulse ${profileBp[0].pulse} bpm` : 'Log reading'}
                      </p>
                    </div>
                    <RadialProgressRing
                      percent={profileBp[0] ? Math.min(100, Math.round((120 / Math.max(profileBp[0].systolic, 90)) * 90)) : 0}
                      color="#4FD1C5"
                      label={profileBp[0] ? `${profileBp[0].pulse}` : 'BP'}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab('rehab')}
                    className="text-left rounded-2xl bg-[#13124A] hover:bg-[#19185F] border border-white/10 p-4 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#A6A8D6]">Rehab Mobility</p>
                      <p className="text-xl font-bold text-white tabular-nums mt-1">
                        {avgMobility > 0 ? `${avgMobility.toFixed(1)}/10` : 'Start'}
                      </p>
                      <p className="text-[11px] text-[#8A8EF5] mt-0.5">
                        {profileRehab.length} sessions logged
                      </p>
                    </div>
                    <RadialProgressRing
                      percent={avgMobility * 10}
                      color="#8A8EF5"
                      label={`${Math.round(avgMobility * 10)}%`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab('care')}
                    className="text-left rounded-2xl bg-[#13124A] hover:bg-[#19185F] border border-white/10 p-4 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#A6A8D6]">Vaccines &amp; Visits</p>
                      <p className="text-xl font-bold text-white tabular-nums mt-1">
                        {completedVaccinesCount} / {vaccinationRecords.length}
                      </p>
                      <p className="text-[11px] text-[#C7C8E6] mt-0.5">
                        {profileAppointments.length} visits scheduled
                      </p>
                    </div>
                    <RadialProgressRing
                      percent={
                        vaccinationRecords.length > 0
                          ? (completedVaccinesCount / vaccinationRecords.length) * 100
                          : 0
                      }
                      color="#34D399"
                      label={`${completedVaccinesCount}✓`}
                    />
                  </button>
                </div>

                {/* Center Analytics & Right Rail Split */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  {/* Center Column (8 cols) */}
                  <div className="xl:col-span-8 space-y-6">
                    {/* User Basic Details + Genotype / Blood Type Strip */}
                    {activeProfile && (
                      <section className="rounded-2xl bg-[#13124A] border border-white/10 p-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8EF5]">
                              Patient Clinical Summary
                            </p>
                            <h2 className="text-lg font-bold text-white mt-0.5">
                              {activeProfile.fullName} · {activeProfile.age > 0 ? `${activeProfile.age} yrs` : 'Age not set'}
                            </h2>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTab('care')}
                            className="px-3 py-1.5 rounded-lg bg-[#272757] hover:bg-[#353574] text-xs font-semibold text-white cursor-pointer"
                          >
                            Sickle Cell &amp; Special Care →
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="rounded-xl bg-[#0B0A33] p-3">
                            <span className="text-[#A6A8D6]">Blood Group</span>
                            <p className="font-bold text-white text-base mt-0.5">
                              {activeProfile.bloodGroup}
                            </p>
                          </div>
                          <div className="rounded-xl bg-[#0B0A33] p-3">
                            <span className="text-[#A6A8D6]">Genotype</span>
                            <p className="font-bold text-[#FFB585] text-base mt-0.5">
                              {activeProfile.genotype}
                            </p>
                          </div>
                          <div className="rounded-xl bg-[#0B0A33] p-3">
                            <span className="text-[#A6A8D6]">Latest Glucose</span>
                            <p className="font-bold text-white text-base tabular-nums mt-0.5">
                              {profileGlucose[0] ? `${profileGlucose[0].valueMgDl} mg/dL` : '—'}
                            </p>
                          </div>
                          <div className="rounded-xl bg-[#0B0A33] p-3">
                            <span className="text-[#A6A8D6]">City Hub</span>
                            <p className="font-bold text-white text-base mt-0.5 truncate">
                              {activeProfile.city}
                            </p>
                          </div>
                        </div>
                      </section>
                    )}

                    {/* Dark-Mode Vitals Trend Area Chart */}
                    <section className="rounded-2xl bg-[#13124A] border border-white/10 p-5 sm:p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h2 className="text-base font-bold text-white">
                            Blood Pressure Trend Analytics
                          </h2>
                          <p className="text-xs text-[#A6A8D6]">
                            Systolic &amp; diastolic trajectory from your logged home cuff readings.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/monitoring')}
                          className="text-xs font-semibold text-[#FFB585] hover:underline shrink-0 cursor-pointer"
                        >
                          Open Full Vitals Charts →
                        </button>
                      </div>

                      {vitalsChartData.length === 0 ? (
                        <div className="rounded-xl bg-[#0B0A33] border border-white/10 p-6 text-center text-xs text-[#A6A8D6]">
                          Log a blood pressure reading in Monitoring to populate your trend chart.
                        </div>
                      ) : (
                        <div className="h-56 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={vitalsChartData}
                              margin={{ top: 8, right: 10, left: -18, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="dashSysGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#4FD1C5" stopOpacity={0.42} />
                                  <stop offset="95%" stopColor="#4FD1C5" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id="dashDiaGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#8A8EF5" stopOpacity={0.38} />
                                  <stop offset="95%" stopColor="#8A8EF5" stopOpacity={0.02} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                              <XAxis dataKey="label" stroke="#A6A8D6" fontSize={11} />
                              <YAxis stroke="#A6A8D6" fontSize={11} domain={[50, 170]} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#0F0E47',
                                  borderColor: 'rgba(255,255,255,0.15)',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  color: '#FFFFFF',
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="systolic"
                                name="Systolic (mmHg)"
                                stroke="#4FD1C5"
                                strokeWidth={2.5}
                                fill="url(#dashSysGrad)"
                              />
                              <Area
                                type="monotone"
                                dataKey="diastolic"
                                name="Diastolic (mmHg)"
                                stroke="#8A8EF5"
                                strokeWidth={2}
                                fill="url(#dashDiaGrad)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </section>

                    {/* Personal Health Timeline Preview */}
                    <HealthTimeline limit={5} onViewAll={() => setTab('timeline')} />
                  </div>

                  {/* Right Rail (4 cols) — Women's Health (age-gated), Notifications & Rehab Shortcut */}
                  <div className="xl:col-span-4 space-y-6">
                    {/* Women's Menstruation & Cycle Tracker (Strict child 0-12 safety gate) */}
                    {!personalisationPlan.hideAdultReproductiveTabs && (
                      <CycleTrackerCard compact onOpenFullCare={() => setTab('womens')} />
                    )}

                    {/* Important Notifications Panel (Notebook Right Area) */}
                    <section className="rounded-2xl bg-[#13124A] border border-white/10 p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-[#FFB585] flex items-center gap-1.5">
                          <Bell className="w-4 h-4" />
                          Important Notifications
                        </p>
                        <button
                          type="button"
                          onClick={() => setTab('contacts')}
                          className="text-[11px] font-semibold text-[#8A8EF5] hover:underline cursor-pointer"
                        >
                          View All ({unreadCount})
                        </button>
                      </div>
                      <div className="space-y-2">
                        {notifications.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl bg-[#0B0A33] border border-white/8 p-3 text-xs space-y-0.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-white truncate">{item.title}</span>
                              <span className="text-[10px] text-[#8686AC] shrink-0">{item.time}</span>
                            </div>
                            <p className="text-[11px] text-[#C7C8E6] line-clamp-2">{item.detail}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Rehabilitation Studio Shortcut Card */}
                    <section className="rounded-2xl bg-[#13124A] border border-white/10 p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-[#8A8EF5] flex items-center gap-1.5">
                          <Dumbbell className="w-4 h-4" />
                          Rehab Progress Studio
                        </p>
                        <span className="text-xs font-bold text-white tabular-nums">
                          {profileRehab.length} logs
                        </span>
                      </div>
                      <p className="text-xs text-[#C7C8E6] leading-relaxed">
                        {profileRehab[0]
                          ? `Latest: ${profileRehab[0].exerciseName} · Mobility ${profileRehab[0].mobilityScore}/10, Pain ${profileRehab[0].painScore}/10.`
                          : 'Start a clinician-assigned physiotherapy timer and track pain & mobility recovery.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setTab('rehab')}
                        className="w-full py-2.5 min-h-[40px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold cursor-pointer"
                      >
                        Open Rehabilitation Studio
                      </button>
                    </section>
                  </div>
                </div>

                {/* Clean Light Surface Frame for Reminders & Appointments */}
                <div className="rounded-2xl bg-[#F5F6FC] text-[#0F0E47] p-4 sm:p-6 space-y-6">
                  <RemindersOverviewWidget onManageClick={() => setTab('reminders')} />
                  <AppointmentHistory
                    appointments={profileAppointments}
                    activeProfileName={activeProfile?.fullName}
                    onViewWallet={() => setTab('wallet')}
                  />
                </div>
              </div>
            )}

            {/* VITALS TAB */}
            {tab === 'vitals' && (
              <section className="rounded-2xl bg-[#13124A] border border-white/10 p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Blood Pressure &amp; Glucose Trends
                    </h2>
                    <p className="text-xs text-[#A6A8D6] mt-0.5">
                      Manual readings entered from validated medical cuffs &amp; glucometers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/monitoring')}
                    className="px-4 py-2.5 min-h-[42px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold cursor-pointer"
                  >
                    Open Full Monitoring &amp; Charts
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-semibold text-white">Recent BP Logs</h3>
                    {profileBp.length === 0 ? (
                      <p className="text-xs text-[#A6A8D6]">
                        No BP logs recorded for this profile yet.
                      </p>
                    ) : (
                      profileBp.map((b) => (
                        <div
                          key={b.id}
                          className="rounded-xl bg-[#0B0A33] border border-white/10 p-3.5 flex justify-between items-center text-xs"
                        >
                          <div>
                            <p className="font-bold text-white tabular-nums">
                              {b.systolic}/{b.diastolic} mmHg · Pulse {b.pulse}
                            </p>
                            <p className="text-[#A6A8D6] mt-0.5">{b.note || b.deviceType}</p>
                          </div>
                          <span className="font-mono text-[#C7C8E6] tabular-nums">
                            {b.recordedAt.replace('T', ' ')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <h3 className="text-sm font-semibold text-white">Recent Glucose Logs</h3>
                    {profileGlucose.length === 0 ? (
                      <p className="text-xs text-[#A6A8D6]">
                        No glucose logs recorded for this profile yet.
                      </p>
                    ) : (
                      profileGlucose.map((g) => (
                        <div
                          key={g.id}
                          className="rounded-xl bg-[#0B0A33] border border-white/10 p-3.5 flex justify-between items-center text-xs"
                        >
                          <div>
                            <p className="font-bold text-white tabular-nums">
                              {g.valueMgDl} mg/dL · {g.context}
                            </p>
                            <p className="text-[#A6A8D6] mt-0.5">{g.note || g.deviceType}</p>
                          </div>
                          <span className="font-mono text-[#C7C8E6] tabular-nums">
                            {g.recordedAt.replace('T', ' ')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* FAMILY PROFILES TAB — Netflix-Style 5-Profile Family Plan Hub */}
            {tab === 'family' && <NetflixFamilyHub onEditProfile={openEditProfile} />}

            {/* EMERGENCY CONTACTS & NOTIFICATIONS TAB */}
            {tab === 'contacts' && (
              <div className="space-y-6">
                <section className="rounded-2xl bg-[#13124A] border border-white/10 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">
                      Notifications ({unreadCount} unread)
                    </h2>
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="text-xs font-semibold text-[#FFB585] hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`rounded-xl p-3.5 text-xs border ${
                          n.read
                            ? 'bg-[#0B0A33] border-white/8 text-[#A6A8D6]'
                            : 'bg-[#1D1B63] border-[#8A8EF5]/35 text-white'
                        }`}
                      >
                        <div className="flex justify-between gap-2 font-semibold">
                          <span>{n.title}</span>
                          <span className="tabular-nums">{n.time}</span>
                        </div>
                        <p className="mt-1">{n.detail}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl bg-[#13124A] border border-white/10 p-6 space-y-4">
                  <h2 className="text-lg font-bold text-white">Emergency Contacts</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {emergencyContacts.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-xl bg-[#0B0A33] border border-white/10 p-4 text-xs space-y-1"
                      >
                        <p className="font-bold text-white text-sm">{c.name}</p>
                        <p className="text-[#A6A8D6]">
                          {c.relationship} · {c.city}
                        </p>
                        <p className="font-mono text-[#FFB585] tabular-nums">{c.phone}</p>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => void handleAddContact(e)}
                    className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3"
                  >
                    <input
                      type="text"
                      placeholder="Contact name"
                      maxLength={100}
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-sm text-white placeholder:text-[#8686AC]"
                    />
                    <input
                      type="text"
                      placeholder="+234 800 000 0000"
                      maxLength={40}
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-sm text-white placeholder:text-[#8686AC]"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Relationship"
                        maxLength={60}
                        value={newContactRelation}
                        onChange={(e) => setNewContactRelation(e.target.value)}
                        className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-sm text-white placeholder:text-[#8686AC]"
                      />
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2.5 min-h-[44px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold shrink-0 cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Essential Health Profile Onboarding Modal (Auto-shown after Google Sign-In or on edit) */}
      <HealthOnboardingModal
        open={needsOnboardingPrompt || manualOnboardingOpen}
        initialProfile={activeProfile}
        defaultName={user.name}
        defaultCity={user.city}
        onSave={async (payload) => {
          await completeHealthOnboarding(payload);
          setManualOnboardingOpen(false);
        }}
        onDismiss={() => {
          dismissOnboardingPrompt();
          setManualOnboardingOpen(false);
        }}
      />
    </div>
  );
}
