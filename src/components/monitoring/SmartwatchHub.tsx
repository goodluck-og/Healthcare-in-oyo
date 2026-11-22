import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bluetooth,
  BluetoothOff,
  CheckCircle2,
  Footprints,
  Heart,
  Info,
  LocateFixed,
  MapPin,
  PhoneCall,
  ShieldAlert,
  Sliders,
  Thermometer,
  Watch,
  Wind,
  X,
} from 'lucide-react';
import { DEMO_FACILITIES } from '../../data/mockNigeriaData';
import { useApp } from '../../context/AppContext';
import {
  connectWebBluetoothHeartRate,
  DEFAULT_WEARABLE_THRESHOLDS,
  evaluateWearableVitals,
  findNearestEmergencyHospitals,
  requestBrowserGpsLocation,
  SMARTWATCH_SIMULATOR_PRESETS,
  type SmartwatchSimulatorPreset,
} from '../../services/wearableEngine';
import type { WearableReading, WearableThresholds } from '../../types/healthcare';

interface SmartwatchHubProps {
  darkTheme?: boolean;
}

export function SmartwatchHub({ darkTheme = false }: SmartwatchHubProps) {
  const {
    familyProfiles,
    activeProfileId,
    wearableReadings,
    addWearableReading,
    triggerCriticalWearableAlert,
    userLocation,
    setUserLocation,
    navigate,
  } = useApp();

  const activeProfile =
    familyProfiles.find((p) => p.id === activeProfileId) || familyProfiles[0] || null;
  const emergencyNumber = activeProfile?.emergencyNumber || '112';

  const profileReadings = useMemo(
    () =>
      activeProfile
        ? wearableReadings.filter((r) => r.profileId === activeProfile.id)
        : wearableReadings,
    [wearableReadings, activeProfile]
  );

  const latestReading: WearableReading = profileReadings[0] || {
    id: 'baseline',
    profileId: activeProfile?.id || 'default',
    source: 'simulator',
    deviceName: 'HealthConnect Watch Simulator',
    heartRateBpm: 72,
    spo2Percent: 98,
    systolic: 118,
    diastolic: 76,
    temperatureC: 36.7,
    steps: 6420,
    sleepHours: 7.4,
    recordedAt: new Date().toISOString(),
  };

  const [thresholds, setThresholds] = useState<WearableThresholds>(DEFAULT_WEARABLE_THRESHOLDS);
  const [showThresholds, setShowThresholds] = useState(false);

  // Web Bluetooth connection state
  const [btConnectedDevice, setBtConnectedDevice] = useState<string | null>(null);
  const [btStatusMsg, setBtStatusMsg] = useState<string | null>(null);
  const btDisconnectRef = useRef<(() => void) | null>(null);

  // GPS state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  // 15-second cancellable Critical-Vital Countdown state
  const [countdownModal, setCountdownModal] = useState<{
    reading: WearableReading;
    reasons: string[];
    secondsLeft: number;
  } | null>(null);

  const assessment = useMemo(
    () => evaluateWearableVitals(latestReading, thresholds),
    [latestReading, thresholds]
  );

  const nearestHospitals = useMemo(
    () => findNearestEmergencyHospitals(DEMO_FACILITIES, userLocation.coordinates).slice(0, 3),
    [userLocation.coordinates]
  );
  const topHospital = nearestHospitals[0] || null;

  useEffect(() => {
    return () => {
      btDisconnectRef.current?.();
    };
  }, []);

  // Countdown tick for critical vital auto-escalation
  useEffect(() => {
    if (!countdownModal) return;
    if (countdownModal.secondsLeft <= 0) {
      const { reading, reasons } = countdownModal;
      setCountdownModal(null);
      triggerCriticalWearableAlert(reading, reasons);
      navigate('/emergency');
      return;
    }
    const timer = window.setTimeout(() => {
      setCountdownModal((prev) =>
        prev ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : null
      );
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [countdownModal, navigate, triggerCriticalWearableAlert]);

  const handleLocateGps = async () => {
    setGpsLoading(true);
    setGpsStatus(null);
    try {
      const coords = await requestBrowserGpsLocation();
      setUserLocation({
        label: `Live GPS (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
        coordinates: coords,
        source: 'gps',
      });
      setGpsStatus('Live GPS locked — nearest 24/7 hospitals updated.');
    } catch (err) {
      setGpsStatus(
        err instanceof Error
          ? err.message
          : 'Unable to obtain GPS right now. Using saved city coordinates.'
      );
    } finally {
      setGpsLoading(false);
    }
  };

  const ingestReading = async (
    partial: Omit<WearableReading, 'id' | 'ownerUid' | 'profileId' | 'recordedAt'>
  ) => {
    const evalResult = evaluateWearableVitals(partial, thresholds);
    const saved = await addWearableReading({
      ...partial,
      profileId: activeProfile?.id || 'default',
      recordedAt: new Date().toISOString(),
      criticalAlertTriggered: evalResult.severity === 'critical',
      alertReason: evalResult.severity === 'critical' ? evalResult.reasons.join('; ') : undefined,
    });

    if (evalResult.severity === 'critical') {
      // Automatically request fresh GPS silently when critical threshold triggers
      void requestBrowserGpsLocation()
        .then((coords) =>
          setUserLocation({
            label: `Live GPS (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
            coordinates: coords,
            source: 'gps',
          })
        )
        .catch(() => undefined);

      setCountdownModal({
        reading: saved,
        reasons: evalResult.reasons,
        secondsLeft: 15,
      });
    }
  };

  const handleRunSimulatorPreset = (preset: SmartwatchSimulatorPreset) => {
    void ingestReading({
      source: 'simulator',
      deviceName: `Smartwatch Simulator (${preset.label})`,
      heartRateBpm: preset.heartRateBpm,
      spo2Percent: preset.spo2Percent,
      systolic: preset.systolic,
      diastolic: preset.diastolic,
      temperatureC: preset.temperatureC,
      steps: preset.steps,
      sleepHours: preset.sleepHours,
    });
  };

  const handleConnectBluetooth = async () => {
    if (btConnectedDevice) {
      btDisconnectRef.current?.();
      btDisconnectRef.current = null;
      setBtConnectedDevice(null);
      setBtStatusMsg('Disconnected Bluetooth wearable.');
      return;
    }
    setBtStatusMsg('Searching for standard Bluetooth Heart-Rate smartwatch/strap (0x180D)...');
    try {
      const conn = await connectWebBluetoothHeartRate(
        (bpm, deviceName) => {
          void ingestReading({
            source: 'web_bluetooth',
            deviceName,
            heartRateBpm: bpm,
            spo2Percent: latestReading.spo2Percent || 98,
            systolic: latestReading.systolic,
            diastolic: latestReading.diastolic,
            temperatureC: latestReading.temperatureC,
            steps: latestReading.steps,
          });
        },
        () => {
          setBtConnectedDevice(null);
          setBtStatusMsg('Bluetooth wearable disconnected.');
        }
      );
      btDisconnectRef.current = conn.disconnect;
      setBtConnectedDevice(conn.deviceName);
      setBtStatusMsg(`Live Web Bluetooth stream connected: ${conn.deviceName}`);
    } catch (err) {
      setBtStatusMsg(
        err instanceof Error
          ? err.message
          : 'Bluetooth pairing unavailable. Use the Smartwatch Simulator below.'
      );
    }
  };

  const sourceLabel =
    latestReading.source === 'web_bluetooth'
      ? `Live Web Bluetooth · ${latestReading.deviceName}`
      : latestReading.source === 'manual'
        ? `Manual Entry · ${latestReading.deviceName}`
        : `Simulated Watch Telemetry · ${latestReading.deviceName}`;

  const surfaceClass = darkTheme
    ? 'bg-[#13124A] border-white/12 text-white'
    : 'bg-white border-[#272757]/12 text-[#0F0E47]';
  const mutedClass = darkTheme ? 'text-[#C7C8E6]' : 'text-[#505081]';
  const tileBg = darkTheme ? 'bg-[#0B0A33] border-white/10' : 'bg-[#F5F6FC] border-[#272757]/10';

  return (
    <section className={`rounded-2xl border p-5 sm:p-6 space-y-5 ${surfaceClass}`}>
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className={`text-xs font-semibold flex items-center gap-1.5 ${darkTheme ? 'text-[#FFB585]' : 'text-[#E8702A]'}`}>
            <Watch className="w-4 h-4" />
            Smartwatch &amp; Wearable Safety Hub · GPS Auto-Escalation
          </p>
          <h2 className="text-xl font-bold mt-1">
            Live Watch Vitals &amp; Critical-Threshold Emergency Guard
          </h2>
          <p className={`text-xs mt-1 ${mutedClass}`}>
            Source: <strong className={darkTheme ? 'text-white' : 'text-[#0F0E47]'}>{sourceLabel}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleConnectBluetooth()}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold cursor-pointer ${
              btConnectedDevice
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-[#272757] hover:bg-[#0F0E47] text-white'
            }`}
          >
            {btConnectedDevice ? <BluetoothOff className="w-4 h-4" /> : <Bluetooth className="w-4 h-4" />}
            {btConnectedDevice ? `Disconnect ${btConnectedDevice}` : 'Pair Bluetooth Watch'}
          </button>
          <button
            type="button"
            disabled={gpsLoading}
            onClick={() => void handleLocateGps()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold cursor-pointer"
          >
            <LocateFixed className="w-4 h-4" />
            {gpsLoading ? 'Locking GPS...' : 'Lock Live GPS'}
          </button>
          <button
            type="button"
            onClick={() => setShowThresholds((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl border text-xs font-semibold cursor-pointer ${
              darkTheme
                ? 'border-white/15 bg-white/6 text-white'
                : 'border-[#272757]/15 bg-[#F5F6FC] text-[#0F0E47]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Thresholds
          </button>
        </div>
      </div>

      {/* Honest Consumer Wearable Limitation Notice */}
      <div
        className={`rounded-xl border p-3.5 flex items-start gap-2.5 text-xs ${
          darkTheme
            ? 'bg-[#0B0A33] border-white/12 text-[#D7D8EE]'
            : 'bg-[#FFF7F1] border-[#E8702A]/30 text-[#0F0E47]'
        }`}
      >
        <Info className="w-4 h-4 text-[#E8702A] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Consumer Wearable Transparency:</strong> Smartwatch sensors and simulator presets assist with early trend awareness and emergency workflow readiness—they are not a substitute for hospital-grade monitors. Critical readings open a 15-second cancellable safety countdown with GPS hospital routing and a 1-tap direct dial ({emergencyNumber}) link.
        </p>
      </div>

      {(btStatusMsg || gpsStatus) && (
        <div className={`rounded-xl border px-3.5 py-2.5 text-xs ${tileBg}`}>
          {btStatusMsg && <p>{btStatusMsg}</p>}
          {gpsStatus && <p className="mt-0.5">{gpsStatus}</p>}
        </div>
      )}

      {/* Vital Readouts Grid (Tabular Monospace Numerals) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className={`rounded-xl border p-4 space-y-1 ${tileBg}`}>
          <p className={`text-[11px] font-semibold flex items-center gap-1.5 ${mutedClass}`}>
            <Heart className="w-3.5 h-3.5 text-[#E5484D]" />
            Heart Rate
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums">
            {latestReading.heartRateBpm} <span className="text-xs font-sans font-normal">bpm</span>
          </p>
          <p className={`text-[11px] ${mutedClass}`}>
            Bounds {thresholds.minHeartRateBpm}–{thresholds.maxHeartRateBpm}
          </p>
        </div>

        <div className={`rounded-xl border p-4 space-y-1 ${tileBg}`}>
          <p className={`text-[11px] font-semibold flex items-center gap-1.5 ${mutedClass}`}>
            <Wind className="w-3.5 h-3.5 text-[#38BDF8]" />
            Oxygen (SpO₂)
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums">
            {latestReading.spo2Percent}
            <span className="text-xs font-sans font-normal">%</span>
          </p>
          <p className={`text-[11px] ${mutedClass}`}>Alert below {thresholds.minSpo2Percent}%</p>
        </div>

        <div className={`rounded-xl border p-4 space-y-1 ${tileBg}`}>
          <p className={`text-[11px] font-semibold flex items-center gap-1.5 ${mutedClass}`}>
            <Activity className="w-3.5 h-3.5 text-[#8A8EF5]" />
            Est. Blood Pressure
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums">
            {latestReading.systolic || '—'}/{latestReading.diastolic || '—'}
          </p>
          <p className={`text-[11px] ${mutedClass}`}>mmHg · Alert ≥{thresholds.maxSystolicMmHg}</p>
        </div>

        <div className={`rounded-xl border p-4 space-y-1 ${tileBg}`}>
          <p className={`text-[11px] font-semibold flex items-center gap-1.5 ${mutedClass}`}>
            <Thermometer className="w-3.5 h-3.5 text-[#FFB585]" />
            Skin Temp
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums">
            {latestReading.temperatureC ? `${latestReading.temperatureC.toFixed(1)}°C` : '—'}
          </p>
          <p className={`text-[11px] ${mutedClass}`}>Alert ≥{thresholds.maxTemperatureC}°C</p>
        </div>

        <div className={`rounded-xl border p-4 space-y-1 col-span-2 lg:col-span-1 ${tileBg}`}>
          <p className={`text-[11px] font-semibold flex items-center gap-1.5 ${mutedClass}`}>
            <Footprints className="w-3.5 h-3.5 text-emerald-500" />
            Steps &amp; Sleep
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums">
            {(latestReading.steps || 0).toLocaleString()}
          </p>
          <p className={`text-[11px] ${mutedClass}`}>
            {latestReading.sleepHours ? `${latestReading.sleepHours}h sleep logged` : 'Daily steps'}
          </p>
        </div>
      </div>

      {/* Live Clinical Threshold Status & Nearest GPS Hospital */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div
          className={`lg:col-span-7 rounded-xl border p-4 space-y-1.5 ${
            assessment.severity === 'critical'
              ? 'bg-[#E5484D]/15 border-[#E5484D]/45'
              : assessment.severity === 'warning'
                ? 'bg-amber-500/12 border-amber-500/35'
                : tileBg
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            {assessment.severity === 'critical' ? (
              <ShieldAlert className="w-4 h-4 text-[#E5484D]" />
            ) : assessment.severity === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            )}
            <span>
              Status:{' '}
              {assessment.severity === 'critical'
                ? 'CRITICAL VITAL ALERT'
                : assessment.severity === 'warning'
                  ? 'ELEVATED WATCH ZONE'
                  : 'WITHIN SAFETY BOUNDS'}
            </span>
          </div>
          <p className={`text-xs leading-relaxed ${mutedClass}`}>
            {assessment.reasons.join(' · ')} — {assessment.recommendedAction}
          </p>
        </div>

        <div className={`lg:col-span-5 rounded-xl border p-4 space-y-2 ${tileBg}`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#E5484D]" />
              Nearest 24/7 GPS Hospital
            </span>
            {topHospital?.distanceKm != null && (
              <span className="font-mono font-semibold tabular-nums text-[#E8702A]">
                {topHospital.distanceKm.toFixed(1)} km
              </span>
            )}
          </div>
          {topHospital ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold">{topHospital.facility.name}</p>
              <p className={`text-[11px] ${mutedClass}`}>{userLocation.label}</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`tel:${emergencyNumber}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-[#E5484D] text-white text-xs font-bold"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Call {emergencyNumber}
                </a>
                <a
                  href={topHospital.mapsDirectionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-[#272757] text-white text-xs font-semibold"
                >
                  GPS Directions
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Configurable Thresholds Drawer */}
      {showThresholds && (
        <div className={`rounded-xl border p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 ${tileBg}`}>
          <div>
            <label className={`block text-[11px] mb-1 ${mutedClass}`}>Min HR (bpm)</label>
            <input
              type="number"
              value={thresholds.minHeartRateBpm}
              onChange={(e) =>
                setThresholds((t) => ({ ...t, minHeartRateBpm: Number(e.target.value) || 40 }))
              }
              className="w-full px-2.5 py-2 rounded-lg border border-[#272757]/20 bg-white text-[#0F0E47] text-xs font-mono tabular-nums"
            />
          </div>
          <div>
            <label className={`block text-[11px] mb-1 ${mutedClass}`}>Max HR (bpm)</label>
            <input
              type="number"
              value={thresholds.maxHeartRateBpm}
              onChange={(e) =>
                setThresholds((t) => ({ ...t, maxHeartRateBpm: Number(e.target.value) || 155 }))
              }
              className="w-full px-2.5 py-2 rounded-lg border border-[#272757]/20 bg-white text-[#0F0E47] text-xs font-mono tabular-nums"
            />
          </div>
          <div>
            <label className={`block text-[11px] mb-1 ${mutedClass}`}>Min SpO₂ (%)</label>
            <input
              type="number"
              value={thresholds.minSpo2Percent}
              onChange={(e) =>
                setThresholds((t) => ({ ...t, minSpo2Percent: Number(e.target.value) || 90 }))
              }
              className="w-full px-2.5 py-2 rounded-lg border border-[#272757]/20 bg-white text-[#0F0E47] text-xs font-mono tabular-nums"
            />
          </div>
          <div>
            <label className={`block text-[11px] mb-1 ${mutedClass}`}>Max Systolic</label>
            <input
              type="number"
              value={thresholds.maxSystolicMmHg}
              onChange={(e) =>
                setThresholds((t) => ({ ...t, maxSystolicMmHg: Number(e.target.value) || 180 }))
              }
              className="w-full px-2.5 py-2 rounded-lg border border-[#272757]/20 bg-white text-[#0F0E47] text-xs font-mono tabular-nums"
            />
          </div>
          <div>
            <label className={`block text-[11px] mb-1 ${mutedClass}`}>Max Diastolic</label>
            <input
              type="number"
              value={thresholds.maxDiastolicMmHg}
              onChange={(e) =>
                setThresholds((t) => ({ ...t, maxDiastolicMmHg: Number(e.target.value) || 120 }))
              }
              className="w-full px-2.5 py-2 rounded-lg border border-[#272757]/20 bg-white text-[#0F0E47] text-xs font-mono tabular-nums"
            />
          </div>
          <div>
            <label className={`block text-[11px] mb-1 ${mutedClass}`}>Max Temp (°C)</label>
            <input
              type="number"
              step="0.1"
              value={thresholds.maxTemperatureC}
              onChange={(e) =>
                setThresholds((t) => ({ ...t, maxTemperatureC: Number(e.target.value) || 39.8 }))
              }
              className="w-full px-2.5 py-2 rounded-lg border border-[#272757]/20 bg-white text-[#0F0E47] text-xs font-mono tabular-nums"
            />
          </div>
        </div>
      )}

      {/* Smartwatch Telemetry Simulator Presets (for modded watch testing & judge demo) */}
      <div className="space-y-2.5 pt-2 border-t border-current/10">
        <p className="text-xs font-bold">
          Smartwatch Telemetry Simulator (Test Watch Firmware &amp; Auto-SOS Flow)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {SMARTWATCH_SIMULATOR_PRESETS.map((preset) => {
            const isCrit = preset.id.startsWith('critical');
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleRunSimulatorPreset(preset)}
                className={`text-left rounded-xl p-3.5 min-h-[52px] border transition-colors cursor-pointer ${
                  isCrit
                    ? 'border-[#E5484D]/40 bg-[#E5484D]/10 hover:bg-[#E5484D]/18'
                    : darkTheme
                      ? 'border-white/12 bg-[#0B0A33] hover:bg-white/10'
                      : 'border-[#272757]/12 bg-[#F5F6FC] hover:bg-[#ECEEF9]'
                }`}
              >
                <p className="text-xs font-bold">{preset.label}</p>
                <p className={`text-[11px] mt-0.5 leading-snug ${mutedClass}`}>
                  {preset.description}
                </p>
                <p className="text-[11px] font-mono tabular-nums mt-1.5 opacity-85">
                  HR {preset.heartRateBpm} · SpO₂ {preset.spo2Percent}% · {preset.temperatureC}°C
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 15-Second Cancellable Critical-Vital Emergency Auto-Escalation Modal */}
      {countdownModal && (
        <div
          className="fixed inset-0 z-50 bg-[#1B0609]/85 backdrop-blur-sm flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="critical-vital-countdown-title"
        >
          <div className="w-full max-w-lg rounded-3xl bg-[#1A0D2E] border-2 border-[#E5484D] text-white p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-7 h-7 text-[#FF6B6B] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#FF8A8E]">
                    Critical Smartwatch Vital Detected
                  </p>
                  <h3 id="critical-vital-countdown-title" className="text-xl font-bold mt-0.5">
                    Auto-Escalating in{' '}
                    <span className="font-mono tabular-nums text-[#FFB585]">
                      {countdownModal.secondsLeft}s
                    </span>
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCountdownModal(null)}
                aria-label="Cancel alert"
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#E5484D]/18 border border-[#E5484D]/45 p-4 space-y-1.5 text-xs">
              {countdownModal.reasons.map((reason) => (
                <p key={reason} className="font-semibold text-[#FFD6D8]">
                  • {reason}
                </p>
              ))}
              {topHospital && (
                <p className="text-[#F5E0E1] pt-1">
                  Nearest 24/7 Hospital: <strong>{topHospital.facility.name}</strong>
                  {topHospital.distanceKm != null
                    ? ` (${topHospital.distanceKm.toFixed(1)} km via GPS)`
                    : ''}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCountdownModal(null)}
                className="w-full py-3 min-h-[48px] rounded-xl bg-white text-[#0F0E47] text-sm font-bold cursor-pointer"
              >
                I&apos;m Safe — Cancel Alert
              </button>
              <a
                href={`tel:${emergencyNumber}`}
                onClick={() => {
                  triggerCriticalWearableAlert(countdownModal.reading, countdownModal.reasons);
                  setCountdownModal(null);
                  navigate('/emergency');
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-3 min-h-[48px] rounded-xl bg-[#E5484D] hover:bg-[#C9363B] text-white text-sm font-bold"
              >
                <PhoneCall className="w-4 h-4" />
                Call {emergencyNumber} &amp; Open SOS
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
