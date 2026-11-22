import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  HeartPulse,
  Lock,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import {
  calculateAgeFromDob,
  GLOBAL_EMERGENCY_PRESETS,
  resolveAgeStage,
} from '../../services/personalisationEngine';
import type { HealthOnboardingPayload } from '../../context/AppContext';
import type { ConfirmedGender, FamilyProfile } from '../../types/healthcare';

interface HealthOnboardingModalProps {
  open: boolean;
  initialProfile?: FamilyProfile | null;
  defaultName?: string;
  defaultCity?: string;
  onSave: (payload: HealthOnboardingPayload) => Promise<void>;
  onDismiss: () => void;
}

const BLOOD_GROUPS = ['Unknown', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const GENOTYPES = ['Unknown', 'AA', 'AS', 'AC', 'SS', 'SC', 'CC'];

function parseCsvList(input: string): string[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function HealthOnboardingModal({
  open,
  initialProfile,
  defaultName,
  defaultCity,
  onSave,
  onDismiss,
}: HealthOnboardingModalProps) {
  const [fullName, setFullName] = useState(initialProfile?.fullName || defaultName || '');
  const [dateOfBirth, setDateOfBirth] = useState(initialProfile?.dateOfBirth || '1996-05-15');
  const [genderConfirmed, setGenderConfirmed] = useState<ConfirmedGender>(
    initialProfile?.genderConfirmed ||
      (initialProfile?.gender?.toLowerCase() === 'female'
        ? 'female'
        : initialProfile?.gender?.toLowerCase() === 'male'
          ? 'male'
          : 'not_specified')
  );
  const [bloodGroup, setBloodGroup] = useState(initialProfile?.bloodGroup || 'Unknown');
  const [genotype, setGenotype] = useState(initialProfile?.genotype || 'Unknown');
  const [allergiesText, setAllergiesText] = useState(
    initialProfile?.allergies?.filter((a) => a.toLowerCase() !== 'none recorded').join(', ') || ''
  );
  const [conditionsText, setConditionsText] = useState(
    initialProfile?.chronicConditions?.join(', ') || ''
  );
  const [medicationsText, setMedicationsText] = useState(
    initialProfile?.currentMedications?.join(', ') || ''
  );
  const [countryCode, setCountryCode] = useState(initialProfile?.countryCode || 'NG');
  const [emergencyNumber, setEmergencyNumber] = useState(initialProfile?.emergencyNumber || '112');
  const [city, setCity] = useState(initialProfile?.city || defaultCity || 'Ibadan');
  const [iceName, setIceName] = useState('');
  const [icePhone, setIcePhone] = useState('');
  const [iceRelation, setIceRelation] = useState('Family Member');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFullName(initialProfile?.fullName || defaultName || '');
    if (initialProfile?.dateOfBirth) setDateOfBirth(initialProfile.dateOfBirth);
    if (initialProfile?.genderConfirmed) setGenderConfirmed(initialProfile.genderConfirmed);
    if (initialProfile?.bloodGroup) setBloodGroup(initialProfile.bloodGroup);
    if (initialProfile?.genotype) setGenotype(initialProfile.genotype);
    if (initialProfile?.countryCode) setCountryCode(initialProfile.countryCode);
    if (initialProfile?.emergencyNumber) setEmergencyNumber(initialProfile.emergencyNumber);
    if (initialProfile?.city || defaultCity) setCity(initialProfile?.city || defaultCity || 'Ibadan');
  }, [open, initialProfile, defaultName, defaultCity]);

  const calculatedAge = useMemo(() => calculateAgeFromDob(dateOfBirth), [dateOfBirth]);
  const ageStage = useMemo(() => resolveAgeStage(calculatedAge), [calculatedAge]);

  if (!open) return null;

  const handleCountryChange = (nextCode: string) => {
    setCountryCode(nextCode);
    const preset = GLOBAL_EMERGENCY_PRESETS.find((p) => p.countryCode === nextCode);
    if (preset) {
      setEmergencyNumber(preset.emergencyNumber);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!dateOfBirth) {
      setError('Please enter your Date of Birth so HealthConnect can tailor safe age-appropriate tools.');
      return;
    }
    if (genderConfirmed === 'not_specified') {
      setError('Please confirm Male or Female so your personalised dashboard & clinical tools adapt accurately.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        fullName: fullName.trim() || undefined,
        dateOfBirth,
        genderConfirmed,
        bloodGroup,
        genotype,
        allergies: parseCsvList(allergiesText),
        chronicConditions: parseCsvList(conditionsText),
        currentMedications: parseCsvList(medicationsText),
        countryCode,
        emergencyNumber: emergencyNumber.trim() || '112',
        city: city.trim() || undefined,
        emergencyContactName: iceName.trim() || undefined,
        emergencyContactPhone: icePhone.trim() || undefined,
        emergencyContactRelation: iceRelation.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save health profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#070624]/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
    >
      <div className="w-full max-w-2xl rounded-3xl bg-[#13124A] border border-white/15 text-white shadow-2xl my-auto overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-[#0F0E47] border-b border-white/10 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#FFB585] flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4" />
              HealthConnect Personalised Medical Profile
            </p>
            <h2 id="onboarding-modal-title" className="text-xl font-bold mt-1 tracking-tight">
              Confirm Essential Health &amp; Safety Details
            </h2>
            <p className="text-xs text-[#C7C8E6] mt-1 leading-relaxed">
              Used to personalise your age-appropriate dashboard, protect minors automatically, and generate your offline Emergency Medical QR Code for first responders.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Skip for now"
            className="w-9 h-9 rounded-xl bg-white/8 hover:bg-white/15 flex items-center justify-center text-[#C7C8E6] hover:text-white shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {error && (
            <div className="rounded-xl bg-[#E5484D]/18 border border-[#E5484D]/45 p-3.5 text-xs text-[#FFD6D8] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#FF8A8E]" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Identity, DOB & Gender Confirmation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="onb-name" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                Full Name
              </label>
              <input
                id="onb-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-sm text-white placeholder:text-[#8686AC] focus:outline-none focus:border-[#8A8EF5]"
              />
            </div>

            <div>
              <label htmlFor="onb-dob" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                Date of Birth (Required)
              </label>
              <input
                id="onb-dob"
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                min="1905-01-01"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-sm text-white tabular-nums focus:outline-none focus:border-[#8A8EF5]"
              />
            </div>
          </div>

          {/* Calculated Age Stage Preview & Child Safety Notice */}
          <div
            className={`rounded-2xl p-4 border text-xs flex items-start gap-3 ${
              ageStage.isGuardianManaged
                ? 'bg-amber-500/15 border-amber-400/40 text-amber-100'
                : 'bg-[#1D1C62] border-white/12 text-[#D7D8EE]'
            }`}
          >
            {ageStage.isGuardianManaged ? (
              <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            ) : (
              <UserCheck className="w-5 h-5 text-[#6EE7B7] shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-bold text-white">
                Calculated Age: <span className="tabular-nums">{calculatedAge}</span> yrs · {ageStage.label} ({ageStage.ageRangeLabel})
              </p>
              <p className="leading-relaxed">
                {ageStage.isGuardianManaged
                  ? 'Child Guardian Safety Lock Active: Adult reproductive, sexual health, and adult screening modules are automatically hidden to keep young users completely safe.'
                  : ageStage.guidanceNote}
              </p>
            </div>
          </div>

          {/* Gender Confirmation */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#D7D8EE]">
              Confirm Biological Sex / Gender Profile (Required)
            </span>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { id: 'female', label: 'Female', sub: 'Personalises female preventive modules' },
                  { id: 'male', label: 'Male', sub: 'Personalises male preventive modules' },
                ] as const
              ).map((opt) => {
                const active = genderConfirmed === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setGenderConfirmed(opt.id)}
                    className={`rounded-xl p-3.5 min-h-[56px] border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#E8702A] border-[#FFB585] text-white'
                        : 'bg-[#0B0A33] border-white/15 text-[#D7D8EE] hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{opt.label}</span>
                      {active && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <p className={`text-[11px] mt-0.5 ${active ? 'text-white/90' : 'text-[#9A9CC7]'}`}>
                      {opt.sub}
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[#A6A8D6]">
              You can customize optional preventive modules anytime from your dashboard — gender alone never limits urgent clinical guidance.
            </p>
          </div>

          {/* Section 2: Lifesaving Emergency Medical Data (for QR & Triage) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="onb-blood" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                Blood Group (For Emergency QR)
              </label>
              <select
                id="onb-blood"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-sm text-white focus:outline-none focus:border-[#8A8EF5]"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg} className="bg-[#0F0E47]">
                    {bg}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="onb-geno" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                Genotype
              </label>
              <select
                id="onb-geno"
                value={genotype}
                onChange={(e) => setGenotype(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-sm text-white focus:outline-none focus:border-[#8A8EF5]"
              >
                {GENOTYPES.map((g) => (
                  <option key={g} value={g} className="bg-[#0F0E47]">
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="onb-allergies" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                Drug / Food Allergies
              </label>
              <input
                id="onb-allergies"
                type="text"
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
                placeholder="e.g. Penicillin, Peanuts"
                className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white placeholder:text-[#8686AC]"
              />
            </div>
            <div>
              <label htmlFor="onb-conditions" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                Chronic Conditions
              </label>
              <input
                id="onb-conditions"
                type="text"
                value={conditionsText}
                onChange={(e) => setConditionsText(e.target.value)}
                placeholder="e.g. Asthma, Hypertension"
                className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white placeholder:text-[#8686AC]"
              />
            </div>
            <div>
              <label htmlFor="onb-meds" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                Current Medications
              </label>
              <input
                id="onb-meds"
                type="text"
                value={medicationsText}
                onChange={(e) => setMedicationsText(e.target.value)}
                placeholder="e.g. Salbutamol, Amlodipine"
                className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white placeholder:text-[#8686AC]"
              />
            </div>
          </div>

          {/* Section 3: Region Emergency Number & ICE Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10">
            <div>
              <label htmlFor="onb-country" className="block text-xs font-semibold text-[#D7D8EE] mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-[#FFB585]" />
                Country / Region
              </label>
              <select
                id="onb-country"
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
            <div>
              <label htmlFor="onb-emg-num" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                Local Emergency Number
              </label>
              <input
                id="onb-emg-num"
                type="text"
                value={emergencyNumber}
                onChange={(e) => setEmergencyNumber(e.target.value)}
                className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white font-mono tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="onb-city" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                City / Town
              </label>
              <input
                id="onb-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Ibadan, Lagos, London"
                className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="onb-ice-name" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                Emergency Contact Name
              </label>
              <input
                id="onb-ice-name"
                type="text"
                value={iceName}
                onChange={(e) => setIceName(e.target.value)}
                placeholder="Next of kin / Guardian"
                className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white placeholder:text-[#8686AC]"
              />
            </div>
            <div>
              <label htmlFor="onb-ice-phone" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                Emergency Contact Phone
              </label>
              <input
                id="onb-ice-phone"
                type="tel"
                value={icePhone}
                onChange={(e) => setIcePhone(e.target.value)}
                placeholder="+234 800 000 0000"
                className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white font-mono tabular-nums placeholder:text-[#8686AC]"
              />
            </div>
            <div>
              <label htmlFor="onb-ice-rel" className="block text-xs font-semibold text-[#D7D8EE] mb-1">
                Relationship
              </label>
              <input
                id="onb-ice-rel"
                type="text"
                value={iceRelation}
                onChange={(e) => setIceRelation(e.target.value)}
                placeholder="Parent / Spouse / Sibling"
                className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[11px] text-[#A6A8D6] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#6EE7B7] shrink-0" />
              Stored under owner-only Firestore rules · QR generated 100% locally on device.
            </p>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onDismiss}
                className="px-4 py-2.5 min-h-[44px] rounded-xl bg-white/8 hover:bg-white/15 text-xs font-semibold text-[#D7D8EE] cursor-pointer"
              >
                Later
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] disabled:opacity-60 text-white text-xs sm:text-sm font-bold cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                {saving ? 'Saving Profile...' : 'Save & Personalise HealthConnect'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
