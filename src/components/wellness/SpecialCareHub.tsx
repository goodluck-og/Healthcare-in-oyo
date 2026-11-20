import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  CreditCard,
  Droplets,
  Eye,
  EyeOff,
  HeartHandshake,
  Plus,
  Shield,
  Syringe,
  Trash2,
} from 'lucide-react';
import { formatNaira, useApp } from '../../context/AppContext';
import { CycleTrackerCard } from './CycleTrackerCard';
import type { VaccineAgeGroup, VaccineStatus } from '../../types/healthcare';

interface RoutineVaccineItem {
  name: string;
  doseLabel: string;
  ageGroup: VaccineAgeGroup;
  note: string;
}

const NIGERIA_WHO_VACCINE_SCHEDULE: Record<VaccineAgeGroup, RoutineVaccineItem[]> = {
  '0-5': [
    {
      name: 'BCG & Hepatitis B (Birth Dose)',
      doseLabel: 'At Birth',
      ageGroup: '0-5',
      note: 'Nigerian NPI routine newborn protection.',
    },
    {
      name: 'Pentavalent (DPT-HepB-Hib)',
      doseLabel: '6, 10 & 14 Weeks',
      ageGroup: '0-5',
      note: '3-dose foundational childhood series.',
    },
    {
      name: 'Measles & Yellow Fever',
      doseLabel: '9 & 15 Months',
      ageGroup: '0-5',
      note: 'Essential West African childhood immunization.',
    },
    {
      name: 'Rotavirus & Pneumococcal (PCV)',
      doseLabel: '6–14 Weeks',
      ageGroup: '0-5',
      note: 'Protects against severe diarrhoea and pneumonia.',
    },
  ],
  '10-15': [
    {
      name: 'HPV (Human Papillomavirus)',
      doseLabel: 'Single Dose (9–14 yrs)',
      ageGroup: '10-15',
      note: 'Nigeria national adolescent cervical cancer prevention.',
    },
    {
      name: 'Tdap Booster (Tetanus-Diphtheria)',
      doseLabel: 'Adolescent Booster',
      ageGroup: '10-15',
      note: 'Recommended booster between ages 10 and 15.',
    },
    {
      name: 'Meningococcal (MenACWY)',
      doseLabel: 'Pre-Secondary School',
      ageGroup: '10-15',
      note: 'Important across the African meningitis belt.',
    },
  ],
  '15+': [
    {
      name: 'Hepatitis B Adult Series',
      doseLabel: '3-Dose / Booster',
      ageGroup: '15+',
      note: 'Recommended for unimmunized adults and healthcare staff.',
    },
    {
      name: 'Yellow Fever (International Card)',
      doseLabel: 'Single Lifetime Dose',
      ageGroup: '15+',
      note: 'WHO-recognized travel and endemic protection.',
    },
    {
      name: 'Tetanus Toxoid (TT / Td)',
      doseLabel: 'Every 10 Years',
      ageGroup: '15+',
      note: 'Ongoing adult & maternal protection.',
    },
    {
      name: 'Typhoid Conjugate (TCV)',
      doseLabel: 'Adult Single Dose',
      ageGroup: '15+',
      note: 'Recommended in high-exposure urban corridors.',
    },
  ],
};

