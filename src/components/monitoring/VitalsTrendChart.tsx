import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BloodPressureReading, GlucoseReading } from '../../types/healthcare';

type VitalViewMode = 'all' | 'bp' | 'glucose' | 'pulse';
type TimeRangeKey = '7d' | '30d' | '90d' | 'all';

interface VitalPoint {
  key: string;
  timestamp: number;
  recordedAt: string;
  axisLabel: string;
  fullLabel: string;
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  glucose?: number;
  glucoseContext?: GlucoseReading['context'];
  bpDevice?: string;
  bpNote?: string;
  glucoseDevice?: string;
  glucoseNote?: string;
}

interface CustomTooltipPayloadItem {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: VitalPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<CustomTooltipPayloadItem>;
}

function parseRecordedAt(recordedAt: string): number {
  const parsed = Date.parse(recordedAt);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatShortDate(recordedAt: string, includeTime = false): string {
  const ms = parseRecordedAt(recordedAt);
  if (!ms) return recordedAt.slice(5, 10);
  const d = new Date(ms);
  const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (!includeTime) return datePart;
  const timePart = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${datePart} ${timePart}`;
}

function formatFullDateTime(recordedAt: string): string {
  const ms = parseRecordedAt(recordedAt);
  if (!ms) return recordedAt.replace('T', ' ');
  const d = new Date(ms);
  const datePart = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${datePart} · ${timePart}`;
}

function classifyBp(systolic: number, diastolic: number): { label: string; className: string } {
  if (systolic >= 140 || diastolic >= 90) {
    return { label: 'High (Stage 2)', className: 'text-[#B91C1C]' };
  }
  if (systolic >= 130 || diastolic >= 80) {
    return { label: 'Elevated / Stage 1', className: 'text-[#B45309]' };
  }
  if (systolic >= 120 && diastolic < 80) {
    return { label: 'Slightly Elevated', className: 'text-[#B45309]' };
  }
  return { label: 'Normal Range', className: 'text-[#15803D]' };
}

function classifyGlucose(
  valueMgDl: number,
  context?: GlucoseReading['context']
): { label: string; className: string } {
  if (valueMgDl < 70) {
    return { label: 'Low (<70)', className: 'text-[#B91C1C]' };
  }
  if (context === 'Fasting') {
    if (valueMgDl <= 100) return { label: 'Target Fasting', className: 'text-[#15803D]' };
    if (valueMgDl <= 125) return { label: 'Borderline', className: 'text-[#B45309]' };
    return { label: 'Elevated', className: 'text-[#B91C1C]' };
  }
  if (valueMgDl <= 140) return { label: 'In Range', className: 'text-[#15803D]' };
  if (valueMgDl <= 180) return { label: 'Moderate Post-Meal', className: 'text-[#B45309]' };
  return { label: 'High (>180)', className: 'text-[#B91C1C]' };
}

function VitalsTooltipContent({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-xl bg-white border border-[#272757]/15 shadow-md px-3.5 py-3 text-xs text-[#0F0E47] max-w-[260px]">
      <p className="font-mono text-[11px] text-[#505081] tabular-nums pb-2 mb-2 border-b border-[#272757]/10">
        {point.fullLabel}
      </p>
      <div className="space-y-1.5">
        {point.systolic !== undefined && point.diastolic !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#505081]">Blood Pressure</span>
            <span className="font-semibold tabular-nums">
              {point.systolic}/{point.diastolic} mmHg
            </span>
          </div>
        )}
        {point.pulse !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#505081]">Pulse Rate</span>
            <span className="font-semibold text-[#0F766E] tabular-nums">{point.pulse} bpm</span>
          </div>
        )}
        {point.glucose !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#505081]">
              Glucose{point.glucoseContext ? ` (${point.glucoseContext})` : ''}
            </span>
            <span className="font-semibold text-[#505081] tabular-nums">
              {point.glucose} mg/dL
            </span>
          </div>
        )}
      </div>

      {(point.bpNote || point.glucoseNote || point.bpDevice || point.glucoseDevice) && (
        <div className="mt-2 pt-2 border-t border-[#272757]/10 space-y-1 text-[11px] text-[#505081]">
          {point.bpDevice && <p className="truncate">Cuff: {point.bpDevice}</p>}
          {point.bpNote && <p className="leading-snug">{point.bpNote}</p>}
          {point.glucoseDevice && <p className="truncate">Meter: {point.glucoseDevice}</p>}
          {point.glucoseNote && <p className="leading-snug">{point.glucoseNote}</p>}
        </div>
      )}
    </div>
  );
}

