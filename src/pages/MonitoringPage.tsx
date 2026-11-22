import React, { useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  Download,
  Droplet,
  Info,
  Plus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  BpRechartsTrend,
  GlucoseRechartsTrend,
  VitalsTrendChart,
} from '../components/monitoring/VitalsTrendChart';
import { SmartwatchHub } from '../components/monitoring/SmartwatchHub';

export function MonitoringPage() {
  const {
    familyProfiles,
    activeProfileId,
    setActiveProfileId,
    bpReadings,
    addBpReading,
    glucoseReadings,
    addGlucoseReading,
    reminders,
    toggleReminder,
    addReminder,
  } = useApp();

  const activeProfile =
    familyProfiles.find((p) => p.id === activeProfileId) ||
    familyProfiles[0] || {
      id: 'default',
      fullName: 'Member',
      demoMemberId: 'HCA-NEW',
    };

  const profileBp = useMemo(
    () => bpReadings.filter((b) => b.profileId === activeProfile.id),
    [bpReadings, activeProfile.id]
  );
  const profileGlu = useMemo(
    () => glucoseReadings.filter((g) => g.profileId === activeProfile.id),
    [glucoseReadings, activeProfile.id]
  );

  const [systolic, setSystolic] = useState('122');
  const [diastolic, setDiastolic] = useState('80');
  const [pulse, setPulse] = useState('72');
  const [bpDate, setBpDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [bpDevice, setBpDevice] = useState('Omron M3 Upper-Arm Cuff');
  const [bpNote, setBpNote] = useState('');

  const [glucoseVal, setGlucoseVal] = useState('96');
  const [glucoseContext, setGlucoseContext] = useState<
    'Fasting' | 'Before Meal' | 'Post-Meal (2h)' | 'Random'
  >('Fasting');
  const [glucoseDate, setGlucoseDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [glucoseDevice, setGlucoseDevice] = useState('Accu-Chek Active Glucometer');
  const [glucoseNote, setGlucoseNote] = useState('');

  const [remTitle, setRemTitle] = useState('');
  const [remSchedule, setRemSchedule] = useState('Daily · 08:00 WAT');

  const [vitalsError, setVitalsError] = useState<string | null>(null);
  const [vitalsSaved, setVitalsSaved] = useState<string | null>(null);

  const avgBp = useMemo(() => {
    if (profileBp.length === 0) return null;
    const s = Math.round(profileBp.reduce((acc, r) => acc + r.systolic, 0) / profileBp.length);
    const d = Math.round(profileBp.reduce((acc, r) => acc + r.diastolic, 0) / profileBp.length);
    return `${s}/${d}`;
  }, [profileBp]);

  const avgGlu = useMemo(() => {
    if (profileGlu.length === 0) return null;
    return Math.round(profileGlu.reduce((acc, r) => acc + r.valueMgDl, 0) / profileGlu.length);
  }, [profileGlu]);

  const handleBpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVitalsError(null);
    setVitalsSaved(null);
    const sys = Number(systolic);
    const dia = Number(diastolic);
    const pul = Number(pulse);
    if (!sys || !dia || sys < 50 || sys > 280 || dia < 30 || dia > 180) {
      setVitalsError('Enter a valid systolic (50–280 mmHg) and diastolic (30–180 mmHg) value.');
      return;
    }
    try {
      await addBpReading({
        profileId: activeProfile.id,
        systolic: sys,
        diastolic: dia,
        pulse: pul || 72,
        recordedAt: bpDate,
        deviceType: bpDevice,
        note: bpNote.trim() || 'Manual entry',
      });
      setBpNote('');
      setVitalsSaved('Blood pressure measurement saved.');
    } catch (err) {
      setVitalsError(err instanceof Error ? err.message : 'Unable to save BP reading.');
    }
  };

  const handleGlucoseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVitalsError(null);
    setVitalsSaved(null);
    const val = Number(glucoseVal);
    if (!val || val < 20 || val > 800) {
      setVitalsError('Enter a valid glucose value between 20 and 800 mg/dL.');
      return;
    }
    try {
      await addGlucoseReading({
        profileId: activeProfile.id,
        valueMgDl: val,
        context: glucoseContext,
        recordedAt: glucoseDate,
        deviceType: glucoseDevice,
        note: glucoseNote.trim() || 'Manual glucometer log',
      });
      setGlucoseNote('');
      setVitalsSaved('Blood glucose measurement saved.');
    } catch (err) {
      setVitalsError(err instanceof Error ? err.message : 'Unable to save glucose reading.');
    }
  };

  const downloadCsvReport = () => {
    const lines = [
      `HealthConnect — Vitals Summary Report`,
      `Patient: ${activeProfile.fullName} (${activeProfile.demoMemberId})`,
      ``,
      `BLOOD PRESSURE LOGS`,
      `Date/Time,Systolic (mmHg),Diastolic (mmHg),Pulse (bpm),Device,Notes`,
      ...profileBp.map(
        (b) => `"${b.recordedAt}",${b.systolic},${b.diastolic},${b.pulse},"${b.deviceType}","${b.note}"`
      ),
      ``,
      `BLOOD GLUCOSE LOGS`,
      `Date/Time,Value (mg/dL),Context,Device,Notes`,
      ...profileGlu.map(
        (g) => `"${g.recordedAt}",${g.valueMgDl},"${g.context}","${g.deviceType}","${g.note}"`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healthconnect-vitals-${activeProfile.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F5F6FC] py-8 sm:py-10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 space-y-8">
        {/* Header & Educational Disclaimer */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#505081]">
              HealthConnect · Smartwatch &amp; Manual Vitals Hub
            </p>
            <h1 className="text-3xl font-bold text-[#0F0E47] mt-1">
              Smartwatch Vitals, Blood Pressure &amp; Glucose Monitoring
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {familyProfiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveProfileId(p.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                  p.id === activeProfile.id
                    ? 'bg-[#272757] text-white'
                    : 'bg-white border border-[#272757]/15 text-[#505081]'
                }`}
              >
                {p.fullName.split(' ')[0]}
              </button>
            ))}
            <button
              type="button"
              onClick={downloadCsvReport}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Report (CSV)
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-[#E8702A]/35 p-4 sm:p-5 flex items-start gap-3 text-xs sm:text-sm text-[#0F0E47]">
          <Info className="w-5 h-5 text-[#E8702A] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Clinical Device Guidance:</strong> An ordinary smartphone cannot directly measure blood pressure or blood glucose without a compatible validated medical cuff or blood glucometer. Record readings taken with your validated medical device here to share accurate trends with your doctor.
          </p>
        </div>

        {vitalsError && (
          <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-3.5 text-xs text-[#9C2327]">
            {vitalsError}
          </div>
        )}
        {vitalsSaved && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800">
            {vitalsSaved}
          </div>
        )}

        {/* Smartwatch Live Vitals & GPS Auto-Escalation Hub */}
        <SmartwatchHub />

        {/* Unified Recharts Vitals Trend Line Chart */}
        <VitalsTrendChart
          profileName={activeProfile.fullName}
          bpReadings={profileBp}
          glucoseReadings={profileGlu}
          onLogVitalsClick={() => {
            const el = document.getElementById('bp-sys');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.focus();
            }
          }}
        />

        {/* Blood Pressure Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={(e) => void handleBpSubmit(e)}
            className="lg:col-span-5 rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#272757]" />
              Log Blood Pressure
            </h2>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="bp-sys" className="block text-xs text-[#505081] mb-1">Systolic</label>
                <input
                  id="bp-sys"
                  type="number"
                  min={60}
                  max={250}
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="bp-dia" className="block text-xs text-[#505081] mb-1">Diastolic</label>
                <input
                  id="bp-dia"
                  type="number"
                  min={40}
                  max={160}
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="bp-pulse" className="block text-xs text-[#505081] mb-1">Pulse (bpm)</label>
                <input
                  id="bp-pulse"
                  type="number"
                  min={35}
                  max={210}
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="bp-dt" className="block text-xs text-[#505081] mb-1">Date & Time</label>
                <input
                  id="bp-dt"
                  type="datetime-local"
                  value={bpDate}
                  onChange={(e) => setBpDate(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-xs tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="bp-dev" className="block text-xs text-[#505081] mb-1">Medical Device Used</label>
                <input
                  id="bp-dev"
                  type="text"
                  value={bpDevice}
                  onChange={(e) => setBpDevice(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-xs"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bp-note" className="block text-xs text-[#505081] mb-1">Notes (Optional)</label>
              <input
                id="bp-note"
                type="text"
                value={bpNote}
                onChange={(e) => setBpNote(e.target.value)}
                placeholder="e.g. Seated 5 mins before breakfast"
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 min-h-[44px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-sm font-semibold cursor-pointer"
            >
              Save BP Measurement
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-[#0F0E47]">Blood Pressure Trend</h3>
                <p className="text-xs text-[#505081]">
                  Navy: Systolic · Orange: Diastolic · Reference lines at 80 / 120 / 140 mmHg
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#505081]">Average ({profileBp.length} logs)</p>
                <p className="text-lg font-bold text-[#0F0E47] tabular-nums">{avgBp || '—'} mmHg</p>
              </div>
            </div>
            <BpRechartsTrend data={profileBp} />

            <div className="space-y-2 max-h-48 overflow-y-auto pt-2 border-t border-[#272757]/10">
              {profileBp.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-xs py-1.5">
                  <div>
                    <span className="font-bold text-[#0F0E47] tabular-nums">
                      {b.systolic}/{b.diastolic} mmHg
                    </span>
                    <span className="text-[#505081]"> · Pulse {b.pulse} · {b.note}</span>
                  </div>
                  <span className="font-mono text-[#505081] tabular-nums">{b.recordedAt.replace('T', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Blood Glucose Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={(e) => void handleGlucoseSubmit(e)}
            className="lg:col-span-5 rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
              <Droplet className="w-5 h-5 text-[#E8702A]" />
              Log Blood Glucose
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="glu-val" className="block text-xs text-[#505081] mb-1">Value (mg/dL)</label>
                <input
                  id="glu-val"
                  type="number"
                  min={30}
                  max={600}
                  value={glucoseVal}
                  onChange={(e) => setGlucoseVal(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="glu-ctx" className="block text-xs text-[#505081] mb-1">Meal Context</label>
                <select
                  id="glu-ctx"
                  value={glucoseContext}
                  onChange={(e) =>
                    setGlucoseContext(
                      e.target.value as 'Fasting' | 'Before Meal' | 'Post-Meal (2h)' | 'Random'
                    )
                  }
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm bg-white"
                >
                  <option value="Fasting">Fasting</option>
                  <option value="Before Meal">Before Meal</option>
                  <option value="Post-Meal (2h)">Post-Meal (2h)</option>
                  <option value="Random">Random</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="glu-dt" className="block text-xs text-[#505081] mb-1">Date & Time</label>
                <input
                  id="glu-dt"
                  type="datetime-local"
                  value={glucoseDate}
                  onChange={(e) => setGlucoseDate(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-xs tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="glu-dev" className="block text-xs text-[#505081] mb-1">Glucometer Device</label>
                <input
                  id="glu-dev"
                  type="text"
                  value={glucoseDevice}
                  onChange={(e) => setGlucoseDevice(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-xs"
                />
              </div>
            </div>

            <div>
              <label htmlFor="glu-note" className="block text-xs text-[#505081] mb-1">Notes (Optional)</label>
              <input
                id="glu-note"
                type="text"
                value={glucoseNote}
                onChange={(e) => setGlucoseNote(e.target.value)}
                placeholder="e.g. 2 hours after dinner"
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 min-h-[44px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-sm font-semibold cursor-pointer"
            >
              Save Glucose Measurement
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-[#0F0E47]">Blood Glucose Trend</h3>
                <p className="text-xs text-[#505081]">
                  Reference lines at 70 / 100 / 140 / 180 mg/dL · Discuss targets with your clinician
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#505081]">Average ({profileGlu.length} logs)</p>
                <p className="text-lg font-bold text-[#0F0E47] tabular-nums">
                  {avgGlu !== null ? `${avgGlu} mg/dL` : '—'}
                </p>
              </div>
            </div>
            <GlucoseRechartsTrend data={profileGlu} />

            <div className="space-y-2 max-h-48 overflow-y-auto pt-2 border-t border-[#272757]/10">
              {profileGlu.map((g) => (
                <div key={g.id} className="flex items-center justify-between text-xs py-1.5">
                  <div>
                    <span className="font-bold text-[#0F0E47] tabular-nums">{g.valueMgDl} mg/dL</span>
                    <span className="text-[#505081]"> · {g.context} · {g.note}</span>
                  </div>
                  <span className="font-mono text-[#505081] tabular-nums">{g.recordedAt.replace('T', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Reminders */}
        <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-4">
          <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#272757]" />
            Measurement & Medication Reminders
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reminders.map((r) => (
              <div key={r.id} className="rounded-xl bg-[#F5F6FC] p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-[#505081]">{r.type}</p>
                  <p className="text-sm font-semibold text-[#0F0E47]">{r.title}</p>
                  <p className="text-xs text-[#505081] tabular-nums mt-0.5">{r.schedule}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVitalsError(null);
                    void toggleReminder(r.id).catch((err) =>
                      setVitalsError(err instanceof Error ? err.message : 'Unable to update reminder.')
                    );
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    r.enabled ? 'bg-[#272757] text-white' : 'bg-white border border-[#272757]/20 text-[#505081]'
                  }`}
                >
                  {r.enabled ? 'On' : 'Paused'}
                </button>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!remTitle.trim()) return;
              setVitalsError(null);
              void addReminder({
                profileId: activeProfile.id,
                title: remTitle.trim(),
                schedule: remSchedule,
                type: 'BP Check',
              })
                .then(() => {
                  setRemTitle('');
                  setVitalsSaved('Reminder scheduled.');
                })
                .catch((err) =>
                  setVitalsError(err instanceof Error ? err.message : 'Unable to schedule reminder.')
                );
            }}
            className="pt-3 border-t border-[#272757]/10 flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              placeholder="New reminder label (e.g. Evening Glucose Check)"
              value={remTitle}
              onChange={(e) => setRemTitle(e.target.value)}
              className="flex-1 px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm"
            />
            <input
              type="text"
              value={remSchedule}
              onChange={(e) => setRemSchedule(e.target.value)}
              className="sm:w-56 px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#272757] text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Reminder
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
