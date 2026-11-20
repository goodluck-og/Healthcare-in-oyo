import React, { useState } from 'react';
import {
  Check,
  Edit3,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { formatNaira, useApp } from '../../context/AppContext';
import { NIGERIA_CITY_PRESETS } from '../../data/mockNigeriaData';
import type { FamilyProfile } from '../../types/healthcare';

const PROFILE_TILE_PALETTE = [
  { bg: 'bg-[#2C2A86]', accent: 'text-indigo-100', border: 'border-indigo-400' },
  { bg: 'bg-[#0F6E6A]', accent: 'text-teal-100', border: 'border-teal-300' },
  { bg: 'bg-[#8A244B]', accent: 'text-rose-100', border: 'border-rose-300' },
  { bg: 'bg-[#A65E14]', accent: 'text-amber-100', border: 'border-amber-300' },
  { bg: 'bg-[#1D4E89]', accent: 'text-sky-100', border: 'border-sky-300' },
];

const OYO_CITIES = Object.keys(NIGERIA_CITY_PRESETS);

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'HC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function NetflixFamilyHub({
  onEditProfile,
}: {
  onEditProfile?: (profile: FamilyProfile) => void;
}) {
  const {
    familyProfiles,
    activeProfileId,
    setActiveProfileId,
    addFamilyProfile,
    activeSubscription,
    openSubscriptionCheckout,
    isGuestDemo,
  } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] =
    useState<FamilyProfile['relationship']>('Child Dependent');
  const [age, setAge] = useState('12');
  const [gender, setGender] = useState('Female');
  const [city, setCity] = useState('Ibadan');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [genotype, setGenotype] = useState('AA');
  const [allergiesText, setAllergiesText] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isFamilyPlan = activeSubscription.maxProfiles === 5;
  const maxSeats = isFamilyPlan ? 5 : 1;
  const seatsUsed = familyProfiles.length;
  const canAddMore = seatsUsed < maxSeats && seatsUsed < 5;
  const emptyFamilySlots = Math.max(0, 5 - seatsUsed);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!fullName.trim()) {
      setErrorMsg('Please enter the family member’s full name.');
      return;
    }
    setSaving(true);
    try {
      await addFamilyProfile({
        fullName: fullName.trim(),
        relationship,
        age: Math.max(0, Math.min(120, Number(age) || 0)),
        gender,
        city,
        bloodGroup,
        genotype,
        allergies: allergiesText
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        hmoProvider: 'HealthConnect Oyo State · Family of 5 Plan',
      });
      setFullName('');
      setAge('12');
      setAllergiesText('');
      setShowAddForm(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to add family profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Netflix-style dark profile selector stage */}
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0D0C2D] p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
              HealthConnect Oyo State · Household Profiles
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Who&apos;s accessing care?
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-slate-300">
              Switch between separate household health profiles just like Netflix. Each member has
              private vitals, prescriptions, vaccinations, and online doctor consultations.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="text-right">
              <p className="text-xs text-slate-400">Active Subscription</p>
              <p className="text-sm font-bold text-white">
                {activeSubscription.status === 'Active'
                  ? isFamilyPlan
                    ? 'Family of 5 Plan · ₦50,000/mo'
                    : 'Individual Plan · ₦16,000/mo'
                  : 'No Active Monthly Plan'}
              </p>
            </div>
            <p className="text-xs font-medium text-sky-300 tabular-nums">
              {seatsUsed} of {maxSeats} {maxSeats === 1 ? 'profile seat' : 'family profiles'} used
            </p>
          </div>
        </div>

        {/* 5-seat Netflix-style avatar tile grid */}
        <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {familyProfiles.slice(0, 5).map((profile, idx) => {
            const palette = PROFILE_TILE_PALETTE[idx % PROFILE_TILE_PALETTE.length];
            const isSelected = profile.id === activeProfileId;
            return (
              <div
                key={profile.id}
                className={`group flex flex-col items-center rounded-2xl border p-4 text-center transition-all ${
                  isSelected
                    ? 'border-white bg-white/10'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveProfileId(profile.id)}
                  className="flex w-full flex-col items-center focus:outline-none"
                >
                  <div
                    className={`relative flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold tracking-tight text-white transition-transform group-hover:scale-[1.03] ${palette.bg} ${
                      isSelected ? `ring-2 ring-white ring-offset-2 ring-offset-[#0D0C2D]` : ''
                    }`}
                  >
                    {getInitials(profile.fullName)}
                    {isSelected && (
                      <span
                        title="Active Profile"
                        className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  <p className="mt-3 line-clamp-1 text-sm font-bold text-white">
                    {profile.fullName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-300">
                    {profile.relationship} · {profile.age} yrs
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-sky-200/90">
                    {profile.bloodGroup} · {profile.genotype} · {profile.city}
                  </p>
                </button>

                {onEditProfile && (
                  <button
                    type="button"
                    onClick={() => onEditProfile(profile)}
                    className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </button>
                )}
              </div>
            );
          })}

          {/* Remaining slots up to 5 */}
          {Array.from({ length: emptyFamilySlots }).map((_, slotIdx) => {
            const isNextActionableSlot = slotIdx === 0;
            const unlocked = isFamilyPlan || isGuestDemo;

            if (isNextActionableSlot && canAddMore) {
              return (
                <button
                  key={`add-slot-${slotIdx}`}
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setShowAddForm(true);
                  }}
                  className="flex min-h-[196px] flex-col items-center justify-center rounded-2xl border border-dashed border-sky-400/50 bg-sky-500/[0.07] p-4 text-center transition-colors hover:border-sky-300 hover:bg-sky-500/15"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/50 text-sky-200">
                    <Plus className="h-7 w-7" />
                  </div>
                  <p className="mt-3 text-sm font-bold text-white">Add Profile</p>
                  <p className="mt-0.5 text-xs text-sky-200/80">
                    {5 - seatsUsed} {5 - seatsUsed === 1 ? 'seat' : 'seats'} left
                  </p>
                </button>
              );
            }

            if (isNextActionableSlot && !unlocked) {
              return (
                <button
                  key={`upgrade-slot-${slotIdx}`}
                  type="button"
                  onClick={() => openSubscriptionCheckout('plan-oyo-family-monthly')}
                  className="flex min-h-[196px] flex-col items-center justify-center rounded-2xl border border-dashed border-amber-400/50 bg-amber-500/[0.08] p-4 text-center transition-colors hover:border-amber-300 hover:bg-amber-500/15"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/50 text-amber-200">
                    <Lock className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-bold text-white">Unlock 5 Profiles</p>
                  <p className="mt-0.5 text-xs text-amber-200">Family Plan · ₦50,000/mo</p>
                </button>
              );
            }

            return (
              <div
                key={`empty-slot-${slotIdx}`}
                className="flex min-h-[196px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center opacity-55"
              >
                <Users className="h-6 w-6 text-slate-500" />
                <p className="mt-2 text-xs font-medium text-slate-400">
                  {unlocked ? 'Open Family Seat' : 'Family Plan Seat'}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer bar inside Netflix hub */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>
              All profiles share unlimited online doctor consultations across Oyo State before
              doctor-scheduled physical exams.
            </span>
          </div>
          {!isFamilyPlan && (
            <button
              type="button"
              onClick={() => openSubscriptionCheckout('plan-oyo-family-monthly')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#0D0C2D] hover:bg-slate-100"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Upgrade to Family of 5 ({formatNaira(50000)}/mo)
            </button>
          )}
        </div>
      </section>

      {/* Inline Add Family Profile Form */}
      {showAddForm && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <UserCheck className="h-5 w-5 text-[#1A1A6C]" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Add Family Member Profile ({seatsUsed + 1} of 5)
                </h3>
                <p className="text-xs text-slate-500">
                  Creates an independent medical profile under your Oyo State Family Plan.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
              {errorMsg}
            </div>
          )}

          <form onSubmit={(e) => void handleAddMember(e)} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ayomide Adeyemi"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1A1A6C] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Relationship</label>
              <select
                value={relationship}
                onChange={(e) =>
                  setRelationship(e.target.value as FamilyProfile['relationship'])
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1A1A6C] focus:outline-none"
              >
                <option value="Child Dependent">Child Dependent</option>
                <option value="Parent">Parent / Elder</option>
                <option value="Self (Primary)">Spouse / Primary Adult</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Oyo State City / Town</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1A1A6C] focus:outline-none"
              >
                {OYO_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Age</label>
              <input
                type="number"
                min={0}
                max={120}
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1A1A6C] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1A1A6C] focus:outline-none"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Not specified">Prefer not to say</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#1A1A6C] focus:outline-none"
                >
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'Unknown'].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Genotype</label>
                <select
                  value={genotype}
                  onChange={(e) => setGenotype(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#1A1A6C] focus:outline-none"
                >
                  {['AA', 'AS', 'AC', 'SS', 'SC', 'Unknown'].map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Known Allergies (comma-separated, optional)
              </label>
              <input
                type="text"
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
                placeholder="e.g. Penicillin, Peanuts (leave blank if none)"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1A1A6C] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 sm:col-span-2 lg:col-span-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#1A1A6C] px-5 py-2 text-sm font-semibold text-white hover:bg-[#131354] disabled:opacity-50"
              >
                {saving ? 'Saving Profile...' : 'Save Family Profile'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