export function SpecialCareHub() {
  const {
    vaccinationRecords,
    addVaccinationRecord,
    updateVaccinationRecord,
    deleteVaccinationRecord,
    familyProfiles,
    activeProfileId,
    openSubscriptionCheckout,
    navigate,
  } = useApp();

  const activeProfile =
    familyProfiles.find((p) => p.id === activeProfileId) || familyProfiles[0] || null;

  const [ageTab, setAgeTab] = useState<VaccineAgeGroup>('0-5');
  const [customVaccineName, setCustomVaccineName] = useState('');
  const [customDoseLabel, setCustomDoseLabel] = useState('Dose 1');
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customFacility, setCustomFacility] = useState('');
  const [customStatus, setCustomStatus] = useState<VaccineStatus>('Scheduled');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [maskSensitiveNotes, setMaskSensitiveNotes] = useState(true);

  const profileVaccines = useMemo(
    () =>
      vaccinationRecords.filter((v) => v.ageGroup === ageTab),
    [vaccinationRecords, ageTab]
  );

  const genotype = (activeProfile?.genotype || 'Unknown').toUpperCase();
  const isSickleTraitOrCondition =
    genotype === 'SS' || genotype === 'SC' || genotype === 'AS' || genotype === 'AC';

  const handleQuickAddFromSchedule = async (item: RoutineVaccineItem) => {
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      await addVaccinationRecord({
        profileId: activeProfile?.id || 'default',
        vaccineName: item.name,
        ageGroup: item.ageGroup,
        doseLabel: item.doseLabel,
        status: 'Scheduled',
        date: new Date().toISOString().slice(0, 10),
        facilityName: activeProfile?.city ? `${activeProfile.city} Primary Health Hub` : 'Primary Health Clinic',
        notes: item.note,
      });
      setNotice(`Added "${item.name}" (${item.ageGroup} yrs) to your immunization tracker.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save vaccination record.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customVaccineName.trim()) return;
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      await addVaccinationRecord({
        profileId: activeProfile?.id || 'default',
        vaccineName: customVaccineName.trim(),
        ageGroup: ageTab,
        doseLabel: customDoseLabel.trim() || 'Dose 1',
        status: customStatus,
        date: customDate,
        facilityName: customFacility.trim() || undefined,
      });
      setCustomVaccineName('');
      setCustomFacility('');
      setNotice('Vaccination record saved to Firestore.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save vaccination record.');
    } finally {
      setSaving(false);
    }
  };

  const handleCycleStatus = async (
    recordId: string,
    currentStatus: VaccineStatus,
    date: string,
    facilityName?: string
  ) => {
    const nextStatus: VaccineStatus =
      currentStatus === 'Due Soon'
        ? 'Scheduled'
        : currentStatus === 'Scheduled'
        ? 'Completed'
        : 'Due Soon';
    setError(null);
    try {
      await updateVaccinationRecord(recordId, {
        status: nextStatus,
        date,
        facilityName,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update vaccine status.');
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/30 p-3.5 flex items-center gap-2 text-xs text-emerald-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-[#E5484D]/18 border border-[#E5484D]/45 p-3.5 flex items-center gap-2 text-xs text-[#FFD6D8]">
          <AlertCircle className="w-4 h-4 text-[#FF8A8E] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Age-Grouped Vaccination Tracker (0-5, 10-15, 15+) */}
      <section className="rounded-2xl bg-[#13124A] border border-white/10 p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#FFB585] flex items-center gap-1.5">
              <Syringe className="w-3.5 h-3.5" />
              Immunization Schedule · Nigerian NPI &amp; WHO Guidelines
            </p>
            <h2 className="text-xl font-bold text-white mt-1">
              Age-Grouped Vaccination Tracker
            </h2>
            <p className="text-xs text-[#C7C8E6] mt-0.5">
              Track routine childhood, adolescent, and adult vaccines across every member of your household.
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-[#0B0A33] p-1 border border-white/10 shrink-0">
            {(
              [
                { id: '0-5', label: 'Ages 0–5' },
                { id: '10-15', label: 'Ages 10–15' },
                { id: '15+', label: 'Ages 15+' },
              ] as const
            ).map((bucket) => (
              <button
                key={bucket.id}
                type="button"
                onClick={() => setAgeTab(bucket.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  ageTab === bucket.id
                    ? 'bg-[#E8702A] text-white'
                    : 'text-[#C7C8E6] hover:text-white'
                }`}
              >
                {bucket.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Recommended Schedule Quick-Add */}
          <div className="lg:col-span-5 space-y-2.5">
            <p className="text-xs font-semibold text-[#D7D8EE]">
              Recommended Schedule ({ageTab} yrs)
            </p>
            {NIGERIA_WHO_VACCINE_SCHEDULE[ageTab].map((item) => (
              <div
                key={item.name}
                className="rounded-xl bg-[#0B0A33] border border-white/10 p-3.5 flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="text-[#FFB585] text-[11px] mt-0.5">{item.doseLabel}</p>
                  <p className="text-[#A6A8D6] text-[11px] mt-0.5">{item.note}</p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleQuickAddFromSchedule(item)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#272757] hover:bg-[#3A3A7E] text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Track
                </button>
              </div>
            ))}
          </div>

          {/* Saved Records + Custom Entry */}
          <div className="lg:col-span-7 space-y-4">
            <p className="text-xs font-semibold text-[#D7D8EE]">
              Recorded Immunizations ({ageTab} yrs) — Click status to toggle
            </p>
            {profileVaccines.length === 0 ? (
              <div className="rounded-xl bg-[#0B0A33] border border-white/10 p-5 text-xs text-[#A6A8D6]">
                No vaccines logged in the {ageTab} yrs group yet. Select from the routine schedule on the left or add a custom dose below.
              </div>
            ) : (
              <div className="space-y-2.5">
                {profileVaccines.map((rec) => {
                  const statusTone =
                    rec.status === 'Completed'
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/35'
                      : rec.status === 'Scheduled'
                      ? 'bg-[#5E60CE]/25 text-[#D7D8FF] border-[#8A8EF5]/40'
                      : 'bg-[#E8702A]/20 text-[#FFD0B0] border-[#E8702A]/45';
                  return (
                    <div
                      key={rec.id}
                      className="rounded-xl bg-[#0B0A33] border border-white/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-white">{rec.vaccineName}</p>
                        <p className="text-[#A6A8D6] mt-0.5 tabular-nums">
                          {rec.doseLabel} · {rec.date}
                          {rec.facilityName ? ` · ${rec.facilityName}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            void handleCycleStatus(rec.id, rec.status, rec.date, rec.facilityName)
                          }
                          className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${statusTone}`}
                        >
                          {rec.status}
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${rec.vaccineName}`}
                          onClick={() => void deleteVaccinationRecord(rec.id)}
                          className="p-1.5 rounded-lg text-[#8686AC] hover:text-[#FFD6D8] hover:bg-[#E5484D]/20 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add custom vaccine */}
            <form
              onSubmit={(e) => void handleAddCustomVaccine(e)}
              className="rounded-xl bg-[#0B0A33]/90 border border-white/10 p-4 space-y-3"
            >
              <p className="text-xs font-semibold text-white">Add Custom Vaccine Record ({ageTab} yrs)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Vaccine name (e.g. Yellow Fever)"
                  value={customVaccineName}
                  onChange={(e) => setCustomVaccineName(e.target.value)}
                  className="px-3 py-2 min-h-[40px] rounded-xl bg-[#13124A] border border-white/15 text-xs text-white placeholder:text-[#8686AC]"
                />
                <input
                  type="text"
                  maxLength={60}
                  placeholder="Dose (e.g. Dose 2 / Booster)"
                  value={customDoseLabel}
                  onChange={(e) => setCustomDoseLabel(e.target.value)}
                  className="px-3 py-2 min-h-[40px] rounded-xl bg-[#13124A] border border-white/15 text-xs text-white placeholder:text-[#8686AC]"
                />
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="px-3 py-2 min-h-[40px] rounded-xl bg-[#13124A] border border-white/15 text-xs text-white"
                />
                <select
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value as VaccineStatus)}
                  className="px-3 py-2 min-h-[40px] rounded-xl bg-[#13124A] border border-white/15 text-xs text-white"
                >
                  <option value="Scheduled" className="bg-[#0F0E47]">Scheduled</option>
                  <option value="Completed" className="bg-[#0F0E47]">Completed</option>
                  <option value="Due Soon" className="bg-[#0F0E47]">Due Soon</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  maxLength={120}
                  placeholder="Clinic / Hospital name (optional)"
                  value={customFacility}
                  onChange={(e) => setCustomFacility(e.target.value)}
                  className="flex-1 px-3 py-2 min-h-[40px] rounded-xl bg-[#13124A] border border-white/15 text-xs text-white placeholder:text-[#8686AC]"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 min-h-[40px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold cursor-pointer shrink-0"
                >
                  Save Dose
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* 2. Special Care Pathways: Sickle Cell, PCOS & Private Sensitive Symptoms */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 space-y-6">
          {/* Sickle Cell & Genotype-Aware Pathway */}
          <section className="rounded-2xl bg-[#13124A] border border-white/10 p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#FFB585] flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5" />
                  Genotype-Aware Care Pathway
                </p>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Sickle Cell &amp; Blood Group Readiness
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#A6A8D6] block">Active Genotype</span>
                <span className="text-lg font-bold text-[#FFB585] font-mono">
                  {genotype} · {activeProfile?.bloodGroup || 'Unknown'}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-[#0B0A33] border border-white/10 p-4 text-xs text-[#D7D8EE] space-y-2 leading-relaxed">
              {isSickleTraitOrCondition ? (
                <>
                  <p className="font-semibold text-white">
                    Tailored Support for Genotype {genotype}:
                  </p>
                  <p>
                    Prioritize consistent daily hydration (2.5–3L water), avoid sudden temperature extremes, keep folic acid / clinician-prescribed preventive refills active, and maintain verified haematology clinic contacts for early crisis intervention.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-white">
                    Recorded Genotype: {genotype}
                  </p>
                  <p>
                    Update your genotype anytime in My Profile or when adding child dependents so emergency triage and haematology care plans reflect accurate blood &amp; genotype data.
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/find-healthcare')}
                className="px-3.5 py-2 min-h-[40px] rounded-xl bg-[#272757] hover:bg-[#353574] text-white text-xs font-semibold cursor-pointer"
              >
                Find Haematology Clinics
              </button>
              <button
                type="button"
                onClick={() => navigate('/payments')}
                className="px-3.5 py-2 min-h-[40px] rounded-xl bg-white/10 hover:bg-white/15 text-[#D7D8EE] text-xs font-semibold cursor-pointer"
              >
                Blood Bank &amp; Lab Screening
              </button>
            </div>
          </section>

          {/* Private Sensitive Symptoms & AI Test Review */}
          <section className="rounded-2xl bg-[#13124A] border border-white/10 p-6 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8EF5] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Discreet &amp; Non-Judgmental Care
                </p>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Sensitive Symptoms &amp; AI Test Review
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMaskSensitiveNotes((m) => !m)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0B0A33] border border-white/15 text-[11px] font-semibold text-[#D7D8EE] cursor-pointer"
              >
                {maskSensitiveNotes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {maskSensitiveNotes ? 'Show Guidance' : 'Mask Screen'}
              </button>
            </div>

            <p className="text-xs text-[#C7C8E6] leading-relaxed">
              {maskSensitiveNotes
                ? 'Screen privacy mask active. Tap "Show Guidance" when you are in a private setting, or jump straight into your private AI Assistant.'
                : 'Privately review PCOS cycle patterns, recurrent yeast infection triggers, vaginal wellness, STI screening preparation, dermatology concerns, or mental health stress with our AI Assistant before booking a discreet Oyo State OB-GYN or video consultation (Adeoyo Maternity & Bodija clinics).'}
            </p>

            {!maskSensitiveNotes && (
              <div className="rounded-xl bg-[#0B0A33] border border-white/10 p-3.5 text-xs text-[#D7D8EE] space-y-1.5">
                <p className="font-semibold text-white">PCOS → Yeast &amp; Sensitive Care Checklist</p>
                <p className="text-[#C7C8E6]">
                  Track missed cycles, blood sugar spikes, and recurring yeast discomfort together — insulin fluctuations in PCOS can increase yeast recurrence. Share your log securely with an Ibadan OB-GYN before self-medicating.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/ai-assistant')}
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold cursor-pointer"
              >
                <Bot className="w-4 h-4" />
                Open Private AI Test &amp; Symptom Review
              </button>
            </div>
          </section>
        </div>

        {/* Full Women's Menstruation & PCOS Cycle Tracker */}
        <div className="lg:col-span-6">
          <CycleTrackerCard />
        </div>
      </div>

      {/* 3. Oyo State Monthly Subscription Plans */}
      <section className="rounded-2xl bg-[#13124A] border border-white/10 p-6 space-y-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#FFB585] flex items-center gap-1.5">
            <HeartHandshake className="w-3.5 h-3.5" />
            HealthConnect Oyo State · Monthly Subscriptions
          </p>
          <h3 className="text-xl font-bold text-white mt-1">
            Individual &amp; Family of 5 Monthly Plans
          </h3>
          <p className="text-xs text-[#C7C8E6] mt-0.5">
            One predictable monthly subscription via Interswitch Checkout — unlimited online doctor consultations first, then doctor-scheduled physical exams across Oyo State.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-2xl bg-[#0B0A33] border border-white/12 p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-base font-bold text-white">Individual Plan</h4>
                <span className="text-xl font-bold text-[#8A8EF5] tabular-nums">
                  {formatNaira(16000)}
                  <span className="text-xs font-normal text-[#A6A8D6]"> / mo</span>
                </span>
              </div>
              <ul className="text-xs text-[#C7C8E6] space-y-1.5 pt-1">
                <li>• 1 personal health profile with private records &amp; vitals</li>
                <li>• Unlimited online video doctor consultations in Oyo State</li>
                <li>• Doctor-booked physical exams at UCH, Adeoyo, Ring Road &amp; Bowen</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => openSubscriptionCheckout('plan-oyo-individual-monthly')}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 min-h-[42px] rounded-xl bg-[#272757] hover:bg-[#353574] text-white text-xs font-semibold cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              Subscribe · {formatNaira(16000)} / month
            </button>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#1C1A60] to-[#0B0A33] border border-[#E8702A]/45 p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-base font-bold text-white">Family Plan (Up to 5 Profiles)</h4>
                <span className="text-xl font-bold text-[#FFB585] tabular-nums">
                  {formatNaira(50000)}
                  <span className="text-xs font-normal text-[#A6A8D6]"> / mo</span>
                </span>
              </div>
              <ul className="text-xs text-[#D7D8EE] space-y-1.5 pt-1">
                <li>• Netflix-style household switcher for up to 5 family profiles</li>
                <li>• Independent vaccines (0–5, 10–15, 15+), vitals &amp; genotype vault</li>
                <li>• Unlimited online doctors &amp; coordinated Oyo physical exams</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => openSubscriptionCheckout('plan-oyo-family-monthly')}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 min-h-[42px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              Subscribe Family of 5 · {formatNaira(50000)} / month
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
