import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  HeartPulse,
  Pause,
  Play,
  RotateCcw,
  Save,
  Watch,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { DEFAULT_WEARABLE_THRESHOLDS } from '../../services/wearableEngine';

export type WatchSimulationModeId = 'resting' | 'brisk_walk' | 'cardio' | 'stress_alert';

export interface WatchSimulationMode {
  id: WatchSimulationModeId;
  label: string;
  deviceLabel: string;
  targetBpm: number;
  variance: number;
  spo2Base: number;
  summary: string;
}

export interface LiveHeartRateSample {
  seq: number;
  elapsedSec: number;
  timeLabel: string;
  bpm: number;
  spo2: number;
  zone: string;
}

export const SIMULATED_WATCH_MODES: WatchSimulationMode[] = [
  {
    id: 'resting',
    label: 'Resting Baseline',
    deviceLabel: 'Apple Watch Series 9 (Simulated)',
    targetBpm: 72,
    variance: 4,
    spo2Base: 98,
    summary: 'Calm seated sinus rhythm (~68–76 bpm)',
  },
  {
    id: 'brisk_walk',
    label: 'Brisk Walk',
    deviceLabel: 'Garmin Venu 3 (Simulated)',
    targetBpm: 108,
    variance: 6,
    spo2Base: 97,
    summary: 'Moderate aerobic activity (~102–115 bpm)',
  },
  {
    id: 'cardio',
    label: 'Cardio Run',
    deviceLabel: 'Galaxy Watch 6 (Simulated)',
    targetBpm: 138,
    variance: 7,
    spo2Base: 96,
    summary: 'Vigorous aerobic interval (~130–146 bpm)',
  },
  {
    id: 'stress_alert',
    label: 'High HR Alert',
    deviceLabel: 'HealthConnect Watch Sim (Alert)',
    targetBpm: 164,
    variance: 6,
    spo2Base: 94,
    summary: 'Simulates tachycardia exceeding alert ceiling',
  },
];

export function classifyHeartRateZone(
  bpm: number,
  minBound = 45,
  maxBound = 155
): { label: string; toneClass: string; isCritical: boolean } {
  if (bpm >= maxBound) {
    return { label: 'Critical High', toneClass: 'text-[#B91C1C]', isCritical: true };
  }
  if (bpm <= minBound) {
    return { label: 'Critical Low', toneClass: 'text-[#B91C1C]', isCritical: true };
  }
  if (bpm >= 125) {
    return { label: 'Vigorous Cardio', toneClass: 'text-[#C2410C]', isCritical: false };
  }
  if (bpm >= 100) {
    return { label: 'Active Zone', toneClass: 'text-[#B45309]', isCritical: false };
  }
  if (bpm >= 60) {
    return { label: 'Resting Normal', toneClass: 'text-[#15803D]', isCritical: false };
  }
  return { label: 'Athletic / Low Normal', toneClass: 'text-[#0F766E]', isCritical: false };
}

export function generateNextHeartRateSample(
  previousBpm: number | null,
  mode: WatchSimulationMode,
  seq: number,
  minBound = 45,
  maxBound = 155,
  nowDate = new Date()
): LiveHeartRateSample {
  const wave = Math.sin(seq * 0.65) * (mode.variance * 0.65);
  const jitter = (Math.random() - 0.5) * mode.variance * 1.1;
  const anchor = previousBpm === null ? mode.targetBpm : previousBpm * 0.55 + mode.targetBpm * 0.45;
  const rawBpm = Math.round(anchor + wave + jitter);
  const bpm = Math.max(38, Math.min(205, rawBpm));
  const spo2 = Math.max(
    88,
    Math.min(100, Math.round(mode.spo2Base + (Math.random() - 0.5) * 1.4))
  );
  const timeLabel = nowDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const zoneInfo = classifyHeartRateZone(bpm, minBound, maxBound);

  return {
    seq,
    elapsedSec: seq,
    timeLabel,
    bpm,
    spo2,
    zone: zoneInfo.label,
  };
}

function formatElapsed(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

interface TooltipPayloadItem {
  payload?: LiveHeartRateSample;
}

function HeartRateLiveTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<TooltipPayloadItem>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const sample = payload[0]?.payload;
  if (!sample) return null;

  return (
    <div className="rounded-xl bg-[#0F0E47] border border-white/15 shadow-lg px-3.5 py-2.5 text-xs text-white">
      <p className="font-mono text-[11px] text-[#C7C8E6] tabular-nums pb-1.5 mb-1.5 border-b border-white/10">
        {sample.timeLabel} · {formatElapsed(sample.elapsedSec)}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#C7C8E6]">Heart Rate</span>
          <span className="font-bold text-[#FFB585] font-mono tabular-nums">{sample.bpm} bpm</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#C7C8E6]">SpO2 Est.</span>
          <span className="font-semibold text-[#4FD1C5] font-mono tabular-nums">
            {sample.spo2}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#C7C8E6]">Zone</span>
          <span className="font-semibold text-white">{sample.zone}</span>
        </div>
      </div>
    </div>
  );
}

