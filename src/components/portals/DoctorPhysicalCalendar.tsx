import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  PlusCircle,
  RefreshCw,
  Search,
  Stethoscope,
  User,
} from 'lucide-react';
import type { Appointment } from '../../types/healthcare';

export interface ParsedTimeWindow {
  start24: string;
  end24: string;
  startLabel: string;
  endLabel: string;
  durationMinutes: number;
  startMinutes: number;
  endMinutes: number;
}

export interface PhysicalDayGroup {
  date: string;
  dayHeading: string;
  shortWeekday: string;
  dayNumber: string;
  shortMonth: string;
  appointments: Appointment[];
}

export interface CalendarMonthCell {
  isoDate: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

export interface CalendarWeekDay {
  isoDate: string;
  shortWeekday: string;
  dayNumber: string;
  shortMonth: string;
  isToday: boolean;
}

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CLINIC_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

export function formatTime24To12(time24: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time24.trim());
  if (!match) return time24;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return time24;
  }
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function toMinutesFrom24(time24: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time24.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function parse12HourTo24(token: string): string | null {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(token.trim());
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const mer = m[3].toUpperCase();
  if (mer === 'PM' && h < 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIsoDateLocal(isoDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function extractAppointmentTimeWindow(apt: Appointment): ParsedTimeWindow {
  let start24 = apt.startTime?.trim() || '';
  let end24 = apt.endTime?.trim() || '';

  if (!start24 || !end24) {
    const raw = (apt.time || '').replace(/\bWAT\b/gi, '').trim();
    const rangeMatch = raw.match(
      /(\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)\s*(?:-|–|—|to|→)\s*(\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)/i
    );
    if (rangeMatch) {
      start24 = parse12HourTo24(rangeMatch[1]) || rangeMatch[1].trim();
      end24 = parse12HourTo24(rangeMatch[2]) || rangeMatch[2].trim();
    } else {
      const single = parse12HourTo24(raw) || (/^\d{1,2}:\d{2}$/.test(raw) ? raw : '09:00');
      start24 = start24 || single;
      const startMins = toMinutesFrom24(start24) ?? 9 * 60;
      const endMins = Math.min(23 * 60 + 45, startMins + 30);
      end24 =
        end24 ||
        `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
    }
  }

  const sMin = toMinutesFrom24(start24) ?? 9 * 60;
  const eMin = toMinutesFrom24(end24) ?? sMin + 30;
  const durationMinutes = eMin > sMin ? eMin - sMin : 30;

  return {
    start24,
    end24,
    startLabel: formatTime24To12(start24),
    endLabel: formatTime24To12(end24),
    durationMinutes,
    startMinutes: sMin,
    endMinutes: eMin > sMin ? eMin : sMin + 30,
  };
}

export function formatIsoDateParts(isoDate: string): {
  dayHeading: string;
  shortWeekday: string;
  dayNumber: string;
  shortMonth: string;
} {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!parts) {
    return {
      dayHeading: isoDate,
      shortWeekday: 'Day',
      dayNumber: isoDate.slice(-2) || '--',
      shortMonth: '',
    };
  }
  const d = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  const dayHeading = d.toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const shortWeekday = d.toLocaleDateString('en-NG', { weekday: 'short' });
  const dayNumber = String(d.getDate()).padStart(2, '0');
  const shortMonth = d.toLocaleDateString('en-NG', { month: 'short' });
  return { dayHeading, shortWeekday, dayNumber, shortMonth };
}

export function buildMonthCalendarCells(
  year: number,
  monthIndex: number,
  todayIso: string = toIsoDateLocal(new Date())
): CalendarMonthCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  // Convert Sunday=0..Saturday=6 into Monday=0..Sunday=6
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, monthIndex, 1 - startOffset);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = startOffset + daysInMonth > 35 ? 42 : 35;

  const cells: CalendarMonthCell[] = [];
  for (let i = 0; i < totalCells; i += 1) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const isoDate = toIsoDateLocal(d);
    cells.push({
      isoDate,
      dayOfMonth: d.getDate(),
      inCurrentMonth: d.getMonth() === monthIndex && d.getFullYear() === year,
      isToday: isoDate === todayIso,
    });
  }
  return cells;
}

export function buildWeekCalendarDays(
  anchorIsoDate: string,
  todayIso: string = toIsoDateLocal(new Date())
): CalendarWeekDay[] {
  const anchor = parseIsoDateLocal(anchorIsoDate);
  const offsetToMonday = (anchor.getDay() + 6) % 7;
  const monday = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() - offsetToMonday
  );

  const days: CalendarWeekDay[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const isoDate = toIsoDateLocal(d);
    const parts = formatIsoDateParts(isoDate);
    days.push({
      isoDate,
      shortWeekday: parts.shortWeekday,
      dayNumber: parts.dayNumber,
      shortMonth: parts.shortMonth,
      isToday: isoDate === todayIso,
    });
  }
  return days;
}

export function detectOverlappingAppointmentIds(appointments: Appointment[]): Set<string> {
  const overlaps = new Set<string>();
  const byDay = groupPhysicalAppointmentsByDay(
    appointments.filter((a) => a.status !== 'Cancelled')
  );

  for (const group of byDay) {
    const items = group.appointments.map((apt) => ({
      apt,
      win: extractAppointmentTimeWindow(apt),
    }));
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        if (items[i].win.startMinutes < items[j].win.endMinutes &&
            items[j].win.startMinutes < items[i].win.endMinutes) {
          overlaps.add(items[i].apt.id);
          overlaps.add(items[j].apt.id);
        }
      }
    }
  }
  return overlaps;
}

export function groupPhysicalAppointmentsByDay(appointments: Appointment[]): PhysicalDayGroup[] {
  const physical = appointments.filter((a) => a.mode === 'In-Person');
  const map = new Map<string, Appointment[]>();

  for (const apt of physical) {
    const key = apt.date || 'Unscheduled';
    const list = map.get(key) || [];
    list.push(apt);
    map.set(key, list);
  }

  const sortedDates = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
  return sortedDates.map((date) => {
    const list = (map.get(date) || []).slice().sort((a, b) => {
      const wa = extractAppointmentTimeWindow(a);
      const wb = extractAppointmentTimeWindow(b);
      return wa.start24.localeCompare(wb.start24);
    });
    const parts = formatIsoDateParts(date);
    return {
      date,
      ...parts,
      appointments: list,
    };
  });
}

export function filterHospitalOwnedDoctors<T extends { hospitalOwnerUid?: string }>(
  doctors: T[],
  hospitalUid: string
): T[] {
  if (!hospitalUid.trim()) return [];
  return doctors.filter((d) => d.hospitalOwnerUid === hospitalUid);
}

interface DoctorPhysicalCalendarProps {
  appointments: Appointment[];
  defaultFacilityName: string;
  defaultCity: string;
  syncLabel?: string;
  onMarkCompleted: (appointmentId: string, note: string) => Promise<void>;
  onUpdateAppointmentStatus?: (
    appointmentId: string,
    status: 'Confirmed' | 'Completed' | 'Rescheduled' | 'Cancelled',
    note?: string
  ) => Promise<void>;
  onBlockPhysicalSlot: (input: {
    patientName: string;
    date: string;
    startTime: string;
    endTime: string;
    facilityName: string;
    city: string;
    notes?: string;
  }) => Promise<void>;
}

export function DoctorPhysicalCalendar({
  appointments,
  defaultFacilityName,
  defaultCity,
  syncLabel = 'Synced with Booking System',
  onMarkCompleted,
  onUpdateAppointmentStatus,
  onBlockPhysicalSlot,
}: DoctorPhysicalCalendarProps) {
  const todayIso = useMemo(() => toIsoDateLocal(new Date()), []);
  const allPhysical = useMemo(
    () => appointments.filter((a) => a.mode === 'In-Person'),
    [appointments]
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'All' | 'Confirmed' | 'Pending Payment' | 'Completed' | 'Rescheduled' | 'Cancelled'
  >('All');

  const filteredPhysical = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allPhysical.filter((apt) => {
      const statusOk = statusFilter === 'All' || apt.status === statusFilter;
      const qOk =
        !q ||
        (apt.patientName || '').toLowerCase().includes(q) ||
        apt.reference.toLowerCase().includes(q) ||
        apt.facilityName.toLowerCase().includes(q) ||
        (apt.clinicalNotes || '').toLowerCase().includes(q);
      return statusOk && qOk;
    });
  }, [allPhysical, searchQuery, statusFilter]);

  const dayGroups = useMemo(
    () => groupPhysicalAppointmentsByDay(filteredPhysical),
    [filteredPhysical]
  );

  const byDateMap = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const g of dayGroups) {
      map.set(g.date, g.appointments);
    }
    return map;
  }, [dayGroups]);

  const overlapIds = useMemo(
    () => detectOverlappingAppointmentIds(allPhysical),
    [allPhysical]
  );

  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<string>(() => dayGroups[0]?.date || todayIso);
  const [cursorMonth, setCursorMonth] = useState<{ year: number; month: number }>(() => {
    const base = parseIsoDateLocal(dayGroups[0]?.date || todayIso);
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(
    () => dayGroups[0]?.appointments[0]?.id || null
  );
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Block physical slot form state
  const [patientName, setPatientName] = useState('');
  const [slotDate, setSlotDate] = useState(todayIso);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:45');
  const [facilityName, setFacilityName] = useState(defaultFacilityName || 'Clinic Examination Room');
  const [slotNotes, setSlotNotes] = useState('');
  const [slotBusy, setSlotBusy] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [slotSuccess, setSlotSuccess] = useState<string | null>(null);

  const monthCells = useMemo(
    () => buildMonthCalendarCells(cursorMonth.year, cursorMonth.month, todayIso),
    [cursorMonth.year, cursorMonth.month, todayIso]
  );

  const weekDays = useMemo(
    () => buildWeekCalendarDays(selectedDate, todayIso),
    [selectedDate, todayIso]
  );

  const monthLabel = useMemo(() => {
    const d = new Date(cursorMonth.year, cursorMonth.month, 1);
    return d.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
  }, [cursorMonth.year, cursorMonth.month]);

  const selectedDayAppointments = useMemo(
    () => byDateMap.get(selectedDate) || [],
    [byDateMap, selectedDate]
  );

  const activeAppointment = useMemo(() => {
    if (selectedAppointmentId) {
      const exact = filteredPhysical.find((a) => a.id === selectedAppointmentId);
      if (exact) return exact;
    }
    return selectedDayAppointments[0] || filteredPhysical[0] || null;
  }, [filteredPhysical, selectedAppointmentId, selectedDayAppointments]);

  const totalClinicMinutes = useMemo(
    () =>
      allPhysical.reduce(
        (sum, apt) =>
          apt.status === 'Cancelled' ? sum : sum + extractAppointmentTimeWindow(apt).durationMinutes,
        0
      ),
    [allPhysical]
  );

  const todayCount = useMemo(
    () => allPhysical.filter((a) => a.date === todayIso && a.status !== 'Cancelled').length,
    [allPhysical, todayIso]
  );

  const jumpToDate = (iso: string) => {
    setSelectedDate(iso);
    const parsed = parseIsoDateLocal(iso);
    setCursorMonth({ year: parsed.getFullYear(), month: parsed.getMonth() });
    const firstOnDay = byDateMap.get(iso)?.[0];
    if (firstOnDay) {
      setSelectedAppointmentId(firstOnDay.id);
    }
  };

  const shiftPeriod = (direction: -1 | 1) => {
    if (calendarView === 'month') {
      const next = new Date(cursorMonth.year, cursorMonth.month + direction, 1);
      setCursorMonth({ year: next.getFullYear(), month: next.getMonth() });
      return;
    }
    const base = parseIsoDateLocal(selectedDate);
    const deltaDays = calendarView === 'week' ? direction * 7 : direction;
    const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + deltaDays);
    jumpToDate(toIsoDateLocal(next));
  };

  const handleStatusChange = async (
    apt: Appointment,
    nextStatus: 'Confirmed' | 'Completed' | 'Rescheduled' | 'Cancelled'
  ) => {
    setActionBusyId(apt.id);
    try {
      const note =
        noteDrafts[apt.id] ??
        apt.clinicalNotes ??
        (nextStatus === 'Completed' ? 'Physical examination completed.' : '');
      if (onUpdateAppointmentStatus) {
        await onUpdateAppointmentStatus(apt.id, nextStatus, note);
      } else {
        await onMarkCompleted(apt.id, note);
      }
      setSlotSuccess(
        `Updated ${apt.patientName || apt.reference} (${apt.date}) to ${nextStatus}.`
      );
    } catch (err) {
      setSlotError(err instanceof Error ? err.message : 'Unable to update appointment status.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleCreatePhysicalSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlotError(null);
    setSlotSuccess(null);

    const startM = toMinutesFrom24(startTime);
    const endM = toMinutesFrom24(endTime);
    if (patientName.trim().length < 2) {
      setSlotError('Enter the patient full name (at least 2 characters).');
      return;
    }
    if (startM === null || endM === null || endM <= startM) {
      setSlotError('End time ("To") must be later than start time ("From").');
      return;
    }

    setSlotBusy(true);
    try {
      await onBlockPhysicalSlot({
        patientName: patientName.trim(),
        date: slotDate,
        startTime,
        endTime,
        facilityName: facilityName.trim() || defaultFacilityName || 'Outpatient Clinic',
        city: defaultCity || 'Ibadan',
        notes: slotNotes.trim() || undefined,
      });
      jumpToDate(slotDate);
      setSlotSuccess(
        `Scheduled physical consultation for ${patientName.trim()} on ${slotDate} (${formatTime24To12(startTime)} → ${formatTime24To12(endTime)}).`
      );
      setPatientName('');
      setSlotNotes('');
      setShowAddForm(false);
    } catch (err) {
      setSlotError(err instanceof Error ? err.message : 'Could not schedule physical slot.');
    } finally {
      setSlotBusy(false);
    }
  };

  const statusTone = (status: Appointment['status']) => {
    if (status === 'Completed') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (status === 'Cancelled') return 'bg-[#E5484D]/10 text-[#9C2327] border-[#E5484D]/25';
    if (status === 'Pending Payment') return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-[#272757]/10 text-[#272757] border-[#272757]/20';
  };

  return (
    <div className="rounded-2xl border border-[#272757]/15 bg-[#F9FAFE] p-5 space-y-5">
      {/* Top Header & Sync Indicator */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-[#0F0E47] flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#E8702A]" />
              Physical Consultations Calendar
            </h3>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
              <RefreshCw className="w-3 h-3" />
              {syncLabel}
            </span>
          </div>
          <p className="text-xs text-[#505081] mt-1">
            Interactive clinic schedule of in-person physical appointments synced from the booking system, with exact{' '}
            <strong className="text-[#0F0E47]">From → To</strong> time slots and patient details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[#272757]/15 bg-white p-1 text-xs font-semibold">
            {(
              [
                { id: 'month', label: 'Month' },
                { id: 'week', label: 'Week Grid' },
                { id: 'day', label: 'Day Agenda' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCalendarView(tab.id)}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  calendarView === tab.id
                    ? 'bg-[#272757] text-white'
                    : 'text-[#505081] hover:text-[#0F0E47]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddForm((v) => !v);
              setSlotError(null);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            {showAddForm ? 'Close Slot Form' : 'Block Physical Slot'}
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white border border-[#272757]/10 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#505081]">
            Scheduled Physical Visits
          </p>
          <p className="text-xl font-bold text-[#0F0E47] tabular-nums mt-0.5">
            {allPhysical.length}
          </p>
        </div>
        <div className="rounded-xl bg-white border border-[#272757]/10 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#505081]">
            Today&apos;s Physical Slots
          </p>
          <p className="text-xl font-bold text-[#E8702A] tabular-nums mt-0.5">{todayCount}</p>
        </div>
        <div className="rounded-xl bg-white border border-[#272757]/10 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#505081]">
            Booked Clinic Hours
          </p>
          <p className="text-xl font-bold text-[#272757] tabular-nums mt-0.5">
            {Math.floor(totalClinicMinutes / 60)}h {totalClinicMinutes % 60}m
          </p>
        </div>
        <div className="rounded-xl bg-white border border-[#272757]/10 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#505081]">
            Slot Conflicts
          </p>
          <p
            className={`text-xl font-bold tabular-nums mt-0.5 ${
              overlapIds.size > 0 ? 'text-[#9C2327]' : 'text-emerald-700'
            }`}
          >
            {overlapIds.size > 0 ? `${overlapIds.size} overlapping` : 'None'}
          </p>
        </div>
      </div>

      {/* Feedback Alerts */}
      {slotSuccess && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{slotSuccess}</span>
        </div>
      )}
      {slotError && (
        <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-3 flex items-center gap-2 text-xs text-[#9C2327]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{slotError}</span>
        </div>
      )}

      {/* Block New Physical Appointment Form */}
      {showAddForm && (
        <form
          onSubmit={(e) => void handleCreatePhysicalSlot(e)}
          className="rounded-xl bg-white border border-[#272757]/15 p-4 grid grid-cols-1 sm:grid-cols-12 gap-3"
        >
          <div className="sm:col-span-4">
            <label htmlFor="phy-patient" className="block text-xs font-semibold text-[#272757] mb-1">
              Patient Full Name
            </label>
            <input
              id="phy-patient"
              type="text"
              required
              maxLength={120}
              placeholder="e.g. Mrs. Folashade Ojo"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full px-3 py-2 min-h-[40px] rounded-xl border border-[#272757]/20 text-xs"
            />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="phy-date" className="block text-xs font-semibold text-[#272757] mb-1">
              Appointment Day
            </label>
            <input
              id="phy-date"
              type="date"
              required
              value={slotDate}
              onChange={(e) => setSlotDate(e.target.value)}
              className="w-full px-3 py-2 min-h-[40px] rounded-xl border border-[#272757]/20 text-xs font-mono"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="phy-from" className="block text-xs font-semibold text-[#272757] mb-1">
              From Time
            </label>
            <input
              id="phy-from"
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 min-h-[40px] rounded-xl border border-[#272757]/20 text-xs font-mono"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="phy-to" className="block text-xs font-semibold text-[#272757] mb-1">
              To Time
            </label>
            <input
              id="phy-to"
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 min-h-[40px] rounded-xl border border-[#272757]/20 text-xs font-mono"
            />
          </div>
          <div className="sm:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={slotBusy}
              className="w-full px-3 py-2 min-h-[40px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
            >
              {slotBusy ? '...' : 'Save'}
            </button>
          </div>
          <div className="sm:col-span-6">
            <label htmlFor="phy-facility" className="block text-xs font-semibold text-[#272757] mb-1">
              Hospital / Examination Room
            </label>
            <input
              id="phy-facility"
              type="text"
              maxLength={140}
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
              className="w-full px-3 py-2 min-h-[38px] rounded-xl border border-[#272757]/20 text-xs"
            />
          </div>
          <div className="sm:col-span-6">
            <label htmlFor="phy-notes" className="block text-xs font-semibold text-[#272757] mb-1">
              Reason / Clinical Preparation Note
            </label>
            <input
              id="phy-notes"
              type="text"
              maxLength={400}
              placeholder="e.g. Physical exam, ECG, blood pressure follow-up..."
              value={slotNotes}
              onChange={(e) => setSlotNotes(e.target.value)}
              className="w-full px-3 py-2 min-h-[38px] rounded-xl border border-[#272757]/20 text-xs"
            />
          </div>
        </form>
      )}

      {/* Calendar Controls: Period Navigation + Search + Status Filter */}
      <div className="rounded-xl bg-white border border-[#272757]/12 p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => shiftPeriod(-1)}
            aria-label="Previous calendar period"
            className="p-2 rounded-lg border border-[#272757]/15 hover:bg-[#F5F6FC] text-[#0F0E47] cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => jumpToDate(todayIso)}
            className="px-3 py-1.5 rounded-lg border border-[#272757]/15 hover:bg-[#F5F6FC] text-xs font-semibold text-[#0F0E47] cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftPeriod(1)}
            aria-label="Next calendar period"
            className="p-2 rounded-lg border border-[#272757]/15 hover:bg-[#F5F6FC] text-[#0F0E47] cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-[#0F0E47] ml-1">
            {calendarView === 'month'
              ? monthLabel
              : calendarView === 'week'
                ? `${weekDays[0]?.dayNumber} ${weekDays[0]?.shortMonth} – ${weekDays[6]?.dayNumber} ${weekDays[6]?.shortMonth}`
                : formatIsoDateParts(selectedDate).dayHeading}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#505081] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, ref, clinic..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#272757]/15 text-xs bg-[#F9FAFE]"
            />
          </div>
          <select
            aria-label="Filter physical appointments by status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as
                  | 'All'
                  | 'Confirmed'
                  | 'Pending Payment'
                  | 'Completed'
                  | 'Rescheduled'
                  | 'Cancelled'
              )
            }
            className="px-3 py-1.5 rounded-lg border border-[#272757]/15 bg-white text-xs text-[#0F0E47]"
          >
            <option value="All">All Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Pending Payment">Pending Payment</option>
            <option value="Completed">Completed</option>
            <option value="Rescheduled">Rescheduled</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <input
            aria-label="Jump to calendar date"
            type="date"
            value={selectedDate}
            onChange={(e) => jumpToDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[#272757]/15 bg-white text-xs font-mono"
          />
        </div>
      </div>

      {/* Main Split Layout: Interactive Calendar Canvas + Synced Patient Appointment Details */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Left: Calendar View (8 cols) */}
        <div className="xl:col-span-8 space-y-4">
          {/* MONTH VIEW */}
          {calendarView === 'month' && (
            <div className="rounded-xl bg-white border border-[#272757]/12 overflow-hidden">
              <div className="grid grid-cols-7 border-b border-[#272757]/10 bg-[#F5F6FC]">
                {WEEKDAY_HEADERS.map((wd) => (
                  <div
                    key={wd}
                    className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-[#505081]"
                  >
                    {wd}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 divide-x divide-y divide-[#272757]/10">
                {monthCells.map((cell) => {
                  const slots = byDateMap.get(cell.isoDate) || [];
                  const isSelected = cell.isoDate === selectedDate;
                  return (
                    <div
                      key={cell.isoDate}
                      role="button"
                      tabIndex={0}
                      onClick={() => jumpToDate(cell.isoDate)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          jumpToDate(cell.isoDate);
                        }
                      }}
                      className={`min-h-[96px] p-1.5 text-left transition-colors cursor-pointer ${
                        !cell.inCurrentMonth ? 'bg-[#F9FAFE] text-[#8A8BA8]' : 'bg-white'
                      } ${isSelected ? 'ring-2 ring-inset ring-[#272757] bg-[#F5F6FC]/70' : 'hover:bg-[#F9FAFE]'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-bold tabular-nums w-6 h-6 rounded-lg flex items-center justify-center ${
                            cell.isToday
                              ? 'bg-[#E8702A] text-white'
                              : isSelected
                                ? 'bg-[#272757] text-white'
                                : 'text-[#0F0E47]'
                          }`}
                        >
                          {cell.dayOfMonth}
                        </span>
                        {slots.length > 0 && (
                          <span className="text-[10px] font-bold text-[#272757] tabular-nums">
                            {slots.length}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {slots.slice(0, 2).map((apt) => {
                          const win = extractAppointmentTimeWindow(apt);
                          const isCurrent = activeAppointment?.id === apt.id;
                          return (
                            <button
                              key={apt.id}
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setSelectedDate(cell.isoDate);
                                setSelectedAppointmentId(apt.id);
                              }}
                              className={`w-full text-left px-1.5 py-1 rounded-md text-[10px] leading-tight truncate cursor-pointer border transition-colors ${
                                isCurrent
                                  ? 'bg-[#272757] text-white border-[#272757]'
                                  : apt.status === 'Completed'
                                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                                    : apt.status === 'Cancelled'
                                      ? 'bg-rose-50 text-rose-800 border-rose-200 line-through'
                                      : 'bg-[#F5F6FC] text-[#0F0E47] border-[#272757]/15 hover:border-[#272757]/40'
                              }`}
                            >
                              <span className="font-mono font-bold">{win.start24}</span>{' '}
                              <span>{apt.patientName || apt.reference}</span>
                            </button>
                          );
                        })}
                        {slots.length > 2 && (
                          <p className="text-[10px] font-semibold text-[#505081] pl-1">
                            +{slots.length - 2} more
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEK TIME-SLOT GRID VIEW */}
          {calendarView === 'week' && (
            <div className="rounded-xl bg-white border border-[#272757]/12 overflow-x-auto">
              <div className="min-w-[680px]">
                <div className="grid grid-cols-8 border-b border-[#272757]/10 bg-[#F5F6FC]">
                  <div className="p-2 text-[11px] font-bold uppercase text-[#505081] flex items-center justify-center">
                    Time
                  </div>
                  {weekDays.map((day) => {
                    const count = (byDateMap.get(day.isoDate) || []).length;
                    const isSel = day.isoDate === selectedDate;
                    return (
                      <button
                        key={day.isoDate}
                        type="button"
                        onClick={() => jumpToDate(day.isoDate)}
                        className={`p-2 text-center border-l border-[#272757]/10 cursor-pointer transition-colors ${
                          isSel ? 'bg-[#272757] text-white' : 'hover:bg-white'
                        }`}
                      >
                        <p
                          className={`text-[10px] font-bold uppercase ${
                            isSel ? 'text-[#C6C7F0]' : 'text-[#505081]'
                          }`}
                        >
                          {day.shortWeekday}
                        </p>
                        <p className="text-sm font-bold tabular-nums">
                          {day.dayNumber}{' '}
                          <span className="text-[11px] font-medium">{day.shortMonth}</span>
                        </p>
                        {count > 0 && (
                          <span
                            className={`inline-block mt-0.5 text-[10px] font-semibold ${
                              isSel ? 'text-emerald-200' : 'text-[#E8702A]'
                            }`}
                          >
                            {count} {count === 1 ? 'visit' : 'visits'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="divide-y divide-[#272757]/10">
                  {CLINIC_HOURS.map((hour) => {
                    const hourLabel = formatTime24To12(`${String(hour).padStart(2, '0')}:00`);
                    return (
                      <div key={hour} className="grid grid-cols-8 min-h-[58px]">
                        <div className="p-2 text-[11px] font-mono font-semibold text-[#505081] bg-[#F9FAFE] flex items-start justify-end pr-2.5">
                          {hourLabel}
                        </div>
                        {weekDays.map((day) => {
                          const dayApts = (byDateMap.get(day.isoDate) || []).filter((apt) => {
                            const win = extractAppointmentTimeWindow(apt);
                            const startHour = Math.floor(win.startMinutes / 60);
                            if (hour === CLINIC_HOURS[0] && startHour < CLINIC_HOURS[0]) return true;
                            if (
                              hour === CLINIC_HOURS[CLINIC_HOURS.length - 1] &&
                              startHour >= CLINIC_HOURS[CLINIC_HOURS.length - 1]
                            ) {
                              return true;
                            }
                            return startHour === hour;
                          });

                          return (
                            <div
                              key={`${day.isoDate}-${hour}`}
                              className="border-l border-[#272757]/10 p-1 space-y-1"
                            >
                              {dayApts.map((apt) => {
                                const win = extractAppointmentTimeWindow(apt);
                                const isCurrent = activeAppointment?.id === apt.id;
                                return (
                                  <button
                                    key={apt.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedDate(day.isoDate);
                                      setSelectedAppointmentId(apt.id);
                                    }}
                                    className={`w-full text-left p-1.5 rounded-lg border text-[10px] leading-snug cursor-pointer transition-colors ${
                                      isCurrent
                                        ? 'bg-[#272757] text-white border-[#272757]'
                                        : 'bg-[#F5F6FC] text-[#0F0E47] border-[#272757]/20 hover:border-[#E8702A]'
                                    }`}
                                  >
                                    <p className="font-mono font-bold tabular-nums">
                                      {win.start24}–{win.end24}
                                    </p>
                                    <p className="font-semibold truncate">
                                      {apt.patientName || apt.reference}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* DAY AGENDA VIEW (OR SELECTED DAY SUMMARY LIST BELOW MONTH/WEEK) */}
          <div className="rounded-xl bg-white border border-[#272757]/12 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#272757]/10 pb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wide text-[#0F0E47] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#E8702A]" />
                {formatIsoDateParts(selectedDate).dayHeading}
              </h4>
              <span className="text-xs font-semibold text-[#505081]">
                {selectedDayAppointments.length}{' '}
                {selectedDayAppointments.length === 1
                  ? 'Physical Consultation'
                  : 'Physical Consultations'}
              </span>
            </div>

            {selectedDayAppointments.length === 0 ? (
              <div className="py-6 text-center space-y-1.5">
                <p className="text-xs font-semibold text-[#0F0E47]">
                  No physical consultations scheduled for {selectedDate}
                </p>
                <p className="text-xs text-[#505081]">
                  Select another highlighted date on the calendar or click &ldquo;Block Physical Slot&rdquo; to add a walk-in clinic exam.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedDayAppointments.map((apt) => {
                  const win = extractAppointmentTimeWindow(apt);
                  const isCurrent = activeAppointment?.id === apt.id;
                  const hasConflict = overlapIds.has(apt.id);
                  return (
                    <div
                      key={apt.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedAppointmentId(apt.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedAppointmentId(apt.id);
                        }
                      }}
                      className={`rounded-xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isCurrent
                          ? 'border-[#272757] bg-[#F5F6FC]'
                          : 'border-[#272757]/12 bg-white hover:bg-[#F9FAFE]'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="rounded-lg bg-[#272757] text-white px-2.5 py-2 text-center shrink-0 min-w-[116px]">
                          <p className="text-[11px] font-bold tabular-nums flex items-center justify-center gap-1">
                            <span>{win.startLabel}</span>
                          </p>
                          <p className="text-[10px] text-[#C6C7F0] tabular-nums">
                            to {win.endLabel} ({win.durationMinutes}m)
                          </p>
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-bold text-[#0F0E47] truncate">
                              {apt.patientName?.trim() || `Patient (${apt.profileId || apt.reference})`}
                            </p>
                            {hasConflict && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#9C2327] bg-[#E5484D]/12 px-1.5 py-0.5 rounded">
                                <AlertTriangle className="w-3 h-3" />
                                Overlap
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#505081] truncate">
                            {apt.facilityName} · <span className="font-mono">{apt.reference}</span>
                          </p>
                          {apt.clinicalNotes && (
                            <p className="text-xs text-[#272757] line-clamp-1">{apt.clinicalNotes}</p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border shrink-0 self-start sm:self-center ${statusTone(apt.status)}`}
                      >
                        {apt.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Synced Patient Appointment Details Inspector (4 cols) */}
        <aside className="xl:col-span-4 rounded-xl bg-white border border-[#272757]/15 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[#272757]/10 pb-3">
            <h4 className="text-sm font-bold text-[#0F0E47] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#272757]" />
              Patient Appointment Details
            </h4>
            {activeAppointment && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusTone(activeAppointment.status)}`}
              >
                {activeAppointment.status}
              </span>
            )}
          </div>

          {!activeAppointment ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-xs font-semibold text-[#0F0E47]">No appointment selected</p>
              <p className="text-xs text-[#505081]">
                Click any booked time slot on the calendar to inspect patient details, visit reason, and update consultation status.
              </p>
            </div>
          ) : (
            (() => {
              const win = extractAppointmentTimeWindow(activeAppointment);
              const dateInfo = formatIsoDateParts(activeAppointment.date);
              const busy = actionBusyId === activeAppointment.id;
              return (
                <div className="space-y-4 text-xs">
                  {/* Patient Header */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#272757] text-white flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0F0E47] truncate">
                        {activeAppointment.patientName?.trim() ||
                          `Patient (${activeAppointment.profileId})`}
                      </p>
                      <p className="text-[11px] font-mono text-[#505081]">
                        Ref: {activeAppointment.reference}
                      </p>
                      <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                        Synced from Booking System · In-Person Physical
                      </p>
                    </div>
                  </div>

                  {/* Time & Day Card */}
                  <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/12 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-[#0F0E47] font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-[#E8702A] shrink-0" />
                      <span>{dateInfo.dayHeading}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#0F0E47] font-bold tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-[#272757] shrink-0" />
                      <span>{win.startLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#E8702A]" />
                      <span>{win.endLabel}</span>
                      <span className="text-[11px] font-medium text-[#505081]">
                        ({win.durationMinutes} min)
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-[#505081]">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        {activeAppointment.facilityName}, {activeAppointment.city}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[#505081]">
                      <Stethoscope className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {activeAppointment.specialty} ·{' '}
                        {activeAppointment.feeNgn > 0
                          ? `₦${activeAppointment.feeNgn.toLocaleString()}`
                          : 'Covered by Plan'}
                      </span>
                    </div>
                  </div>

                  {overlapIds.has(activeAppointment.id) && (
                    <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-2.5 flex items-center gap-2 text-[#9C2327]">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        This physical time slot overlaps another scheduled patient on{' '}
                        {activeAppointment.date}.
                      </span>
                    </div>
                  )}

                  {/* Clinical Notes Editor */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="inspector-clinical-note"
                      className="block text-xs font-semibold text-[#272757]"
                    >
                      Patient Reason &amp; Clinician Exam Notes
                    </label>
                    <textarea
                      id="inspector-clinical-note"
                      rows={3}
                      value={noteDrafts[activeAppointment.id] ?? activeAppointment.clinicalNotes ?? ''}
                      onChange={(e) =>
                        setNoteDrafts((prev) => ({
                          ...prev,
                          [activeAppointment.id]: e.target.value,
                        }))
                      }
                      placeholder="Add physical examination findings or preparation instructions..."
                      className="w-full px-3 py-2 rounded-xl border border-[#272757]/20 bg-[#F9FAFE] text-xs"
                    />
                  </div>

                  {/* Status Actions */}
                  {activeAppointment.status !== 'Completed' &&
                  activeAppointment.status !== 'Cancelled' ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleStatusChange(activeAppointment, 'Completed')}
                        className="flex-1 px-3 py-2 rounded-xl bg-[#272757] hover:bg-[#0F0E47] disabled:opacity-50 text-white font-semibold cursor-pointer"
                      >
                        {busy ? 'Saving...' : 'Mark Completed'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleStatusChange(activeAppointment, 'Confirmed')}
                        className="px-3 py-2 rounded-xl border border-[#272757]/20 bg-white hover:bg-[#F5F6FC] text-[#0F0E47] font-semibold cursor-pointer"
                      >
                        Save Note
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleStatusChange(activeAppointment, 'Cancelled')}
                        className="px-3 py-2 rounded-xl border border-[#E5484D]/30 text-[#9C2327] hover:bg-[#E5484D]/10 font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#505081] italic">
                      This appointment is marked {activeAppointment.status}.
                    </p>
                  )}
                </div>
              );
            })()
          )}
        </aside>
      </div>
    </div>
  );
}
