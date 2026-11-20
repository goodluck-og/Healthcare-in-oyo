import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileText,
  HeartPulse,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NIGERIA_CITY_PRESETS } from '../../data/mockNigeriaData';

interface UserProfileProps {
  startInEditMode?: boolean;
  onExitEditMode?: () => void;
}

export function UserProfile({ startInEditMode = false, onExitEditMode }: UserProfileProps) {
  const {
    user,
    userProfile,
    isGuestDemo,
    privateInfo,
    familyProfiles,
    activeProfileId,
    updateMyAccount,
    updateFamilyProfile,
    updatePrivateDetails,
    addFamilyProfile,
    documents,
    addMedicalDocument,
    appointments,
    bpReadings,
    glucoseReadings,
    navigate,
  } = useApp();

  const activeProfile =
    familyProfiles.find((p) => p.id === activeProfileId) || familyProfiles[0] || null;
  const isPrimaryProfile = activeProfile?.relationship === 'Self (Primary)';

  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable personal, medical, and contact fields
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('0');
  const [gender, setGender] = useState('Not specified');
  const [city, setCity] = useState('Ibadan');
  const [bloodGroup, setBloodGroup] = useState('Unknown');
  const [genotype, setGenotype] = useState('Unknown');
  const [allergiesText, setAllergiesText] = useState('None recorded');
  const [hmoProvider, setHmoProvider] = useState('Self-Pay / Not Set');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Quick add medical history / clinical note
  const [showAddHistory, setShowAddHistory] = useState(false);
  const [historyTitle, setHistoryTitle] = useState('');
  const [historyCategory, setHistoryCategory] = useState<
    'Lab Report' | 'Imaging' | 'Immunization' | 'Discharge Summary'
  >('Discharge Summary');
  const [historySummary, setHistorySummary] = useState('');

  useEffect(() => {
    if (startInEditMode) {
      setIsEditing(true);
    }
  }, [startInEditMode]);

  useEffect(() => {
    if (activeProfile) {
      setFullName(activeProfile.fullName);
      setAge(String(activeProfile.age));
      setGender(activeProfile.gender || 'Not specified');
      setCity(activeProfile.city || userProfile?.city || user.city || 'Ibadan');
      setBloodGroup(activeProfile.bloodGroup || 'Unknown');
      setGenotype(activeProfile.genotype || 'Unknown');
      setAllergiesText(activeProfile.allergies.join(', ') || 'None recorded');
      setHmoProvider(activeProfile.hmoProvider || 'Self-Pay / Not Set');
    } else {
      setFullName(userProfile?.displayName || (user.name !== 'Guest Preview (Demo)' ? user.name : ''));
      setCity(userProfile?.city || user.city || 'Ibadan');
    }
    setMedicalHistory(userProfile?.medicalHistory || '');
    setPhone(privateInfo?.phone || '');
    setAddress(privateInfo?.address || '');
  }, [activeProfile, userProfile, privateInfo, user.name, user.city]);

  const profileDocs = activeProfile
    ? documents.filter((d) => d.profileId === activeProfile.id)
    : [];
  const profileAppointments = activeProfile
    ? appointments.filter((a) => a.profileId === activeProfile.id || a.profileId === 'default')
    : [];
  const latestBp = activeProfile
    ? bpReadings.find((b) => b.profileId === activeProfile.id)
    : undefined;
  const latestGlucose = activeProfile
    ? glucoseReadings.find((g) => g.profileId === activeProfile.id)
    : undefined;

  const cancelEdit = () => {
    setIsEditing(false);
    setErrorMsg(null);
    onExitEditMode?.();
    if (activeProfile) {
      setFullName(activeProfile.fullName);
      setAge(String(activeProfile.age));
      setGender(activeProfile.gender || 'Not specified');
      setCity(activeProfile.city || userProfile?.city || 'Ibadan');
      setBloodGroup(activeProfile.bloodGroup || 'Unknown');
      setGenotype(activeProfile.genotype || 'Unknown');
      setAllergiesText(activeProfile.allergies.join(', ') || 'None recorded');
      setHmoProvider(activeProfile.hmoProvider || 'Self-Pay / Not Set');
    }
    setMedicalHistory(userProfile?.medicalHistory || '');
    setPhone(privateInfo?.phone || '');
    setAddress(privateInfo?.address || '');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      const parsedAllergies = allergiesText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      const safeAge = Math.max(0, Math.min(120, Number(age) || 0));
      const trimmedName = fullName.trim();
      const trimmedCity = city.trim() || 'Ibadan';
      const trimmedHistory = medicalHistory.trim();

      if (!isGuestDemo) {
        // Persist core user fields & medical history summary directly to users/{uid}
        await updateMyAccount({
          ...(isPrimaryProfile || !activeProfile
            ? { displayName: trimmedName, city: trimmedCity }
            : {}),
          medicalHistory: trimmedHistory,
        });

        // Persist isolated contact details directly to users/{uid}/private/contact
        await updatePrivateDetails({
          phone: phone.trim(),
          address: address.trim(),
        });
      }

      if (activeProfile) {
        if (isGuestDemo || user.emailVerified) {
          await updateFamilyProfile(activeProfile.id, {
            fullName: trimmedName,
            age: safeAge,
            gender: gender.trim() || 'Not specified',
            city: trimmedCity,
            bloodGroup,
            genotype,
            allergies: parsedAllergies.length > 0 ? parsedAllergies : ['None recorded'],
            hmoProvider: hmoProvider.trim() || 'Self-Pay / Not Set',
          });
        }
      } else if (isGuestDemo || user.emailVerified) {
        await addFamilyProfile({
          fullName: trimmedName,
          relationship: 'Self (Primary)',
          age: safeAge,
          gender: gender.trim() || 'Not specified',
          city: trimmedCity,
          bloodGroup,
          genotype,
          allergies: parsedAllergies.length > 0 ? parsedAllergies : ['None recorded'],
          hmoProvider: hmoProvider.trim() || 'Self-Pay / Not Set',
        });
      }

      setIsEditing(false);
      onExitEditMode?.();
      setSuccessMsg(
        isGuestDemo
          ? 'Profile updated for this demonstration preview. Sign in to save permanently to Cloud Firestore.'
          : 'Your personal details, medical history, and contact information have been synced to your Firestore user record.'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save profile updates.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMedicalHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) {
      setErrorMsg('Create or save your primary profile before adding medical history records.');
      return;
    }
    if (!historyTitle.trim() || !historySummary.trim()) {
      setErrorMsg('Provide both a condition/record title and clinical summary.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      await addMedicalDocument({
        profileId: activeProfile.id,
        title: historyTitle.trim(),
        category: historyCategory,
        date: new Date().toISOString().slice(0, 10),
        issuer: 'Patient Self-Reported History',
        plainSummary: historySummary.trim(),
      });
      setHistoryTitle('');
      setHistorySummary('');
      setShowAddHistory(false);
      setSuccessMsg('Medical history entry added to your health records.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save medical history note.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#272757]/10">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#272757] text-white flex items-center justify-center shrink-0">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-[#0F0E47]">
                  {activeProfile ? activeProfile.fullName : user.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-md bg-[#F5F6FC] border border-[#272757]/12 text-[11px] font-semibold text-[#272757]">
                  {activeProfile?.relationship || 'Primary Account'}
                </span>
                {user.signedIn && (
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-semibold">
                    {user.role.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#505081] mt-1">
                {activeProfile
                  ? `Member ID: ${activeProfile.demoMemberId} · ${activeProfile.city}, Nigeria`
                  : 'Complete your primary personal and medical details below.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setSuccessMsg(null);
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Profile Information
              </button>
            ) : (
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[42px] rounded-xl bg-[#F5F6FC] text-[#505081] hover:text-[#0F0E47] text-xs font-semibold cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Cancel Editing
              </button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-3.5 flex items-start gap-2 text-xs text-[#9C2327]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-2 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* View Mode vs Edit Mode */}
        {isEditing ? (
          <form onSubmit={(e) => void handleSaveProfile(e)} className="space-y-6 text-xs">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#0F0E47]">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label htmlFor="up-full-name" className="block font-semibold text-[#272757] mb-1">
                    Full Name
                  </label>
                  <input
                    id="up-full-name"
                    type="text"
                    required
                    maxLength={120}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-sm text-[#0F0E47]"
                  />
                </div>

                <div>
                  <label htmlFor="up-age" className="block font-semibold text-[#272757] mb-1">
                    Age (Years)
                  </label>
                  <input
                    id="up-age"
                    type="number"
                    min="0"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-sm text-[#0F0E47] tabular-nums"
                  />
                </div>

                <div>
                  <label htmlFor="up-gender" className="block font-semibold text-[#272757] mb-1">
                    Gender
                  </label>
                  <select
                    id="up-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-sm bg-white text-[#0F0E47]"
                  >
                    <option value="Not specified">Not specified</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="up-city" className="block font-semibold text-[#272757] mb-1">
                    City Hub
                  </label>
                  <select
                    id="up-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-sm bg-white text-[#0F0E47]"
                  >
                    {Object.keys(NIGERIA_CITY_PRESETS).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="up-hmo" className="block font-semibold text-[#272757] mb-1">
                    HMO / NHIA Insurance Coverage
                  </label>
                  <input
                    id="up-hmo"
                    type="text"
                    maxLength={120}
                    value={hmoProvider}
                    onChange={(e) => setHmoProvider(e.target.value)}
                    placeholder="e.g. Hygeia HMO, Reliance HMO, NHIA, Self-Pay"
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-sm text-[#0F0E47]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#272757]/10 space-y-4">
              <h3 className="text-sm font-bold text-[#0F0E47]">Medical Profile & Allergies</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="up-blood" className="block font-semibold text-[#272757] mb-1">
                    Blood Group
                  </label>
                  <select
                    id="up-blood"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-sm bg-white text-[#0F0E47]"
                  >
                    {['Unknown', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="up-genotype" className="block font-semibold text-[#272757] mb-1">
                    Genotype
                  </label>
                  <select
                    id="up-genotype"
                    value={genotype}
                    onChange={(e) => setGenotype(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-sm bg-white text-[#0F0E47]"
                  >
                    {['Unknown', 'AA', 'AS', 'SS', 'AC', 'SC'].map((gt) => (
                      <option key={gt} value={gt}>
                        {gt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="up-allergies" className="block font-semibold text-[#272757] mb-1">
                    Allergies &amp; Sensitivities (comma-separated)
                  </label>
                  <input
                    id="up-allergies"
                    type="text"
                    value={allergiesText}
                    onChange={(e) => setAllergiesText(e.target.value)}
                    placeholder="e.g. Penicillin, Sulfa drugs, Peanuts, None recorded"
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-sm text-[#0F0E47]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="up-medical-history" className="block font-semibold text-[#272757] mb-1">
                  Personal Medical History &amp; Ongoing Conditions
                </label>
                <textarea
                  id="up-medical-history"
                  rows={3}
                  maxLength={1000}
                  disabled={isGuestDemo}
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  placeholder="Document chronic conditions, past surgeries, current medications, or family history..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#272757]/20 disabled:bg-[#F5F6FC] text-sm text-[#0F0E47]"
                />
                <p className="text-[11px] text-[#505081] mt-1">
                  {isGuestDemo
                    ? 'Sign in with Google to save your medical history directly to your Firestore account.'
                    : 'Saved directly to your personal HealthConnect account document in Cloud Firestore.'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#272757]/10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#0F0E47]">Account Contact Details</h3>
                <span className="text-[11px] text-[#505081]">
                  {isGuestDemo
                    ? 'Sign in with Google to persist private contact details'
                    : 'Stored privately on your HealthConnect user record'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="up-phone" className="block font-semibold text-[#272757] mb-1">
                    Phone Number
                  </label>
                  <input
                    id="up-phone"
                    type="text"
                    maxLength={32}
                    disabled={isGuestDemo}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 disabled:bg-[#F5F6FC] text-sm text-[#0F0E47]"
                  />
                </div>
                <div>
                  <label htmlFor="up-address" className="block font-semibold text-[#272757] mb-1">
                    Residential Address
                  </label>
                  <input
                    id="up-address"
                    type="text"
                    maxLength={240}
                    disabled={isGuestDemo}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, Neighbourhood, State"
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 disabled:bg-[#F5F6FC] text-sm text-[#0F0E47]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#272757]/10">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2.5 min-h-[42px] rounded-xl bg-[#F5F6FC] text-[#505081] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] disabled:opacity-60 text-white font-semibold cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Personal & Medical Basics */}
            <div className="rounded-xl bg-[#F5F6FC] p-5 space-y-4">
              <h3 className="text-sm font-bold text-[#0F0E47] flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-[#E8702A]" />
                Personal & Clinical Identity
              </h3>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <span className="text-[#505081]">Full Name</span>
                  <p className="font-semibold text-[#0F0E47] mt-0.5">
                    {activeProfile?.fullName || user.name}
                  </p>
                </div>
                <div>
                  <span className="text-[#505081]">Age & Gender</span>
                  <p className="font-semibold text-[#0F0E47] mt-0.5 tabular-nums">
                    {activeProfile && activeProfile.age > 0 ? `${activeProfile.age} yrs` : 'Not set'} ·{' '}
                    {activeProfile?.gender || 'Not specified'}
                  </p>
                </div>
                <div>
                  <span className="text-[#505081]">Blood Group</span>
                  <p className="font-bold text-[#0F0E47] text-sm mt-0.5">
                    {activeProfile?.bloodGroup || 'Unknown'}
                  </p>
                </div>
                <div>
                  <span className="text-[#505081]">Genotype</span>
                  <p className="font-bold text-[#0F0E47] text-sm mt-0.5">
                    {activeProfile?.genotype || 'Unknown'}
                  </p>
                </div>
                <div>
                  <span className="text-[#505081]">City Hub</span>
                  <p className="font-semibold text-[#0F0E47] mt-0.5">
                    {activeProfile?.city || user.city}
                  </p>
                </div>
                <div>
                  <span className="text-[#505081]">HMO / NHIA Coverage</span>
                  <p className="font-semibold text-[#272757] mt-0.5">
                    {activeProfile?.hmoProvider || 'Self-Pay / Not Set'}
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-[#272757]/10">
                <span className="text-[#505081]">Recorded Allergies</span>
                <p className="font-medium text-[#0F0E47] mt-1">
                  {activeProfile?.allergies.join(', ') || 'None recorded'}
                </p>
              </div>
            </div>

            {/* Contact Details */}
            <div className="rounded-xl bg-[#F5F6FC] p-5 space-y-4">
              <h3 className="text-sm font-bold text-[#0F0E47] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#272757]" />
                Contact & Verification Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-[#505081] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#505081]">Email Address</span>
                    <p className="font-semibold text-[#0F0E47] mt-0.5">
                      {privateInfo?.email || user.email || 'Not signed in (Guest Preview)'}
                    </p>
                    {user.signedIn && (
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        {user.emailVerified ? 'Verified via Firebase Auth' : 'Pending email verification'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-[#505081] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#505081]">Phone Number</span>
                    <p className="font-semibold text-[#0F0E47] mt-0.5 tabular-nums">
                      {privateInfo?.phone || 'Not added yet — click Edit Profile to add'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#505081] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#505081]">Residential Address</span>
                    <p className="font-semibold text-[#0F0E47] mt-0.5">
                      {privateInfo?.address || 'Not added yet — click Edit Profile to add'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Medical History & Longitudinal Records Summary */}
      <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#272757]" />
              Medical History & Clinical Summary
            </h3>
            <p className="text-xs text-[#505081] mt-0.5">
              Baseline vitals, recorded past conditions, discharge summaries, and visit history for{' '}
              {activeProfile?.fullName || user.name}.
            </p>
          </div>
          {activeProfile && (
            <button
              type="button"
              onClick={() => setShowAddHistory((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-[#F5F6FC] hover:bg-[#E8EAF7] text-[#272757] text-xs font-semibold cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddHistory ? 'Close Entry Form' : 'Add Medical History Note'}
            </button>
          )}
        </div>

        {/* Personal Medical History Summary */}
        <div className="rounded-xl bg-[#F5F6FC] p-4 space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-[#272757]">Personal Medical History Summary</span>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-[11px] font-semibold text-[#E8702A] hover:underline cursor-pointer"
              >
                Edit Summary
              </button>
            )}
          </div>
          <p className="text-[#0F0E47] leading-relaxed whitespace-pre-line">
            {userProfile?.medicalHistory?.trim() ||
              'No general medical history summary recorded yet. Click Edit Profile Information to add chronic conditions, surgeries, or current medications.'}
          </p>
        </div>

        {/* Snapshot Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl bg-[#F5F6FC] p-4">
            <span className="text-[#505081]">Latest Recorded BP</span>
            <p className="text-base font-bold text-[#0F0E47] tabular-nums mt-1">
              {latestBp ? `${latestBp.systolic}/${latestBp.diastolic} mmHg` : 'No reading yet'}
            </p>
            <p className="text-[11px] text-[#505081] mt-0.5">
              {latestBp ? latestBp.recordedAt.replace('T', ' ') : 'Log readings in Monitoring'}
            </p>
          </div>
          <div className="rounded-xl bg-[#F5F6FC] p-4">
            <span className="text-[#505081]">Latest Blood Glucose</span>
            <p className="text-base font-bold text-[#0F0E47] tabular-nums mt-1">
              {latestGlucose ? `${latestGlucose.valueMgDl} mg/dL` : 'No reading yet'}
            </p>
            <p className="text-[11px] text-[#505081] mt-0.5">
              {latestGlucose ? `${latestGlucose.context}` : 'Log readings in Monitoring'}
            </p>
          </div>
          <div className="rounded-xl bg-[#F5F6FC] p-4">
            <span className="text-[#505081]">Recorded Consultations</span>
            <p className="text-base font-bold text-[#0F0E47] tabular-nums mt-1">
              {profileAppointments.length} visit{profileAppointments.length === 1 ? '' : 's'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/find-healthcare')}
              className="text-[11px] font-semibold text-[#E8702A] hover:underline mt-0.5 cursor-pointer"
            >
              Schedule Specialist Visit →
            </button>
          </div>
        </div>

        {showAddHistory && activeProfile && (
          <form
            onSubmit={(e) => void handleAddMedicalHistory(e)}
            className="rounded-xl bg-[#F5F6FC] border border-[#272757]/12 p-4 space-y-3 text-xs"
          >
            <p className="font-semibold text-[#0F0E47]">Record Medical History / Clinical Note</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Condition, procedure, or report title"
                maxLength={160}
                required
                value={historyTitle}
                onChange={(e) => setHistoryTitle(e.target.value)}
                className="sm:col-span-2 px-3.5 py-2.5 min-h-[42px] rounded-xl bg-white border border-[#272757]/20 text-sm text-[#0F0E47]"
              />
              <select
                aria-label="History category"
                value={historyCategory}
                onChange={(e) =>
                  setHistoryCategory(
                    e.target.value as
                      | 'Lab Report'
                      | 'Imaging'
                      | 'Immunization'
                      | 'Discharge Summary'
                  )
                }
                className="px-3.5 py-2.5 min-h-[42px] rounded-xl bg-white border border-[#272757]/20 text-sm text-[#0F0E47]"
              >
                <option value="Discharge Summary">Clinical History / Summary</option>
                <option value="Immunization">Immunization Record</option>
                <option value="Lab Report">Lab Report</option>
                <option value="Imaging">Imaging / Scan</option>
              </select>
            </div>
            <textarea
              rows={2}
              required
              maxLength={600}
              placeholder="Summary of diagnosis, past surgery, ongoing treatment, or clinician guidance..."
              value={historySummary}
              onChange={(e) => setHistorySummary(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#272757]/20 text-sm text-[#0F0E47]"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white font-semibold cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Medical History Entry'}
              </button>
            </div>
          </form>
        )}

        {/* Saved Clinical History Items */}
        {profileDocs.length === 0 ? (
          <p className="text-xs text-[#505081] py-2">
            No medical history notes or documents recorded yet for this profile. Use &ldquo;Add Medical History Note&rdquo; above to add past conditions, immunizations, or lab summaries.
          </p>
        ) : (
          <div className="space-y-2.5">
            {profileDocs.map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-[#F5F6FC] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-[#0F0E47] text-sm">{item.title}</span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-[#272757]/12 text-[10px] font-semibold text-[#505081]">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[#505081] mt-1 leading-relaxed">{item.plainSummary}</p>
                  <p className="text-[11px] text-[#8686AC] mt-1">Source: {item.issuer}</p>
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-[#505081] tabular-nums shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                  {item.date}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
