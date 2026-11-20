import React, { useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Camera,
  CheckCircle2,
  Droplets,
  FileText,
  FlaskConical,
  HeartPulse,
  Image as ImageIcon,
  Pill,
  Plus,
  Share2,
  ShieldAlert,
  Stethoscope,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BLUEPRINT_LIMITS, sanitizeString } from '../../firebaseConfig';
import type { GlucoseReading, MedicalDocument } from '../../types/healthcare';

const DOCUMENT_CATEGORIES: MedicalDocument['category'][] = [
  'Condition',
  'Lab Report',
  'Imaging',
  'Immunization',
  'Discharge Summary',
  'Prescription',
];

const GLUCOSE_CONTEXTS: GlucoseReading['context'][] = [
  'Fasting',
  'Before Meal',
  'Post-Meal (2h)',
  'Random',
];

const MAX_COMPRESSED_DATA_URL_CHARS = 390000;

async function compressImageFileToDataUrl(
  file: File
): Promise<{ dataUrl: string; approxKb: number }> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read the selected image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read the selected image file.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Selected file could not be decoded as an image.'));
    image.src = rawDataUrl;
  });

  const attempts: Array<{ maxDim: number; quality: number }> = [
    { maxDim: 960, quality: 0.78 },
    { maxDim: 960, quality: 0.6 },
    { maxDim: 760, quality: 0.55 },
    { maxDim: 600, quality: 0.45 },
    { maxDim: 480, quality: 0.35 },
  ];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser canvas compression is unavailable.');
  }

  for (const step of attempts) {
    const scale = Math.min(1, step.maxDim / Math.max(img.width, img.height, 1));
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const compressed = canvas.toDataURL('image/jpeg', step.quality);
    if (compressed.length <= MAX_COMPRESSED_DATA_URL_CHARS) {
      return {
        dataUrl: compressed,
        approxKb: Math.max(1, Math.round((compressed.length * 0.75) / 1024)),
      };
    }
  }

  throw new Error(
    'This image is too detailed to fit inside the Firestore document limit. Please crop or select a smaller photo.'
  );
}

