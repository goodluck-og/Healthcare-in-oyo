import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Dumbbell,
  Pause,
  Play,
  RotateCcw,
  Share2,
  ShieldCheck,
  Trash2,
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
import { useApp } from '../../context/AppContext';
import type { RehabBodyArea } from '../../types/healthcare';

interface ClinicianExercise {
  id: string;
  name: string;
  bodyArea: RehabBodyArea;
  clinician: string;
  prescription: string;
  defaultMinutes: number;
  safetyCue: string;
}

const CLINICIAN_CATALOGUE: ClinicianExercise[] = [
  {
    id: 'ex-knee-1',
    name: 'Seated Knee Extension & Quad Strengthening',
    bodyArea: 'Knee & Lower Limb',
    clinician: 'PT Chinedu Okafor, BMR (MRTBN)',
    prescription: '3 sets × 12 reps · 15 min',
    defaultMinutes: 15,
    safetyCue: 'Stop if sharp joint pain exceeds 5/10 or swelling worsens.',
  },
  {
    id: 'ex-back-1',
    name: 'Lumbar Pelvic Tilts & Core Stabilization',
    bodyArea: 'Back & Spine',
    clinician: 'PT Chinedu Okafor, BMR (MRTBN)',
    prescription: '3 sets × 10 reps · 12 min',
    defaultMinutes: 12,
    safetyCue: 'Keep breathing steady; avoid arching the lower back.',
  },
  {
    id: 'ex-shoulder-1',
    name: 'Pendulum & Wall-Slide Rotator Mobility',
    bodyArea: 'Shoulder & Arm',
    clinician: 'PT Zainab Bello, DPT (UCH Ibadan Physio Unit)',
    prescription: '2 sets × 10 reps · 10 min',
    defaultMinutes: 10,
    safetyCue: 'Move within comfortable arc; never force overhead impingement.',
  },
  {
    id: 'ex-stroke-1',
    name: 'Assisted Sit-to-Stand Balance Progression',
    bodyArea: 'Post-Stroke Mobility',
    clinician: 'PT Emeka Nwosu, Neuro-Rehab Specialist',
    prescription: '3 sets × 8 reps · 15 min',
    defaultMinutes: 15,
    safetyCue: 'Always perform near a sturdy chair with caregiver supervision.',
  },
  {
    id: 'ex-pelvic-1',
    name: 'Gentle Diaphragmatic & Pelvic Floor Activation',
    bodyArea: 'Pelvic & Postpartum',
    clinician: 'PT Halima Yusuf, Women’s Health Physio',
    prescription: '3 sets × 10 breaths · 10 min',
    defaultMinutes: 10,
    safetyCue: 'Focus on full relaxation between contractions; no breath holding.',
  },
  {
    id: 'ex-cardio-1',
    name: 'Paced Indoor Walking & Recovery Breathing',
    bodyArea: 'Cardiopulmonary',
    clinician: 'Dr. Adewale Ogunleye & Cardiac Rehab Team',
    prescription: '15–20 min steady low-impact pace',
    defaultMinutes: 15,
    safetyCue: 'Stop immediately for chest tightness, dizziness, or severe breathlessness.',
  },
];

const BODY_AREAS: Array<'All' | RehabBodyArea> = [
  'All',
  'Knee & Lower Limb',
  'Back & Spine',
  'Shoulder & Arm',
  'Post-Stroke Mobility',
  'Pelvic & Postpartum',
  'Cardiopulmonary',
];

