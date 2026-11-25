import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Ambulance,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Layers,
  PlusCircle,
  Shield,
  ShieldAlert,
  Smartphone,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { requestSmsOtp } from '../../services/apiClient';
import { NIGERIA_CITY_PRESETS } from '../../data/mockNigeriaData';
import { evaluateModeratorBot, type ModeratorBotDecision } from '../../../shared/moderatorBot';
import { DoctorPhysicalCalendar } from './DoctorPhysicalCalendar';
import type { Doctor, Facility, PlatformService } from '../../types/healthcare';

export function RolePortalsSection() {
  const {
    user,
    privateInfo,
    integrationStatus,
    resendVerificationEmail,
    refreshVerificationStatus,
    updatePrivateDetails,
    roleRequests,
    submitRoleRequest,
    auditLogs,
    doctorAppointments,
    doctorSharedBp,
    doctorSharedGlucose,
    doctorSharedDocs,
    updateAppointmentClinician,
    blockDoctorPhysicalSlot,
    hospitalAppointments,
    hospitalEmergencies,
    hospitalUpdateEmergency,
    partnerHospitals,
    allFacilities,
    addPartnerHospital,
    removePartnerHospital,
    partnerDoctors,
    myHospitalDoctors,
    addPartnerDoctor,
    removePartnerDoctor,
    addHospitalDoctor,
    removeHospitalDoctor,
    platformServices,
    allPlatformServices,
    addPlatformService,
    togglePlatformServiceBot,
    removePlatformService,
    chatModerationEvents,
  } = useApp();

  const [phoneInput, setPhoneInput] = useState(privateInfo?.phone || '');
  const [addressInput, setAddressInput] = useState(privateInfo?.address || '');
  const [smsStatusMsg, setSmsStatusMsg] = useState<string | null>(null);
  const [emailStatusMsg, setEmailStatusMsg] = useState<string | null>(null);

  const [requestedRole, setRequestedRole] = useState<'doctor' | 'hospital'>('doctor');
  const [licenseRef, setLicenseRef] = useState('');
  const [organization, setOrganization] = useState('');
  const [roleStatusMsg, setRoleStatusMsg] = useState<string | null>(null);
  const [roleErrorMsg, setRoleErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [clinicalNoteDrafts, setClinicalNoteDrafts] = useState<Record<string, string>>({});
  const [partnerUnitDrafts, setPartnerUnitDrafts] = useState<Record<string, string>>({});

  // Admin Partner Hospital Registry form state
  const [hospName, setHospName] = useState('');
  const [hospType, setHospType] = useState<Facility['type']>('Hospital');
  const [hospCity, setHospCity] = useState('Ibadan');
  const [hospState, setHospState] = useState('Oyo State');
  const [hospAddress, setHospAddress] = useState('');
  const [hospAccreditedBy, setHospAccreditedBy] = useState('Oyo State MoH / HEFAMAA Verified');
  const [hospPhoneNote, setHospPhoneNote] = useState('24/7 Emergency & Reception Desk');
  const [hospSpecialties, setHospSpecialties] = useState('Emergency Medicine, Internal Medicine, Pediatrics');
  const [hospEmergency24h, setHospEmergency24h] = useState(true);
  const [hospNhiaAccepted, setHospNhiaAccepted] = useState(true);
  const [hospLat, setHospLat] = useState('7.4020');
  const [hospLng, setHospLng] = useState('3.9020');
  const [hospMsg, setHospMsg] = useState<string | null>(null);
  const [hospError, setHospError] = useState<string | null>(null);
  const [hospBusy, setHospBusy] = useState(false);

  // Admin Console sub-tab (strictly non-client governance)
  const [adminSubTab, setAdminSubTab] = useState<'hospitals' | 'doctors' | 'services' | 'bot'>('doctors');

  // Admin Partner Doctor Registry form state
  const [docName, setDocName] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('Internal Medicine');
  const [docCredentials, setDocCredentials] = useState('MBBS, FWACP');
  const docMdcnStatus = 'MDCN Verified · Active License';
  const [docHospital, setDocHospital] = useState('University College Hospital (UCH), Ibadan');
  const [docCity, setDocCity] = useState('Ibadan');
  const [docState, setDocState] = useState('Oyo State');
  const [docFee, setDocFee] = useState('0');
  const [docYears, setDocYears] = useState('8');
  const [docLanguages, setDocLanguages] = useState('English, Yoruba');
  const [docBio, setDocBio] = useState('');
  const [docTelehealth, setDocTelehealth] = useState(true);
  const [docLinkedUid, setDocLinkedUid] = useState('');
  const [docMsg, setDocMsg] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [docBusy, setDocBusy] = useState(false);

  // Hospital-Only Doctor Roster form state (strictly scoped to current hospital)
  const [hDocName, setHDocName] = useState('');
  const [hDocSpecialty, setHDocSpecialty] = useState('General Medicine');
  const [hDocCredentials, setHDocCredentials] = useState('MBBS, FWACP');
  const [hDocMdcnStatus, setHDocMdcnStatus] = useState('MDCN Verified · Hospital Staff');
  const [hDocYears, setHDocYears] = useState('6');
  const hDocFee = '0';
  const [hDocLanguages, setHDocLanguages] = useState('English, Yoruba');
  const [hDocBio, setHDocBio] = useState('');
  const [hDocDoctorUid, setHDocDoctorUid] = useState('');
  const [hDocTelehealth, setHDocTelehealth] = useState(true);
  const [hDocMsg, setHDocMsg] = useState<string | null>(null);
  const [hDocError, setHDocError] = useState<string | null>(null);
  const [hDocBusy, setHDocBusy] = useState(false);

  // Admin Website Care Teams & Platform Services (Bot-Managed) form state
  const [svcName, setSvcName] = useState('');
  const [svcCategory, setSvcCategory] = useState<PlatformService['category']>('Care Team');
  const [svcLeadSpecialty, setSvcLeadSpecialty] = useState('Family Medicine');
  const [svcCity, setSvcCity] = useState('Oyo State (All)');
  const [svcTurnaround, setSvcTurnaround] = useState('24/7 Sentinel Bot + Clinician Desk');
  const [svcDesc, setSvcDesc] = useState('');
  const [svcBotEnabled, setSvcBotEnabled] = useState(true);
  const [svcAutoMask, setSvcAutoMask] = useState(true);
  const [svcAutoRedFlag, setSvcAutoRedFlag] = useState(true);
  const [svcMsg, setSvcMsg] = useState<string | null>(null);
  const [svcError, setSvcError] = useState<string | null>(null);
  const [svcBusy, setSvcBusy] = useState(false);

  // Admin Sentinel Moderator Bot filter & interactive rule tester
  const [modFilter, setModFilter] = useState<'all' | 'pii_masked' | 'medical_red_flag' | 'bot_policy_warning'>('all');
  const [botTestInput, setBotTestInput] = useState('');
  const [botTestResult, setBotTestResult] = useState<ModeratorBotDecision | null>(null);

  const filteredModerationEvents = useMemo(() => {
    if (modFilter === 'all') return chatModerationEvents;
    return chatModerationEvents.filter((ev) => ev.flagType === modFilter);
  }, [chatModerationEvents, modFilter]);

  useEffect(() => {
    setPhoneInput(privateInfo?.phone || '');
    setAddressInput(privateInfo?.address || '');
  }, [privateInfo?.phone, privateInfo?.address]);

  const handleCitySelect = (nextCity: string) => {
    setHospCity(nextCity);
    const preset = NIGERIA_CITY_PRESETS[nextCity];
    if (preset) {
      setHospLat(preset.lat.toFixed(4));
      setHospLng(preset.lng.toFixed(4));
    }
  };

  const handleAddHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    setHospError(null);
    setHospMsg(null);
    if (hospName.trim().length < 2 || hospAddress.trim().length < 4) {
      setHospError('Enter a valid facility name (at least 2 chars) and street address (at least 4 chars).');
      return;
    }
    setHospBusy(true);
    try {
      const specialtiesList = hospSpecialties
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const parsedLat = Number(hospLat);
      const parsedLng = Number(hospLng);
      const created = await addPartnerHospital({
        name: hospName.trim(),
        type: hospType,
        city: hospCity.trim(),
        state: hospState.trim() || 'Oyo State',
        address: hospAddress.trim(),
        accreditedBy: hospAccreditedBy.trim() || 'Oyo State MoH',
        emergency24h: hospEmergency24h,
        specialties: specialtiesList.length > 0 ? specialtiesList : ['General Medicine'],
        nhiaAccepted: hospNhiaAccepted,
        phoneNote: hospPhoneNote.trim() || '24/7 Reception Desk',
        coordinates: {
          lat: Number.isFinite(parsedLat) ? parsedLat : 7.402,
          lng: Number.isFinite(parsedLng) ? parsedLng : 3.902,
        },
      });
      setHospName('');
      setHospAddress('');
      setHospMsg(`Added "${created.name}" (${created.city}) to the live directory and Emergency Centre.`);
    } catch (err) {
      setHospError(err instanceof Error ? err.message : 'Unable to add partner hospital.');
    } finally {
      setHospBusy(false);
    }
  };

  const handleRemoveHospital = async (id: string, name: string) => {
    setHospError(null);
    setHospMsg(null);
    try {
      await removePartnerHospital(id);
      setHospMsg(`Removed "${name}" from the partner hospital directory.`);
    } catch (err) {
      setHospError(err instanceof Error ? err.message : 'Unable to remove hospital.');
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError(null);
    setDocMsg(null);
    if (docName.trim().length < 2 || docSpecialty.trim().length < 2 || docHospital.trim().length < 2) {
      setDocError('Enter a valid doctor name, specialty, and affiliated hospital.');
      return;
    }
    setDocBusy(true);
    try {
      const preset = NIGERIA_CITY_PRESETS[docCity] || { lat: 7.402, lng: 3.902 };
      const langs = docLanguages
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);
      const variants: Doctor['avatarVariant'][] = ['adewale', 'chioma', 'ibrahim', 'ngozi', 'tunde', 'amina'];
      const chosenVariant = variants[partnerDoctors.length % variants.length];
      const created = await addPartnerDoctor({
        name: docName.trim(),
        specialty: docSpecialty.trim(),
        credentials: docCredentials.trim() || 'MBBS',
        mdcnStatus: docMdcnStatus.trim() || 'MDCN Verified',
        hospital: docHospital.trim(),
        ...(docLinkedUid.trim() ? { doctorUid: docLinkedUid.trim() } : {}),
        city: docCity.trim() || 'Ibadan',
        state: docState.trim() || 'Oyo State',
        consultationFeeNgn: Number(docFee) || 0,
        languages: langs.length > 0 ? langs : ['English'],
        nextAvailable: 'Today · Online Video & In-Person',
        experienceYears: Number(docYears) || 5,
        supportsTelehealth: docTelehealth,
        bio:
          docBio.trim() ||
          `Verified ${docSpecialty.trim()} specialist affiliated with ${docHospital.trim()}.`,
        avatarVariant: chosenVariant,
        coordinates: { lat: preset.lat, lng: preset.lng },
      });
      setDocName('');
      setDocBio('');
      setDocLinkedUid('');
      setDocMsg(`Registered "${created.name}" (${created.specialty}) live in Find Healthcare.`);
    } catch (err) {
      setDocError(err instanceof Error ? err.message : 'Unable to register partner doctor.');
    } finally {
      setDocBusy(false);
    }
  };

  const handleRemoveDoctor = async (id: string, name: string) => {
    setDocError(null);
    setDocMsg(null);
    try {
      await removePartnerDoctor(id);
      setDocMsg(`Removed "${name}" from the verified partner doctor directory.`);
    } catch (err) {
      setDocError(err instanceof Error ? err.message : 'Unable to remove doctor.');
    }
  };

  const hospitalDisplayFacility =
    user.name.replace(/\s*\(Demo\)\s*$/i, '').replace(/\s*Emergency Desk$/i, '').trim() ||
    'Verified Partner Hospital';

  const handleAddHospitalDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setHDocError(null);
    setHDocMsg(null);
    if (hDocName.trim().length < 2 || hDocSpecialty.trim().length < 2) {
      setHDocError('Enter a valid doctor full name and clinical specialty.');
      return;
    }
    setHDocBusy(true);
    try {
      const cityKey = user.city || 'Ibadan';
      const preset = NIGERIA_CITY_PRESETS[cityKey] || { lat: 7.402, lng: 3.902 };
      const langs = hDocLanguages
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);
      const variants: Doctor['avatarVariant'][] = ['chioma', 'ibrahim', 'adewale', 'ngozi', 'tunde', 'amina'];
      const chosenVariant = variants[myHospitalDoctors.length % variants.length];
      const created = await addHospitalDoctor({
        name: hDocName.trim(),
        specialty: hDocSpecialty.trim(),
        credentials: hDocCredentials.trim() || 'MBBS',
        mdcnStatus: hDocMdcnStatus.trim() || 'MDCN Verified',
        hospital: hospitalDisplayFacility,
        ...(hDocDoctorUid.trim() ? { doctorUid: hDocDoctorUid.trim() } : {}),
        city: cityKey,
        state: 'Oyo State',
        consultationFeeNgn: Number(hDocFee) || 0,
        languages: langs.length > 0 ? langs : ['English'],
        nextAvailable: 'Today · In-Person & Video',
        experienceYears: Number(hDocYears) || 5,
        supportsTelehealth: hDocTelehealth,
        bio:
          hDocBio.trim() ||
          `Verified ${hDocSpecialty.trim()} specialist practicing at ${hospitalDisplayFacility}.`,
        avatarVariant: chosenVariant,
        coordinates: { lat: preset.lat, lng: preset.lng },
      });
      setHDocName('');
      setHDocBio('');
      setHDocDoctorUid('');
      setHDocMsg(
        `Registered "${created.name}" exclusively under ${hospitalDisplayFacility}.`
      );
    } catch (err) {
      setHDocError(err instanceof Error ? err.message : 'Unable to register hospital doctor.');
    } finally {
      setHDocBusy(false);
    }
  };

  const handleRemoveHospitalDoctor = async (id: string, name: string) => {
    setHDocError(null);
    setHDocMsg(null);
    try {
      await removeHospitalDoctor(id);
      setHDocMsg(`Removed "${name}" from ${hospitalDisplayFacility}'s doctor roster.`);
    } catch (err) {
      setHDocError(err instanceof Error ? err.message : 'Unable to remove doctor from your roster.');
    }
  };

  const handleAddPlatformService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSvcError(null);
    setSvcMsg(null);
    if (svcName.trim().length < 2 || svcDesc.trim().length < 4) {
      setSvcError('Provide a team/service name and a brief description (at least 4 characters).');
      return;
    }
    setSvcBusy(true);
    try {
      const created = await addPlatformService({
        name: svcName.trim(),
        category: svcCategory,
        description: svcDesc.trim(),
        leadSpecialty: svcLeadSpecialty.trim() || 'General Medicine',
        city: svcCity.trim() || 'Oyo State (All)',
        turnaroundLabel: svcTurnaround.trim() || '24/7 Active',
        botModerationEnabled: svcBotEnabled,
        botAutoMaskPii: svcAutoMask,
        botAutoEscalateRedFlags: svcAutoRedFlag,
        active: true,
      });
      setSvcName('');
      setSvcDesc('');
      setSvcMsg(
        `Published "${created.name}" (${created.category}) — Sentinel Moderator Bot ${created.botModerationEnabled ? 'is now actively guarding it' : 'is paused'}.`
      );
    } catch (err) {
      setSvcError(err instanceof Error ? err.message : 'Unable to create website team/service.');
    } finally {
      setSvcBusy(false);
    }
  };

  const handleRunBotTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!botTestInput.trim()) return;
    setBotTestResult(evaluateModeratorBot(botTestInput, allPlatformServices));
  };

  const handleSavePrivateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmsStatusMsg(null);
    setBusy(true);
    try {
      await updatePrivateDetails({ phone: phoneInput, address: addressInput });
      setSmsStatusMsg('Private phone and address saved to isolated /users/{uid}/private/contact.');
    } catch (err) {
      setSmsStatusMsg(err instanceof Error ? err.message : 'Unable to save private contact details.');
    } finally {
      setBusy(false);
    }
  };

  const handleRequestSmsOtp = async () => {
    setSmsStatusMsg(null);
    setBusy(true);
    try {
      const res = await requestSmsOtp(phoneInput.trim());
      setSmsStatusMsg(res.message);
    } catch (err) {
      setSmsStatusMsg(err instanceof Error ? err.message : 'SMS provider not configured.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitRoleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleErrorMsg(null);
    setRoleStatusMsg(null);
    if (licenseRef.trim().length < 3 || organization.trim().length < 2) {
      setRoleErrorMsg('Please provide a valid MDCN / HEFAMAA license reference and organization name.');
      return;
    }
    setBusy(true);
    try {
      await submitRoleRequest({
        requestedRole,
        licenseRef: licenseRef.trim(),
        organization: organization.trim(),
      });
      setLicenseRef('');
      setOrganization('');
      setRoleStatusMsg('Verification request submitted for administrator review.');
    } catch (err) {
      setRoleErrorMsg(err instanceof Error ? err.message : 'Unable to submit verification request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Identity Verification & Isolated PII Card */}
      <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#272757]" />
              Account Verification & Isolated Contact Details
            </h2>
            <p className="text-xs text-[#505081] mt-0.5">
              Your UID: <span className="font-mono text-[#0F0E47]">{user.uid || 'Guest'}</span> · Active Role:{' '}
              <strong className="uppercase text-[#272757]">{user.role}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span
              className={`px-3 py-1 rounded-lg ${
                user.emailVerified
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-[#E8702A]/12 text-[#7E3308] border border-[#E8702A]/25'
              }`}
            >
              Email: {user.emailVerified ? 'Verified' : 'Unverified'}
            </span>
            <span className="px-3 py-1 rounded-lg bg-[#F5F6FC] text-[#505081] border border-[#272757]/12">
              SMS OTP: {integrationStatus.smsConfigured ? 'Provider Ready' : 'Not Configured'}
            </span>
          </div>
        </div>

        {user.signedIn && !user.emailVerified && (
          <div className="rounded-xl bg-[#E8702A]/10 border border-[#E8702A]/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#7E3308]">
            <div>
              <p className="font-semibold">Verify your email to unlock Firestore writes</p>
              <p className="mt-0.5">
                Security rules require a verified email token before saving medical records, bookings, or role applications.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  await resendVerificationEmail();
                  setEmailStatusMsg('Verification email sent. Check your inbox.');
                }}
                className="px-3.5 py-2 rounded-lg bg-white border border-[#7E3308]/30 font-semibold cursor-pointer"
              >
                Resend Email
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await refreshVerificationStatus();
                  setEmailStatusMsg(
                    ok ? 'Email verified! Firestore writes unlocked.' : 'Still unverified—click the link in your inbox first.'
                  );
                }}
                className="px-3.5 py-2 rounded-lg bg-[#272757] text-white font-semibold cursor-pointer"
              >
                Refresh Status
              </button>
            </div>
          </div>
        )}

        {emailStatusMsg && (
          <p className="text-xs font-medium text-[#272757]">{emailStatusMsg}</p>
        )}

        {user.signedIn && (
          <form onSubmit={(e) => void handleSavePrivateContact(e)} className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#272757]/10">
            <div>
              <label htmlFor="priv-phone" className="block text-xs text-[#505081] mb-1">
                Phone Number (Private PII)
              </label>
              <input
                id="priv-phone"
                type="tel"
                maxLength={32}
                placeholder="+234 800 000 0000"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
              />
            </div>
            <div>
              <label htmlFor="priv-addr" className="block text-xs text-[#505081] mb-1">
                Residential / Dispatch Address (Private PII)
              </label>
              <input
                id="priv-addr"
                type="text"
                maxLength={240}
                placeholder="Bodija, Ibadan, Oyo State"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2.5 min-h-[42px] rounded-xl bg-[#272757] text-white text-xs font-semibold cursor-pointer"
              >
                Save Contact
              </button>
              <button
                type="button"
                disabled={busy || !phoneInput.trim()}
                onClick={() => void handleRequestSmsOtp()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs font-semibold text-[#272757] hover:bg-[#F5F6FC] disabled:opacity-50 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Test SMS OTP
              </button>
            </div>
          </form>
        )}

        {smsStatusMsg && (
          <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/12 p-3 text-xs text-[#0F0E47]">
            {smsStatusMsg}
          </div>
        )}
      </section>

      {/* 2. Doctor / Hospital Verification Application */}
      {user.signedIn && user.role === 'patient' && (
        <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#E8702A]" />
              Clinician & Hospital Credential Verification
            </h2>
            <p className="text-xs text-[#505081] mt-0.5">
              Apply for a verified Doctor (MDCN) or Partner Hospital (HEFAMAA) role. Administrators review applications before granting clinical access.
            </p>
          </div>

          <form onSubmit={(e) => void handleSubmitRoleRequest(e)} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              aria-label="Requested role"
              value={requestedRole}
              onChange={(e) => setRequestedRole(e.target.value as 'doctor' | 'hospital')}
              className="px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-xs bg-white"
            >
              <option value="doctor">Doctor (MDCN)</option>
              <option value="hospital">Partner Hospital (HEFAMAA)</option>
            </select>
            <input
              type="text"
              required
              maxLength={80}
              placeholder={requestedRole === 'doctor' ? 'MDCN/R/12345' : 'HEFAMAA/FAC/908'}
              value={licenseRef}
              onChange={(e) => setLicenseRef(e.target.value)}
              className="px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-xs"
            />
            <input
              type="text"
              required
              maxLength={120}
              placeholder={requestedRole === 'doctor' ? 'Cardiology · Reddington' : 'Hospital Name & City'}
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-xs"
            />
            <button
              type="submit"
              disabled={busy || !user.emailVerified}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
            >
              Submit Role Application
            </button>
          </form>

          {roleErrorMsg && (
            <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-3 flex items-center gap-2 text-xs text-[#9C2327]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{roleErrorMsg}</span>
            </div>
          )}
          {roleStatusMsg && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{roleStatusMsg}</span>
            </div>
          )}

          {roleRequests.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-[#0F0E47]">Your Submitted Applications</p>
              {roleRequests.map((req) => (
                <div key={req.id} className="rounded-xl bg-[#F5F6FC] p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold uppercase text-[#272757]">{req.requestedRole}</span> · {req.organization} ({req.licenseRef})
                  </div>
                  <span className="font-mono font-semibold text-[#0F0E47] uppercase">{req.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. Doctor Portal */}
      {user.role === 'doctor' && (
        <section className="rounded-2xl bg-white border border-[#272757]/12 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-[#272757]" />
                Doctor Clinical Portal &amp; Physical Schedule
              </h2>
              <p className="text-xs text-[#505081] mt-0.5">
                Review every physical appointment day &amp; time window, manage video consultations, and inspect patient-shared clinical logs.
              </p>
            </div>
            <span className="text-xs font-mono text-[#505081] bg-[#F5F6FC] px-2.5 py-1 rounded-lg border border-[#272757]/10">
              Doctor UID: {user.uid}
            </span>
          </div>

          {/* Dedicated Physical Appointment Calendar Breakdown */}
          <DoctorPhysicalCalendar
            appointments={doctorAppointments}
            defaultFacilityName={
              doctorAppointments[0]?.facilityName || 'University College Hospital (UCH) Ibadan'
            }
            defaultCity={user.city || 'Ibadan'}
            syncLabel={
              user.signedIn && user.emailVerified
                ? 'Live Firestore Booking Sync'
                : 'Synced with Booking System'
            }
            onMarkCompleted={async (aptId, note) => {
              await updateAppointmentClinician(aptId, 'Completed', note);
            }}
            onUpdateAppointmentStatus={async (aptId, status, note) => {
              await updateAppointmentClinician(aptId, status, note);
            }}
            onBlockPhysicalSlot={async (input) => {
              await blockDoctorPhysicalSlot(input);
            }}
          />

          {/* Video Telehealth & All Assigned Consultations */}
          <div className="space-y-3 pt-2 border-t border-[#272757]/10">
            <h3 className="text-sm font-semibold text-[#0F0E47]">
              Video Telehealth Consultations (
              {doctorAppointments.filter((a) => a.mode === 'Video Telehealth').length})
            </h3>
            {doctorAppointments.filter((a) => a.mode === 'Video Telehealth').length === 0 ? (
              <p className="text-xs text-[#505081]">
                No video telehealth consultations assigned yet. All physical appointments appear in the calendar breakdown above.
              </p>
            ) : (
              doctorAppointments
                .filter((a) => a.mode === 'Video Telehealth')
                .map((apt) => (
                  <div key={apt.id} className="rounded-xl bg-[#F5F6FC] p-4 space-y-3 text-xs">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <p className="font-bold text-[#0F0E47]">
                          {apt.patientName || apt.profileId} · {apt.reference} · {apt.mode}
                        </p>
                        <p className="text-[#505081]">
                          {apt.date} · {apt.time} · Status: {apt.status}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void updateAppointmentClinician(
                            apt.id,
                            'Completed',
                            clinicalNoteDrafts[apt.id] || apt.clinicalNotes || 'Consultation completed.'
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#272757] text-white font-semibold cursor-pointer"
                      >
                        Mark Completed &amp; Save Note
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Add clinical summary note..."
                      value={clinicalNoteDrafts[apt.id] ?? apt.clinicalNotes ?? ''}
                      onChange={(e) =>
                        setClinicalNoteDrafts((prev) => ({ ...prev, [apt.id]: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white border border-[#272757]/15 text-xs"
                    />
                  </div>
                ))
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-[#272757]/10 text-xs">
            <div className="rounded-xl bg-[#F5F6FC] p-4 space-y-2">
              <p className="font-bold text-[#0F0E47]">Shared BP Logs ({doctorSharedBp.length})</p>
              {doctorSharedBp.map((b) => (
                <div key={b.id} className="bg-white rounded-lg p-2.5">
                  <p className="font-semibold tabular-nums">{b.systolic}/{b.diastolic} mmHg</p>
                  <p className="text-[#505081]">{b.recordedAt}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-[#F5F6FC] p-4 space-y-2">
              <p className="font-bold text-[#0F0E47]">Shared Glucose Logs ({doctorSharedGlucose.length})</p>
              {doctorSharedGlucose.map((g) => (
                <div key={g.id} className="bg-white rounded-lg p-2.5">
                  <p className="font-semibold tabular-nums">{g.valueMgDl} mg/dL ({g.context})</p>
                  <p className="text-[#505081]">{g.recordedAt}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-[#F5F6FC] p-4 space-y-2">
              <p className="font-bold text-[#0F0E47]">Shared Documents ({doctorSharedDocs.length})</p>
              {doctorSharedDocs.map((d) => (
                <div key={d.id} className="bg-white rounded-lg p-2.5">
                  <p className="font-semibold">{d.title}</p>
                  <p className="text-[#505081]">{d.plainSummary}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Hospital Portal */}
      {user.role === 'hospital' && (
        <section className="rounded-2xl bg-white border border-[#272757]/12 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#E5484D]" />
                Hospital Portal — Own Doctors &amp; Emergency Triage
              </h2>
              <p className="text-xs text-[#505081] mt-0.5">
                Manage ONLY doctors belonging to <strong className="text-[#0F0E47]">{hospitalDisplayFacility}</strong> and coordinate live EMS triage.
              </p>
            </div>
            <span className="text-xs font-mono text-[#505081] bg-[#F5F6FC] px-2.5 py-1 rounded-lg border border-[#272757]/10">
              Facility UID: {user.uid}
            </span>
          </div>

          {/* Hospital-Only Doctor Roster Management (Strictly Scoped to This Hospital) */}
          <div className="rounded-2xl border border-[#272757]/15 bg-[#F9FAFE] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#0F0E47] flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[#272757]" />
                  My Hospital Doctors Only ({myHospitalDoctors.length})
                </h3>
                <p className="text-xs text-[#505081] mt-0.5">
                  Firestore security rules lock every doctor registered here to your Facility UID ({user.uid}). You cannot view, edit, or delete doctors from any other hospital.
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg self-start shrink-0">
                Own Facility Roster Only
              </span>
            </div>

            <form
              onSubmit={(e) => void handleAddHospitalDoctor(e)}
              className="grid grid-cols-1 md:grid-cols-12 gap-3"
            >
              <div className="md:col-span-4">
                <label htmlFor="hdoc-name" className="block text-xs font-semibold text-[#272757] mb-1">
                  Doctor Full Name
                </label>
                <input
                  id="hdoc-name"
                  type="text"
                  required
                  maxLength={120}
                  placeholder="e.g. Dr. Kolawole Adeyemi"
                  value={hDocName}
                  onChange={(e) => setHDocName(e.target.value)}
                  className="w-full px-3 py-2 min-h-[40px] rounded-xl border border-[#272757]/20 bg-white text-xs"
                />
              </div>
              <div className="md:col-span-4">
                <label htmlFor="hdoc-spec" className="block text-xs font-semibold text-[#272757] mb-1">
                  Clinical Specialty
                </label>
                <input
                  id="hdoc-spec"
                  type="text"
                  required
                  maxLength={100}
                  placeholder="Emergency Medicine, Pediatrics, Cardiology..."
                  value={hDocSpecialty}
                  onChange={(e) => setHDocSpecialty(e.target.value)}
                  className="w-full px-3 py-2 min-h-[40px] rounded-xl border border-[#272757]/20 bg-white text-xs"
                />
              </div>
              <div className="md:col-span-4">
                <label htmlFor="hdoc-cred" className="block text-xs font-semibold text-[#272757] mb-1">
                  Credentials
                </label>
                <input
                  id="hdoc-cred"
                  type="text"
                  required
                  maxLength={120}
                  value={hDocCredentials}
                  onChange={(e) => setHDocCredentials(e.target.value)}
                  className="w-full px-3 py-2 min-h-[40px] rounded-xl border border-[#272757]/20 bg-white text-xs"
                />
              </div>
              <div className="md:col-span-4">
                <label htmlFor="hdoc-mdcn" className="block text-xs font-semibold text-[#272757] mb-1">
                  MDCN Verification Note
                </label>
                <input
                  id="hdoc-mdcn"
                  type="text"
                  required
                  maxLength={80}
                  value={hDocMdcnStatus}
                  onChange={(e) => setHDocMdcnStatus(e.target.value)}
                  className="w-full px-3 py-2 min-h-[40px] rounded-xl border border-[#272757]/20 bg-white text-xs"
                />
              </div>
              <div className="md:col-span-3">
                <label htmlFor="hdoc-langs" className="block text-xs font-semibold text-[#272757] mb-1">
                  Languages
                </label>
                <input
                  id="hdoc-langs"
                  type="text"
                  value={hDocLanguages}
                  onChange={(e) => setHDocLanguages(e.target.value)}
                  className="w-full px-3 py-2 min-h-[40px] rounded-xl border border-[#272757]/20 bg-white text-xs"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="hdoc-years" className="block text-xs font-semibold text-[#272757] mb-1">
                  Years Exp.
                </label>
                <input
                  id="hdoc-years"
                  type="number"
                  min={0}
                  max={70}
                  value={hDocYears}
                  onChange={(e) => setHDocYears(e.target.value)}
                  className="w-full px-3 py-2 min-h-[40px] rounded-xl border border-[#272757]/20 bg-white text-xs font-mono"
                />
              </div>
              <div className="md:col-span-3">
                <label htmlFor="hdoc-uid" className="block text-xs font-semibold text-[#272757] mb-1">
                  Doctor Account UID (Optional)
                </label>
                <input
                  id="hdoc-uid"
                  type="text"
                  maxLength={128}
                  placeholder="Links physical bookings to calendar"
                  value={hDocDoctorUid}
                  onChange={(e) => setHDocDoctorUid(e.target.value)}
                  className="w-full px-3 py-2 min-h-[40px] rounded-xl border border-[#272757]/20 bg-white text-xs font-mono"
                />
              </div>
              <div className="md:col-span-8">
                <label htmlFor="hdoc-bio" className="block text-xs font-semibold text-[#272757] mb-1">
                  Short Clinical Bio
                </label>
                <input
                  id="hdoc-bio"
                  type="text"
                  maxLength={400}
                  placeholder={`Specialist practicing at ${hospitalDisplayFacility}...`}
                  value={hDocBio}
                  onChange={(e) => setHDocBio(e.target.value)}
                  className="w-full px-3 py-2 min-h-[40px] rounded-xl border border-[#272757]/20 bg-white text-xs"
                />
              </div>
              <div className="md:col-span-4 flex items-end justify-between gap-2">
                <label className="inline-flex items-center gap-1.5 text-xs text-[#272757] cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={hDocTelehealth}
                    onChange={(e) => setHDocTelehealth(e.target.checked)}
                  />
                  <span>Telehealth</span>
                </label>
                <button
                  type="submit"
                  disabled={hDocBusy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  {hDocBusy ? 'Adding...' : 'Register Own Doctor'}
                </button>
              </div>
            </form>

            {hDocError && (
              <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-3 flex items-center gap-2 text-xs text-[#9C2327]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{hDocError}</span>
              </div>
            )}
            {hDocMsg && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{hDocMsg}</span>
              </div>
            )}

            {myHospitalDoctors.length === 0 ? (
              <p className="text-xs text-[#505081]">
                No doctors registered under {hospitalDisplayFacility} yet. Use the form above to add doctors exclusively for your hospital.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myHospitalDoctors.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-xl bg-white border border-[#272757]/12 p-3.5 text-xs flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="font-bold text-[#0F0E47] truncate">
                        {d.name} · {d.credentials}
                      </p>
                      <p className="text-[#272757] font-medium">
                        {d.specialty} · {d.experienceYears} yrs exp.
                      </p>
                      <p className="text-[#505081] truncate">
                        {d.hospital} · {d.mdcnStatus}
                      </p>
                      {d.doctorUid && (
                        <p className="text-[11px] font-mono text-[#505081] truncate">
                          Linked Calendar UID: {d.doctorUid}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemoveHospitalDoctor(d.id, d.name)}
                      aria-label={`Remove ${d.name} from hospital roster`}
                      className="p-2 rounded-lg text-[#9C2327] hover:bg-[#E5484D]/12 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2 border-t border-[#272757]/10">
            <h3 className="text-sm font-semibold text-[#0F0E47]">
              Active Emergency Triage Queue ({hospitalEmergencies.length})
            </h3>
            {hospitalEmergencies.length === 0 ? (
              <p className="text-xs text-[#505081]">No active emergency requests in the queue.</p>
            ) : (
              hospitalEmergencies.map((emg) => (
                <div key={emg.id} className="rounded-xl bg-[#F5F6FC] p-4 space-y-3 text-xs">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-bold text-[#0F0E47]">{emg.patientName} · {emg.type}</p>
                      <p className="text-[#505081]">{emg.locationLabel} · Stage: <strong className="uppercase">{emg.stage}</strong></p>
                      <p className="text-[#272757] mt-1">{emg.notes}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Partner EMS Unit Name"
                      value={partnerUnitDrafts[emg.id] ?? emg.partnerUnit}
                      onChange={(e) =>
                        setPartnerUnitDrafts((prev) => ({ ...prev, [emg.id]: e.target.value }))
                      }
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#272757]/15 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => void hospitalUpdateEmergency(emg.id, 'accepted', partnerUnitDrafts[emg.id])}
                      className="px-3 py-1.5 rounded-lg bg-[#272757] text-white font-semibold cursor-pointer"
                    >
                      Accept Request
                    </button>
                    <button
                      type="button"
                      onClick={() => void hospitalUpdateEmergency(emg.id, 'dispatched', partnerUnitDrafts[emg.id], 12)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#E8702A] text-white font-semibold cursor-pointer"
                    >
                      <Ambulance className="w-3.5 h-3.5" /> Confirm Dispatch
                    </button>
                    <button
                      type="button"
                      onClick={() => void hospitalUpdateEmergency(emg.id, 'resolved')}
                      className="px-3 py-1.5 rounded-lg border border-[#272757]/20 bg-white text-[#0F0E47] font-semibold cursor-pointer"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-[#272757]/10">
            <h3 className="text-sm font-semibold text-[#0F0E47]">
              Facility Appointments ({hospitalAppointments.length})
            </h3>
            {hospitalAppointments.length > 0 && (
              <div className="mt-2 space-y-2">
                {hospitalAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="rounded-xl bg-[#F5F6FC] px-3.5 py-2.5 text-xs flex flex-wrap justify-between gap-2"
                  >
                    <span className="font-semibold text-[#0F0E47]">
                      {apt.patientName || apt.profileId} · {apt.doctorName} ({apt.mode})
                    </span>
                    <span className="text-[#505081] font-mono">
                      {apt.date} · {apt.time} · {apt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. Administrator Scoped Console: Partner Doctors, Hospitals, Website Teams/Services & Automated Sentinel Bot */}
      {user.role === 'administrator' && (
        <section className="rounded-2xl bg-white border border-[#272757]/12 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#272757]" />
                Provider Registry, Website Services &amp; Sentinel Bot Console
              </h2>
              <p className="text-xs text-[#505081] mt-0.5">
                Non-client administrator scope: register verified doctors and hospitals, launch
                website care teams &amp; services, and oversee the automated HealthConnect Sentinel
                Moderator Bot. Client/patient accounts, private contacts, medical records, and
                payments are strictly isolated and inaccessible.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg self-start sm:self-auto shrink-0">
              Providers &amp; Bot Only · Zero Client Access
            </span>
          </div>

          {/* Admin Console Sub-Navigation */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#272757]/10">
            {(
              [
                { id: 'doctors', label: `Register Doctors (${partnerDoctors.length})`, icon: Stethoscope },
                { id: 'hospitals', label: `Register Hospitals (${partnerHospitals.length})`, icon: Building2 },
                { id: 'services', label: `Teams & Services (${platformServices.length})`, icon: Layers },
                { id: 'bot', label: `Sentinel Moderator Bot (${chatModerationEvents.length})`, icon: Bot },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAdminSubTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                    adminSubTab === tab.id
                      ? 'bg-[#272757] text-white'
                      : 'bg-[#F5F6FC] text-[#505081] hover:text-[#0F0E47]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: Register Verified Partner Doctors */}
          {adminSubTab === 'doctors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#0F0E47] flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-[#E8702A]" />
                  Register Verified Partner Doctor
                </h3>
                <span className="text-[11px] text-[#505081]">
                  Published live to Find Healthcare directory &amp; online consultations
                </span>
              </div>

              <form onSubmit={(e) => void handleAddDoctor(e)} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4">
                  <label htmlFor="doc-name" className="block text-xs font-semibold text-[#272757] mb-1">
                    Doctor Full Name
                  </label>
                  <input
                    id="doc-name"
                    type="text"
                    required
                    maxLength={120}
                    placeholder="e.g. Dr. Folake Adeyemi"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
                  />
                </div>
                <div className="md:col-span-4">
                  <label htmlFor="doc-spec" className="block text-xs font-semibold text-[#272757] mb-1">
                    Clinical Specialty
                  </label>
                  <input
                    id="doc-spec"
                    type="text"
                    required
                    maxLength={100}
                    placeholder="Cardiology, Pediatrics, OB/GYN..."
                    value={docSpecialty}
                    onChange={(e) => setDocSpecialty(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
                  />
                </div>
                <div className="md:col-span-4">
                  <label htmlFor="doc-cred" className="block text-xs font-semibold text-[#272757] mb-1">
                    Credentials &amp; MDCN Verification
                  </label>
                  <input
                    id="doc-cred"
                    type="text"
                    required
                    maxLength={120}
                    value={docCredentials}
                    onChange={(e) => setDocCredentials(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
                  />
                </div>
                <div className="md:col-span-5">
                  <label htmlFor="doc-hosp" className="block text-xs font-semibold text-[#272757] mb-1">
                    Affiliated Hospital / Clinic
                  </label>
                  <input
                    id="doc-hosp"
                    list="registered-hospitals-datalist"
                    type="text"
                    required
                    maxLength={140}
                    value={docHospital}
                    onChange={(e) => setDocHospital(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
                  />
                  <datalist id="registered-hospitals-datalist">
                    {allFacilities
                      .filter((f) => f.type === 'Hospital' || f.type === 'Clinic')
                      .map((f) => (
                        <option key={f.id} value={f.name} />
                      ))}
                  </datalist>
                </div>
                <div className="md:col-span-3">
                  <label htmlFor="doc-linked-uid" className="block text-xs font-semibold text-[#272757] mb-1">
                    Doctor Account UID (Optional)
                  </label>
                  <input
                    id="doc-linked-uid"
                    type="text"
                    maxLength={128}
                    placeholder="Routes physical bookings to calendar"
                    value={docLinkedUid}
                    onChange={(e) => setDocLinkedUid(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs font-mono"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="doc-city" className="block text-xs font-semibold text-[#272757] mb-1">
                    City / Town
                  </label>
                  <select
                    id="doc-city"
                    value={docCity}
                    onChange={(e) => setDocCity(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs bg-white"
                  >
                    {Object.keys(NIGERIA_CITY_PRESETS).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="doc-state" className="block text-xs font-semibold text-[#272757] mb-1">
                    State
                  </label>
                  <input
                    id="doc-state"
                    type="text"
                    maxLength={60}
                    value={docState}
                    onChange={(e) => setDocState(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
                  />
                </div>
                <div className="md:col-span-4">
                  <label htmlFor="doc-langs" className="block text-xs font-semibold text-[#272757] mb-1">
                    Languages (comma-separated)
                  </label>
                  <input
                    id="doc-langs"
                    type="text"
                    value={docLanguages}
                    onChange={(e) => setDocLanguages(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="doc-years" className="block text-xs font-semibold text-[#272757] mb-1">
                    Years Exp.
                  </label>
                  <input
                    id="doc-years"
                    type="number"
                    min={0}
                    max={70}
                    value={docYears}
                    onChange={(e) => setDocYears(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs font-mono"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="doc-fee" className="block text-xs font-semibold text-[#272757] mb-1">
                    Extra Fee (₦)
                  </label>
                  <input
                    id="doc-fee"
                    type="number"
                    min={0}
                    max={500000}
                    value={docFee}
                    onChange={(e) => setDocFee(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs font-mono"
                  />
                </div>
                <div className="md:col-span-4">
                  <label htmlFor="doc-bio" className="block text-xs font-semibold text-[#272757] mb-1">
                    Short Clinical Bio
                  </label>
                  <input
                    id="doc-bio"
                    type="text"
                    maxLength={400}
                    placeholder="Focus areas and patient care summary..."
                    value={docBio}
                    onChange={(e) => setDocBio(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
                  />
                </div>
                <div className="md:col-span-12 flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs text-[#272757] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={docTelehealth}
                      onChange={(e) => setDocTelehealth(e.target.checked)}
                    />
                    <span>Available for Online Video Telehealth</span>
                  </label>
                  <button
                    type="submit"
                    disabled={docBusy || !user.emailVerified}
                    className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    {docBusy ? 'Registering Doctor...' : 'Register Verified Doctor'}
                  </button>
                </div>
              </form>

              {docError && (
                <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-3 flex items-center gap-2 text-xs text-[#9C2327]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{docError}</span>
                </div>
              )}
              {docMsg && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{docMsg}</span>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-[#0F0E47]">
                  Admin-Registered Partner Doctors ({partnerDoctors.length})
                </p>
                {partnerDoctors.length === 0 ? (
                  <p className="text-xs text-[#505081]">
                    No custom partner doctors registered yet. Register a verified doctor above and
                    they will immediately appear in Find Healthcare for online consultations.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {partnerDoctors.map((d) => (
                      <div
                        key={d.id}
                        className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-3.5 text-xs flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="font-bold text-[#0F0E47] truncate">
                            {d.name} · {d.credentials}
                          </p>
                          <p className="text-[#505081]">
                            {d.specialty} · {d.city}, {d.state}
                          </p>
                          <p className="text-[#505081] truncate">
                            {d.hospital} · {d.mdcnStatus}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleRemoveDoctor(d.id, d.name)}
                          aria-label={`Remove ${d.name}`}
                          className="p-2 rounded-lg text-[#9C2327] hover:bg-[#E5484D]/12 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Add & Manage Verified Partner Hospitals */}
          {adminSubTab === 'hospitals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#0F0E47] flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-[#E8702A]" />
                  Register Verified Partner Hospital / Facility
                </h3>
                <span className="text-[11px] text-[#505081]">
                  Published live to Find Healthcare &amp; Emergency Centre
                </span>
              </div>

              <form onSubmit={(e) => void handleAddHospital(e)} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-5">
                  <label htmlFor="hosp-name" className="block text-xs font-semibold text-[#272757] mb-1">
                    Hospital / Facility Name
                  </label>
                  <input
                    id="hosp-name"
                    type="text"
                    required
                    maxLength={140}
                    placeholder="e.g. Ring Road Specialist Hospital"
                    value={hospName}
                    onChange={(e) => setHospName(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
                  />
                </div>

                <div className="md:col-span-3">
                  <label htmlFor="hosp-type" className="block text-xs font-semibold text-[#272757] mb-1">
                    Facility Type
                  </label>
                  <select
                    id="hosp-type"
                    value={hospType}
                    onChange={(e) => setHospType(e.target.value as Facility['type'])}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs bg-white"
                  >
                    <option value="Hospital">Hospital</option>
                    <option value="Clinic">Clinic</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Laboratory">Laboratory</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="hosp-city" className="block text-xs font-semibold text-[#272757] mb-1">
                    City / Town
                  </label>
                  <select
                    id="hosp-city"
                    value={hospCity}
                    onChange={(e) => handleCitySelect(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs bg-white"
                  >
                    {Object.keys(NIGERIA_CITY_PRESETS).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="hosp-state" className="block text-xs font-semibold text-[#272757] mb-1">
                    State
                  </label>
                  <input
                    id="hosp-state"
                    type="text"
                    required
                    maxLength={60}
                    value={hospState}
                    onChange={(e) => setHospState(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
                  />
                </div>

                <div className="md:col-span-6">
                  <label htmlFor="hosp-address" className="block text-xs font-semibold text-[#272757] mb-1">
                    Full Street Address
                  </label>
                  <input
                    id="hosp-address"
                    type="text"
                    required
                    maxLength={200}
                    placeholder="e.g. 14 Ring Road, Challenge, Ibadan"
                    value={hospAddress}
                    onChange={(e) => setHospAddress(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
                  />
                </div>

                <div className="md:col-span-3">
                  <label htmlFor="hosp-accred" className="block text-xs font-semibold text-[#272757] mb-1">
                    Accreditation Body
                  </label>
                  <input
                    id="hosp-accred"
                    type="text"
                    required
                    maxLength={120}
                    value={hospAccreditedBy}
                    onChange={(e) => setHospAccreditedBy(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
                  />
                </div>

                <div className="md:col-span-3">
                  <label htmlFor="hosp-phone" className="block text-xs font-semibold text-[#272757] mb-1">
                    Reception / Triage Desk Note
                  </label>
                  <input
                    id="hosp-phone"
                    type="text"
                    required
                    maxLength={120}
                    value={hospPhoneNote}
                    onChange={(e) => setHospPhoneNote(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
                  />
                </div>

                <div className="md:col-span-6">
                  <label htmlFor="hosp-specs" className="block text-xs font-semibold text-[#272757] mb-1">
                    Specialties (comma-separated)
                  </label>
                  <input
                    id="hosp-specs"
                    type="text"
                    value={hospSpecialties}
                    onChange={(e) => setHospSpecialties(e.target.value)}
                    placeholder="Emergency Medicine, Cardiology, Obstetrics"
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
                  />
                </div>

                <div className="md:col-span-3">
                  <label htmlFor="hosp-lat" className="block text-xs font-semibold text-[#272757] mb-1">
                    Latitude (GPS)
                  </label>
                  <input
                    id="hosp-lat"
                    type="number"
                    step="0.0001"
                    value={hospLat}
                    onChange={(e) => setHospLat(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs font-mono"
                  />
                </div>

                <div className="md:col-span-3">
                  <label htmlFor="hosp-lng" className="block text-xs font-semibold text-[#272757] mb-1">
                    Longitude (GPS)
                  </label>
                  <input
                    id="hosp-lng"
                    type="number"
                    step="0.0001"
                    value={hospLng}
                    onChange={(e) => setHospLng(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs font-mono"
                  />
                </div>

                <div className="md:col-span-12 flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#272757]">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hospEmergency24h}
                        onChange={(e) => setHospEmergency24h(e.target.checked)}
                      />
                      <span>24/7 Emergency Triage Unit</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hospNhiaAccepted}
                        onChange={(e) => setHospNhiaAccepted(e.target.checked)}
                      />
                      <span>NHIA / HMO Accepted</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={hospBusy || !user.emailVerified}
                    className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    {hospBusy ? 'Saving Hospital...' : 'Add Verified Hospital'}
                  </button>
                </div>
              </form>

              {hospError && (
                <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-3 flex items-center gap-2 text-xs text-[#9C2327]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{hospError}</span>
                </div>
              )}
              {hospMsg && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{hospMsg}</span>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-[#0F0E47]">
                  Admin-Registered Partner Facilities ({partnerHospitals.length})
                </p>
                {partnerHospitals.length === 0 ? (
                  <p className="text-xs text-[#505081]">
                    No custom partner hospitals added yet. Add a hospital above and it will immediately
                    appear in Find Healthcare and Emergency Centre GPS rankings.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {partnerHospitals.map((h) => (
                      <div
                        key={h.id}
                        className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-3.5 text-xs flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="font-bold text-[#0F0E47] truncate">{h.name}</p>
                          <p className="text-[#505081]">
                            {h.type} · {h.city}, {h.state} {h.emergency24h ? '· 24/7 Emergency' : ''}
                          </p>
                          <p className="text-[#505081] truncate">{h.address}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleRemoveHospital(h.id, h.name)}
                          aria-label={`Remove ${h.name}`}
                          className="p-2 rounded-lg text-[#9C2327] hover:bg-[#E5484D]/12 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Website Care Teams & Platform Services (Sentinel Bot Managed) */}
          {adminSubTab === 'services' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#0F0E47] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#E8702A]" />
                  Create Website Care Teams &amp; Platform Services
                </h3>
                <span className="text-[11px] text-[#505081]">
                  Assigned directly to HealthConnect Sentinel Moderator Bot
                </span>
              </div>

              <form onSubmit={(e) => void handleAddPlatformService(e)} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-5">
                  <label htmlFor="svc-name" className="block text-xs font-semibold text-[#272757] mb-1">
                    Team or Service Name
                  </label>
                  <input
                    id="svc-name"
                    type="text"
                    required
                    maxLength={120}
                    placeholder="e.g. Maternal & Pediatric Care Team"
                    value={svcName}
                    onChange={(e) => setSvcName(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
                  />
                </div>
                <div className="md:col-span-3">
                  <label htmlFor="svc-cat" className="block text-xs font-semibold text-[#272757] mb-1">
                    Type
                  </label>
                  <select
                    id="svc-cat"
                    value={svcCategory}
                    onChange={(e) => setSvcCategory(e.target.value as PlatformService['category'])}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs bg-white"
                  >
                    <option value="Care Team">Care Team</option>
                    <option value="Clinical Service">Clinical Service</option>
                    <option value="Emergency Desk">Emergency Desk</option>
                    <option value="Community Support">Community Support</option>
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label htmlFor="svc-spec" className="block text-xs font-semibold text-[#272757] mb-1">
                    Lead Clinical Specialty
                  </label>
                  <input
                    id="svc-spec"
                    type="text"
                    required
                    maxLength={100}
                    value={svcLeadSpecialty}
                    onChange={(e) => setSvcLeadSpecialty(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
                  />
                </div>
                <div className="md:col-span-4">
                  <label htmlFor="svc-city" className="block text-xs font-semibold text-[#272757] mb-1">
                    Coverage Area
                  </label>
                  <input
                    id="svc-city"
                    type="text"
                    required
                    maxLength={60}
                    value={svcCity}
                    onChange={(e) => setSvcCity(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
                  />
                </div>
                <div className="md:col-span-4">
                  <label htmlFor="svc-turn" className="block text-xs font-semibold text-[#272757] mb-1">
                    Response / Turnaround
                  </label>
                  <input
                    id="svc-turn"
                    type="text"
                    required
                    maxLength={80}
                    value={svcTurnaround}
                    onChange={(e) => setSvcTurnaround(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
                  />
                </div>
                <div className="md:col-span-4">
                  <label htmlFor="svc-desc" className="block text-xs font-semibold text-[#272757] mb-1">
                    Service / Team Summary
                  </label>
                  <input
                    id="svc-desc"
                    type="text"
                    required
                    maxLength={360}
                    placeholder="What this team or service handles..."
                    value={svcDesc}
                    onChange={(e) => setSvcDesc(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
                  />
                </div>
                <div className="md:col-span-12 flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#272757]">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={svcBotEnabled}
                        onChange={(e) => setSvcBotEnabled(e.target.checked)}
                      />
                      <span>Sentinel Bot Active</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={svcAutoMask}
                        onChange={(e) => setSvcAutoMask(e.target.checked)}
                      />
                      <span>Auto-Mask PII</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={svcAutoRedFlag}
                        onChange={(e) => setSvcAutoRedFlag(e.target.checked)}
                      />
                      <span>Auto-Escalate Red Flags</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={svcBusy || !user.emailVerified}
                    className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    {svcBusy ? 'Creating Service...' : 'Create Team / Service'}
                  </button>
                </div>
              </form>

              {svcError && (
                <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-3 flex items-center gap-2 text-xs text-[#9C2327]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{svcError}</span>
                </div>
              )}
              {svcMsg && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{svcMsg}</span>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-[#0F0E47]">
                  Active Website Teams &amp; Services ({allPlatformServices.length})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {allPlatformServices.map((svc) => {
                    const isCustom = platformServices.some((p) => p.id === svc.id);
                    return (
                      <div
                        key={svc.id}
                        className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-3.5 text-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-[#0F0E47]">
                              {svc.name}{' '}
                              <span className="font-normal text-[#505081]">({svc.category})</span>
                            </p>
                            <p className="text-[#505081] mt-0.5">{svc.description}</p>
                            <p className="text-[11px] text-[#272757] mt-1">
                              {svc.leadSpecialty} · {svc.city} · {svc.turnaroundLabel}
                            </p>
                          </div>
                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => void removePlatformService(svc.id)}
                              aria-label={`Remove ${svc.name}`}
                              className="p-1.5 rounded-lg text-[#9C2327] hover:bg-[#E5484D]/12 cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#272757]/8">
                          <span
                            className={`text-[11px] font-semibold ${
                              svc.botModerationEnabled ? 'text-emerald-700' : 'text-[#505081]'
                            }`}
                          >
                            Sentinel Bot: {svc.botModerationEnabled ? 'Actively Moderating' : 'Paused'}
                          </span>
                          {isCustom && (
                            <button
                              type="button"
                              onClick={() =>
                                void togglePlatformServiceBot(svc.id, {
                                  botModerationEnabled: !svc.botModerationEnabled,
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-white border border-[#272757]/20 text-[11px] font-semibold text-[#272757] hover:bg-[#272757] hover:text-white cursor-pointer"
                            >
                              {svc.botModerationEnabled ? 'Pause Bot' : 'Enable Bot'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Automated Sentinel Moderator Bot & Read-Only Safety Feed */}
          {adminSubTab === 'bot' && (
            <div className="space-y-5">
              {/* Bot Live Telemetry Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-3.5">
                  <p className="text-[#505081]">Bot Status</p>
                  <p className="font-bold text-emerald-700 text-sm mt-0.5 flex items-center gap-1.5">
                    <Bot className="w-4 h-4" /> Active 24/7
                  </p>
                </div>
                <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-3.5">
                  <p className="text-[#505081]">Protected Services</p>
                  <p className="font-bold text-[#0F0E47] text-sm mt-0.5 tabular-nums">
                    {allPlatformServices.filter((s) => s.active && s.botModerationEnabled).length} Teams/Services
                  </p>
                </div>
                <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-3.5">
                  <p className="text-[#505081]">PII Auto-Masked</p>
                  <p className="font-bold text-amber-700 text-sm mt-0.5 tabular-nums">
                    {chatModerationEvents.filter((e) => e.flagType === 'pii_masked').length} Events
                  </p>
                </div>
                <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-3.5">
                  <p className="text-[#505081]">Red Flags / Warnings</p>
                  <p className="font-bold text-[#9C2327] text-sm mt-0.5 tabular-nums">
                    {chatModerationEvents.filter((e) => e.flagType !== 'pii_masked').length} Events
                  </p>
                </div>
              </div>

              {/* Interactive Sentinel Bot Sandbox Tester */}
              <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/12 p-4 space-y-3">
                <div>
                  <p className="text-xs font-bold text-[#0F0E47] flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-[#272757]" />
                    Test Sentinel Moderator Bot Policies (No Client Data Accessed)
                  </p>
                  <p className="text-[11px] text-[#505081] mt-0.5">
                    Try sample inputs with phone numbers, bank accounts, GPS coordinates, red-flag
                    symptoms, or off-platform payment requests to verify automated bot enforcement.
                  </p>
                </div>
                <form onSubmit={handleRunBotTest} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={botTestInput}
                    onChange={(e) => setBotTestInput(e.target.value)}
                    placeholder="e.g. Call me on +234 803 123 4567 or WhatsApp me to send money to account 0123456789"
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#272757]/20 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold cursor-pointer shrink-0"
                  >
                    Run Bot Check
                  </button>
                </form>
                {botTestResult && (
                  <div className="rounded-xl bg-white border border-[#272757]/12 p-3 text-xs space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-[#0F0E47]">
                        Bot Decision: <span className="uppercase text-[#E8702A]">{botTestResult.action}</span>
                      </span>
                      {botTestResult.routedServiceName && (
                        <span className="text-[11px] text-[#505081]">
                          Matched Service: <strong>{botTestResult.routedServiceName}</strong>
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[11px] bg-[#F5F6FC] rounded-lg px-2.5 py-1.5 text-[#0F0E47]">
                      {botTestResult.maskedText}
                    </p>
                    {botTestResult.botNotice && (
                      <p className="text-[11px] text-[#505081]">{botTestResult.botNotice}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Read-Only Masked Bot Activity Feed */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F0E47] flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-[#272757]" />
                      Read-Only Sentinel Bot Activity Stream ({filteredModerationEvents.length})
                    </h3>
                    <p className="text-[11px] text-[#505081] mt-0.5">
                      Live read-only audit of automated PII masking, emergency red-flag escalations,
                      and policy warnings. Raw personal details are never stored or visible.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'pii_masked', label: 'PII Masked' },
                        { id: 'medical_red_flag', label: 'Red Flags' },
                        { id: 'bot_policy_warning', label: 'Policy Warnings' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setModFilter(f.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                          modFilter === f.id
                            ? 'bg-[#272757] text-white'
                            : 'bg-[#F5F6FC] text-[#505081] hover:text-[#0F0E47]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredModerationEvents.length === 0 ? (
                  <div className="rounded-xl bg-[#F5F6FC] p-4 text-xs text-[#505081]">
                    No automated moderation alerts recorded yet. Whenever Sentinel Bot masks PII,
                    intercepts an emergency red flag, or flags off-platform solicitation, a masked
                    monitor entry appears here automatically.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2.5">
                    {filteredModerationEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-3.5 text-xs space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ShieldAlert
                              className={`w-4 h-4 shrink-0 ${
                                ev.flagType === 'medical_red_flag'
                                  ? 'text-[#E5484D]'
                                  : ev.flagType === 'bot_policy_warning'
                                    ? 'text-[#272757]'
                                    : 'text-amber-600'
                              }`}
                            />
                            <span className="font-bold uppercase text-[#0F0E47]">
                              {ev.botAction ||
                                (ev.flagType === 'medical_red_flag'
                                  ? 'Medical Red Flag'
                                  : ev.flagType === 'bot_policy_warning'
                                    ? 'Bot Policy Warning'
                                    : 'PII Auto-Masked')}
                            </span>
                            <span className="text-[#505081]">
                              · {ev.serviceName || ev.mode}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[#8686AC]">
                            {(ev.createdAt || '').slice(0, 19).replace('T', ' ')}
                          </span>
                        </div>
                        <p className="text-[#0F0E47] bg-white rounded-lg px-3 py-2 border border-[#272757]/8 font-mono text-[11px]">
                          {ev.maskedExcerpt}
                        </p>
                        <p className="text-[11px] text-[#505081]">
                          Categories:{' '}
                          <strong className="text-[#272757]">
                            {ev.detectedCategories.join(', ')}
                          </strong>{' '}
                          · Automated Sentinel Bot log (read-only · zero client account access)
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 6. Personal Audit Log */}
      {user.signedIn && (
        <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-3">
          <h2 className="text-lg font-bold text-[#0F0E47]">Your Security & Access Audit Log ({auditLogs.length})</h2>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-[#505081]">
              Audit events are recorded automatically when you create health records, share data with doctors, book visits, or submit emergency requests.
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="rounded-xl bg-[#F5F6FC] p-3 text-xs flex justify-between gap-3">
                  <div>
                    <span className="font-mono font-semibold text-[#272757]">{log.action}</span> · {log.summary}
                    <p className="text-[11px] text-[#505081] font-mono mt-0.5">{log.targetPath}</p>
                  </div>
                  <span className="text-[11px] font-mono text-[#8686AC] shrink-0">
                    {(log.createdAt || '').slice(0, 19).replace('T', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