export function MedicalRecords() {
  const {
    user,
    isGuestDemo,
    navigate,
    familyProfiles,
    activeProfileId,
    updateFamilyProfile,
    bpReadings,
    addBpReading,
    glucoseReadings,
    addGlucoseReading,
    prescriptions,
    labResults,
    documents,
    addMedicalDocument,
    shareRecordWithDoctor,
  } = useApp();

  const activeProfile =
    familyProfiles.find((p) => p.id === activeProfileId) || familyProfiles[0] || null;

  const profileBp = useMemo(
    () => (activeProfile ? bpReadings.filter((b) => b.profileId === activeProfile.id) : []),
    [bpReadings, activeProfile]
  );
  const profileGlucose = useMemo(
    () => (activeProfile ? glucoseReadings.filter((g) => g.profileId === activeProfile.id) : []),
    [glucoseReadings, activeProfile]
  );
  const profileDocs = useMemo(
    () => (activeProfile ? documents.filter((d) => d.profileId === activeProfile.id) : []),
    [documents, activeProfile]
  );
  const profileRx = useMemo(
    () => (isGuestDemo && activeProfile ? prescriptions.filter((r) => r.profileId === activeProfile.id) : []),
    [isGuestDemo, prescriptions, activeProfile]
  );
  const profileLabs = useMemo(
    () => (isGuestDemo && activeProfile ? labResults.filter((l) => l.profileId === activeProfile.id) : []),
    [isGuestDemo, labResults, activeProfile]
  );

  const realAllergies = useMemo(
    () =>
      (activeProfile?.allergies || []).filter(
        (item) => item.trim().length > 0 && item.trim().toLowerCase() !== 'none recorded'
      ),
    [activeProfile]
  );

  // Global feedback state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [savingTarget, setSavingTarget] = useState<
    null | 'bp' | 'glucose' | 'allergy' | 'record' | 'share'
  >(null);

  // Vitals entry state
  const [vitalMode, setVitalMode] = useState<'bp' | 'glucose'>('bp');
  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [pulse, setPulse] = useState('74');
  const [bpDevice, setBpDevice] = useState('Omron Upper-Arm Monitor');
  const [bpNote, setBpNote] = useState('');

  const [glucoseValue, setGlucoseValue] = useState('96');
  const [glucoseContext, setGlucoseContext] = useState<GlucoseReading['context']>('Fasting');
  const [glucoseDevice, setGlucoseDevice] = useState('Accu-Chek Glucometer');
  const [glucoseNote, setGlucoseNote] = useState('');

  // Allergies entry state
  const [newAllergy, setNewAllergy] = useState('');

  // Conditions & Clinical Documents entry state
  const [categoryFilter, setCategoryFilter] = useState<'All' | MedicalDocument['category']>('All');
  const [recordCategory, setRecordCategory] = useState<MedicalDocument['category']>('Condition');
  const [recordTitle, setRecordTitle] = useState('');
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [recordIssuer, setRecordIssuer] = useState('Patient Uploaded Record');
  const [recordSummary, setRecordSummary] = useState('');
  const [attachmentDataUrl, setAttachmentDataUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [attachmentKb, setAttachmentKb] = useState<number | null>(null);
  const [compressingImage, setCompressingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Consent sharing + image lightbox
  const [shareDoctorUid, setShareDoctorUid] = useState('');
  const [lightboxImage, setLightboxImage] = useState<{
    src: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  const filteredDocs = useMemo(
    () =>
      categoryFilter === 'All'
        ? profileDocs
        : profileDocs.filter((d) => d.category === categoryFilter),
    [profileDocs, categoryFilter]
  );

  const conditionCount = useMemo(
    () => profileDocs.filter((d) => d.category === 'Condition').length,
    [profileDocs]
  );

  const clearFeedback = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleAddBp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    clearFeedback();
    const sys = Number(systolic);
    const dia = Number(diastolic);
    const pul = Number(pulse);
    if (!Number.isFinite(sys) || sys < 50 || sys > 280) {
      setErrorMsg('Systolic BP must be between 50 and 280 mmHg.');
      return;
    }
    if (!Number.isFinite(dia) || dia < 30 || dia > 180) {
      setErrorMsg('Diastolic BP must be between 30 and 180 mmHg.');
      return;
    }
    if (!Number.isFinite(pul) || pul < 30 || pul > 240) {
      setErrorMsg('Pulse rate must be between 30 and 240 bpm.');
      return;
    }

    setSavingTarget('bp');
    try {
      await addBpReading({
        profileId: activeProfile.id,
        systolic: Math.round(sys),
        diastolic: Math.round(dia),
        pulse: Math.round(pul),
        recordedAt: new Date().toISOString().slice(0, 16),
        deviceType: sanitizeString(bpDevice || 'Blood Pressure Cuff', BLUEPRINT_LIMITS.deviceTypeMaxLength),
        note: sanitizeString(bpNote || 'Logged from Medical Records', BLUEPRINT_LIMITS.noteMaxLength),
      });
      setBpNote('');
      setSuccessMsg('Blood pressure reading saved to Firestore.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save blood pressure reading.');
    } finally {
      setSavingTarget(null);
    }
  };

  const handleAddGlucose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    clearFeedback();
    const val = Number(glucoseValue);
    if (!Number.isFinite(val) || val < 20 || val > 800) {
      setErrorMsg('Blood glucose value must be between 20 and 800 mg/dL.');
      return;
    }

    setSavingTarget('glucose');
    try {
      await addGlucoseReading({
        profileId: activeProfile.id,
        valueMgDl: Math.round(val),
        context: glucoseContext,
        recordedAt: new Date().toISOString().slice(0, 16),
        deviceType: sanitizeString(glucoseDevice || 'Blood Glucometer', BLUEPRINT_LIMITS.deviceTypeMaxLength),
        note: sanitizeString(glucoseNote || 'Logged from Medical Records', BLUEPRINT_LIMITS.noteMaxLength),
      });
      setGlucoseNote('');
      setSuccessMsg('Blood glucose reading saved to Firestore.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save blood glucose reading.');
    } finally {
      setSavingTarget(null);
    }
  };

  const handleAddAllergy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    clearFeedback();
    const cleaned = sanitizeString(newAllergy, 60);
    if (cleaned.length < 2) {
      setErrorMsg('Enter an allergy name (at least 2 characters).');
      return;
    }
    if (realAllergies.some((a) => a.toLowerCase() === cleaned.toLowerCase())) {
      setErrorMsg('This allergy is already listed on the active profile.');
      return;
    }
    if (realAllergies.length >= 10) {
      setErrorMsg('Maximum of 10 structured allergies reached for this profile.');
      return;
    }

    setSavingTarget('allergy');
    try {
      const updatedList = [...realAllergies, cleaned];
      await updateFamilyProfile(activeProfile.id, { allergies: updatedList });
      setNewAllergy('');
      setSuccessMsg(`Added "${cleaned}" to recorded allergies.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save allergy.');
    } finally {
      setSavingTarget(null);
    }
  };

  const handleRemoveAllergy = async (allergyToRemove: string) => {
    if (!activeProfile) return;
    clearFeedback();
    setSavingTarget('allergy');
    try {
      const remaining = realAllergies.filter((item) => item !== allergyToRemove);
      await updateFamilyProfile(activeProfile.id, {
        allergies: remaining.length > 0 ? remaining : ['None recorded'],
      });
      setSuccessMsg(`Removed "${allergyToRemove}" from recorded allergies.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update allergies.');
    } finally {
      setSavingTarget(null);
    }
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    clearFeedback();

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please choose a valid image file (JPEG, PNG, or WebP).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setCompressingImage(true);
    try {
      const { dataUrl, approxKb } = await compressImageFileToDataUrl(file);
      const safeName = sanitizeString(file.name, BLUEPRINT_LIMITS.attachmentNameMaxLength) || 'medical-photo.jpg';
      setAttachmentDataUrl(dataUrl);
      setAttachmentName(safeName);
      setAttachmentKb(approxKb);
    } catch (err) {
      setAttachmentDataUrl(null);
      setAttachmentName('');
      setAttachmentKb(null);
      setErrorMsg(err instanceof Error ? err.message : 'Unable to process the selected image.');
    } finally {
      setCompressingImage(false);
    }
  };

  const clearSelectedAttachment = () => {
    setAttachmentDataUrl(null);
    setAttachmentName('');
    setAttachmentKb(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddClinicalRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    clearFeedback();

    const title = sanitizeString(recordTitle, 160);
    const issuer = sanitizeString(recordIssuer || 'Patient Uploaded Record', 140) || 'Patient Uploaded Record';
    const summary = sanitizeString(recordSummary, BLUEPRINT_LIMITS.summaryMaxLength);

    if (title.length < 2) {
      setErrorMsg('Condition or document title must be at least 2 characters.');
      return;
    }
    if (summary.length < 2) {
      setErrorMsg('Please enter clinical details or notes (at least 2 characters).');
      return;
    }

    setSavingTarget('record');
    try {
      await addMedicalDocument({
        profileId: activeProfile.id,
        title,
        category: recordCategory,
        date: recordDate || new Date().toISOString().slice(0, 10),
        issuer,
        plainSummary: summary,
        ...(attachmentDataUrl
          ? {
              attachmentDataUrl,
              attachmentName: attachmentName || 'clinical-photo.jpg',
            }
          : {}),
      });
      setRecordTitle('');
      setRecordSummary('');
      clearSelectedAttachment();
      setSuccessMsg(`${recordCategory} saved to Firestore${attachmentDataUrl ? ' with photo attachment' : ''}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save medical record.');
    } finally {
      setSavingTarget(null);
    }
  };

  const handleShareDoc = async (docId: string) => {
    clearFeedback();
    if (!shareDoctorUid.trim()) {
      setErrorMsg('Enter a verified Doctor UID first to grant consent access.');
      return;
    }
    setSavingTarget('share');
    try {
      await shareRecordWithDoctor('document', docId, shareDoctorUid.trim());
      setSuccessMsg('Clinical record consent granted to the specified Doctor UID.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to share document.');
    } finally {
      setSavingTarget(null);
    }
  };

  if (!activeProfile) {
    return (
      <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-3">
        <h2 className="text-lg font-bold text-[#0F0E47]">Structured Medical Records</h2>
        <p className="text-sm text-[#505081]">
          Create or initialize your primary health profile above to log vitals, allergies, conditions, and clinical photos.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Structured Overview Header */}
      <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#505081]">
              {isGuestDemo ? 'Demonstration Memory' : 'Cloud Firestore Synced'} · {activeProfile.fullName}
            </p>
            <h2 className="text-xl font-bold text-[#0F0E47] mt-0.5">
              Structured Medical Records
            </h2>
          </div>
          {!isGuestDemo && !user.emailVerified && (
            <span className="text-xs font-semibold text-[#9C420E] bg-[#E8702A]/12 border border-[#E8702A]/30 px-3 py-1.5 rounded-xl">
              Verify email to save changes to Firestore
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="rounded-xl bg-[#F5F6FC] p-3.5">
            <p className="text-[11px] font-medium text-[#505081]">Latest Blood Pressure</p>
            <p className="text-lg font-bold text-[#0F0E47] tabular-nums mt-0.5">
              {profileBp[0] ? `${profileBp[0].systolic}/${profileBp[0].diastolic}` : '—'}{' '}
              <span className="text-xs font-normal text-[#505081]">mmHg</span>
            </p>
          </div>
          <div className="rounded-xl bg-[#F5F6FC] p-3.5">
            <p className="text-[11px] font-medium text-[#505081]">Latest Glucose</p>
            <p className="text-lg font-bold text-[#0F0E47] tabular-nums mt-0.5">
              {profileGlucose[0] ? `${profileGlucose[0].valueMgDl}` : '—'}{' '}
              <span className="text-xs font-normal text-[#505081]">mg/dL</span>
            </p>
          </div>
          <div className="rounded-xl bg-[#F5F6FC] p-3.5">
            <p className="text-[11px] font-medium text-[#505081]">Recorded Allergies</p>
            <p className="text-lg font-bold text-[#0F0E47] tabular-nums mt-0.5">
              {realAllergies.length}
            </p>
          </div>
          <div className="rounded-xl bg-[#F5F6FC] p-3.5">
            <p className="text-[11px] font-medium text-[#505081]">Conditions & Docs</p>
            <p className="text-lg font-bold text-[#0F0E47] tabular-nums mt-0.5">
              {profileDocs.length}{' '}
              <span className="text-xs font-normal text-[#505081]">
                ({conditionCount} cond.)
              </span>
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-3.5 flex items-start gap-2.5 text-xs text-[#9C2327]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-start justify-between gap-2.5 text-xs text-emerald-900">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-700 hover:underline font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </section>

      {/* 1. Structured Vitals + Quick Append */}
      <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-[#E8702A]" />
              Vitals (Blood Pressure & Blood Glucose)
            </h3>
            <p className="text-xs text-[#505081] mt-0.5">
              Append new cuff or glucometer readings directly to your profile record.
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-[#F5F6FC] p-1 self-start">
            <button
              type="button"
              onClick={() => setVitalMode('bp')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                vitalMode === 'bp'
                  ? 'bg-[#272757] text-white'
                  : 'text-[#505081] hover:text-[#0F0E47]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Log BP
            </button>
            <button
              type="button"
              onClick={() => setVitalMode('glucose')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                vitalMode === 'glucose'
                  ? 'bg-[#272757] text-white'
                  : 'text-[#505081] hover:text-[#0F0E47]'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" /> Log Glucose
            </button>
          </div>
        </div>

        {/* Append Vital Form */}
        {vitalMode === 'bp' ? (
          <form
            onSubmit={(e) => void handleAddBp(e)}
            className="rounded-xl bg-[#F5F6FC] p-4 grid grid-cols-2 sm:grid-cols-6 gap-3 items-end"
          >
            <div>
              <label className="block text-[11px] font-semibold text-[#505081] mb-1">
                Systolic (mmHg)
              </label>
              <input
                type="number"
                min={50}
                max={280}
                required
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#272757]/20 bg-white text-xs tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#505081] mb-1">
                Diastolic (mmHg)
              </label>
              <input
                type="number"
                min={30}
                max={180}
                required
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#272757]/20 bg-white text-xs tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#505081] mb-1">
                Pulse (bpm)
              </label>
              <input
                type="number"
                min={30}
                max={240}
                required
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#272757]/20 bg-white text-xs tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#505081] mb-1">
                Device
              </label>
              <input
                type="text"
                maxLength={BLUEPRINT_LIMITS.deviceTypeMaxLength}
                value={bpDevice}
                onChange={(e) => setBpDevice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#272757]/20 bg-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#505081] mb-1">
                Note (Optional)
              </label>
              <input
                type="text"
                placeholder="Resting morning check"
                maxLength={BLUEPRINT_LIMITS.noteMaxLength}
                value={bpNote}
                onChange={(e) => setBpNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#272757]/20 bg-white text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={savingTarget !== null}
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[38px] rounded-xl bg-[#272757] hover:bg-[#1C1C42] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              <Plus className="w-3.5 h-3.5" />
              {savingTarget === 'bp' ? 'Saving...' : 'Save BP'}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => void handleAddGlucose(e)}
            className="rounded-xl bg-[#F5F6FC] p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-[11px] font-semibold text-[#505081] mb-1">
                Glucose (mg/dL)
              </label>
              <input
                type="number"
                min={20}
                max={800}
                required
                value={glucoseValue}
                onChange={(e) => setGlucoseValue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#272757]/20 bg-white text-xs tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#505081] mb-1">
                Context
              </label>
              <select
                value={glucoseContext}
                onChange={(e) => setGlucoseContext(e.target.value as GlucoseReading['context'])}
                className="w-full px-3 py-2 rounded-xl border border-[#272757]/20 bg-white text-xs"
              >
                {GLUCOSE_CONTEXTS.map((ctx) => (
                  <option key={ctx} value={ctx}>
                    {ctx}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#505081] mb-1">
                Device
              </label>
              <input
                type="text"
                maxLength={BLUEPRINT_LIMITS.deviceTypeMaxLength}
                value={glucoseDevice}
                onChange={(e) => setGlucoseDevice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#272757]/20 bg-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#505081] mb-1">
                Note (Optional)
              </label>
              <input
                type="text"
                placeholder="Before breakfast"
                maxLength={BLUEPRINT_LIMITS.noteMaxLength}
                value={glucoseNote}
                onChange={(e) => setGlucoseNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#272757]/20 bg-white text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={savingTarget !== null}
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[38px] rounded-xl bg-[#272757] hover:bg-[#1C1C42] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              <Plus className="w-3.5 h-3.5" />
              {savingTarget === 'glucose' ? 'Saving...' : 'Save Glucose'}
            </button>
          </form>
        )}

        {/* Recent Vitals Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#0F0E47] uppercase tracking-wider">
              Blood Pressure Entries ({profileBp.length})
            </h4>
            {profileBp.length === 0 ? (
              <p className="text-xs text-[#505081]">No BP readings logged for this profile yet.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {profileBp.slice(0, 6).map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-[#272757]/10 bg-[#F5F6FC]/70 p-3 flex justify-between items-center text-xs gap-2"
                  >
                    <div>
                      <p className="font-bold text-[#0F0E47] tabular-nums">
                        {b.systolic}/{b.diastolic} mmHg · Pulse {b.pulse}
                      </p>
                      <p className="text-[#505081] mt-0.5">{b.note || b.deviceType}</p>
                    </div>
                    <span className="font-mono text-[11px] text-[#505081] tabular-nums shrink-0">
                      {b.recordedAt.replace('T', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#0F0E47] uppercase tracking-wider">
              Blood Glucose Entries ({profileGlucose.length})
            </h4>
            {profileGlucose.length === 0 ? (
              <p className="text-xs text-[#505081]">No glucose readings logged for this profile yet.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {profileGlucose.slice(0, 6).map((g) => (
                  <div
                    key={g.id}
                    className="rounded-xl border border-[#272757]/10 bg-[#F5F6FC]/70 p-3 flex justify-between items-center text-xs gap-2"
                  >
                    <div>
                      <p className="font-bold text-[#0F0E47] tabular-nums">
                        {g.valueMgDl} mg/dL · {g.context}
                      </p>
                      <p className="text-[#505081] mt-0.5">{g.note || g.deviceType}</p>
                    </div>
                    <span className="font-mono text-[11px] text-[#505081] tabular-nums shrink-0">
                      {g.recordedAt.replace('T', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. Structured Allergies */}
      <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#E5484D]" />
            Allergies & Sensitivities
          </h3>
          <p className="text-xs text-[#505081] mt-0.5">
            Track medication, food, or environmental allergies for safe prescribing and emergency response (up to 10 entries).
          </p>
        </div>

        {realAllergies.length === 0 ? (
          <p className="text-xs text-[#505081] bg-[#F5F6FC] rounded-xl px-4 py-3">
            No allergies recorded on {activeProfile.fullName}&apos;s profile yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {realAllergies.map((allergy) => (
              <span
                key={allergy}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 text-xs font-semibold text-[#8E1F24]"
              >
                <span>{allergy}</span>
                <button
                  type="button"
                  disabled={savingTarget !== null}
                  onClick={() => void handleRemoveAllergy(allergy)}
                  aria-label={`Remove allergy ${allergy}`}
                  className="hover:text-[#0F0E47] cursor-pointer disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <form onSubmit={(e) => void handleAddAllergy(e)} className="flex flex-col sm:flex-row gap-3 pt-1">
          <input
            type="text"
            placeholder="Add allergy (e.g. Penicillin, Sulfa drugs, Peanuts)"
            maxLength={60}
            value={newAllergy}
            onChange={(e) => setNewAllergy(e.target.value)}
            className="flex-1 px-3.5 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
          />
          <button
            type="submit"
            disabled={savingTarget !== null || realAllergies.length >= 10}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[42px] rounded-xl bg-[#272757] hover:bg-[#1C1C42] text-white text-xs font-semibold cursor-pointer disabled:opacity-60 shrink-0"
          >
            <Plus className="w-4 h-4" />
            {savingTarget === 'allergy' ? 'Saving...' : 'Add Allergy'}
          </button>
        </form>
      </section>

      {/* 3. Conditions, Clinical Records & Picture Upload */}
      <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-[#272757]" />
              Conditions, Clinical Notes & Photo Records
            </h3>
            <p className="text-xs text-[#505081] mt-0.5">
              Append diagnosed conditions, lab reports, imaging, or prescription notes — with optional picture uploads.
            </p>
          </div>
          {!isGuestDemo && (
            <input
              type="text"
              placeholder="Doctor UID for consent sharing"
              value={shareDoctorUid}
              onChange={(e) => setShareDoctorUid(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#272757]/20 text-xs lg:w-64"
            />
          )}
        </div>

        {/* Add New Condition / Medical Record + Picture Upload Form */}
        <form
          onSubmit={(e) => void handleAddClinicalRecord(e)}
          className="rounded-2xl bg-[#F5F6FC] border border-[#272757]/10 p-4 sm:p-5 space-y-4"
        >
          <p className="text-xs font-bold text-[#0F0E47]">
            Append New Condition or Medical Record
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#505081] mb-1">
                Entry Type
              </label>
              <select
                value={recordCategory}
                onChange={(e) => setRecordCategory(e.target.value as MedicalDocument['category'])}
                className="w-full px-3 py-2.5 min-h-[40px] rounded-xl border border-[#272757]/20 bg-white text-xs"
              >
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-[11px] font-semibold text-[#505081] mb-1">
                Title / Condition Name
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={160}
                placeholder="e.g. Essential Hypertension"
                value={recordTitle}
                onChange={(e) => setRecordTitle(e.target.value)}
                className="w-full px-3 py-2.5 min-h-[40px] rounded-xl border border-[#272757]/20 bg-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#505081] mb-1">
                Facility / Issuer
              </label>
              <input
                type="text"
                minLength={2}
                maxLength={140}
                placeholder="e.g. UCH Ibadan / Self-Reported"
                value={recordIssuer}
                onChange={(e) => setRecordIssuer(e.target.value)}
                className="w-full px-3 py-2.5 min-h-[40px] rounded-xl border border-[#272757]/20 bg-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#505081] mb-1">
                Date
              </label>
              <input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className="w-full px-3 py-2.5 min-h-[40px] rounded-xl border border-[#272757]/20 bg-white text-xs tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#505081] mb-1">
              Clinical Summary / Observations
            </label>
            <textarea
              rows={2}
              required
              minLength={2}
              maxLength={BLUEPRINT_LIMITS.summaryMaxLength}
              placeholder="Describe diagnosis status, current management plan, dosage, or lab notes..."
              value={recordSummary}
              onChange={(e) => setRecordSummary(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#272757]/20 bg-white text-xs"
            />
          </div>

          {/* Picture Upload Area */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                onChange={(e) => void handleImageSelected(e)}
                className="hidden"
                id="medical-record-photo-input"
              />
              <label
                htmlFor="medical-record-photo-input"
                className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl bg-white border border-[#272757]/20 hover:border-[#272757] text-xs font-semibold text-[#272757] cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#E8702A]" />
                {compressingImage
                  ? 'Compressing image...'
                  : attachmentDataUrl
                    ? 'Replace Photo'
                    : 'Upload Photo (Lab, Rx, Scan)'}
              </label>

              {attachmentDataUrl && (
                <div className="flex items-center gap-2.5 bg-white border border-[#272757]/15 rounded-xl p-1.5 pr-2.5">
                  <img
                    src={attachmentDataUrl}
                    alt={attachmentName || 'Uploaded record preview'}
                    className="w-10 h-10 rounded-lg object-cover border border-[#272757]/10"
                  />
                  <div className="text-[11px]">
                    <p className="font-semibold text-[#0F0E47] max-w-[160px] truncate">
                      {attachmentName}
                    </p>
                    <p className="text-[#505081] tabular-nums">
                      {attachmentKb ? `${attachmentKb} KB · Ready` : 'Ready'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelectedAttachment}
                    aria-label="Remove selected photo"
                    className="p-1 rounded-lg text-[#505081] hover:text-[#E5484D] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={savingTarget !== null || compressingImage}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 min-h-[42px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold cursor-pointer disabled:opacity-60 shrink-0"
            >
              <Plus className="w-4 h-4" />
              {savingTarget === 'record' ? 'Saving Record...' : 'Save Medical Record'}
            </button>
          </div>
        </form>

        {/* Category Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {(['All', ...DOCUMENT_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#272757] text-white'
                  : 'bg-[#F5F6FC] text-[#505081] hover:text-[#0F0E47]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Stored Records List */}
        {filteredDocs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#272757]/20 p-6 text-center space-y-1">
            <FileText className="w-6 h-6 text-[#505081] mx-auto" />
            <p className="text-sm font-semibold text-[#0F0E47]">
              No {categoryFilter === 'All' ? 'conditions or documents' : categoryFilter.toLowerCase() + ' entries'} yet
            </p>
            <p className="text-xs text-[#505081]">
              Use the form above to append a condition, clinical summary, or photo attachment.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-4 flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="flex flex-col sm:flex-row gap-3.5 min-w-0 flex-1">
                  {doc.attachmentDataUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxImage({
                          src: doc.attachmentDataUrl!,
                          title: doc.title,
                          subtitle: `${doc.category} · ${doc.date} · ${doc.issuer}`,
                        })
                      }
                      className="group relative w-full sm:w-24 h-36 sm:h-24 rounded-xl overflow-hidden border border-[#272757]/15 bg-white shrink-0 cursor-pointer"
                    >
                      <img
                        src={doc.attachmentDataUrl}
                        alt={doc.attachmentName || doc.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0F0E47]/80 text-white text-[10px] font-semibold">
                        <ZoomIn className="w-3 h-3" /> View
                      </span>
                    </button>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          doc.category === 'Condition'
                            ? 'bg-[#272757] text-white'
                            : 'bg-white border border-[#272757]/15 text-[#272757]'
                        }`}
                      >
                        {doc.category}
                      </span>
                      <span className="text-xs font-mono text-[#505081] tabular-nums">
                        {doc.date}
                      </span>
                      <span className="text-xs text-[#505081]">· {doc.issuer}</span>
                    </div>

                    <p className="text-sm font-bold text-[#0F0E47]">{doc.title}</p>
                    <p className="text-xs text-[#303060] leading-relaxed">{doc.plainSummary}</p>

                    {doc.attachmentDataUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImage({
                            src: doc.attachmentDataUrl!,
                            title: doc.title,
                            subtitle: `${doc.category} · ${doc.date} · ${doc.issuer}`,
                          })
                        }
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#272757] hover:text-[#E8702A] pt-0.5 cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Inspect attached photo{doc.attachmentName ? ` (${doc.attachmentName})` : ''}
                      </button>
                    )}

                    {doc.sharedWithDoctorUid && (
                      <p className="text-[11px] font-mono text-emerald-700 pt-0.5">
                        Shared with Doctor UID: {doc.sharedWithDoctorUid}
                      </p>
                    )}
                  </div>
                </div>

                {!isGuestDemo && (
                  <button
                    type="button"
                    disabled={savingTarget !== null}
                    onClick={() => void handleShareDoc(doc.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#272757] hover:bg-[#1C1C42] text-white text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-60 self-start"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Active Prescriptions & Partner Lab Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-4">
          <h3 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
            <Pill className="w-5 h-5 text-[#E8702A]" />
            Active Prescriptions
          </h3>
          {profileRx.length === 0 ? (
            <p className="text-xs text-[#505081]">
              {isGuestDemo
                ? 'No active prescriptions on this profile.'
                : 'No verified facility prescriptions linked to this account yet. You can still log medication prescriptions in Conditions & Photo Records above.'}
            </p>
          ) : (
            <div className="space-y-3">
              {profileRx.map((rx) => (
                <div
                  key={rx.id}
                  className="rounded-xl bg-[#F5F6FC] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-bold text-[#0F0E47]">{rx.medication}</p>
                    <p className="text-xs text-[#505081]">
                      {rx.dosage} · {rx.frequency} · Prescribed by {rx.prescriber}
                    </p>
                    <p className="text-xs text-[#272757] mt-1">{rx.instructions}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/find-healthcare')}
                    className="px-4 py-2 min-h-[40px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Talk to Doctor Online (Included)
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-4">
          <h3 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#272757]" />
            Partner Laboratory Results
          </h3>
          {profileLabs.length === 0 ? (
            <p className="text-xs text-[#505081]">
              No partner laboratory panels posted yet. Upload photos of paper lab slips using the form above.
            </p>
          ) : (
            <div className="space-y-3">
              {profileLabs.map((lab) => (
                <div key={lab.id} className="rounded-xl bg-[#F5F6FC] p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-[#0F0E47]">{lab.testName}</p>
                      <p className="text-xs text-[#505081]">
                        {lab.labName} · {lab.date} · {lab.status}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/ai-assistant')}
                      className="text-xs font-semibold text-[#272757] hover:text-[#E8702A] cursor-pointer"
                    >
                      Explain with AI Assistant
                    </button>
                  </div>
                  <p className="text-xs text-[#0F0E47]">{lab.summary}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxImage.title}
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-[#0F0E47]/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl w-full rounded-2xl bg-white overflow-hidden shadow-2xl border border-[#272757]/15"
          >
            <div className="px-5 py-3.5 border-b border-[#272757]/10 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#0F0E47]">{lightboxImage.title}</p>
                {lightboxImage.subtitle && (
                  <p className="text-xs text-[#505081]">{lightboxImage.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                aria-label="Close image preview"
                className="p-2 rounded-xl bg-[#F5F6FC] hover:bg-[#E8EAF7] text-[#0F0E47] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-[#0F0E47]/5 p-4 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={lightboxImage.src}
                alt={lightboxImage.title}
                className="max-h-[68vh] w-auto rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