export function RehabilitationStudio() {
  const {
    rehabSessions,
    addRehabSession,
    shareRehabWithDoctor,
    deleteRehabSession,
    familyProfiles,
    activeProfileId,
    bookOnlineConsultation,
    navigate,
  } = useApp();

  const activeProfile =
    familyProfiles.find((p) => p.id === activeProfileId) || familyProfiles[0] || null;

  const profileSessions = useMemo(
    () =>
      activeProfile
        ? rehabSessions.filter(
            (s) => s.profileId === activeProfile.id || s.profileId === 'default'
          )
        : rehabSessions,
    [rehabSessions, activeProfile]
  );

  const [areaFilter, setAreaFilter] = useState<'All' | RehabBodyArea>('All');
  const [selectedExercise, setSelectedExercise] = useState<ClinicianExercise>(
    CLINICIAN_CATALOGUE[0]
  );

  // Interactive session timer
  const [timerSeconds, setTimerSeconds] = useState(CLINICIAN_CATALOGUE[0].defaultMinutes * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Session completion log state
  const [durationMinutes, setDurationMinutes] = useState(
    String(CLINICIAN_CATALOGUE[0].defaultMinutes)
  );
  const [painScore, setPainScore] = useState(3);
  const [mobilityScore, setMobilityScore] = useState(7);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Physiotherapist consent share state
  const [shareSessionId, setShareSessionId] = useState<string | null>(null);
  const [physioUidInput, setPhysioUidInput] = useState('');

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
      setElapsedSeconds((e) => e + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  const handleSelectExercise = (ex: ClinicianExercise) => {
    setSelectedExercise(ex);
    setTimerRunning(false);
    setTimerSeconds(ex.defaultMinutes * 60);
    setElapsedSeconds(0);
    setDurationMinutes(String(ex.defaultMinutes));
  };

  const formatClock = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const filteredCatalogue = useMemo(
    () =>
      areaFilter === 'All'
        ? CLINICIAN_CATALOGUE
        : CLINICIAN_CATALOGUE.filter((ex) => ex.bodyArea === areaFilter),
    [areaFilter]
  );

  const chartData = useMemo(() => {
    return [...profileSessions]
      .sort((a, b) => a.completedDate.localeCompare(b.completedDate))
      .map((s) => ({
        date: s.completedDate.slice(5),
        mobility: s.mobilityScore,
        pain: s.painScore,
        exercise: s.exerciseName,
      }));
  }, [profileSessions]);

  const avgMobility = useMemo(() => {
    if (profileSessions.length === 0) return 0;
    return (
      profileSessions.reduce((acc, s) => acc + s.mobilityScore, 0) / profileSessions.length
    );
  }, [profileSessions]);

  const latestPain = profileSessions[0]?.painScore ?? null;
  const totalMinutes = profileSessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    setSaving(true);
    try {
      const loggedMins = Math.max(
        1,
        Number(durationMinutes) ||
          Math.max(1, Math.round(elapsedSeconds / 60)) ||
          selectedExercise.defaultMinutes
      );
      await addRehabSession({
        profileId: activeProfile?.id || 'default',
        exerciseName: selectedExercise.name,
        bodyArea: selectedExercise.bodyArea,
        assignedByClinician: selectedExercise.clinician,
        targetPrescription: selectedExercise.prescription,
        durationMinutes: loggedMins,
        painScore,
        mobilityScore,
        completedDate: new Date().toISOString().slice(0, 10),
        notes: notes.trim() || undefined,
      });
      setNotes('');
      setTimerRunning(false);
      setStatusMessage(
        `Session logged for ${selectedExercise.name} (${loggedMins} min · Mobility ${mobilityScore}/10 · Pain ${painScore}/10).`
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to save rehab session.');
    } finally {
      setSaving(false);
    }
  };

  const handleShareSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareSessionId || !physioUidInput.trim()) return;
    setErrorMessage(null);
    setStatusMessage(null);
    setSaving(true);
    try {
      await shareRehabWithDoctor(shareSessionId, physioUidInput.trim());
      setStatusMessage(
        `Shared rehabilitation progress with physiotherapist UID ${physioUidInput.trim()} (revokable via clinician permissions).`
      );
      setShareSessionId(null);
      setPhysioUidInput('');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to share rehab session.');
    } finally {
      setSaving(false);
    }
  };

  const handleBookPhysioFollowUp = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setSaving(true);
    try {
      await bookOnlineConsultation({
        doctorId: 'physio-okafor',
        doctorName: selectedExercise.clinician,
        specialty: 'Physiotherapy & Rehabilitation',
        facilityName: 'HealthConnect Oyo Virtual Rehab Clinic',
        city: activeProfile?.city || 'Ibadan',
        date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        time: '11:00 WAT',
        reason: `Online physiotherapy follow-up for ${selectedExercise.name} (included in Oyo monthly plan).`,
      });
      setStatusMessage(
        `Online physiotherapy follow-up booked with ${selectedExercise.clinician} at ₦0 (included in your Oyo State plan).`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to book online physiotherapy follow-up.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[#13124A] border border-white/10 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FFB585] flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5" />
            Rehabilitation Progress Studio
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Clinician-Approved Recovery &amp; Mobility Tracking
          </h2>
          <p className="text-xs text-[#C7C8E6] mt-1 max-w-2xl leading-relaxed">
            Follow clinician-assigned home exercises, time each session, log pain &amp; mobility scores, and share verified recovery trends with your physiotherapist.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleBookPhysioFollowUp()}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            Book Online Physio Follow-Up (Included)
          </button>
          <button
            type="button"
            onClick={() => navigate('/find-healthcare')}
            className="px-4 py-2.5 min-h-[42px] rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-semibold cursor-pointer"
          >
            Find Rehab Clinics
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-[#13124A] border border-white/10 p-5">
          <p className="text-xs text-[#A6A8D6]">Sessions Completed</p>
          <p className="text-2xl font-bold text-white tabular-nums mt-1">
            {profileSessions.length}
          </p>
          <p className="text-xs text-[#C7C8E6] mt-1 tabular-nums">
            {totalMinutes} total active rehab minutes
          </p>
        </div>
        <div className="rounded-2xl bg-[#13124A] border border-white/10 p-5">
          <p className="text-xs text-[#A6A8D6]">Average Mobility Score</p>
          <p className="text-2xl font-bold text-[#8A8EF5] tabular-nums mt-1">
            {avgMobility > 0 ? `${avgMobility.toFixed(1)} / 10` : '—'}
          </p>
          <p className="text-xs text-[#C7C8E6] mt-1">Higher indicates stronger range of motion</p>
        </div>
        <div className="rounded-2xl bg-[#13124A] border border-white/10 p-5">
          <p className="text-xs text-[#A6A8D6]">Latest Reported Pain</p>
          <p className="text-2xl font-bold text-[#FFB585] tabular-nums mt-1">
            {latestPain !== null ? `${latestPain} / 10` : '—'}
          </p>
          <p className="text-xs text-[#C7C8E6] mt-1">
            Flag persistent pain ≥ 6/10 to your physiotherapist
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/30 p-3.5 flex items-start gap-2 text-xs text-emerald-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl bg-[#E5484D]/18 border border-[#E5484D]/45 p-3.5 flex items-start gap-2 text-xs text-[#FFD6D8]">
          <AlertCircle className="w-4 h-4 text-[#FF8A8E] shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Split: Catalogue + Live Timer & Logger */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Clinician-Approved Exercise Catalogue */}
        <section className="xl:col-span-7 rounded-2xl bg-[#13124A] border border-white/10 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Clinician-Assigned Exercise Plan</h3>
              <p className="text-xs text-[#A6A8D6]">
                Select a prescribed exercise to launch the guided session timer.
              </p>
            </div>
            <select
              aria-label="Filter body area"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value as 'All' | RehabBodyArea)}
              className="px-3 py-2 rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white"
            >
              {BODY_AREAS.map((area) => (
                <option key={area} value={area} className="bg-[#0F0E47]">
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredCatalogue.map((ex) => {
              const active = ex.id === selectedExercise.id;
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => handleSelectExercise(ex)}
                  className={`text-left rounded-xl p-4 border transition-colors cursor-pointer space-y-1.5 ${
                    active
                      ? 'bg-[#22216B] border-[#8A8EF5] text-white'
                      : 'bg-[#0B0A33]/75 border-white/10 text-[#D7D8EE] hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#FFB585]">
                      {ex.bodyArea}
                    </span>
                    <span className="text-[11px] text-[#A6A8D6] tabular-nums">
                      {ex.defaultMinutes} min
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white leading-snug">{ex.name}</p>
                  <p className="text-[11px] text-[#C7C8E6]">{ex.prescription}</p>
                  <p className="text-[11px] text-[#8686AC] pt-1 border-t border-white/10">
                    Approved by: {ex.clinician}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Guided Timer & Completion Form */}
        <section className="xl:col-span-5 rounded-2xl bg-[#13124A] border border-white/10 p-5 space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8EF5]">
              Active Guided Exercise
            </p>
            <h3 className="text-base font-bold text-white mt-0.5">{selectedExercise.name}</h3>
            <p className="text-xs text-[#FFB585] mt-1">{selectedExercise.safetyCue}</p>
          </div>

          {/* Live Countdown Timer */}
          <div className="rounded-xl bg-[#0B0A33] border border-white/10 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] text-[#A6A8D6] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#8A8EF5]" />
                Session Countdown
              </p>
              <p className="text-3xl font-bold font-mono text-white tabular-nums mt-1">
                {formatClock(timerSeconds)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTimerRunning((r) => !r)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[40px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold cursor-pointer"
              >
                {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {timerRunning ? 'Pause' : 'Start'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setTimerSeconds(selectedExercise.defaultMinutes * 60);
                  setElapsedSeconds(0);
                }}
                aria-label="Reset session timer"
                className="p-2.5 min-h-[40px] rounded-xl bg-white/10 hover:bg-white/15 text-white cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Completion Logger */}
          <form onSubmit={(e) => void handleLogSession(e)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#C7C8E6] mb-1">
                  Minutes
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-full px-3 py-2 min-h-[40px] rounded-xl bg-[#0B0A33] border border-white/15 text-sm text-white tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#C7C8E6] mb-1">
                  Pain (0–10): <span className="text-[#FFB585]">{painScore}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={painScore}
                  onChange={(e) => setPainScore(Number(e.target.value))}
                  className="w-full accent-[#E8702A] mt-2"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#C7C8E6] mb-1">
                  Mobility (1–10): <span className="text-[#8A8EF5]">{mobilityScore}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={mobilityScore}
                  onChange={(e) => setMobilityScore(Number(e.target.value))}
                  className="w-full accent-[#8A8EF5] mt-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#C7C8E6] mb-1">
                Recovery Notes (Optional)
              </label>
              <input
                type="text"
                maxLength={400}
                placeholder="e.g. Less stiffness on extension, completed all 3 sets."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white placeholder:text-[#8686AC]"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 min-h-[44px] rounded-xl bg-[#5E60CE] hover:bg-[#4F51BD] disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
            >
              {saving ? 'Saving to Firestore...' : 'Log Completed Rehab Session'}
            </button>
          </form>
        </section>
      </div>

      {/* Mobility vs Pain Recovery Trend Chart */}
      <section className="rounded-2xl bg-[#13124A] border border-white/10 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#8A8EF5]" />
              Mobility vs. Pain Recovery Trajectory
            </h3>
            <p className="text-xs text-[#A6A8D6] mt-0.5">
              Track steady mobility improvement alongside declining pain ratings over time.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-[#C7C8E6]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8A8EF5]" />
              Mobility (1–10)
            </span>
            <span className="flex items-center gap-1.5 text-[#C7C8E6]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E8702A]" />
              Pain (0–10)
            </span>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="rounded-xl bg-[#0B0A33] border border-white/10 p-8 text-center text-xs text-[#A6A8D6]">
            Log your first rehabilitation session above to visualize your mobility &amp; pain curve.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="rehabMobilityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8A8EF5" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#8A8EF5" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="rehabPainGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8702A" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#E8702A" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" stroke="#A6A8D6" fontSize={11} />
                <YAxis domain={[0, 10]} stroke="#A6A8D6" fontSize={11} />
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
                  dataKey="mobility"
                  name="Mobility Score"
                  stroke="#8A8EF5"
                  strokeWidth={2.5}
                  fill="url(#rehabMobilityGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="pain"
                  name="Pain Score"
                  stroke="#E8702A"
                  strokeWidth={2.5}
                  fill="url(#rehabPainGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Logged Sessions & Consent-Based Physiotherapist Sharing */}
      <section className="rounded-2xl bg-[#13124A] border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white">Completed Rehabilitation Log</h3>
            <p className="text-xs text-[#A6A8D6]">
              Share individual sessions with your verified physiotherapist by UID with explicit consent.
            </p>
          </div>
        </div>

        {shareSessionId && (
          <form
            onSubmit={(e) => void handleShareSession(e)}
            className="rounded-xl bg-[#0B0A33] border border-[#8A8EF5]/40 p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
          >
            <input
              type="text"
              required
              maxLength={128}
              placeholder="Enter verified physiotherapist / doctor UID"
              value={physioUidInput}
              onChange={(e) => setPhysioUidInput(e.target.value)}
              className="flex-1 px-3.5 py-2 min-h-[40px] rounded-lg bg-[#13124A] border border-white/15 text-xs text-white placeholder:text-[#8686AC]"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 min-h-[40px] rounded-lg bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold cursor-pointer"
              >
                Confirm Share
              </button>
              <button
                type="button"
                onClick={() => setShareSessionId(null)}
                className="px-3 py-2 min-h-[40px] rounded-lg bg-white/10 text-xs text-[#D7D8EE] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2.5">
          {profileSessions.length === 0 ? (
            <p className="text-xs text-[#A6A8D6]">No completed sessions logged yet.</p>
          ) : (
            profileSessions.map((session) => (
              <div
                key={session.id}
                className="rounded-xl bg-[#0B0A33]/85 border border-white/10 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white text-sm">{session.exerciseName}</span>
                    <span className="text-[11px] text-[#FFB585]">{session.bodyArea}</span>
                  </div>
                  <p className="text-[#A6A8D6]">
                    {session.completedDate} · {session.durationMinutes} min · Assigned by{' '}
                    {session.assignedByClinician}
                  </p>
                  {session.notes && <p className="text-[#D7D8EE]">{session.notes}</p>}
                  {session.sharedWithDoctorUid && (
                    <p className="text-emerald-300 flex items-center gap-1 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Shared with clinician UID: {session.sharedWithDoctorUid}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div className="text-right tabular-nums">
                    <p className="text-[#8A8EF5] font-semibold">
                      Mobility {session.mobilityScore}/10
                    </p>
                    <p className="text-[#FFB585]">Pain {session.painScore}/10</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShareSessionId(session.id)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${session.exerciseName}`}
                    onClick={() => void deleteRehabSession(session.id)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-[#E5484D]/25 text-[#A6A8D6] hover:text-[#FFD6D8] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