const MAX_WINDOW_POINTS = 30;

export function SimulatedWatchHeartRateChart() {
  const {
    familyProfiles,
    activeProfileId,
    addWearableReading,
    navigate,
  } = useApp();

  const wearableThresholds = DEFAULT_WEARABLE_THRESHOLDS;

  const activeProfile =
    familyProfiles.find((p) => p.id === activeProfileId) || familyProfiles[0] || null;

  const [modeId, setModeId] = useState<WatchSimulationModeId>('resting');
  const [isRunning, setIsRunning] = useState(false);
  const [samples, setSamples] = useState<LiveHeartRateSample[]>([]);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotNotice, setSnapshotNotice] = useState<string | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const seqRef = useRef(0);
  const lastBpmRef = useRef<number | null>(null);

  const activeMode = useMemo(
    () => SIMULATED_WATCH_MODES.find((m) => m.id === modeId) || SIMULATED_WATCH_MODES[0],
    [modeId]
  );

  useEffect(() => {
    if (!isRunning) return;

    const pushTick = () => {
      seqRef.current += 1;
      const next = generateNextHeartRateSample(
        lastBpmRef.current,
        activeMode,
        seqRef.current,
        wearableThresholds.minHeartRateBpm,
        wearableThresholds.maxHeartRateBpm
      );
      lastBpmRef.current = next.bpm;
      setSamples((prev) => {
        const updated = [...prev, next];
        return updated.length > MAX_WINDOW_POINTS
          ? updated.slice(updated.length - MAX_WINDOW_POINTS)
          : updated;
      });
    };

    const timer = window.setInterval(pushTick, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, activeMode, wearableThresholds.minHeartRateBpm, wearableThresholds.maxHeartRateBpm]);

  const handleStartOrResume = () => {
    setSnapshotNotice(null);
    setSnapshotError(null);
    if (samples.length === 0) {
      // Seed 6 initial baseline ticks immediately so the Recharts area curve appears right away
      const now = Date.now();
      const seeded: LiveHeartRateSample[] = [];
      let prevBpm: number | null = null;
      for (let i = 5; i >= 0; i -= 1) {
        seqRef.current += 1;
        const pt = generateNextHeartRateSample(
          prevBpm,
          activeMode,
          seqRef.current,
          wearableThresholds.minHeartRateBpm,
          wearableThresholds.maxHeartRateBpm,
          new Date(now - i * 1000)
        );
        prevBpm = pt.bpm;
        seeded.push(pt);
      }
      lastBpmRef.current = prevBpm;
      setSamples(seeded);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    seqRef.current = 0;
    lastBpmRef.current = null;
    setSamples([]);
    setSnapshotNotice(null);
    setSnapshotError(null);
  };

  const latest = samples[samples.length - 1] ?? null;

  const stats = useMemo(() => {
    if (samples.length === 0) {
      return { avg: null, min: null, max: null, elapsedSec: 0 };
    }
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    for (const s of samples) {
      sum += s.bpm;
      if (s.bpm < min) min = s.bpm;
      if (s.bpm > max) max = s.bpm;
    }
    return {
      avg: Math.round(sum / samples.length),
      min,
      max,
      elapsedSec: samples[samples.length - 1].elapsedSec,
    };
  }, [samples]);

  const currentZone = latest
    ? classifyHeartRateZone(
        latest.bpm,
        wearableThresholds.minHeartRateBpm,
        wearableThresholds.maxHeartRateBpm
      )
    : null;

  const strokeColor = currentZone?.isCritical ? '#E5484D' : '#E8702A';

  const handleSaveSnapshot = async () => {
    if (!latest) return;
    setSavingSnapshot(true);
    setSnapshotNotice(null);
    setSnapshotError(null);
    try {
      await addWearableReading({
        profileId: activeProfile?.id || 'default',
        source: 'simulator',
        deviceName: activeMode.deviceLabel,
        heartRateBpm: latest.bpm,
        spo2Percent: latest.spo2,
        recordedAt: new Date().toISOString(),
        criticalAlertTriggered: currentZone?.isCritical || false,
        alertReason: currentZone?.isCritical
          ? `Simulated Watch Session exceeded HR threshold (${latest.bpm} bpm)`
          : undefined,
      });
      setSnapshotNotice(
        `Saved ${latest.bpm} bpm (${activeMode.label}) snapshot to ${activeProfile?.fullName || 'member'} watch history.`
      );
    } catch (err) {
      setSnapshotError(
        err instanceof Error ? err.message : 'Unable to save simulated watch snapshot.'
      );
    } finally {
      setSavingSnapshot(false);
    }
  };

  return (
    <section
      aria-label="Real-time simulated watch heart rate monitor"
      className="rounded-2xl bg-white border border-[#272757]/10 p-5 sm:p-6 space-y-5"
    >
      {/* Header & Session Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#505081] flex items-center gap-2">
            <Watch className="w-3.5 h-3.5 text-[#E8702A]" />
            <span>
              Simulated Watch Telemetry · {activeProfile?.fullName || 'Active Member'}
            </span>
            {isRunning && (
              <span className="inline-flex items-center gap-1.5 text-[#15803D] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" aria-hidden="true" />
                Live 1s Stream
              </span>
            )}
          </p>
          <h2 className="text-xl font-bold text-[#0F0E47] mt-0.5">
            Real-Time Heart Rate Stream (Simulated Watch Session)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!isRunning ? (
            <button
              type="button"
              onClick={handleStartOrResume}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold cursor-pointer"
            >
              <Play className="w-4 h-4" />
              {samples.length > 0 ? 'Resume Watch Session' : 'Start Simulated Watch Session'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold cursor-pointer"
            >
              <Pause className="w-4 h-4" />
              Pause Session
            </button>
          )}

          <button
            type="button"
            disabled={!latest || savingSnapshot}
            onClick={() => void handleSaveSnapshot()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl bg-[#F5F6FC] hover:bg-[#E8EAF6] border border-[#272757]/15 text-[#0F0E47] text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {savingSnapshot ? 'Saving...' : 'Save Snapshot'}
          </button>

          <button
            type="button"
            disabled={samples.length === 0 && !isRunning}
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl bg-white hover:bg-[#F5F6FC] border border-[#272757]/15 text-[#505081] text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Activity Profile Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Simulated watch activity profile"
          className="inline-flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#F5F6FC] border border-[#272757]/10"
        >
          {SIMULATED_WATCH_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModeId(m.id)}
              className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                modeId === m.id
                  ? m.id === 'stress_alert'
                    ? 'bg-[#E5484D] text-white'
                    : 'bg-[#272757] text-white'
                  : 'text-[#505081] hover:text-[#0F0E47]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#505081]">{activeMode.summary}</p>
      </div>

      {/* Critical Alert Banner when simulated BPM breaches configured thresholds */}
      {currentZone?.isCritical && latest && (
        <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/35 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#9C2327]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#E5484D] shrink-0 mt-0.5" />
            <span>
              <strong>Threshold Breached ({latest.bpm} bpm):</strong> Exceeds your configured watch ceiling ({wearableThresholds.maxHeartRateBpm} bpm) or floor ({wearableThresholds.minHeartRateBpm} bpm). Save snapshot or review Emergency protocols.
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/emergency')}
            className="px-3 py-1.5 rounded-lg bg-[#E5484D] text-white font-semibold shrink-0 cursor-pointer"
          >
            Open Emergency Centre
          </button>
        </div>
      )}

      {snapshotNotice && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
          {snapshotNotice}
        </div>
      )}
      {snapshotError && (
        <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-3 text-xs text-[#9C2327]">
          {snapshotError}
        </div>
      )}

      {/* Flat Hairline KPI Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 py-3.5 border-y border-[#272757]/10">
        <div>
          <p className="text-xs text-[#505081] flex items-center gap-1">
            <HeartPulse className="w-3.5 h-3.5 text-[#E8702A]" />
            Live Heart Rate
          </p>
          <p className="text-2xl font-bold text-[#0F0E47] font-mono tabular-nums mt-0.5">
            {latest ? latest.bpm : '—'}
            <span className="text-xs font-sans font-normal text-[#505081] ml-1">bpm</span>
          </p>
          <p className={`text-xs font-semibold mt-0.5 ${currentZone?.toneClass ?? 'text-[#505081]'}`}>
            {currentZone ? currentZone.label : 'Session standby'}
          </p>
        </div>

        <div>
          <p className="text-xs text-[#505081]">Session Average</p>
          <p className="text-2xl font-bold text-[#0F0E47] font-mono tabular-nums mt-0.5">
            {stats.avg ?? '—'}
            <span className="text-xs font-sans font-normal text-[#505081] ml-1">bpm</span>
          </p>
          <p className="text-xs text-[#505081] tabular-nums mt-0.5">
            Rolling {samples.length}/{MAX_WINDOW_POINTS}s window
          </p>
        </div>

        <div>
          <p className="text-xs text-[#505081]">Session Min / Max</p>
          <p className="text-2xl font-bold text-[#0F0E47] font-mono tabular-nums mt-0.5">
            {stats.min !== null && stats.max !== null ? `${stats.min}–${stats.max}` : '—'}
          </p>
          <p className="text-xs text-[#505081] tabular-nums mt-0.5">
            Alert ceiling {wearableThresholds.maxHeartRateBpm} bpm
          </p>
        </div>

        <div>
          <p className="text-xs text-[#505081]">Estimated SpO2</p>
          <p className="text-2xl font-bold text-[#0F0E47] font-mono tabular-nums mt-0.5">
            {latest ? `${latest.spo2}%` : '—'}
          </p>
          <p className="text-xs text-[#505081] mt-0.5">Target ≥ {wearableThresholds.minSpo2Percent}%</p>
        </div>

        <div>
          <p className="text-xs text-[#505081]">Elapsed Duration</p>
          <p className="text-2xl font-bold text-[#0F0E47] font-mono tabular-nums mt-0.5">
            {formatElapsed(stats.elapsedSec)}
          </p>
          <p className="text-xs text-[#505081] mt-0.5 truncate">{activeMode.deviceLabel}</p>
        </div>
      </div>

      {/* Real-Time Recharts AreaChart Viewport */}
      {samples.length === 0 ? (
        <div className="h-[280px] rounded-xl bg-[#F5F6FC] border border-dashed border-[#272757]/20 flex flex-col items-center justify-center text-center px-6 gap-3">
          <Activity className="w-7 h-7 text-[#272757]" />
          <div>
            <p className="text-sm font-bold text-[#0F0E47]">
              Ready to Stream Simulated Watch Heart Rate
            </p>
            <p className="text-xs text-[#505081] max-w-md mt-1">
              Select an activity intensity above and click <strong>Start Simulated Watch Session</strong> to plot live 1-second heart rate telemetry with clinical alert thresholds.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartOrResume}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold cursor-pointer"
          >
            <Play className="w-4 h-4" />
            Start Simulated Watch Session
          </button>
        </div>
      ) : (
        <div className="w-full h-[290px] min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={samples} margin={{ top: 14, right: 18, left: 0, bottom: 6 }}>
              <defs>
                <linearGradient id="liveHrFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" stroke="#8686AC" strokeOpacity={0.24} />
              <XAxis
                dataKey="timeLabel"
                tick={{ fontSize: 10, fill: '#505081', fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={false}
                axisLine={{ stroke: '#272757', strokeOpacity: 0.16 }}
                minTickGap={22}
              />
              <YAxis
                domain={[40, 190]}
                tick={{ fontSize: 11, fill: '#505081', fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip content={<HeartRateLiveTooltip />} />

              {/* Adult resting normal shaded band */}
              <ReferenceArea y1={60} y2={100} fill="#16A34A" fillOpacity={0.06} />

              {/* High alert threshold */}
              <ReferenceLine
                y={wearableThresholds.maxHeartRateBpm}
                stroke="#DC2626"
                strokeDasharray="4 4"
                strokeOpacity={0.65}
                label={{
                  value: `${wearableThresholds.maxHeartRateBpm} bpm Alert`,
                  position: 'insideTopRight',
                  fill: '#B91C1C',
                  fontSize: 10,
                }}
              />

              {/* Low alert threshold */}
              <ReferenceLine
                y={wearableThresholds.minHeartRateBpm}
                stroke="#272757"
                strokeDasharray="4 4"
                strokeOpacity={0.45}
                label={{
                  value: `${wearableThresholds.minHeartRateBpm} bpm Low`,
                  position: 'insideBottomRight',
                  fill: '#505081',
                  fontSize: 10,
                }}
              />

              <Area
                type="monotone"
                dataKey="bpm"
                name="Heart Rate (bpm)"
                stroke={strokeColor}
                strokeWidth={2.5}
                fill="url(#liveHrFill)"
                dot={{ r: 3, fill: strokeColor, stroke: '#FFFFFF', strokeWidth: 1.5 }}
                activeDot={{ r: 5.5, fill: strokeColor, stroke: '#FFFFFF', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#505081]">
        <span>
          Shaded green band: 60–100 bpm adult resting range · Switch activity mode live without restarting
        </span>
        <span className="font-mono tabular-nums">
          Sample rate: 1 Hz · Educational watch simulation
        </span>
      </div>
    </section>
  );
}
