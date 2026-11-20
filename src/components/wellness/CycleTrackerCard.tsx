import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { FlowIntensity } from '../../types/healthcare';

const SYMPTOM_OPTIONS = [
  'Mild Cramps',
  'Heavy Cramps',
  'Irregular Cycle',
  'Fatigue',
  'Bloating',
  'Headache',
  'Acne / Hormonal',
  'Pelvic Pain',
  'Mood Changes',
];

interface CycleTrackerCardProps {
  compact?: boolean;
  onOpenFullCare?: () => void;
}

export function CycleTrackerCard({ compact = false, onOpenFullCare }: CycleTrackerCardProps) {
  const { cycleLogs, addCycleLog, deleteCycleLog, familyProfiles, activeProfileId, navigate } =
    useApp();

  const activeProfile =
    familyProfiles.find((p) => p.id === activeProfileId) || familyProfiles[0] || null;

  const profileLogs = useMemo(() => {
    const filtered = activeProfile
      ? cycleLogs.filter((l) => l.profileId === activeProfile.id || l.profileId === 'default')
      : cycleLogs;
    return [...filtered].sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [cycleLogs, activeProfile]);

  const [privacyMasked, setPrivacyMasked] = useState(false);
  const [showForm, setShowForm] = useState(!compact);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cycleLengthDays, setCycleLengthDays] = useState('28');
  const [flowIntensity, setFlowIntensity] = useState<FlowIntensity>('Moderate');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['Mild Cramps']);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const latest = profileLogs[0] || null;

  const cycleMetrics = useMemo(() => {
    if (!latest) return null;
    const startMs = Date.parse(`${latest.startDate}T00:00:00Z`);
    if (Number.isNaN(startMs)) return null;
    const lengthDays = Math.min(60, Math.max(18, latest.cycleLengthDays || 28));
    const nextMs = startMs + lengthDays * 86400000;
    const todayMs = Date.now();
    const dayOfCycle = Math.max(1, Math.floor((todayMs - startMs) / 86400000) + 1);
    const daysUntilNext = Math.ceil((nextMs - todayMs) / 86400000);
    const nextDateIso = new Date(nextMs).toISOString().slice(0, 10);
    return { dayOfCycle, daysUntilNext, nextDateIso, lengthDays };
  }, [latest]);

  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    setSaving(true);
    try {
      await addCycleLog({
        profileId: activeProfile?.id || 'default',
        startDate,
        cycleLengthDays: Math.min(60, Math.max(18, Number(cycleLengthDays) || 28)),
        flowIntensity,
        symptoms: selectedSymptoms,
        notes: notes.trim() || undefined,
      });
      setNotes('');
      setFeedback('Private cycle entry saved (owner-only encrypted access).');
      if (compact) setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save cycle entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl bg-[#13124A] border border-white/10 p-5 space-y-4">
      {/* Header with Privacy Mask toggle */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#FFB585] flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            Private · Owner-Only
          </p>
          <h3 className="text-base font-bold text-white mt-0.5">
            Women&apos;s Cycle &amp; PCOS Tracker
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setPrivacyMasked((m) => !m)}
          aria-pressed={privacyMasked}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0B0A33] hover:bg-[#1E1D63] border border-white/15 text-[11px] font-semibold text-[#D7D8EE] cursor-pointer shrink-0"
        >
          {privacyMasked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {privacyMasked ? 'Unmask' : 'Mask'}
        </button>
      </div>

      {/* Next Cycle Estimate Summary */}
      {latest && cycleMetrics ? (
        <div className="rounded-xl bg-[#0B0A33] border border-white/10 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#A6A8D6]">Estimated Next Cycle</span>
            <span className="font-bold text-white tabular-nums">
              {privacyMasked ? '••••-••-••' : cycleMetrics.nextDateIso}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#A6A8D6]">Cycle Window</span>
            <span className="font-semibold text-[#8A8EF5] tabular-nums">
              {privacyMasked
                ? 'Hidden (Privacy Mask)'
                : cycleMetrics.daysUntilNext >= 0
                ? `Day ${cycleMetrics.dayOfCycle} · In ${cycleMetrics.daysUntilNext} days`
                : `Day ${cycleMetrics.dayOfCycle} · ${Math.abs(cycleMetrics.daysUntilNext)} days past avg`}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#A6A8D6]">Last Logged Flow</span>
            <span className="font-semibold text-[#FFB585]">
              {privacyMasked ? '••••' : `${latest.flowIntensity} (${latest.cycleLengthDays}d avg)`}
            </span>
          </div>
          {!privacyMasked && latest.symptoms.length > 0 && (
            <p className="text-[11px] text-[#C7C8E6] pt-1.5 border-t border-white/10">
              Symptoms: {latest.symptoms.join(', ')}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-[#0B0A33] border border-white/10 p-3.5 text-xs text-[#A6A8D6]">
          No cycle entries logged yet. Add your last start date to track regularity, flow, and PCOS symptoms privately.
        </div>
      )}

      {feedback && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/30 p-2.5 flex items-center gap-2 text-[11px] text-emerald-100">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-[#E5484D]/18 border border-[#E5484D]/45 p-2.5 flex items-center gap-2 text-[11px] text-[#FFD6D8]">
          <AlertCircle className="w-3.5 h-3.5 text-[#FF8A8E] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {compact && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl bg-[#272757] hover:bg-[#353574] text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {showForm ? 'Close Log' : 'Log Cycle'}
          </button>
          {onOpenFullCare && (
            <button
              type="button"
              onClick={onOpenFullCare}
              className="px-3 py-2 min-h-[38px] rounded-xl bg-white/10 hover:bg-white/15 text-[#D7D8EE] text-xs font-semibold cursor-pointer"
            >
              PCOS &amp; Care →
            </button>
          )}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={(e) => void handleSave(e)}
          className="space-y-3 pt-2 border-t border-white/10"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] text-[#C7C8E6] mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-2 min-h-[38px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#C7C8E6] mb-1">Cycle Days</label>
              <input
                type="number"
                min={18}
                max={60}
                value={cycleLengthDays}
                onChange={(e) => setCycleLengthDays(e.target.value)}
                className="w-full px-2.5 py-2 min-h-[38px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#C7C8E6] mb-1">Flow</label>
              <select
                value={flowIntensity}
                onChange={(e) => setFlowIntensity(e.target.value as FlowIntensity)}
                className="w-full px-2.5 py-2 min-h-[38px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white"
              >
                {(['Spotting', 'Light', 'Moderate', 'Heavy'] as const).map((f) => (
                  <option key={f} value={f} className="bg-[#0F0E47]">
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="text-[11px] text-[#C7C8E6] mb-1.5">Symptoms &amp; PCOS Indicators</p>
            <div className="flex flex-wrap gap-1.5">
              {SYMPTOM_OPTIONS.map((sym) => {
                const active = selectedSymptoms.includes(sym);
                return (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => toggleSymptom(sym)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#E8702A] border-[#E8702A] text-white'
                        : 'bg-[#0B0A33] border-white/12 text-[#C7C8E6] hover:border-white/30'
                    }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>

          <input
            type="text"
            maxLength={400}
            placeholder="Private note (e.g. irregular cycle, PCOS check-in)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 min-h-[38px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white placeholder:text-[#8686AC]"
          />

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 min-h-[40px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
          >
            {saving ? 'Saving Privately...' : 'Save Private Cycle Log'}
          </button>
        </form>
      )}

      {!compact && profileLogs.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <p className="text-xs font-semibold text-[#C7C8E6] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#8A8EF5]" />
            Logged Cycle History
          </p>
          {profileLogs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl bg-[#0B0A33] border border-white/10 p-3 flex items-center justify-between gap-2 text-xs"
            >
              <div>
                <p className="font-semibold text-white tabular-nums">
                  {privacyMasked ? '••••-••-••' : log.startDate} ·{' '}
                  {privacyMasked ? '••••' : `${log.flowIntensity} flow (${log.cycleLengthDays}d)`}
                </p>
                {!privacyMasked && log.symptoms.length > 0 && (
                  <p className="text-[11px] text-[#A6A8D6] mt-0.5">{log.symptoms.join(', ')}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Delete cycle entry"
                onClick={() => void deleteCycleLog(log.id)}
                className="p-1.5 rounded-lg text-[#8686AC] hover:text-[#FFD6D8] hover:bg-[#E5484D]/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#A6A8D6]">
        <span>Personal tracking aid — not contraception or diagnosis.</span>
        <button
          type="button"
          onClick={() => navigate('/ai-assistant')}
          className="inline-flex items-center gap-1 font-semibold text-[#FFB585] hover:underline cursor-pointer"
        >
          <Bot className="w-3.5 h-3.5" />
          Private AI Symptom Review
        </button>
      </div>
    </section>
  );
}
