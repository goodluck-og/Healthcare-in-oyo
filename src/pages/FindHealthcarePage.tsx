import React, { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  Stethoscope,
  Video,
  X,
} from 'lucide-react';
import { DEMO_DOCTORS, DEMO_FACILITIES, NIGERIA_CITY_PRESETS } from '../data/mockNigeriaData';
import { useApp } from '../context/AppContext';
import { DoctorAvatarArtwork } from '../components/ui/VisualArtwork';
import { LocationModal } from '../components/modals/LocationModal';
import {
  buildGoogleMapsDirectionsUrl,
  computeDistanceKm,
  getMapsReadinessSummary,
} from '../services/mapsService';
import type { Doctor } from '../types/healthcare';

type CategoryTab = 'All' | 'Doctors' | 'Hospital' | 'Clinic' | 'Pharmacy' | 'Laboratory';

export function FindHealthcarePage() {
  const {
    userLocation,
    integrationStatus,
    activeSubscription,
    openSubscriptionCheckout,
    bookOnlineConsultation,
    navigate,
  } = useApp();

  const [query, setQuery] = useState('');
  const [city, setCity] = useState('All Cities');
  const [category, setCategory] = useState<CategoryTab>('All');
  const [locationOpen, setLocationOpen] = useState(false);
  const [selectedRouteTargetId, setSelectedRouteTargetId] = useState<string>(DEMO_FACILITIES[0].id);

  // Inline Online Consultation Booking state
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
  const [slotDate, setSlotDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slotTime, setSlotTime] = useState('11:00 WAT');
  const [consultReason, setConsultReason] = useState('');
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingFeedback, setBookingFeedback] = useState<{
    doctorName: string;
    reference: string;
    date: string;
    time: string;
  } | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const mapsReadiness = getMapsReadinessSummary(integrationStatus);

  const doctors = useMemo(() => {
    if (category !== 'All' && category !== 'Doctors') return [];
    const q = query.trim().toLowerCase();
    return DEMO_DOCTORS.filter((d) => {
      const cityOk = city === 'All Cities' || d.city === city;
      const qOk =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        d.hospital.toLowerCase().includes(q);
      return cityOk && qOk;
    });
  }, [category, city, query]);

  const facilities = useMemo(() => {
    if (category === 'Doctors') return [];
    const q = query.trim().toLowerCase();
    const list = DEMO_FACILITIES.filter((f) => {
      const catOk = category === 'All' || f.type === category;
      const cityOk = city === 'All Cities' || f.city === city;
      const qOk =
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.address.toLowerCase().includes(q) ||
        f.specialties.some((s) => s.toLowerCase().includes(q));
      return catOk && cityOk && qOk;
    }).map((f) => ({
      ...f,
      distanceKm: userLocation.coordinates
        ? computeDistanceKm(userLocation.coordinates, f.coordinates)
        : null,
    }));

    return list.sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }
      return 0;
    });
  }, [category, city, query, userLocation.coordinates]);

  const routeTarget =
    facilities.find((f) => f.id === selectedRouteTargetId) || facilities[0] || null;

  const handleConfirmOnlineConsult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDoctor) return;
    setBookingError(null);
    setBookingBusy(true);
    try {
      const created = await bookOnlineConsultation({
        doctorId: bookingDoctor.id,
        doctorName: bookingDoctor.name,
        specialty: bookingDoctor.specialty,
        facilityName: bookingDoctor.hospital,
        city: bookingDoctor.city,
        date: slotDate,
        time: slotTime,
        reason: consultReason,
      });
      setBookingFeedback({
        doctorName: created.doctorName,
        reference: created.reference,
        date: created.date,
        time: created.time,
      });
      setBookingDoctor(null);
      setConsultReason('');
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : 'Unable to book online doctor consultation.'
      );
    } finally {
      setBookingBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FC] py-10 sm:py-12">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 space-y-8">
        {/* Header & Location Bar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#505081]">
              HealthConnect Oyo State · Online Doctors First, Physical Exam With Doctor Approval
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0F0E47] mt-1">
              Oyo State Care Directory
            </h1>
            <p className="text-sm text-[#505081] mt-1">
              Talk to any verified Oyo State doctor online under your monthly plan — zero per-visit payments.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLocationOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-white border border-[#272757]/15 text-xs sm:text-sm font-semibold text-[#0F0E47] hover:border-[#272757] self-start lg:self-auto cursor-pointer"
          >
            <LocateFixed className="w-4 h-4 text-[#E8702A]" />
            <span className="truncate max-w-[260px]">{userLocation.label}</span>
          </button>
        </div>

        {/* Subscription Status Strip */}
        <div className="rounded-2xl bg-white border border-[#272757]/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Video className="w-5 h-5 text-[#E8702A] shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <p className="font-bold text-[#0F0E47]">
                {activeSubscription.status === 'Active'
                  ? `Active Plan: ${activeSubscription.planName}`
                  : 'Monthly Subscription Required for Unlimited Online Doctors'}
              </p>
              <p className="text-[#505081] mt-0.5">
                Start every case online with your doctor. If a physical examination is required, you and your doctor pick the hospital date together inside your Dashboard.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openSubscriptionCheckout()}
            className="px-4 py-2 min-h-[40px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold shrink-0 cursor-pointer self-start sm:self-auto"
          >
            {activeSubscription.status === 'Active' ? 'Manage Plan' : 'Subscribe (₦16k / ₦50k)'}
          </button>
        </div>

        {/* Confirmed online booking banner */}
        {bookingFeedback && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-emerald-950">
                <p className="font-bold">
                  Online Doctor Consultation Booked ({bookingFeedback.reference})
                </p>
                <p className="mt-0.5 text-emerald-900">
                  {bookingFeedback.doctorName} · {bookingFeedback.date} at {bookingFeedback.time} ·
                  Included in your monthly plan (₦0 extra). After speaking online, schedule a physical exam together anytime from Appointments.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shrink-0 cursor-pointer"
            >
              Open My Appointments
            </button>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="rounded-2xl bg-white border border-[#272757]/10 p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-8 relative">
              <Search className="w-4 h-4 text-[#505081] absolute left-3.5 top-3.5" />
              <input
                type="search"
                aria-label="Search providers or facilities"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Oyo State doctors, specialties, hospitals, pharmacies or labs..."
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl bg-[#F5F6FC] border border-[#272757]/12 text-sm text-[#0F0E47]"
              />
            </div>
            <div className="md:col-span-4">
              <select
                aria-label="Filter by Oyo State city or town"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#F5F6FC] border border-[#272757]/12 text-sm text-[#0F0E47]"
              >
                <option value="All Cities">All Cities &amp; Towns (Oyo State)</option>
                {Object.keys(NIGERIA_CITY_PRESETS).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'Doctors', 'Hospital', 'Clinic', 'Pharmacy', 'Laboratory'] as CategoryTab[]).map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCategory(tab)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    category === tab
                      ? 'bg-[#272757] text-white'
                      : 'bg-[#F5F6FC] text-[#505081] hover:text-[#0F0E47]'
                  }`}
                >
                  {tab === 'All' ? 'All Care' : tab === 'Doctors' ? 'Online Doctors' : `${tab}s`}
                </button>
              )
            )}
          </div>
        </div>

        {/* Google Maps & Route Readiness Panel */}
        <div className="rounded-2xl bg-[#0F0E47] text-white p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#FFB585] font-semibold">
              <Navigation className="w-4 h-4" />
              <span>{mapsReadiness.label}</span>
            </div>
            <h2 className="text-xl font-bold">
              {routeTarget
                ? `Physical Exam Hub Route: ${routeTarget.name}`
                : 'Select an Oyo State Facility for Distance & Route'}
            </h2>
            <p className="text-xs sm:text-sm text-[#D7D8EE] leading-relaxed">
              {routeTarget
                ? `Origin: ${userLocation.label} → Destination: ${routeTarget.address}. Straight-line distance: ${
                    routeTarget.distanceKm !== null
                      ? `${routeTarget.distanceKm.toFixed(1)} km`
                      : 'Set location to compute'
                  }.`
                : 'Choose any Oyo State hospital, clinic, pharmacy, or lab below to preview coordinate alignment.'}
            </p>
            <p className="text-[11px] text-[#C7C8E6]">{mapsReadiness.detail}</p>
            {routeTarget && (
              <div className="pt-1">
                <a
                  href={buildGoogleMapsDirectionsUrl(routeTarget.coordinates, userLocation.coordinates)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold transition-colors"
                >
                  <span>Open Directions in Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 rounded-xl bg-white/8 border border-white/15 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#C7C8E6]">
              <span>Oyo Coordinate Preview</span>
              <span className="font-mono tabular-nums">
                {routeTarget
                  ? `${routeTarget.coordinates.lat.toFixed(4)}, ${routeTarget.coordinates.lng.toFixed(4)}`
                  : '7.4190, 3.9110'}
              </span>
            </div>
            <div className="h-24 rounded-lg bg-[#19185C] border border-white/10 flex items-center justify-between px-4 text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#E8702A]" />
                <span className="truncate max-w-[130px]">
                  {userLocation.source === 'gps' ? 'Your GPS' : 'Selected Oyo Town'}
                </span>
              </div>
              <div className="flex-1 mx-3 border-t border-dashed border-[#8686AC]" />
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-white" />
                <span className="truncate max-w-[130px]">
                  {routeTarget ? routeTarget.city : 'Ibadan'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Inline Online Consultation Booking Drawer */}
        {bookingDoctor && (
          <section className="rounded-2xl border-2 border-[#272757] bg-white p-6 space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Included in Monthly Subscription · ₦0 Per Visit
                </p>
                <h2 className="text-lg font-bold text-[#0F0E47] mt-0.5">
                  Book Online Doctor Consultation — {bookingDoctor.name}
                </h2>
                <p className="text-xs text-[#505081] mt-0.5">
                  {bookingDoctor.specialty} · Affiliated with {bookingDoctor.hospital} ({bookingDoctor.city})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingDoctor(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close booking panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bookingError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {bookingError}
              </div>
            )}

            <form
              onSubmit={(e) => void handleConfirmOnlineConsult(e)}
              className="grid grid-cols-1 md:grid-cols-12 gap-4"
            >
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-[#0F0E47] mb-1">
                  Preferred Date
                </label>
                <input
                  type="date"
                  required
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-[#0F0E47]"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-[#0F0E47] mb-1">
                  Video Slot (WAT)
                </label>
                <select
                  value={slotTime}
                  onChange={(e) => setSlotTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-[#0F0E47]"
                >
                  <option value="09:30 WAT">09:30 WAT</option>
                  <option value="11:00 WAT">11:00 WAT</option>
                  <option value="14:00 WAT">14:00 WAT</option>
                  <option value="16:30 WAT">16:30 WAT</option>
                  <option value="19:00 WAT">19:00 WAT</option>
                </select>
              </div>

              <div className="md:col-span-6">
                <label className="block text-xs font-semibold text-[#0F0E47] mb-1">
                  Symptoms or Discussion Topic (Optional)
                </label>
                <input
                  type="text"
                  value={consultReason}
                  onChange={(e) => setConsultReason(e.target.value)}
                  placeholder="e.g. Persistent headaches, BP review, or child fever check..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-[#0F0E47]"
                />
              </div>

              <div className="md:col-span-12 flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-xs text-[#505081]">
                  After this video consultation, you and {bookingDoctor.name} can book an in-person physical examination at {bookingDoctor.hospital} whenever needed.
                </p>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBookingDoctor(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingBusy}
                    className="px-5 py-2.5 rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {bookingBusy ? 'Confirming Slot...' : 'Confirm Online Consultation'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}

        {/* Doctors Results */}
        {doctors.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#0F0E47]">
              Verified Oyo State Online Doctors ({doctors.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doc) => (
                <article
                  key={doc.id}
                  className="rounded-2xl bg-white border border-[#272757]/10 p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start gap-4">
                      <DoctorAvatarArtwork
                        variant={doc.avatarVariant}
                        name={doc.name}
                        className="w-14 h-14 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-[#505081] truncate">{doc.mdcnStatus}</p>
                        <h3 className="text-base font-bold text-[#0F0E47] truncate">{doc.name}</h3>
                        <p className="text-xs font-medium text-[#272757]">{doc.specialty}</p>
                      </div>
                    </div>
                    <p className="text-xs text-[#505081] mt-3 leading-relaxed">{doc.bio}</p>
                    <p className="text-xs text-[#0F0E47] font-medium mt-3 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-[#505081]" />
                      {doc.hospital} · {doc.city}
                    </p>
                    <p className="text-xs text-[#505081] mt-1 flex items-center gap-1.5 tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-[#E8702A]" />
                      {doc.nextAvailable}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#272757]/10 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-emerald-700">Included in Plan</p>
                      <p className="text-[11px] text-[#505081]">Online first · Physical exam if needed</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeSubscription.status === 'Inactive') {
                          openSubscriptionCheckout('plan-oyo-individual-monthly');
                          return;
                        }
                        setBookingError(null);
                        setBookingDoctor(doc);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[42px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold cursor-pointer shrink-0"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>
                        {activeSubscription.status === 'Inactive'
                          ? 'Subscribe to Talk'
                          : 'Talk Online'}
                      </span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Partner Facilities Results (For Doctor-Scheduled Physical Exams & Fulfilment) */}
        {facilities.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-[#0F0E47]">
                Oyo State Partner Hospitals, Pharmacies &amp; Labs ({facilities.length})
              </h2>
              <p className="text-xs text-[#505081] mt-0.5">
                Physical examinations at these accredited Oyo State hubs are scheduled together with your online doctor.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {facilities.map((fac) => (
                <article
                  key={fac.id}
                  className="rounded-2xl bg-white border border-[#272757]/10 p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#505081]">
                      <span className="font-semibold text-[#272757]">{fac.type}</span>
                      <span className="tabular-nums">
                        {fac.distanceKm !== null ? `${fac.distanceKm.toFixed(1)} km` : fac.city}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#0F0E47] mt-2">{fac.name}</h3>
                    <p className="text-xs text-[#505081] mt-1">{fac.address}</p>
                    <p className="text-xs text-[#505081] mt-2">{fac.accreditedBy}</p>
                    <p className="text-xs text-[#0F0E47] mt-3">{fac.specialties.join(' · ')}</p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#272757]/10 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRouteTargetId(fac.id)}
                      className="text-xs font-semibold text-[#505081] hover:text-[#0F0E47] cursor-pointer"
                    >
                      Preview Route
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCategory('Doctors');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-4 py-2 min-h-[42px] rounded-xl bg-[#F5F6FC] hover:bg-[#E7E9F8] border border-[#272757]/15 text-[#0F0E47] text-xs font-semibold cursor-pointer"
                    >
                      Consult Doctor Online First
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {doctors.length === 0 && facilities.length === 0 && (
          <div className="rounded-2xl bg-white border border-[#272757]/10 p-10 text-center space-y-3">
            <p className="text-base font-semibold text-[#0F0E47]">
              No Oyo State healthcare providers matched your filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCity('All Cities');
                setCategory('All');
              }}
              className="px-5 py-2.5 rounded-xl bg-[#272757] text-white text-xs font-semibold cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      <LocationModal open={locationOpen} onClose={() => setLocationOpen(false)} />
    </div>
  );
}
