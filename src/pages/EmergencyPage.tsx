import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ambulance,
  Building2,
  CheckCircle2,
  ExternalLink,
  LocateFixed,
  MapPin,
  PhoneCall,
  ShieldAlert,
  Watch,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LocationModal } from '../components/modals/LocationModal';
import { EmergencyMedicalQrCard } from '../components/emergency/EmergencyMedicalQrCard';
import { TwilioEmergencySmsPanel } from '../components/emergency/TwilioEmergencySmsPanel';
import {
  findNearestEmergencyHospitals,
  requestBrowserGpsLocation,
} from '../services/wearableEngine';

export function EmergencyPage() {
  const {
    userLocation,
    setUserLocation,
    emergencyContacts,
    activeEmergency,
    submitEmergencyRequest,
    advanceEmergencyStage,
    clearEmergencyRequest,
    familyProfiles,
    activeProfileId,
    updateFamilyProfile,
    criticalWearableAlert,
    clearCriticalWearableAlert,
    allFacilities,
  } = useApp();

  const [locationModalOpen, setLocationOpen] = useState(false);
  const [gpsLocking, setGpsLocking] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<'SOS Medical Triage' | 'Ambulance Dispatch Request'>(
    'Ambulance Dispatch Request'
  );
  const [notes, setNotes] = useState('');
  const [selectedHospitalId, setSelectedHospitalId] = useState(allFacilities[0]?.id || '');

  const [emgError, setEmgError] = useState<string | null>(null);
  const activeProfile =
    familyProfiles.find((p) => p.id === activeProfileId) ||
    familyProfiles[0] || {
      id: 'default',
      fullName: 'Patient Member',
      bloodGroup: 'Unknown',
      genotype: 'Unknown',
      allergies: ['None recorded'],
      emergencyNumber: '112',
    };

  const emergencyNumber = activeProfile.emergencyNumber || '112';
  const primaryContact =
    emergencyContacts.find((c) => c.isPrimary) || emergencyContacts[0] || null;

  const rankedHospitals = useMemo(
    () => findNearestEmergencyHospitals(allFacilities, userLocation.coordinates),
    [allFacilities, userLocation.coordinates]
  );

  const chosenRanked =
    rankedHospitals.find((h) => h.facility.id === selectedHospitalId) || rankedHospitals[0];

  const handleOneTapGps = async () => {
    setGpsLocking(true);
    setGpsNotice(null);
    try {
      const coords = await requestBrowserGpsLocation();
      setUserLocation({
        label: `Live GPS (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
        coordinates: coords,
        source: 'gps',
      });
      setGpsNotice('Live GPS acquired — nearest 24/7 emergency hospitals sorted by distance.');
    } catch (err) {
      setGpsNotice(
        err instanceof Error ? err.message : 'GPS unavailable. Choose location manually.'
      );
    } finally {
      setGpsLocking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmgError(null);
    try {
      const autoAlertNote = criticalWearableAlert
        ? `Smartwatch Critical Alert: ${criticalWearableAlert.reasons.join('; ')}. `
        : '';
      await submitEmergencyRequest({
        type: requestType,
        patientName: activeProfile.fullName,
        locationLabel: userLocation.label,
        coordinates: userLocation.coordinates,
        notes:
          `${autoAlertNote}${notes.trim()}`.trim() ||
          'Urgent clinical assessment requested via HealthConnect.',
        assignedHospital: chosenRanked.facility.name,
        partnerUnit: 'Coordinated Emergency Medical Response Unit (Prototype)',
        etaMinutes: chosenRanked.distanceKm
          ? Math.max(8, Math.round(chosenRanked.distanceKm * 2.5))
          : 14,
      });
    } catch (err) {
      setEmgError(err instanceof Error ? err.message : 'Unable to submit emergency request.');
    }
  };

  const handleStageAdvance = async (stage: 'submitted' | 'accepted' | 'dispatched' | 'resolved') => {
    setEmgError(null);
    try {
      await advanceEmergencyStage(stage);
    } catch (err) {
      setEmgError(err instanceof Error ? err.message : 'Unable to advance emergency stage.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FC] py-8 sm:py-10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 space-y-6 sm:space-y-8">
        {/* Critical Emergency Hero & 1-Tap Direct Device Call */}
        <div className="rounded-2xl bg-[#E5484D] text-white p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                HealthConnect Emergency Centre
              </h1>
              <p className="text-xs sm:text-sm text-white/95 mt-1 max-w-3xl leading-relaxed">
                <strong>Direct Action First:</strong> In a life-threatening emergency, tap{' '}
                <strong>Call {emergencyNumber} Now</strong> to dial directly from your phone or use GPS directions to the nearest 24/7 hospital below. The dispatch workflow below is a coordination prototype and does not replace official emergency services.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href={`tel:${emergencyNumber}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] rounded-xl bg-[#0F0E47] hover:bg-[#1B1A6B] text-white text-sm font-bold whitespace-nowrap"
            >
              <PhoneCall className="w-4 h-4 text-[#FFB585]" />
              Call {emergencyNumber} Now
            </a>
            <button
              type="button"
              disabled={gpsLocking}
              onClick={() => void handleOneTapGps()}
              className="inline-flex items-center gap-2 px-4 py-3 min-h-[46px] rounded-xl bg-white text-[#0F0E47] text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              <LocateFixed className="w-4 h-4 text-[#E5484D]" />
              {gpsLocking ? 'Locating GPS...' : 'Lock Live GPS'}
            </button>
          </div>
        </div>

        {/* Incoming Smartwatch Critical-Vital Auto-Escalation Banner */}
        {criticalWearableAlert && (
          <div className="rounded-2xl bg-[#1A0D2E] border-2 border-[#E5484D] text-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Watch className="w-6 h-6 text-[#FF8A8E] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-[#FF8A8E]">
                  Smartwatch Critical-Vital Auto-Escalation Active
                </p>
                <p className="text-sm font-bold">
                  {criticalWearableAlert.reasons.join(' · ')}
                </p>
                <p className="text-xs text-[#E3D5EC] font-mono tabular-nums">
                  HR {criticalWearableAlert.reading.heartRateBpm} bpm · SpO₂{' '}
                  {criticalWearableAlert.reading.spo2Percent}% · Source:{' '}
                  {criticalWearableAlert.reading.deviceName}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={`tel:${emergencyNumber}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#E5484D] hover:bg-[#C9363B] text-white text-xs font-bold"
              >
                <PhoneCall className="w-4 h-4" />
                Dial {emergencyNumber}
              </a>
              <button
                type="button"
                onClick={clearCriticalWearableAlert}
                className="inline-flex items-center gap-1 px-3 py-2.5 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
              >
                <X className="w-4 h-4" />
                Dismiss
              </button>
            </div>
          </div>
        )}

        {gpsNotice && (
          <div className="rounded-xl bg-white border border-[#272757]/15 p-3.5 text-xs text-[#0F0E47] flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#E8702A]" />
              {gpsNotice}
            </span>
            <button
              type="button"
              onClick={() => setLocationOpen(true)}
              className="font-semibold text-[#E8702A] hover:underline shrink-0 cursor-pointer"
            >
              Manual City
            </button>
          </div>
        )}

        {emgError && (
          <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-4 text-xs text-[#9C2327]">
            {emgError}
          </div>
        )}

        {/* Offline First-Responder Emergency Medical QR Code (Phone Wallet & Smartwatch Face) */}
        <EmergencyMedicalQrCard
          profile={activeProfile}
          primaryContact={primaryContact}
          onUpdateSharedFields={(fields) => {
            if (activeProfile.id && activeProfile.id !== 'default') {
              void updateFamilyProfile(activeProfile.id, { qrSharedFields: fields }).catch(
                () => undefined
              );
            }
          }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: SOS / Ambulance Request & 3-Stage Status */}
          <div className="lg:col-span-7 space-y-6">
            {!activeEmergency ? (
              <form
                onSubmit={(e) => void handleSubmit(e)}
                className="rounded-2xl bg-white border border-[#272757]/10 p-6 sm:p-8 space-y-5"
              >
                <div>
                  <h2 className="text-xl font-bold text-[#0F0E47]">
                    Initiate Emergency Coordination Request
                  </h2>
                  <p className="text-xs text-[#505081] mt-1">
                    Patient Profile: <strong>{activeProfile.fullName}</strong> · Blood Group{' '}
                    <strong>{activeProfile.bloodGroup}</strong> · Allergies:{' '}
                    {activeProfile.allergies.join(', ')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['Ambulance Dispatch Request', 'SOS Medical Triage'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRequestType(t)}
                      className={`px-4 py-3 min-h-[44px] rounded-xl border text-left text-xs font-semibold transition-colors cursor-pointer ${
                        requestType === t
                          ? 'border-[#E5484D] bg-[#E5484D]/8 text-[#9C2327]'
                          : 'border-[#272757]/15 text-[#505081]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-[#272757]">
                      Pickup / Incident Location
                    </span>
                    <button
                      type="button"
                      onClick={() => setLocationOpen(true)}
                      className="text-xs font-semibold text-[#E8702A] hover:underline cursor-pointer"
                    >
                      Change or Use GPS
                    </button>
                  </div>
                  <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/12 px-4 py-3 text-xs text-[#0F0E47] flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#E5484D] shrink-0" />
                    <span>{userLocation.label}</span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="emg-hospital"
                    className="block text-xs font-semibold text-[#272757] mb-1.5"
                  >
                    Target Receiving Hospital (Sorted by GPS Proximity)
                  </label>
                  <select
                    id="emg-hospital"
                    value={selectedHospitalId}
                    onChange={(e) => setSelectedHospitalId(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-white border border-[#272757]/20 text-sm text-[#0F0E47]"
                  >
                    {rankedHospitals.map((h) => (
                      <option key={h.facility.id} value={h.facility.id}>
                        {h.facility.name} ({h.facility.city}
                        {h.distanceKm !== null ? ` · ${h.distanceKm.toFixed(1)} km` : ''})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="emg-notes"
                    className="block text-xs font-semibold text-[#272757] mb-1.5"
                  >
                    Situation Summary for Triage Desk
                  </label>
                  <textarea
                    id="emg-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe symptoms, consciousness level, or landmark access instructions..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#272757]/20 text-sm text-[#0F0E47]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] rounded-xl bg-[#E5484D] hover:bg-[#C9363B] text-white text-sm font-bold transition-colors cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  Submit Emergency Coordination Request (Prototype)
                </button>
              </form>
            ) : (
              <div className="rounded-2xl bg-white border border-[#272757]/12 p-6 sm:p-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-mono text-[#505081]">
                      {activeEmergency.id} · {activeEmergency.createdAt}
                    </p>
                    <h2 className="text-xl font-bold text-[#0F0E47] mt-0.5">
                      {activeEmergency.type}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={clearEmergencyRequest}
                    className="px-3.5 py-2 rounded-lg border border-[#272757]/20 text-xs font-semibold text-[#505081] hover:text-[#0F0E47] cursor-pointer"
                  >
                    Reset Prototype Request
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      {
                        key: 'submitted',
                        label: '1. Submitted Request',
                        desc: 'Intake logged with location & allergies.',
                      },
                      {
                        key: 'accepted',
                        label: '2. Accepted Request',
                        desc: 'Hospital triage desk confirmed readiness.',
                      },
                      {
                        key: 'dispatched',
                        label: '3. Confirmed Dispatch',
                        desc: 'Ambulance partner unit assigned & en route.',
                      },
                    ] as const
                  ).map((step, idx) => {
                    const order: Record<string, number> = {
                      submitted: 0,
                      accepted: 1,
                      dispatched: 2,
                      resolved: 3,
                      idle: -1,
                    };
                    const reached = (order[activeEmergency.stage] ?? -1) >= idx;
                    const current = activeEmergency.stage === step.key;
                    return (
                      <div
                        key={step.key}
                        className={`rounded-xl border p-4 space-y-1.5 ${
                          current
                            ? 'border-[#E8702A] bg-[#E8702A]/10'
                            : reached
                              ? 'border-emerald-600/40 bg-emerald-50/70'
                              : 'border-[#272757]/12 bg-[#F5F6FC]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-[#0F0E47]">
                          <span>{step.label}</span>
                          {reached && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </div>
                        <p className="text-xs text-[#505081] leading-relaxed">{step.desc}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl bg-[#F5F6FC] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#0F0E47]">
                      Workflow Controls (Hospital Role Required When Signed In)
                    </span>
                    <span className="text-[#505081]">Not a real live ambulance dispatch</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleStageAdvance('accepted')}
                      className="px-3 py-2 rounded-lg bg-[#272757] text-white text-xs font-semibold cursor-pointer"
                    >
                      Stage 2: Mark Accepted
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleStageAdvance('dispatched')}
                      className="px-3 py-2 rounded-lg bg-[#E8702A] text-white text-xs font-semibold cursor-pointer"
                    >
                      Stage 3: Confirmed Dispatch
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleStageAdvance('resolved')}
                      className="px-3 py-2 rounded-lg bg-white border border-[#272757]/15 text-xs font-semibold text-[#0F0E47] cursor-pointer"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-[#0F0E47] text-white p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-sm font-bold">
                      <Ambulance className="w-4 h-4 text-[#FFB585]" />
                      {activeEmergency.stage === 'dispatched'
                        ? `Estimated Arrival: ~${activeEmergency.etaMinutes} mins (Simulated)`
                        : activeEmergency.stage === 'accepted'
                          ? 'Hospital Bed Reserved · Preparing Unit'
                          : 'Awaiting Partner Hospital Acceptance'}
                    </span>
                  </div>
                  <div className="text-xs text-[#C7C8E6] space-y-1">
                    <p>Receiving Facility: {activeEmergency.assignedHospital}</p>
                    <p>Location Shared: {activeEmergency.locationLabel}</p>
                    <p>Clinical Notes: {activeEmergency.notes}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Automated Twilio Emergency SMS Alert with Last Known GPS Coordinates */}
            <TwilioEmergencySmsPanel
              patientName={activeProfile.fullName}
              bloodGroup={activeProfile.bloodGroup}
              allergies={activeProfile.allergies}
              locationLabel={userLocation.label}
              coordinates={userLocation.coordinates}
              emergencyType={
                criticalWearableAlert ? 'Watch Critical Alert' : requestType
              }
              notes={
                criticalWearableAlert
                  ? `Watch Critical Alert: ${criticalWearableAlert.reasons.join('; ')}. ${notes}`.trim()
                  : notes
              }
              gpsLocking={gpsLocking}
              onRefreshGps={() => void handleOneTapGps()}
            />
          </div>

          {/* Right Column: Nearest GPS 24/7 Emergency Hospitals & Direct-Call Contacts */}
          <aside className="lg:col-span-5 space-y-6">
            <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#E5484D]" />
                Nearest 24/7 Emergency Hospitals (GPS)
              </h2>
              <div className="space-y-3">
                {rankedHospitals.map(({ facility: h, distanceKm, mapsDirectionsUrl }) => (
                  <div key={h.id} className="rounded-xl bg-[#F5F6FC] p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#0F0E47]">{h.name}</span>
                      <span className="font-mono font-semibold text-[#E8702A] tabular-nums shrink-0">
                        {distanceKm !== null ? `${distanceKm.toFixed(1)} km` : h.city}
                      </span>
                    </div>
                    <p className="text-xs text-[#505081]">{h.address}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-[#272757] font-medium">{h.phoneNote}</span>
                      <a
                        href={mapsDirectionsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#272757] hover:text-[#E8702A]"
                      >
                        Directions <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-3">
              <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#E8702A]" />
                Emergency Contacts on File
              </h2>
              <div className="space-y-2.5">
                {emergencyContacts.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl bg-[#F5F6FC] p-3.5 text-xs flex justify-between items-center gap-3"
                  >
                    <div>
                      <p className="font-bold text-[#0F0E47]">{c.name}</p>
                      <p className="text-[#505081]">
                        {c.relationship} · {c.city}
                      </p>
                    </div>
                    <a
                      href={`tel:${c.phone.replace(/[^+\d]/g, '')}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg bg-[#272757] text-white font-mono text-xs tabular-nums shrink-0"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      {c.phone}
                    </a>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <LocationModal open={locationModalOpen} onClose={() => setLocationOpen(false)} />
    </div>
  );
}
