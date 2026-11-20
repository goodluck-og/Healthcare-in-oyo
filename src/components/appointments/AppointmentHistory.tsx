import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  Stethoscope,
  Video,
  Wallet,
  XCircle,
} from 'lucide-react';
import { formatNaira, useApp } from '../../context/AppContext';
import type { Appointment } from '../../types/healthcare';

const OYO_PHYSICAL_EXAM_HOSPITALS = [
  { name: 'University College Hospital (UCH) Ibadan', city: 'Ibadan' },
  { name: 'Adeoyo Maternity Teaching Hospital, Yemetu', city: 'Ibadan' },
  { name: 'Ring Road State Hospital, Ibadan', city: 'Ibadan' },
  { name: 'Jericho Specialist Hospital, Ibadan', city: 'Ibadan' },
  { name: 'Bowen University Teaching Hospital, Ogbomoso', city: 'Ogbomoso' },
];

type FilterTab = 'all' | 'upcoming' | 'past';

interface AppointmentHistoryProps {
  appointments: Appointment[];
  activeProfileName?: string;
  onViewWallet?: () => void;
}

function isPastConsultation(apt: Appointment, todayIso: string): boolean {
  if (apt.status === 'Completed' || apt.status === 'Cancelled') {
    return true;
  }
  return apt.date < todayIso;
}

function getStatusBadgeClasses(status: Appointment['status']): string {
  switch (status) {
    case 'Confirmed':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'Pending Payment':
      return 'bg-[#E8702A]/12 text-[#9C4410] border-[#E8702A]/30';
    case 'Rescheduled':
      return 'bg-[#505081]/12 text-[#272757] border-[#505081]/25';
    case 'Completed':
      return 'bg-[#272757]/10 text-[#0F0E47] border-[#272757]/20';
    case 'Cancelled':
      return 'bg-[#E5484D]/10 text-[#9C2327] border-[#E5484D]/25';
    default:
      return 'bg-[#F5F6FC] text-[#505081] border-[#272757]/15';
  }
}

