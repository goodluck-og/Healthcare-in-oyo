import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  Syringe,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type {
  VaccinationRecord,
  VaccineAgeGroup,
  VaccineStatus,
} from '../../types/healthcare';

export interface VaccineMilestoneTemplate {
  id: string;
  ageGroup: VaccineAgeGroup;
  milestoneStage: string;
  vaccineName: string;
  doseLabel: string;
  guidance: string;
}

export const VACCINE_AGE_PROFILES: Array<{
  id: VaccineAgeGroup;
  label: string;
  shortLabel: string;
  framework: string;
}> = [
  {
    id: '0-5',
    label: 'Early Childhood (0–5 yrs)',
    shortLabel: '0–5 yrs',
    framework: 'Nigerian NPI Childhood Schedule',
  },
  {
    id: '10-15',
    label: 'Adolescent (10–15 yrs)',
    shortLabel: '10–15 yrs',
    framework: 'WHO & National Adolescent Boosters',
  },
  {
    id: '15+',
    label: 'Adult & Senior (15+ yrs)',
    shortLabel: '15+ yrs',
    framework: 'Adult Immunity & Travel Readiness',
  },
];

export const VACCINE_MILESTONE_CATALOG: Record<VaccineAgeGroup, VaccineMilestoneTemplate[]> = {
  '0-5': [
    {
      id: 'npi-birth-bcg',
      ageGroup: '0-5',
      milestoneStage: 'At Birth',
      vaccineName: 'BCG & Hepatitis B (Birth Dose)',
      doseLabel: 'At Birth',
      guidance: 'First-week newborn protection against tuberculosis and perinatal HepB.',
    },
    {
      id: 'npi-6-14w-penta',
      ageGroup: '0-5',
      milestoneStage: '6, 10 & 14 Weeks',
      vaccineName: 'Pentavalent (DPT-HepB-Hib)',
      doseLabel: '3-Dose Primary Series',
      guidance: 'Core childhood protection across diphtheria, pertussis, tetanus, HepB, and Hib.',
    },
    {
      id: 'npi-6-14w-rota-pcv',
      ageGroup: '0-5',
      milestoneStage: '6–14 Weeks',
      vaccineName: 'Rotavirus & Pneumococcal (PCV)',
      doseLabel: 'Infant Series',
      guidance: 'Reduces severe infant diarrhoea and bacterial pneumonia hospitalization.',
    },
    {
      id: 'npi-9-15m-measles-yf',
      ageGroup: '0-5',
      milestoneStage: '9 & 15 Months',
      vaccineName: 'Measles & Yellow Fever',
      doseLabel: '9 & 15 Months',
      guidance: 'Essential West African childhood immunization milestone.',
    },
  ],
  '10-15': [
    {
      id: 'adol-hpv',
      ageGroup: '10-15',
      milestoneStage: 'Ages 9–14',
      vaccineName: 'HPV (Human Papillomavirus)',
      doseLabel: 'Single Dose (9–14 yrs)',
      guidance: 'National adolescent cervical cancer prevention campaign.',
    },
    {
      id: 'adol-tdap',
      ageGroup: '10-15',
      milestoneStage: 'Ages 10–15',
      vaccineName: 'Tdap Booster (Tetanus-Diphtheria)',
      doseLabel: 'Adolescent Booster',
      guidance: 'Maintains childhood tetanus, diphtheria, and pertussis immunity.',
    },
    {
      id: 'adol-menacwy',
      ageGroup: '10-15',
      milestoneStage: 'Pre-Secondary',
      vaccineName: 'Meningococcal (MenACWY)',
      doseLabel: 'Boarding / School Entry',
      guidance: 'Recommended protection across the African meningitis belt.',
    },
  ],
  '15+': [
    {
      id: 'adult-hepb',
      ageGroup: '15+',
      milestoneStage: 'Adult Baseline',
      vaccineName: 'Hepatitis B Adult Series',
      doseLabel: '3-Dose / Booster',
      guidance: 'Recommended for unimmunized adults and healthcare personnel.',
    },
    {
      id: 'adult-yellow-fever',
      ageGroup: '15+',
      milestoneStage: 'Lifetime Card',
      vaccineName: 'Yellow Fever (International Card)',
      doseLabel: 'Single Lifetime Dose',
      guidance: 'WHO Yellow Card for international travel and endemic protection.',
    },
    {
      id: 'adult-tetanus',
      ageGroup: '15+',
      milestoneStage: 'Every 10 Years',
      vaccineName: 'Tetanus Toxoid (TT / Td)',
      doseLabel: '10-Year Booster',
      guidance: 'Routine adult wound and maternal-neonatal tetanus protection.',
    },
    {
      id: 'adult-typhoid',
      ageGroup: '15+',
      milestoneStage: 'Urban Prevention',
      vaccineName: 'Typhoid Conjugate (TCV)',
      doseLabel: 'Adult Single Dose',
      guidance: 'Recommended for high-exposure urban corridors and food handlers.',
    },
  ],
};

