import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  Clock,
  Pill,
  Plus,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BLUEPRINT_LIMITS } from '../../firebaseConfig';
import type {
  MedicationReminder,
  ReminderCategory,
  ReminderFrequency,
} from '../../types/healthcare';

const CATEGORIES: ReminderCategory[] = [
  'Medication',
  'BP Check',
  'Glucose Check',
  'Hydration & Wellness',
  'Appointment',
];

const FREQUENCIES: ReminderFrequency[] = [
  'Daily',
  'Twice Daily',
  'Weekdays',
  'Weekends',
  'Weekly',
];

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getNextScheduledReminder(items: MedicationReminder[]): MedicationReminder | null {
  const active = items.filter((r) => r.enabled);
  if (active.length === 0) return null;
  const now = new Date();
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
  const sorted = [...active].sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));
  return sorted.find((r) => r.timeOfDay >= currentHHMM) ?? sorted[0] ?? null;
}

function StatusSwitch({
  checked,
  disabled,
  label,
  onToggle,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`inline-flex items-center gap-2 min-h-[36px] px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
        checked
          ? 'border-[#272757]/20 bg-[#F5F6FC] text-[#0F0E47]'
          : 'border-[#272757]/15 bg-white text-[#505081]'
      }`}
    >
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? 'bg-[#272757]' : 'bg-[#C7C8E6]'
        }`}
        aria-hidden="true"
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform ${
            checked ? 'translate-x-4.5' : 'translate-x-1'
          }`}
        />
      </span>
      <span className="w-11 text-left">{checked ? 'Active' : 'Paused'}</span>
    </button>
  );
}