export function AppointmentHistory({
  appointments,
  activeProfileName,
  onViewWallet,
}: AppointmentHistoryProps) {
  const {
    navigate,
    rescheduleOrCancelAppointment,
    bookPhysicalExamFollowUp,
    walletTransactions,
  } = useApp();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [physicalExamForId, setPhysicalExamForId] = useState<string | null>(null);
  const [examHospital, setExamHospital] = useState(OYO_PHYSICAL_EXAM_HOSPITALS[0].name);
  const [examDate, setExamDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [examTime, setExamTime] = useState('10:30 WAT');
  const [examNotes, setExamNotes] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:00 WAT');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastRefunded, setLastRefunded] = useState<number>(0);

  const todayIso = new Date().toISOString().slice(0, 10);

  const { upcomingCount, pastCount, filteredAppointments } = useMemo(() => {
    const sorted = [...appointments].sort((a, b) => b.date.localeCompare(a.date));
    const upcoming = sorted.filter((a) => !isPastConsultation(a, todayIso));
    const past = sorted.filter((a) => isPastConsultation(a, todayIso));

    const list =
      filter === 'upcoming' ? upcoming : filter === 'past' ? past : [...upcoming, ...past];

    return {
      upcomingCount: upcoming.length,
      pastCount: past.length,
      filteredAppointments: list,
    };
  }, [appointments, filter, todayIso]);

  const startReschedule = (apt: Appointment) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setReschedulingId(apt.id);
    setNewDate(apt.date);
    setNewTime(apt.time);
  };

  const handleConfirmReschedule = async (aptId: string) => {
    if (!newDate.trim() || !newTime.trim()) {
      setErrorMsg('Please select a new date and time.');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyId(aptId);
    try {
      await rescheduleOrCancelAppointment(aptId, 'Rescheduled', newDate, newTime);
      setReschedulingId(null);
      setSuccessMsg('Consultation rescheduled.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reschedule consultation.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelAppointment = async (apt: Appointment) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLastRefunded(0);
    setBusyId(apt.id);
    try {
      const result = await rescheduleOrCancelAppointment(apt.id, 'Cancelled', apt.date, apt.time);
      if (reschedulingId === apt.id) setReschedulingId(null);
      setConfirmCancelId(null);
      if (result.refundedAmountNgn > 0) {
        setLastRefunded(result.refundedAmountNgn);
        setSuccessMsg(
          `Cancelled consultation with ${apt.doctorName}. ${formatNaira(
            result.refundedAmountNgn
          )} has been refunded to your HealthConnect Wallet${
            result.walletReference ? ` (${result.walletReference})` : ''
          } for future bookings.`
        );
      } else {
        setSuccessMsg(`Cancelled consultation with ${apt.doctorName}.`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to cancel consultation.');
    } finally {
      setBusyId(null);
    }
  };

  const handleBookPhysicalExam = async (parentApt: Appointment) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyId(parentApt.id);
    try {
      const selectedHub =
        OYO_PHYSICAL_EXAM_HOSPITALS.find((h) => h.name === examHospital) ||
        OYO_PHYSICAL_EXAM_HOSPITALS[0];
      const booked = await bookPhysicalExamFollowUp({
        parentAppointment: parentApt,
        facilityName: selectedHub.name,
        city: selectedHub.city,
        date: examDate,
        time: examTime,
        notes: examNotes,
      });
      setPhysicalExamForId(null);
      setExamNotes('');
      setSuccessMsg(
        `In-person physical examination scheduled with ${booked.doctorName} at ${booked.facilityName} on ${booked.date} at ${booked.time} (${booked.reference}).`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to schedule physical examination.'
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      aria-label="Clinical Consultation History"
      className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#272757]" />
            Consultations & Appointment History
          </h2>
          <p className="text-xs text-[#505081] mt-0.5">
            Track upcoming bookings and past clinical visits{activeProfileName ? ` for ${activeProfileName}` : ''}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/find-healthcare')}
          className="px-4 py-2 min-h-[38px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold cursor-pointer self-start sm:self-auto"
        >
          Book New Visit
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#272757]/10 pb-3">
        {(
          [
            { id: 'all', label: `All Consultations (${appointments.length})` },
            { id: 'upcoming', label: `Upcoming (${upcomingCount})` },
            { id: 'past', label: `Past & Completed (${pastCount})` },
          ] as const
        ).map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            onClick={() => setFilter(tabItem.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === tabItem.id
                ? 'bg-[#272757] text-white'
                : 'bg-[#F5F6FC] text-[#505081] hover:text-[#0F0E47]'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-3.5 flex items-start gap-2 text-xs text-[#9C2327]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-emerald-900">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
          {lastRefunded > 0 && onViewWallet && (
            <button
              type="button"
              onClick={onViewWallet}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#272757] text-white text-xs font-semibold shrink-0 cursor-pointer self-start sm:self-auto"
            >
              <Wallet className="w-3.5 h-3.5" />
              View Wallet
            </button>
          )}
        </div>
      )}

      {filteredAppointments.length === 0 ? (
        <div className="rounded-xl bg-[#F5F6FC] p-6 text-center space-y-2.5">
          <p className="text-sm text-[#505081]">
            {filter === 'upcoming'
              ? 'No upcoming consultations scheduled.'
              : filter === 'past'
              ? 'No past consultations recorded yet.'
              : `No appointments recorded${activeProfileName ? ` for ${activeProfileName}` : ''}.`}
          </p>
          <button
            type="button"
            onClick={() => navigate('/find-healthcare')}
            className="px-4 py-2 rounded-xl bg-[#272757] text-white text-xs font-semibold cursor-pointer"
          >
            Find a Specialist
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((apt) => {
            const past = isPastConsultation(apt, todayIso);
            const isRescheduling = reschedulingId === apt.id;
            const isConfirmingCancel = confirmCancelId === apt.id;
            const isBusy = busyId === apt.id;
            const refundEntry = walletTransactions.find(
              (w) => w.relatedAppointmentId === apt.id && w.type === 'credit'
            );
            const refundEligible =
              (apt.status === 'Confirmed' || apt.status === 'Rescheduled') && apt.feeNgn > 0;

            return (
              <article
                key={apt.id}
                className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-4 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className={`px-2 py-0.5 rounded-md border font-semibold ${getStatusBadgeClasses(
                          apt.status
                        )}`}
                      >
                        {apt.status}
                      </span>
                      <span className="font-mono text-[#505081] tabular-nums">{apt.reference}</span>
                      <span className="inline-flex items-center gap-1 text-[#505081]">
                        {apt.mode === 'Video Telehealth' ? (
                          <Video className="w-3 h-3 text-[#E8702A]" />
                        ) : (
                          <Building2 className="w-3 h-3 text-[#272757]" />
                        )}
                        {apt.mode}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#8686AC]">
                        {past ? 'Past Visit' : 'Upcoming'}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-[#0F0E47] flex items-center gap-1.5 pt-0.5">
                      <Stethoscope className="w-4 h-4 text-[#272757] shrink-0" />
                      <span>{apt.doctorName}</span>
                    </p>
                    <p className="text-xs text-[#505081]">
                      {apt.specialty} · {apt.facilityName}, {apt.city}
                    </p>

                    {refundEntry && (
                      <p className="text-xs font-medium text-[#15803D] pt-0.5 tabular-nums">
                        Refunded {formatNaira(refundEntry.amountNgn)} to HealthConnect Wallet ({refundEntry.reference})
                      </p>
                    )}

                    {apt.clinicalNotes && (
                      <p className="text-xs text-[#272757] bg-white border border-[#272757]/10 rounded-lg px-3 py-2 mt-2">
                        <span className="font-semibold">Clinician Note:</span> {apt.clinicalNotes}
                      </p>
                    )}
                  </div>

                  <div className="sm:text-right space-y-1 shrink-0">
                    <p className="text-sm font-semibold text-[#0F0E47] tabular-nums flex sm:justify-end items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#E8702A]" />
                      <span>
                        {apt.date} · {apt.time}
                      </span>
                    </p>
                    <p className="text-xs font-semibold text-emerald-700 tabular-nums">
                      {apt.feeNgn > 0 ? formatNaira(apt.feeNgn) : 'Included in Plan'}
                    </p>

                    {apt.status !== 'Cancelled' && (
                      <div className="flex flex-wrap sm:justify-end items-center gap-2 pt-1.5">
                        {apt.mode === 'Video Telehealth' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setConfirmCancelId(null);
                              setReschedulingId(null);
                              setExamHospital(
                                OYO_PHYSICAL_EXAM_HOSPITALS.find((h) => h.name === apt.facilityName)
                                  ?.name || OYO_PHYSICAL_EXAM_HOSPITALS[0].name
                              );
                              setPhysicalExamForId(physicalExamForId === apt.id ? null : apt.id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#272757] hover:bg-[#0F0E47] text-[11px] font-semibold text-white cursor-pointer"
                          >
                            <Building2 className="w-3 h-3" />
                            Schedule Physical Exam
                          </button>
                        )}
                        {!past && (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setConfirmCancelId(null);
                                setPhysicalExamForId(null);
                                startReschedule(apt);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#272757]/15 text-[11px] font-semibold text-[#272757] hover:border-[#272757] cursor-pointer"
                            >
                              <CalendarClock className="w-3 h-3" />
                              Reschedule
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setReschedulingId(null);
                                setPhysicalExamForId(null);
                                setConfirmCancelId(isConfirmingCancel ? null : apt.id);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#E5484D]/25 text-[11px] font-semibold text-[#9C2327] hover:bg-[#E5484D]/10 cursor-pointer"
                            >
                              <XCircle className="w-3 h-3" />
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {physicalExamForId === apt.id && (
                  <div className="pt-3 border-t border-[#272757]/10 bg-white rounded-xl p-4 space-y-3 text-xs">
                    <div>
                      <p className="font-bold text-[#0F0E47]">
                        Book In-Person Physical Examination (Agreed With {apt.doctorName})
                      </p>
                      <p className="text-[#505081] mt-0.5">
                        Choose the Oyo State hospital and date decided during your online consultation. No additional visit fee applies under your monthly plan.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-[#272757] mb-1">
                          Oyo State Partner Hospital
                        </label>
                        <select
                          value={examHospital}
                          onChange={(e) => setExamHospital(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#272757]/20 text-xs text-[#0F0E47]"
                        >
                          {OYO_PHYSICAL_EXAM_HOSPITALS.map((h) => (
                            <option key={h.name} value={h.name}>
                              {h.name} ({h.city})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#272757] mb-1">
                          Exam Date
                        </label>
                        <input
                          type="date"
                          value={examDate}
                          onChange={(e) => setExamDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#272757]/20 text-xs text-[#0F0E47]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#272757] mb-1">
                          Time (WAT)
                        </label>
                        <select
                          value={examTime}
                          onChange={(e) => setExamTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#272757]/20 text-xs text-[#0F0E47]"
                        >
                          <option value="09:00 WAT">09:00 WAT</option>
                          <option value="10:30 WAT">10:30 WAT</option>
                          <option value="12:00 WAT">12:00 WAT</option>
                          <option value="14:30 WAT">14:30 WAT</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2 lg:col-span-4">
                        <label className="block text-[11px] font-semibold text-[#272757] mb-1">
                          Doctor&apos;s Physical Exam Note (Optional)
                        </label>
                        <input
                          type="text"
                          value={examNotes}
                          onChange={(e) => setExamNotes(e.target.value)}
                          placeholder="e.g. Chest auscultation, BP follow-up, or antenatal physical exam"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#272757]/20 text-xs text-[#0F0E47]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleBookPhysicalExam(apt)}
                        className="px-4 py-2 rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white font-semibold cursor-pointer"
                      >
                        {isBusy ? 'Booking...' : 'Confirm Physical Exam'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhysicalExamForId(null)}
                        className="px-3 py-2 rounded-xl bg-[#F5F6FC] border border-[#272757]/15 text-[#505081] font-semibold cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {isConfirmingCancel && (
                  <div className="pt-3 border-t border-[#272757]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white rounded-xl p-3.5 border border-[#E5484D]/25">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-[#0F0E47]">
                        {refundEligible
                          ? `Cancel visit & refund ${formatNaira(apt.feeNgn)} to your HealthConnect Wallet?`
                          : 'Confirm cancelling this unpaid consultation?'}
                      </p>
                      <p className="text-[#505081]">
                        {refundEligible
                          ? 'Your refunded balance is credited immediately and can be used toward any future consultation, lab panel, or pharmacy refill.'
                          : 'No payment has been captured for this appointment.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleCancelAppointment(apt)}
                        className="px-3.5 py-2 min-h-[36px] rounded-xl bg-[#E5484D] hover:bg-[#C9363B] text-white font-semibold cursor-pointer whitespace-nowrap"
                      >
                        {isBusy
                          ? 'Processing...'
                          : refundEligible
                            ? `Cancel & Refund ${formatNaira(apt.feeNgn)}`
                            : 'Confirm Cancel'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmCancelId(null)}
                        className="px-3 py-2 min-h-[36px] rounded-xl bg-[#F5F6FC] border border-[#272757]/15 text-[#505081] font-semibold cursor-pointer whitespace-nowrap"
                      >
                        Keep Visit
                      </button>
                    </div>
                  </div>
                )}

                {isRescheduling && (
                  <div className="pt-3 border-t border-[#272757]/10 flex flex-wrap items-end gap-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#272757] mb-1">
                        New Date
                      </label>
                      <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-white border border-[#272757]/20 text-xs text-[#0F0E47]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#272757] mb-1">
                        Time Slot (WAT)
                      </label>
                      <select
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-white border border-[#272757]/20 text-xs text-[#0F0E47]"
                      >
                        <option value="09:00 WAT">09:00 WAT</option>
                        <option value="10:30 WAT">10:30 WAT</option>
                        <option value="12:00 WAT">12:00 WAT</option>
                        <option value="14:30 WAT">14:30 WAT</option>
                        <option value="16:00 WAT">16:00 WAT</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleConfirmReschedule(apt.id)}
                      className="px-3.5 py-2 rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white font-semibold cursor-pointer"
                    >
                      {isBusy ? 'Saving...' : 'Confirm Slot'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReschedulingId(null)}
                      className="px-3 py-2 rounded-xl bg-white border border-[#272757]/15 text-[#505081] font-semibold cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