export function resolveAgeGroupFromAge(age?: number | null): VaccineAgeGroup {
  if (typeof age !== 'number' || !Number.isFinite(age) || age <= 0) {
    return '15+';
  }
  if (age <= 5) return '0-5';
  if (age <= 15) return '10-15';
  return '15+';
}

export interface MilestoneProgressItem {
  template: VaccineMilestoneTemplate;
  matchedRecord: VaccinationRecord | null;
  status: VaccineStatus | 'Not Logged';
}

export interface VaccineScheduleSummary {
  ageGroup: VaccineAgeGroup;
  items: MilestoneProgressItem[];
  customRecords: VaccinationRecord[];
  totalMilestones: number;
  completedCount: number;
  scheduledCount: number;
  dueSoonCount: number;
  unloggedCount: number;
  completionPercent: number;
  scheduledPercent: number;
}

function normalizeName(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function computeVaccineScheduleProgress(
  ageGroup: VaccineAgeGroup,
  records: VaccinationRecord[]
): VaccineScheduleSummary {
  const templates = VACCINE_MILESTONE_CATALOG[ageGroup];
  const groupRecords = records.filter((r) => r.ageGroup === ageGroup);
  const usedRecordIds = new Set<string>();

  const items: MilestoneProgressItem[] = templates.map((template) => {
    const targetNorm = normalizeName(template.vaccineName);
    const primaryToken = targetNorm.split(' ')[0] || targetNorm;
    const match =
      groupRecords.find((rec) => {
        if (usedRecordIds.has(rec.id)) return false;
        const recNorm = normalizeName(rec.vaccineName);
        return (
          recNorm === targetNorm ||
          recNorm.includes(primaryToken) ||
          targetNorm.includes(recNorm)
        );
      }) || null;

    if (match) {
      usedRecordIds.add(match.id);
    }

    return {
      template,
      matchedRecord: match,
      status: match ? match.status : 'Not Logged',
    };
  });

  const customRecords = groupRecords.filter((rec) => !usedRecordIds.has(rec.id));

  const totalMilestones = items.length + customRecords.length;
  const completedCount =
    items.filter((i) => i.status === 'Completed').length +
    customRecords.filter((r) => r.status === 'Completed').length;
  const scheduledCount =
    items.filter((i) => i.status === 'Scheduled').length +
    customRecords.filter((r) => r.status === 'Scheduled').length;
  const dueSoonCount =
    items.filter((i) => i.status === 'Due Soon').length +
    customRecords.filter((r) => r.status === 'Due Soon').length;
  const unloggedCount = items.filter((i) => i.status === 'Not Logged').length;

  const completionPercent =
    totalMilestones > 0 ? Math.round((completedCount / totalMilestones) * 100) : 0;
  const scheduledPercent =
    totalMilestones > 0 ? Math.round((scheduledCount / totalMilestones) * 100) : 0;

  return {
    ageGroup,
    items,
    customRecords,
    totalMilestones,
    completedCount,
    scheduledCount,
    dueSoonCount,
    unloggedCount,
    completionPercent,
    scheduledPercent,
  };
}

interface VaccineScheduleTrackerProps {
  compact?: boolean;
  onOpenFullCareHub?: () => void;
}

export function VaccineScheduleTracker({
  compact = false,
  onOpenFullCareHub,
}: VaccineScheduleTrackerProps) {
  const {
    familyProfiles,
    activeProfileId,
    vaccinationRecords,
    addVaccinationRecord,
    updateVaccinationRecord,
  } = useApp();

  const activeProfile =
    familyProfiles.find((p) => p.id === activeProfileId) || familyProfiles[0] || null;

  const recommendedAgeGroup = useMemo(
    () => resolveAgeGroupFromAge(activeProfile?.age),
    [activeProfile?.age]
  );

  const [selectedAgeGroup, setSelectedAgeGroup] = useState<VaccineAgeGroup>(recommendedAgeGroup);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedAgeGroup(recommendedAgeGroup);
  }, [recommendedAgeGroup]);

  const summary = useMemo(
    () => computeVaccineScheduleProgress(selectedAgeGroup, vaccinationRecords),
    [selectedAgeGroup, vaccinationRecords]
  );

  const activeBracketMeta =
    VACCINE_AGE_PROFILES.find((p) => p.id === selectedAgeGroup) || VACCINE_AGE_PROFILES[0];

  const handleMilestoneAction = async (
    item: MilestoneProgressItem,
    targetStatus: VaccineStatus
  ) => {
    setBusyId(item.template.id);
    setFeedback(null);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (item.matchedRecord) {
        await updateVaccinationRecord(item.matchedRecord.id, {
          status: targetStatus,
          date: item.matchedRecord.date || today,
          facilityName: item.matchedRecord.facilityName,
        });
      } else {
        await addVaccinationRecord({
          profileId: activeProfile?.id || 'default',
          vaccineName: item.template.vaccineName,
          ageGroup: item.template.ageGroup,
          doseLabel: item.template.doseLabel,
          status: targetStatus,
          date: today,
          facilityName: activeProfile?.city
            ? `${activeProfile.city} Primary Health Clinic`
            : 'Primary Health Clinic',
          notes: item.template.guidance,
        });
      }
      setFeedback(
        `${item.template.vaccineName} marked as ${targetStatus} for ${activeBracketMeta.shortLabel}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update vaccine milestone.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      aria-label="Age-based vaccine schedule tracker"
      className="rounded-2xl bg-[#13124A] border border-white/10 p-5 sm:p-6 space-y-5"
    >
      {/* Header + Age-Profile Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#FFB585] flex items-center gap-1.5">
            <Syringe className="w-3.5 h-3.5" />
            <span>
              Immunization Timeline · {activeBracketMeta.framework}
            </span>
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
            Age-Based Vaccine Schedule Tracker
          </h2>
          <p className="text-xs text-[#C7C8E6] mt-0.5">
            {activeProfile
              ? `${activeProfile.fullName} (${activeProfile.age > 0 ? `${activeProfile.age} yrs` : 'Age not set'}) · Matched bracket: ${recommendedAgeGroup} yrs`
              : 'Compare milestone progress across childhood, adolescent, and adult immunization schedules.'}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Select vaccine age profile"
          className="inline-flex rounded-xl bg-[#0B0A33] p-1 border border-white/10 shrink-0 self-start lg:self-auto"
        >
          {VACCINE_AGE_PROFILES.map((bucket) => {
            const isActive = selectedAgeGroup === bucket.id;
            const isMatched = recommendedAgeGroup === bucket.id;
            return (
              <button
                key={bucket.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedAgeGroup(bucket.id)}
                className={`px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#E8702A] text-white'
                    : 'text-[#C7C8E6] hover:text-white'
                }`}
              >
                {bucket.shortLabel}
                {isMatched && !isActive ? ' · Profile' : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Progress Bar & Breakdown */}
      <div className="rounded-xl bg-[#0B0A33] border border-white/10 p-4 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-[#D7D8EE]">
              {activeBracketMeta.label} Completion Progress
            </p>
            <p className="text-xs text-[#A6A8D6] mt-0.5 tabular-nums">
              {summary.completedCount} Completed · {summary.scheduledCount} Scheduled ·{' '}
              {summary.dueSoonCount} Due Soon · {summary.unloggedCount} Remaining
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-white font-mono tabular-nums">
              {summary.completionPercent}%
            </span>
            <span className="text-xs text-[#A6A8D6] ml-1.5 font-mono tabular-nums">
              ({summary.completedCount}/{summary.totalMilestones})
            </span>
          </div>
        </div>

        {/* Stacked Progress Bar (Completed = Emerald, Scheduled = Indigo) */}
        <div
          role="progressbar"
          aria-valuenow={summary.completionPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${activeBracketMeta.label} vaccine schedule completion`}
          className="w-full h-3 rounded-full bg-white/10 overflow-hidden flex"
        >
          <div
            className="h-full bg-[#34D399] transition-all duration-300"
            style={{ width: `${summary.completionPercent}%` }}
          />
          <div
            className="h-full bg-[#8A8EF5] transition-all duration-300"
            style={{
              width: `${Math.min(100 - summary.completionPercent, summary.scheduledPercent)}%`,
            }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#A6A8D6]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34D399]" aria-hidden="true" />
              Completed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8A8EF5]" aria-hidden="true" />
              Scheduled
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white/20" aria-hidden="true" />
              Not Yet Completed
            </span>
          </div>
          {onOpenFullCareHub && (
            <button
              type="button"
              onClick={onOpenFullCareHub}
              className="text-[#FFB585] hover:underline font-semibold cursor-pointer"
            >
              Manage Custom Doses →
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/30 p-3 flex items-center gap-2 text-xs text-emerald-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-[#E5484D]/18 border border-[#E5484D]/45 p-3 flex items-center gap-2 text-xs text-[#FFD6D8]">
          <AlertCircle className="w-4 h-4 text-[#FF8A8E] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Visual Connected Milestone Timeline */}
      <ol className="relative space-y-3">
        {summary.items.map((item, idx) => {
          const isLast = idx === summary.items.length - 1 && summary.customRecords.length === 0;
          const isBusy = busyId === item.template.id;
          const isCompleted = item.status === 'Completed';
          const isScheduled = item.status === 'Scheduled';
          const isDueSoon = item.status === 'Due Soon';

          const statusLabelClass = isCompleted
            ? 'text-emerald-300'
            : isScheduled
              ? 'text-[#B4B8FF]'
              : isDueSoon
                ? 'text-[#FFB585]'
                : 'text-[#A6A8D6]';

          return (
            <li key={item.template.id} className="relative pl-9">
              {/* Vertical connector line */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[13px] top-7 bottom-[-14px] w-0.5 ${
                    isCompleted ? 'bg-emerald-400/50' : 'bg-white/15'
                  }`}
                />
              )}

              {/* Milestone node icon */}
              <span
                aria-hidden="true"
                className={`absolute left-0 top-2.5 w-7 h-7 rounded-full flex items-center justify-center border ${
                  isCompleted
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : isScheduled
                      ? 'bg-[#5E60CE]/25 border-[#8A8EF5] text-[#C7C9FF]'
                      : isDueSoon
                        ? 'bg-[#E8702A]/20 border-[#FFB585] text-[#FFB585]'
                        : 'bg-[#0B0A33] border-white/25 text-[#8686AC]'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isScheduled ? (
                  <CalendarClock className="w-3.5 h-3.5" />
                ) : isDueSoon ? (
                  <Clock className="w-3.5 h-3.5" />
                ) : (
                  <Circle className="w-3 h-3" />
                )}
              </span>

              <div className="rounded-xl bg-[#0B0A33] border border-white/10 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                    <span className="font-mono font-semibold text-[#FFB585]">
                      {item.template.milestoneStage}
                    </span>
                    <span className="text-white/30">·</span>
                    <span className={`font-semibold ${statusLabelClass}`}>{item.status}</span>
                    {item.matchedRecord?.date && (
                      <>
                        <span className="text-white/30">·</span>
                        <span className="text-[#A6A8D6] font-mono tabular-nums">
                          {item.matchedRecord.date}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white">{item.template.vaccineName}</p>
                  {!compact && (
                    <p className="text-xs text-[#A6A8D6] leading-relaxed">
                      {item.template.guidance}
                      {item.matchedRecord?.facilityName
                        ? ` · ${item.matchedRecord.facilityName}`
                        : ''}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {!isCompleted ? (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleMilestoneAction(item, 'Completed')}
                        className="px-3 py-2 min-h-[38px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {isBusy ? 'Saving...' : 'Mark Completed'}
                      </button>
                      {!isScheduled && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleMilestoneAction(item, 'Scheduled')}
                          className="px-3 py-2 min-h-[38px] rounded-lg bg-[#272757] hover:bg-[#37377A] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                        >
                          Schedule
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleMilestoneAction(item, 'Scheduled')}
                      className="px-3 py-2 min-h-[38px] rounded-lg bg-white/10 hover:bg-white/15 text-[#D7D8EE] text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      Reopen Dose
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}

        {/* Any extra user-logged custom vaccines in this age group */}
        {summary.customRecords.map((rec, idx) => {
          const isLast = idx === summary.customRecords.length - 1;
          const isCompleted = rec.status === 'Completed';
          return (
            <li key={rec.id} className="relative pl-9">
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="absolute left-[13px] top-7 bottom-[-14px] w-0.5 bg-white/15"
                />
              )}
              <span
                aria-hidden="true"
                className={`absolute left-0 top-2.5 w-7 h-7 rounded-full flex items-center justify-center border ${
                  isCompleted
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-[#5E60CE]/25 border-[#8A8EF5] text-[#C7C9FF]'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <CalendarClock className="w-3.5 h-3.5" />
                )}
              </span>
              <div className="rounded-xl bg-[#0B0A33] border border-white/10 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <p className="text-[11px] text-[#A6A8D6] font-mono tabular-nums">
                    Custom Dose · {rec.status} · {rec.date}
                  </p>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {rec.vaccineName} ({rec.doseLabel})
                  </p>
                </div>
                <span className="text-[11px] text-[#C7C8E6]">
                  {rec.facilityName || 'Custom entry'}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