export function MedicationReminders() {
  const {
    familyProfiles,
    activeProfileId,
    prescriptions,
    reminders,
    addReminder,
    toggleReminder,
    markReminderTaken,
    deleteReminder,
  } = useApp();

  const activeProfile =
    familyProfiles.find((p) => p.id === activeProfileId) || familyProfiles[0] || null;
  const todayIso = getTodayIso();

  const profileReminders = useMemo(() => {
    if (!activeProfile) return reminders;
    return reminders.filter(
      (r) => !r.profileId || r.profileId === 'default' || r.profileId === activeProfile.id
    );
  }, [reminders, activeProfile]);

  const profilePrescriptions = useMemo(() => {
    if (!activeProfile) return prescriptions;
    return prescriptions.filter((rx) => rx.profileId === activeProfile.id);
  }, [prescriptions, activeProfile]);

  const [categoryFilter, setCategoryFilter] = useState<'All' | ReminderCategory>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  // Form state
  const [title, setTitle] = useState('');
  const [dosage, setDosage] = useState('');
  const [category, setCategory] = useState<ReminderCategory>('Medication');
  const [timeOfDay, setTimeOfDay] = useState('08:00');
  const [frequency, setFrequency] = useState<ReminderFrequency>('Daily');
  const [notes, setNotes] = useState('');

  // Mutation / feedback state
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [browserAlertStatus, setBrowserAlertStatus] = useState<
    'default' | 'granted' | 'denied' | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  });

  const filteredReminders = useMemo(() => {
    return [...profileReminders]
      .filter((r) => (categoryFilter === 'All' ? true : r.category === categoryFilter))
      .filter((r) => {
        if (statusFilter === 'active') return r.enabled;
        if (statusFilter === 'paused') return !r.enabled;
        return true;
      })
      .sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));
  }, [profileReminders, categoryFilter, statusFilter]);

  const activeCount = profileReminders.filter((r) => r.enabled).length;
  const completedTodayCount = profileReminders.filter(
    (r) => r.enabled && r.lastTakenDate === todayIso
  ).length;
  const nextReminder = useMemo(
    () => getNextScheduledReminder(profileReminders),
    [profileReminders]
  );

  const handleEnableBrowserAlerts = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserAlertStatus('unsupported');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setBrowserAlertStatus(result);
    } catch {
      setBrowserAlertStatus('denied');
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2) {
      setErrorMsg('Enter a reminder title (at least 2 characters), such as a medication name or health check.');
      return;
    }
    setSubmitting(true);
    try {
      const cleanTime = timeOfDay || '08:00';
      await addReminder({
        profileId: activeProfile?.id || 'default',
        title: trimmedTitle,
        dosage: dosage.trim() || undefined,
        category,
        timeOfDay: cleanTime,
        frequency,
        schedule: `${frequency} · ${cleanTime} WAT`,
        notes: notes.trim() || undefined,
      });
      setTitle('');
      setDosage('');
      setNotes('');
      setSuccessMsg(`Scheduled "${trimmedTitle}" for ${frequency.toLowerCase()} at ${cleanTime} WAT.`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to save reminder right now. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    setErrorMsg(null);
    setBusyId(id);
    try {
      await toggleReminder(id);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to update reminder status right now.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkTaken = async (id: string) => {
    setErrorMsg(null);
    setBusyId(id);
    try {
      await markReminderTaken(id, todayIso);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to update today’s completion status.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setErrorMsg(null);
    setBusyId(id);
    try {
      await deleteReminder(id);
      setConfirmDeleteId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to remove reminder.');
    } finally {
      setBusyId(null);
    }
  };

  const applyQuickFill = (preset: {
    title: string;
    dosage: string;
    category: ReminderCategory;
    timeOfDay: string;
    frequency: ReminderFrequency;
    notes: string;
  }) => {
    setTitle(preset.title);
    setDosage(preset.dosage);
    setCategory(preset.category);
    setTimeOfDay(preset.timeOfDay);
    setFrequency(preset.frequency);
    setNotes(preset.notes);
    setErrorMsg(null);
    const input = document.getElementById('reminder-title-input');
    input?.focus();
  };

  return (
    <div className="space-y-6">
      {/* Header & Summary Card */}
      <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-[#505081]">
              {activeProfile ? `${activeProfile.fullName} · Daily Care Schedule` : 'Daily Care Schedule'}
            </p>
            <h2 className="text-xl font-bold text-[#0F0E47] mt-0.5 flex items-center gap-2">
              <Pill className="w-5 h-5 text-[#E8702A]" />
              Medication &amp; Health Reminders
            </h2>
          </div>

          {browserAlertStatus !== 'unsupported' && (
            <button
              type="button"
              disabled={browserAlertStatus === 'granted'}
              onClick={() => void handleEnableBrowserAlerts()}
              className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                browserAlertStatus === 'granted'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 cursor-default'
                  : 'bg-[#F5F6FC] hover:bg-[#E8EAF7] border border-[#272757]/15 text-[#0F0E47] cursor-pointer'
              }`}
            >
              <BellRing className="w-4 h-4 shrink-0" />
              {browserAlertStatus === 'granted'
                ? 'Browser Alerts Enabled'
                : browserAlertStatus === 'denied'
                  ? 'Browser Alerts Blocked'
                  : 'Enable Browser Alerts'}
            </button>
          )}
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-y border-[#272757]/10">
          <div>
            <p className="text-xs text-[#505081]">Active Notifications</p>
            <p className="text-2xl font-bold text-[#0F0E47] tabular-nums mt-0.5">
              {activeCount}
              <span className="text-xs font-normal text-[#505081] ml-1.5">
                of {profileReminders.length} scheduled
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs text-[#505081]">Completed Today</p>
            <p className="text-2xl font-bold text-[#0F0E47] tabular-nums mt-0.5">
              {completedTodayCount} / {activeCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#505081]">Next Scheduled Alert</p>
            <p className="text-base font-bold text-[#0F0E47] tabular-nums mt-1 truncate">
              {nextReminder ? `${nextReminder.timeOfDay} WAT · ${nextReminder.title}` : 'No active alerts'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-3.5 flex items-start gap-2 text-xs text-[#9C2327]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center justify-between gap-2 text-xs text-emerald-900">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {successMsg}
            </span>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-700 font-semibold hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F5F6FC] border border-[#272757]/10 overflow-x-auto">
            {(['All', ...CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#272757] text-white'
                    : 'text-[#505081] hover:text-[#0F0E47]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F5F6FC] border border-[#272757]/10 self-start">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'paused', label: 'Paused' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatusFilter(opt.id)}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === opt.id
                    ? 'bg-white text-[#0F0E47] border border-[#272757]/15 shadow-xs'
                    : 'text-[#505081] hover:text-[#0F0E47]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scheduled Reminders List */}
        {filteredReminders.length === 0 ? (
          <div className="rounded-xl bg-[#F5F6FC] border border-dashed border-[#272757]/20 py-10 px-6 text-center space-y-2">
            <p className="text-sm font-semibold text-[#0F0E47]">
              No reminders match this filter
            </p>
            <p className="text-xs text-[#505081]">
              {profileReminders.length === 0
                ? 'Schedule your first daily medication or vital check notification below.'
                : 'Reset filters to view all scheduled health notifications.'}
            </p>
            {profileReminders.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('All');
                  setStatusFilter('all');
                }}
                className="mt-2 px-4 py-2 min-h-[38px] rounded-xl bg-white border border-[#272757]/20 text-xs font-semibold text-[#0F0E47] cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#272757]/10 border-t border-[#272757]/10">
            {filteredReminders.map((item) => {
              const takenToday = item.lastTakenDate === todayIso;
              const isBusy = busyId === item.id;

              return (
                <div
                  key={item.id}
                  className={`py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-opacity ${
                    item.enabled ? 'opacity-100' : 'opacity-70'
                  }`}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="shrink-0 w-20 pt-0.5">
                      <p className="font-mono text-sm font-bold text-[#0F0E47] tabular-nums flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#505081]" />
                        {item.timeOfDay}
                      </p>
                      <p className="text-[11px] text-[#505081] mt-0.5">{item.frequency}</p>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <h3 className="text-sm font-bold text-[#0F0E47]">{item.title}</h3>
                        {item.dosage && (
                          <span className="text-xs text-[#505081]">· {item.dosage}</span>
                        )}
                      </div>
                      <p className="text-xs text-[#505081]">
                        <span>{item.category}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="tabular-nums">{item.schedule}</span>
                        {takenToday && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="font-semibold text-[#15803D]">Completed today</span>
                          </>
                        )}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-[#505081] leading-relaxed">{item.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Row Controls */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 md:justify-end">
                    <button
                      type="button"
                      disabled={isBusy || !item.enabled}
                      onClick={() => void handleMarkTaken(item.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                        takenToday
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-white border-[#272757]/15 text-[#0F0E47] hover:bg-[#F5F6FC]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {takenToday ? 'Done Today' : 'Mark Done'}
                    </button>

                    <StatusSwitch
                      checked={item.enabled}
                      disabled={isBusy}
                      label={`Toggle ${item.title} reminder ${item.enabled ? 'off' : 'on'}`}
                      onToggle={() => void handleToggle(item.id)}
                    />

                    {confirmDeleteId === item.id ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDelete(item.id)}
                          className="px-2.5 py-1.5 min-h-[36px] rounded-lg bg-[#E5484D] hover:bg-[#C9363B] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1.5 min-h-[36px] rounded-lg border border-[#272757]/15 text-xs text-[#505081] cursor-pointer whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        aria-label={`Delete ${item.title}`}
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#272757]/12 text-[#505081] hover:text-[#B91C1C] hover:border-[#E5484D]/30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Schedule New Reminder Form */}
      <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#0F0E47]">
              Schedule Daily Health Notification
            </h3>
            <p className="text-xs text-[#505081] mt-0.5">
              Set up recurring medication doses, vitals checks, or hydration prompts synced to your account.
            </p>
          </div>
        </div>

        {/* Quick-Fill Templates from Prescriptions & Common Health Routines */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#505081]">Quick fill from prescriptions &amp; routines:</p>
          <div className="flex flex-wrap gap-2">
            {profilePrescriptions.map((rx) => (
              <button
                key={rx.id}
                type="button"
                onClick={() =>
                  applyQuickFill({
                    title: rx.medication,
                    dosage: `${rx.dosage} · ${rx.frequency}`,
                    category: 'Medication',
                    timeOfDay: '08:00',
                    frequency: 'Daily',
                    notes: rx.instructions,
                  })
                }
                className="px-3 py-1.5 min-h-[36px] rounded-lg bg-[#F5F6FC] hover:bg-[#E8EAF7] border border-[#272757]/12 text-xs font-medium text-[#0F0E47] cursor-pointer whitespace-nowrap"
              >
                + {rx.medication}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                applyQuickFill({
                  title: 'Evening Blood Pressure Check',
                  dosage: 'Seated 5 mins rest',
                  category: 'BP Check',
                  timeOfDay: '20:00',
                  frequency: 'Daily',
                  notes: 'Record reading before dinner or bedtime.',
                })
              }
              className="px-3 py-1.5 min-h-[36px] rounded-lg bg-[#F5F6FC] hover:bg-[#E8EAF7] border border-[#272757]/12 text-xs font-medium text-[#0F0E47] cursor-pointer whitespace-nowrap"
            >
              + Evening BP Check (20:00)
            </button>
            <button
              type="button"
              onClick={() =>
                applyQuickFill({
                  title: 'Daily Hydration & Electrolyte Check',
                  dosage: '500ml water',
                  category: 'Hydration & Wellness',
                  timeOfDay: '13:00',
                  frequency: 'Daily',
                  notes: 'Midday hydration prompt during warm weather.',
                })
              }
              className="px-3 py-1.5 min-h-[36px] rounded-lg bg-[#F5F6FC] hover:bg-[#E8EAF7] border border-[#272757]/12 text-xs font-medium text-[#0F0E47] cursor-pointer whitespace-nowrap"
            >
              + Midday Hydration (13:00)
            </button>
          </div>
        </div>

        <form onSubmit={(e) => void handleScheduleSubmit(e)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="reminder-title-input"
                className="block text-xs font-medium text-[#505081] mb-1"
              >
                Medication or Reminder Title *
              </label>
              <input
                id="reminder-title-input"
                type="text"
                required
                minLength={2}
                maxLength={BLUEPRINT_LIMITS.reminderTitleMaxLength}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Metformin 500mg or Morning BP Check"
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm text-[#0F0E47]"
              />
            </div>

            <div>
              <label
                htmlFor="reminder-dosage-input"
                className="block text-xs font-medium text-[#505081] mb-1"
              >
                Dosage / Target Detail (Optional)
              </label>
              <input
                id="reminder-dosage-input"
                type="text"
                maxLength={BLUEPRINT_LIMITS.reminderDosageMaxLength}
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g. 1 tablet after dinner"
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm text-[#0F0E47]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="reminder-category-select"
                className="block text-xs font-medium text-[#505081] mb-1"
              >
                Category
              </label>
              <select
                id="reminder-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as ReminderCategory)}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm bg-white text-[#0F0E47]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="reminder-time-input"
                className="block text-xs font-medium text-[#505081] mb-1"
              >
                Time of Day (WAT)
              </label>
              <input
                id="reminder-time-input"
                type="time"
                required
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm font-mono tabular-nums text-[#0F0E47]"
              />
            </div>

            <div>
              <label
                htmlFor="reminder-freq-select"
                className="block text-xs font-medium text-[#505081] mb-1"
              >
                Recurrence
              </label>
              <select
                id="reminder-freq-select"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as ReminderFrequency)}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm bg-white text-[#0F0E47]"
              >
                {FREQUENCIES.map((freq) => (
                  <option key={freq} value={freq}>
                    {freq}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="reminder-notes-input"
              className="block text-xs font-medium text-[#505081] mb-1"
            >
              Instructions or Notes (Optional)
            </label>
            <input
              id="reminder-notes-input"
              type="text"
              maxLength={BLUEPRINT_LIMITS.reminderNotesMaxLength}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Swallow whole with evening meal; avoid grapefruit juice"
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm text-[#0F0E47]"
            />
          </div>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Saving Reminder...' : 'Schedule Reminder'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function RemindersOverviewWidget({
  onManageClick,
}: {
  onManageClick: () => void;
}) {
  const { familyProfiles, activeProfileId, reminders, toggleReminder } = useApp();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeProfile =
    familyProfiles.find((p) => p.id === activeProfileId) || familyProfiles[0] || null;

  const profileReminders = useMemo(() => {
    const scoped = activeProfile
      ? reminders.filter(
          (r) => !r.profileId || r.profileId === 'default' || r.profileId === activeProfile.id
        )
      : reminders;
    return [...scoped].sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));
  }, [reminders, activeProfile]);

  const activeCount = profileReminders.filter((r) => r.enabled).length;

  const handleToggle = async (id: string) => {
    setErrorMsg(null);
    setBusyId(id);
    try {
      await toggleReminder(id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update reminder.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#0F0E47] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#E8702A]" />
            Medication &amp; Daily Health Reminders
          </h2>
          <p className="text-xs text-[#505081] mt-0.5 tabular-nums">
            {activeCount} active · {profileReminders.length} scheduled
          </p>
        </div>

        <button
          type="button"
          onClick={onManageClick}
          className="px-3.5 py-2 min-h-[38px] rounded-xl bg-[#F5F6FC] hover:bg-[#E8EAF7] border border-[#272757]/15 text-xs font-semibold text-[#0F0E47] cursor-pointer whitespace-nowrap"
        >
          Manage &amp; Schedule
        </button>
      </div>

      {errorMsg && (
        <p className="text-xs text-[#9C2327] bg-[#E5484D]/10 border border-[#E5484D]/25 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}

      {profileReminders.length === 0 ? (
        <div className="rounded-xl bg-[#F5F6FC] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-[#505081]">
            No daily medication or vital reminders scheduled yet.
          </p>
          <button
            type="button"
            onClick={onManageClick}
            className="px-3.5 py-2 min-h-[38px] rounded-xl bg-[#272757] text-white text-xs font-semibold cursor-pointer whitespace-nowrap self-start"
          >
            Schedule First Reminder
          </button>
        </div>
      ) : (
        <div className="divide-y divide-[#272757]/10 border-t border-[#272757]/10">
          {profileReminders.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0F0E47] truncate">
                  {item.title}
                  {item.dosage && (
                    <span className="font-normal text-xs text-[#505081]"> · {item.dosage}</span>
                  )}
                </p>
                <p className="text-xs text-[#505081] mt-0.5 tabular-nums">
                  {item.category} · {item.schedule}
                </p>
              </div>
              <StatusSwitch
                checked={item.enabled}
                disabled={busyId === item.id}
                label={`Toggle ${item.title} reminder ${item.enabled ? 'off' : 'on'}`}
                onToggle={() => void handleToggle(item.id)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