interface VitalsTrendChartProps {
  profileName: string;
  bpReadings: BloodPressureReading[];
  glucoseReadings: GlucoseReading[];
  onLogVitalsClick?: () => void;
}

const VIEW_TABS: Array<{ id: VitalViewMode; label: string }> = [
  { id: 'all', label: 'All Vitals' },
  { id: 'bp', label: 'Blood Pressure' },
  { id: 'glucose', label: 'Blood Glucose' },
  { id: 'pulse', label: 'Heart Rate' },
];

const RANGE_OPTIONS: Array<{ id: TimeRangeKey; label: string; days: number | null }> = [
  { id: '7d', label: '7D', days: 7 },
  { id: '30d', label: '30D', days: 30 },
  { id: '90d', label: '90D', days: 90 },
  { id: 'all', label: 'All', days: null },
];

export function VitalsTrendChart({
  profileName,
  bpReadings,
  glucoseReadings,
  onLogVitalsClick,
}: VitalsTrendChartProps) {
  const [viewMode, setViewMode] = useState<VitalViewMode>('all');
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('all');
  const [visibleSeries, setVisibleSeries] = useState({
    systolic: true,
    diastolic: true,
    pulse: true,
    glucose: true,
  });

  const sortedBp = useMemo(
    () => [...bpReadings].sort((a, b) => parseRecordedAt(a.recordedAt) - parseRecordedAt(b.recordedAt)),
    [bpReadings]
  );

  const sortedGlu = useMemo(
    () =>
      [...glucoseReadings].sort(
        (a, b) => parseRecordedAt(a.recordedAt) - parseRecordedAt(b.recordedAt)
      ),
    [glucoseReadings]
  );

  const allMergedPoints = useMemo<VitalPoint[]>(() => {
    const byKey = new Map<string, VitalPoint>();

    for (const bp of sortedBp) {
      const ts = parseRecordedAt(bp.recordedAt);
      const mapKey = `${ts}-${bp.recordedAt}`;
      const existing = byKey.get(mapKey);
      if (existing) {
        existing.systolic = bp.systolic;
        existing.diastolic = bp.diastolic;
        existing.pulse = bp.pulse;
        existing.bpDevice = bp.deviceType;
        existing.bpNote = bp.note;
      } else {
        byKey.set(mapKey, {
          key: mapKey,
          timestamp: ts,
          recordedAt: bp.recordedAt,
          axisLabel: formatShortDate(bp.recordedAt),
          fullLabel: formatFullDateTime(bp.recordedAt),
          systolic: bp.systolic,
          diastolic: bp.diastolic,
          pulse: bp.pulse,
          bpDevice: bp.deviceType,
          bpNote: bp.note,
        });
      }
    }

    for (const glu of sortedGlu) {
      const ts = parseRecordedAt(glu.recordedAt);
      const mapKey = `${ts}-${glu.recordedAt}`;
      const existing = byKey.get(mapKey);
      if (existing) {
        existing.glucose = glu.valueMgDl;
        existing.glucoseContext = glu.context;
        existing.glucoseDevice = glu.deviceType;
        existing.glucoseNote = glu.note;
      } else {
        byKey.set(mapKey, {
          key: mapKey,
          timestamp: ts,
          recordedAt: glu.recordedAt,
          axisLabel: formatShortDate(glu.recordedAt),
          fullLabel: formatFullDateTime(glu.recordedAt),
          glucose: glu.valueMgDl,
          glucoseContext: glu.context,
          glucoseDevice: glu.deviceType,
          glucoseNote: glu.note,
        });
      }
    }

    const sorted = Array.from(byKey.values()).sort((a, b) => a.timestamp - b.timestamp);

    // Disambiguate axis labels when multiple readings fall on the same calendar day
    const dayCounts = new Map<string, number>();
    for (const pt of sorted) {
      dayCounts.set(pt.axisLabel, (dayCounts.get(pt.axisLabel) ?? 0) + 1);
    }
    return sorted.map((pt) =>
      (dayCounts.get(pt.axisLabel) ?? 0) > 1
        ? { ...pt, axisLabel: formatShortDate(pt.recordedAt, true) }
        : pt
    );
  }, [sortedBp, sortedGlu]);

  const filteredPoints = useMemo(() => {
    const modeFiltered = allMergedPoints.filter((pt) => {
      if (viewMode === 'bp') return pt.systolic !== undefined || pt.diastolic !== undefined;
      if (viewMode === 'glucose') return pt.glucose !== undefined;
      if (viewMode === 'pulse') return pt.pulse !== undefined;
      return true;
    });

    const selectedRange = RANGE_OPTIONS.find((r) => r.id === timeRange);
    if (!selectedRange || selectedRange.days === null || modeFiltered.length === 0) {
      return modeFiltered;
    }

    const latestTs = Math.max(
      Date.now(),
      modeFiltered[modeFiltered.length - 1]?.timestamp ?? Date.now()
    );
    const cutoff = latestTs - selectedRange.days * 24 * 60 * 60 * 1000;
    return modeFiltered.filter((pt) => pt.timestamp >= cutoff);
  }, [allMergedPoints, viewMode, timeRange]);

  const latestBp = sortedBp[sortedBp.length - 1] ?? null;
  const latestGlu = sortedGlu[sortedGlu.length - 1] ?? null;
  const avgPulse = useMemo(() => {
    if (sortedBp.length === 0) return null;
    return Math.round(sortedBp.reduce((acc, r) => acc + r.pulse, 0) / sortedBp.length);
  }, [sortedBp]);

  const bpStatus = latestBp ? classifyBp(latestBp.systolic, latestBp.diastolic) : null;
  const gluStatus = latestGlu ? classifyGlucose(latestGlu.valueMgDl, latestGlu.context) : null;

  const showSystolic = (viewMode === 'all' || viewMode === 'bp') && visibleSeries.systolic;
  const showDiastolic = (viewMode === 'all' || viewMode === 'bp') && visibleSeries.diastolic;
  const showPulse =
    (viewMode === 'pulse' || (viewMode === 'all' && visibleSeries.pulse)) &&
    (viewMode === 'pulse' || visibleSeries.pulse);
  const showGlucose = (viewMode === 'all' || viewMode === 'glucose') && visibleSeries.glucose;
  const useDualAxis = viewMode === 'all' && showGlucose && (showSystolic || showDiastolic || showPulse);

  const toggleSeries = (key: keyof typeof visibleSeries) => {
    setVisibleSeries((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Prevent turning off all visible series in current view
      const activeInView =
        viewMode === 'bp'
          ? next.systolic || next.diastolic
          : viewMode === 'all'
            ? next.systolic || next.diastolic || next.pulse || next.glucose
            : true;
      return activeInView ? next : prev;
    });
  };

  return (
    <section
      aria-label="Vitals trend line chart"
      className="rounded-2xl bg-white border border-[#272757]/10 p-5 sm:p-6 space-y-5"
    >
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-[#505081]">
            {profileName} · Longitudinal Vitals Overview
          </p>
          <h2 className="text-xl font-bold text-[#0F0E47] mt-0.5">
            Vitals Trend Over Time
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Metric view switcher */}
          <div
            role="tablist"
            aria-label="Select vital metric"
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F5F6FC] border border-[#272757]/10 overflow-x-auto"
          >
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={viewMode === tab.id}
                onClick={() => setViewMode(tab.id)}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === tab.id
                    ? 'bg-[#272757] text-white'
                    : 'text-[#505081] hover:text-[#0F0E47]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Timeframe filter */}
          <div
            role="group"
            aria-label="Select date range"
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F5F6FC] border border-[#272757]/10"
          >
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTimeRange(opt.id)}
                className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  timeRange === opt.id
                    ? 'bg-white text-[#0F0E47] shadow-xs border border-[#272757]/15'
                    : 'text-[#505081] hover:text-[#0F0E47]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Summary Strip (flat hairline dividers, tabular figures) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-3.5 border-y border-[#272757]/10">
        <div>
          <p className="text-xs text-[#505081]">Latest Blood Pressure</p>
          <p className="text-xl font-bold text-[#0F0E47] tabular-nums mt-0.5">
            {latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : '—'}
            <span className="text-xs font-normal text-[#505081] ml-1">mmHg</span>
          </p>
          <p className={`text-xs font-medium mt-0.5 ${bpStatus?.className ?? 'text-[#505081]'}`}>
            {bpStatus ? bpStatus.label : 'No readings yet'}
          </p>
        </div>

        <div>
          <p className="text-xs text-[#505081]">Latest Blood Glucose</p>
          <p className="text-xl font-bold text-[#0F0E47] tabular-nums mt-0.5">
            {latestGlu ? latestGlu.valueMgDl : '—'}
            <span className="text-xs font-normal text-[#505081] ml-1">mg/dL</span>
          </p>
          <p className={`text-xs font-medium mt-0.5 ${gluStatus?.className ?? 'text-[#505081]'}`}>
            {latestGlu && gluStatus
              ? `${gluStatus.label} · ${latestGlu.context}`
              : 'No readings yet'}
          </p>
        </div>

        <div>
          <p className="text-xs text-[#505081]">Latest Resting Pulse</p>
          <p className="text-xl font-bold text-[#0F0E47] tabular-nums mt-0.5">
            {latestBp ? latestBp.pulse : '—'}
            <span className="text-xs font-normal text-[#505081] ml-1">bpm</span>
          </p>
          <p className="text-xs text-[#505081] tabular-nums mt-0.5">
            {avgPulse !== null ? `Average ${avgPulse} bpm` : 'Logged alongside BP'}
          </p>
        </div>

        <div>
          <p className="text-xs text-[#505081]">Plotted Entries</p>
          <p className="text-xl font-bold text-[#0F0E47] tabular-nums mt-0.5">
            {filteredPoints.length}
            <span className="text-xs font-normal text-[#505081] ml-1">
              {filteredPoints.length === 1 ? 'timestamp' : 'timestamps'}
            </span>
          </p>
          <p className="text-xs text-[#505081] tabular-nums mt-0.5">
            {sortedBp.length} BP · {sortedGlu.length} Glucose total
          </p>
        </div>
      </div>

      {/* Interactive Series Legend */}
      {(viewMode === 'all' || viewMode === 'bp') && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(viewMode === 'all' || viewMode === 'bp') && (
              <>
                <button
                  type="button"
                  onClick={() => toggleSeries('systolic')}
                  aria-pressed={visibleSeries.systolic}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    visibleSeries.systolic
                      ? 'border-[#272757]/25 bg-[#F5F6FC] text-[#0F0E47]'
                      : 'border-[#272757]/10 bg-white text-[#8686AC] line-through'
                  }`}
                >
                  <span className="w-3 h-0.5 bg-[#272757] inline-block" aria-hidden="true" />
                  Systolic (mmHg)
                </button>
                <button
                  type="button"
                  onClick={() => toggleSeries('diastolic')}
                  aria-pressed={visibleSeries.diastolic}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    visibleSeries.diastolic
                      ? 'border-[#E8702A]/30 bg-[#FFF7F2] text-[#0F0E47]'
                      : 'border-[#272757]/10 bg-white text-[#8686AC] line-through'
                  }`}
                >
                  <span className="w-3 h-0.5 bg-[#E8702A] inline-block" aria-hidden="true" />
                  Diastolic (mmHg)
                </button>
              </>
            )}

            {viewMode === 'all' && (
              <>
                <button
                  type="button"
                  onClick={() => toggleSeries('glucose')}
                  aria-pressed={visibleSeries.glucose}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    visibleSeries.glucose
                      ? 'border-[#505081]/30 bg-[#F5F6FC] text-[#0F0E47]'
                      : 'border-[#272757]/10 bg-white text-[#8686AC] line-through'
                  }`}
                >
                  <span className="w-3 h-0.5 bg-[#505081] inline-block" aria-hidden="true" />
                  Glucose (mg/dL)
                </button>
                <button
                  type="button"
                  onClick={() => toggleSeries('pulse')}
                  aria-pressed={visibleSeries.pulse}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    visibleSeries.pulse
                      ? 'border-[#0D9488]/30 bg-[#F0FDFA] text-[#0F0E47]'
                      : 'border-[#272757]/10 bg-white text-[#8686AC] line-through'
                  }`}
                >
                  <span className="w-3 h-0.5 bg-[#0D9488] inline-block" aria-hidden="true" />
                  Pulse (bpm)
                </button>
              </>
            )}
          </div>

          <p className="text-xs text-[#505081]">
            Click any series to toggle visibility · Hover points for device &amp; clinical notes
          </p>
        </div>
      )}

      {/* Main Recharts LineChart Viewport */}
      {filteredPoints.length === 0 ? (
        <div className="h-[300px] rounded-xl bg-[#F5F6FC] border border-dashed border-[#272757]/20 flex flex-col items-center justify-center text-center px-6 gap-3">
          <p className="text-sm font-semibold text-[#0F0E47]">
            No vitals logged for this view yet
          </p>
          <p className="text-xs text-[#505081] max-w-md">
            {timeRange !== 'all' && allMergedPoints.length > 0
              ? 'No readings fall inside the selected date window. Expand the range to All to inspect earlier records.'
              : `Record a blood pressure or blood glucose measurement for ${profileName} below to generate your interactive trend line.`}
          </p>
          <div className="flex items-center gap-2">
            {timeRange !== 'all' && allMergedPoints.length > 0 && (
              <button
                type="button"
                onClick={() => setTimeRange('all')}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-white border border-[#272757]/20 text-xs font-semibold text-[#0F0E47] cursor-pointer"
              >
                Show All Dates
              </button>
            )}
            {onLogVitalsClick && (
              <button
                type="button"
                onClick={onLogVitalsClick}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold cursor-pointer"
              >
                Log First Reading
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full h-[320px] min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart
              data={filteredPoints}
              margin={{ top: 14, right: useDualAxis ? 16 : 20, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 4" stroke="#8686AC" strokeOpacity={0.22} />

              <XAxis
                dataKey="axisLabel"
                tick={{ fontSize: 11, fill: '#505081', fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={false}
                axisLine={{ stroke: '#272757', strokeOpacity: 0.16 }}
                minTickGap={24}
              />

              {/* Left Y-Axis: Blood Pressure / Pulse (or Glucose when in Glucose-only view) */}
              <YAxis
                yAxisId="left"
                domain={
                  viewMode === 'glucose'
                    ? [60, 'dataMax + 20']
                    : viewMode === 'pulse'
                      ? [45, 130]
                      : [50, 'dataMax + 15']
                }
                tick={{ fontSize: 11, fill: '#505081', fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={false}
                axisLine={false}
                width={44}
                unit={viewMode === 'glucose' ? '' : ''}
              />

              {/* Right Y-Axis: Glucose when combined with BP/Pulse */}
              {useDualAxis && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[60, 'dataMax + 20']}
                  tick={{ fontSize: 11, fill: '#505081', fontFamily: 'JetBrains Mono, monospace' }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
              )}

              <Tooltip content={<VitalsTooltipContent />} />

              {/* Clinical Reference Guides */}
              {viewMode === 'bp' && (
                <>
                  <ReferenceArea
                    yAxisId="left"
                    y1={80}
                    y2={120}
                    fill="#16A34A"
                    fillOpacity={0.05}
                  />
                  <ReferenceLine
                    yAxisId="left"
                    y={140}
                    stroke="#DC2626"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                    label={{
                      value: '140 High',
                      position: 'insideTopRight',
                      fill: '#B91C1C',
                      fontSize: 10,
                    }}
                  />
                  <ReferenceLine
                    yAxisId="left"
                    y={120}
                    stroke="#272757"
                    strokeDasharray="4 4"
                    strokeOpacity={0.35}
                    label={{
                      value: '120 Target',
                      position: 'insideTopRight',
                      fill: '#505081',
                      fontSize: 10,
                    }}
                  />
                  <ReferenceLine
                    yAxisId="left"
                    y={80}
                    stroke="#E8702A"
                    strokeDasharray="4 4"
                    strokeOpacity={0.35}
                  />
                </>
              )}

              {viewMode === 'glucose' && (
                <>
                  <ReferenceArea
                    yAxisId="left"
                    y1={70}
                    y2={140}
                    fill="#16A34A"
                    fillOpacity={0.05}
                  />
                  <ReferenceLine
                    yAxisId="left"
                    y={180}
                    stroke="#DC2626"
                    strokeDasharray="4 4"
                    strokeOpacity={0.45}
                    label={{
                      value: '180 High',
                      position: 'insideTopRight',
                      fill: '#B91C1C',
                      fontSize: 10,
                    }}
                  />
                  <ReferenceLine
                    yAxisId="left"
                    y={140}
                    stroke="#D97706"
                    strokeDasharray="4 4"
                    strokeOpacity={0.4}
                    label={{
                      value: '140 Post-Meal',
                      position: 'insideTopRight',
                      fill: '#B45309',
                      fontSize: 10,
                    }}
                  />
                  <ReferenceLine
                    yAxisId="left"
                    y={100}
                    stroke="#16A34A"
                    strokeDasharray="4 4"
                    strokeOpacity={0.4}
                    label={{
                      value: '100 Fasting',
                      position: 'insideTopRight',
                      fill: '#15803D',
                      fontSize: 10,
                    }}
                  />
                  <ReferenceLine
                    yAxisId="left"
                    y={70}
                    stroke="#505081"
                    strokeDasharray="4 4"
                    strokeOpacity={0.35}
                  />
                </>
              )}

              {viewMode === 'pulse' && (
                <>
                  <ReferenceArea
                    yAxisId="left"
                    y1={60}
                    y2={100}
                    fill="#0D9488"
                    fillOpacity={0.06}
                  />
                  <ReferenceLine
                    yAxisId="left"
                    y={100}
                    stroke="#0F766E"
                    strokeDasharray="4 4"
                    strokeOpacity={0.4}
                    label={{
                      value: '100 bpm',
                      position: 'insideTopRight',
                      fill: '#0F766E',
                      fontSize: 10,
                    }}
                  />
                  <ReferenceLine
                    yAxisId="left"
                    y={60}
                    stroke="#0F766E"
                    strokeDasharray="4 4"
                    strokeOpacity={0.4}
                    label={{
                      value: '60 bpm',
                      position: 'insideBottomRight',
                      fill: '#0F766E',
                      fontSize: 10,
                    }}
                  />
                </>
              )}

              {/* Trend Lines */}
              {showSystolic && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="systolic"
                  name="Systolic (mmHg)"
                  stroke="#272757"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#272757', strokeWidth: 2, stroke: '#FFFFFF' }}
                  activeDot={{ r: 6, fill: '#272757', stroke: '#FFFFFF', strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              )}

              {showDiastolic && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="diastolic"
                  name="Diastolic (mmHg)"
                  stroke="#E8702A"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#E8702A', strokeWidth: 2, stroke: '#FFFFFF' }}
                  activeDot={{ r: 6, fill: '#E8702A', stroke: '#FFFFFF', strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              )}

              {showPulse && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="pulse"
                  name="Pulse (bpm)"
                  stroke="#0D9488"
                  strokeWidth={2}
                  strokeDasharray={viewMode === 'all' ? '5 3' : undefined}
                  dot={{ r: 3.5, fill: '#0D9488', strokeWidth: 2, stroke: '#FFFFFF' }}
                  activeDot={{ r: 5.5, fill: '#0D9488', stroke: '#FFFFFF', strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              )}

              {showGlucose && (
                <Line
                  yAxisId={useDualAxis ? 'right' : 'left'}
                  type="monotone"
                  dataKey="glucose"
                  name="Blood Glucose (mg/dL)"
                  stroke="#505081"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0F0E47', strokeWidth: 2, stroke: '#FFFFFF' }}
                  activeDot={{ r: 6, fill: '#0F0E47', stroke: '#FFFFFF', strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Axis Unit Caption */}
      {filteredPoints.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#505081]">
          <span>
            {useDualAxis
              ? 'Left axis: Systolic / Diastolic (mmHg) & Pulse (bpm) · Right axis: Blood Glucose (mg/dL)'
              : viewMode === 'bp'
                ? 'Y-axis: mmHg · Shaded band indicates 80–120 mmHg reference zone'
                : viewMode === 'glucose'
                  ? 'Y-axis: mg/dL · Shaded band indicates 70–140 mg/dL reference zone'
                  : 'Y-axis: beats per minute (bpm) · Shaded band indicates 60–100 bpm adult resting range'}
          </span>
          <span className="font-mono tabular-nums">
            Chronological order (oldest → newest)
          </span>
        </div>
      )}
    </section>
  );
}

export function BpRechartsTrend({ data }: { data: BloodPressureReading[] }) {
  const ordered = useMemo(
    () =>
      [...data]
        .sort((a, b) => parseRecordedAt(a.recordedAt) - parseRecordedAt(b.recordedAt))
        .map((d) => ({
          key: d.id,
          timestamp: parseRecordedAt(d.recordedAt),
          recordedAt: d.recordedAt,
          axisLabel: formatShortDate(d.recordedAt),
          fullLabel: formatFullDateTime(d.recordedAt),
          systolic: d.systolic,
          diastolic: d.diastolic,
          pulse: d.pulse,
          bpDevice: d.deviceType,
          bpNote: d.note,
        })),
    [data]
  );

  if (ordered.length === 0) {
    return (
      <div className="h-48 rounded-xl bg-[#F5F6FC] flex items-center justify-center text-xs text-[#505081]">
        Log your first blood pressure reading to see trends.
      </div>
    );
  }

  return (
    <div className="w-full h-48 min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={ordered} margin={{ top: 10, right: 14, left: -8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 4" stroke="#8686AC" strokeOpacity={0.22} />
          <XAxis
            dataKey="axisLabel"
            tick={{ fontSize: 10, fill: '#505081', fontFamily: 'JetBrains Mono, monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#272757', strokeOpacity: 0.15 }}
          />
          <YAxis
            domain={[55, 'dataMax + 15']}
            tick={{ fontSize: 10, fill: '#505081', fontFamily: 'JetBrains Mono, monospace' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip content={<VitalsTooltipContent />} />
          <ReferenceLine y={140} stroke="#DC2626" strokeDasharray="4 4" strokeOpacity={0.4} />
          <ReferenceLine y={120} stroke="#272757" strokeDasharray="4 4" strokeOpacity={0.3} />
          <ReferenceLine y={80} stroke="#E8702A" strokeDasharray="4 4" strokeOpacity={0.3} />
          <Line
            type="monotone"
            dataKey="systolic"
            name="Systolic"
            stroke="#272757"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#272757', stroke: '#FFFFFF', strokeWidth: 1.5 }}
            activeDot={{ r: 5.5 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="diastolic"
            name="Diastolic"
            stroke="#E8702A"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#E8702A', stroke: '#FFFFFF', strokeWidth: 1.5 }}
            activeDot={{ r: 5.5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GlucoseRechartsTrend({ data }: { data: GlucoseReading[] }) {
  const ordered = useMemo(
    () =>
      [...data]
        .sort((a, b) => parseRecordedAt(a.recordedAt) - parseRecordedAt(b.recordedAt))
        .map((d) => ({
          key: d.id,
          timestamp: parseRecordedAt(d.recordedAt),
          recordedAt: d.recordedAt,
          axisLabel: formatShortDate(d.recordedAt),
          fullLabel: formatFullDateTime(d.recordedAt),
          glucose: d.valueMgDl,
          glucoseContext: d.context,
          glucoseDevice: d.deviceType,
          glucoseNote: d.note,
        })),
    [data]
  );

  if (ordered.length === 0) {
    return (
      <div className="h-48 rounded-xl bg-[#F5F6FC] flex items-center justify-center text-xs text-[#505081]">
        Log your first blood glucose reading to see trends.
      </div>
    );
  }

  return (
    <div className="w-full h-48 min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={ordered} margin={{ top: 10, right: 14, left: -8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 4" stroke="#8686AC" strokeOpacity={0.22} />
          <XAxis
            dataKey="axisLabel"
            tick={{ fontSize: 10, fill: '#505081', fontFamily: 'JetBrains Mono, monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#272757', strokeOpacity: 0.15 }}
          />
          <YAxis
            domain={[60, 'dataMax + 20']}
            tick={{ fontSize: 10, fill: '#505081', fontFamily: 'JetBrains Mono, monospace' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip content={<VitalsTooltipContent />} />
          <ReferenceLine y={180} stroke="#DC2626" strokeDasharray="4 4" strokeOpacity={0.4} />
          <ReferenceLine y={140} stroke="#D97706" strokeDasharray="4 4" strokeOpacity={0.35} />
          <ReferenceLine y={100} stroke="#16A34A" strokeDasharray="4 4" strokeOpacity={0.35} />
          <ReferenceLine y={70} stroke="#505081" strokeDasharray="4 4" strokeOpacity={0.3} />
          <Line
            type="monotone"
            dataKey="glucose"
            name="Glucose"
            stroke="#505081"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#0F0E47', stroke: '#FFFFFF', strokeWidth: 1.5 }}
            activeDot={{ r: 5.5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
