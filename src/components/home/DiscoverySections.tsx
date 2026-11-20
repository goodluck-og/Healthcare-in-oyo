import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  LocateFixed,
  MapPin,
  Search,
  Video,
} from 'lucide-react';
import {
  DEMO_DOCTORS,
  DEMO_FACILITIES,
  NIGERIA_CITY_PRESETS,
  POPULAR_SERVICES,
} from '../../data/mockNigeriaData';
import { formatNaira, useApp } from '../../context/AppContext';
import { DoctorAvatarArtwork } from '../ui/VisualArtwork';
import { LocationModal } from '../modals/LocationModal';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function DiscoverySections() {
  const { navigate, openCheckout, userLocation } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('All Cities');
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  // Quick appointment builder state
  const [selectedDoctorId, setSelectedDoctorId] = useState(DEMO_DOCTORS[0].id);
  const [appointmentDate, setAppointmentDate] = useState('2026-11-24');
  const [appointmentTime, setAppointmentTime] = useState('10:30 WAT');
  const [appointmentMode, setAppointmentMode] = useState<'In-Person' | 'Video Telehealth'>('In-Person');

  const filteredDoctors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return DEMO_DOCTORS.filter((doc) => {
      const cityMatch = cityFilter === 'All Cities' || doc.city === cityFilter;
      const textMatch =
        !q ||
        doc.name.toLowerCase().includes(q) ||
        doc.specialty.toLowerCase().includes(q) ||
        doc.hospital.toLowerCase().includes(q) ||
        doc.city.toLowerCase().includes(q);
      return cityMatch && textMatch;
    });
  }, [searchQuery, cityFilter]);

  const filteredFacilities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return DEMO_FACILITIES.filter((fac) => {
      const cityMatch = cityFilter === 'All Cities' || fac.city === cityFilter;
      const textMatch =
        !q ||
        fac.name.toLowerCase().includes(q) ||
        fac.type.toLowerCase().includes(q) ||
        fac.specialties.some((s) => s.toLowerCase().includes(q)) ||
        fac.city.toLowerCase().includes(q);
      return cityMatch && textMatch;
    });
  }, [searchQuery, cityFilter]);

  const selectedDoctor =
    DEMO_DOCTORS.find((d) => d.id === selectedDoctorId) || DEMO_DOCTORS[0];

  return (
    <>
      {/* 2. Healthcare Search */}
      <section id="search" className="bg-white border-b border-[#272757]/10 py-10 sm:py-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold text-[#505081]">Unified Care Discovery</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F0E47] mt-1">
                Search verified doctors, hospitals, pharmacies & labs
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#272757] hover:text-[#0F0E47] px-3.5 py-2 min-h-[40px] rounded-xl bg-[#F5F6FC] border border-[#272757]/12 self-start lg:self-auto cursor-pointer"
            >
              <LocateFixed className="w-4 h-4 text-[#E8702A]" />
              <span className="truncate max-w-[240px] sm:max-w-xs">{userLocation.label}</span>
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate('/find-healthcare');
            }}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 rounded-2xl bg-[#F5F6FC] border border-[#272757]/12"
          >
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-[#505081] absolute left-3.5 top-3.5" />
              <input
                type="search"
                aria-label="Search doctors, specialties, hospitals or diagnostic tests"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cardiology, malaria panel, Victoria Island, Dr. Adewale..."
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl bg-white border border-[#272757]/12 text-sm text-[#0F0E47] focus:outline-none focus:ring-2 focus:ring-[#272757]"
              />
            </div>

            <div className="md:col-span-3">
              <select
                aria-label="Filter by Nigerian city"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-white border border-[#272757]/12 text-sm text-[#0F0E47]"
              >
                <option value="All Cities">All Nigerian Hubs</option>
                {Object.keys(NIGERIA_CITY_PRESETS).map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 flex gap-2">
              <button
                type="submit"
                className="w-full px-5 py-2.5 min-h-[44px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                Explore Directory
              </button>
            </div>
          </form>

          {searchQuery.trim() && (
            <div className="mt-4 text-xs text-[#505081]">
              Showing {filteredDoctors.length} specialists and {filteredFacilities.length} facilities matching "{searchQuery.trim()}" below.
            </div>
          )}
        </div>
      </section>

      {/* 3. Popular Healthcare Services */}
      <section id="services" className="py-16 lg:py-20 bg-[#F5F6FC]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold text-[#505081]">Core Care Pathways</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F0E47] mt-1">
                Essential healthcare services built for everyday clarity
              </h2>
            </div>
            <p className="text-sm text-[#505081] max-w-md">
              Transparent pricing in Nigerian Naira, verified clinicians, and connected follow-up care.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {POPULAR_SERVICES.map((srv) => (
              <button
                key={srv.id}
                type="button"
                onClick={() => navigate(srv.targetRoute, srv.sectionAnchor)}
                className="group text-left rounded-2xl bg-white border border-[#272757]/10 hover:border-[#272757]/35 p-6 transition-all flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#505081]">
                    <span className="font-mono font-semibold text-[#272757]">{srv.index}.</span>
                    <span>{srv.typicalTurnaround}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#0F0E47] mt-3 group-hover:text-[#272757]">
                    {srv.title}
                  </h3>
                  <p className="text-sm text-[#505081] leading-relaxed mt-2">{srv.summary}</p>
                </div>
                <div className="pt-5 mt-5 border-t border-[#272757]/8 flex items-center justify-between text-xs font-semibold text-[#272757]">
                  <span className="tabular-nums">
                    {srv.startingFeeNgn > 0
                      ? `From ${formatNaira(srv.startingFeeNgn)}`
                      : 'Free self-service & triage'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#E8702A]">
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Find Doctors and Specialists */}
      <section id="doctors" className="py-16 lg:py-20 bg-white border-y border-[#272757]/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold text-[#505081]">Demonstration Clinician Network</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F0E47] mt-1">
                Find doctors and specialists across Nigeria
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/find-healthcare')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#272757] hover:text-[#0F0E47] cursor-pointer"
            >
              View all specialists <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {filteredDoctors.length === 0 ? (
            <div className="rounded-2xl bg-[#F5F6FC] border border-[#272757]/10 p-8 text-center">
              <p className="text-sm font-semibold text-[#0F0E47]">No specialists matched your current filter.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCityFilter('All Cities');
                }}
                className="mt-3 px-4 py-2 rounded-xl bg-[#272757] text-white text-xs font-semibold cursor-pointer"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDoctors.map((doc) => (
                <article
                  key={doc.id}
                  className="rounded-2xl bg-[#F5F6FC]/60 border border-[#272757]/10 p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start gap-4">
                      <DoctorAvatarArtwork
                        variant={doc.avatarVariant}
                        name={doc.name}
                        className="w-16 h-16 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-[#505081] truncate">{doc.mdcnStatus}</p>
                        <h3 className="text-base font-bold text-[#0F0E47] mt-0.5 truncate">
                          {doc.name}
                        </h3>
                        <p className="text-xs font-medium text-[#272757] mt-0.5">
                          {doc.specialty}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-[#505081] mt-4 leading-relaxed">{doc.bio}</p>

                    <div className="mt-4 pt-4 border-t border-[#272757]/10 space-y-1.5 text-xs text-[#505081]">
                      <p className="flex items-center gap-1.5 text-[#0F0E47] font-medium">
                        <Building2 className="w-3.5 h-3.5 text-[#505081] shrink-0" />
                        <span className="truncate">{doc.hospital} · {doc.city}</span>
                      </p>
                      <p className="flex items-center gap-1.5 tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-[#E8702A] shrink-0" />
                        <span>Next slot: {doc.nextAvailable}</span>
                      </p>
                      <p>Languages: {doc.languages.join(' · ')}</p>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#272757]/10 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] text-[#505081]">Consultation</p>
                      <p className="text-base font-bold text-[#0F0E47] tabular-nums">
                        {formatNaira(doc.consultationFeeNgn)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        openCheckout({
                          title: `Consultation · ${doc.name}`,
                          subtitle: `${doc.specialty} · ${doc.hospital} (${doc.city})`,
                          category: 'Consultation',
                          amountNgn: doc.consultationFeeNgn,
                          appointmentMeta: {
                            doctorId: doc.id,
                            doctorName: doc.name,
                            specialty: doc.specialty,
                            facilityName: doc.hospital,
                            city: doc.city,
                            date: '2026-11-24',
                            time: '11:00 WAT',
                            mode: doc.supportsTelehealth ? 'Video Telehealth' : 'In-Person',
                          },
                        })
                      }
                      className="px-4 py-2.5 min-h-[42px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Book Consultation
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. Find Hospitals and Clinics */}
      <section id="hospitals" className="py-16 lg:py-20 bg-[#F5F6FC]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold text-[#505081]">Accredited Facilities (Demo Data)</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F0E47] mt-1">
                Hospitals, clinics, pharmacies & diagnostics near you
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[42px] rounded-xl bg-white border border-[#272757]/15 text-xs font-semibold text-[#272757] hover:border-[#272757] cursor-pointer self-start md:self-auto"
            >
              <MapPin className="w-4 h-4 text-[#E8702A]" />
              Update Location for Distance
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFacilities.map((fac) => {
              const dist = userLocation.coordinates
                ? haversineKm(
                    userLocation.coordinates.lat,
                    userLocation.coordinates.lng,
                    fac.coordinates.lat,
                    fac.coordinates.lng
                  )
                : null;
              return (
                <article
                  key={fac.id}
                  className="rounded-2xl bg-white border border-[#272757]/10 p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#505081]">
                      <span className="font-semibold text-[#272757]">{fac.type}</span>
                      <span className="tabular-nums">
                        {dist !== null ? `${dist.toFixed(1)} km away` : fac.city}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#0F0E47] mt-2">{fac.name}</h3>
                    <p className="text-xs text-[#505081] mt-1">{fac.address}</p>
                    <p className="text-xs text-[#505081] mt-3">
                      {fac.specialties.join(' · ')}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#272757]/10 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[#505081]">
                      {fac.emergency24h ? '24/7 Emergency Intake' : fac.phoneNote}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/find-healthcare')}
                      className="font-semibold text-[#272757] hover:text-[#E8702A] whitespace-nowrap cursor-pointer"
                    >
                      View Details
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Book Appointments */}
      <section id="appointments" className="py-16 lg:py-20 bg-white border-b border-[#272757]/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-semibold text-[#505081]">Instant Scheduling</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F0E47]">
                Book in-person or video consultations in under a minute
              </h2>
              <p className="text-sm sm:text-base text-[#505081] leading-relaxed">
                Select a verified Nigerian specialist, choose clinic visit or encrypted video care, and confirm transparently with Interswitch Web Checkout sandbox.
              </p>
              <div className="space-y-2.5 pt-2 text-sm text-[#0F0E47]">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[#E8702A]" />
                  <span>Automatic reminders synced to your Patient Dashboard</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Video className="w-4 h-4 text-[#272757]" />
                  <span>Low-bandwidth audio fallback for video consultations</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl bg-[#F5F6FC] border border-[#272757]/12 p-6 sm:p-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="quick-doc" className="block text-xs font-semibold text-[#272757] mb-1.5">
                      1. Specialist
                    </label>
                    <select
                      id="quick-doc"
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-white border border-[#272757]/15 text-sm text-[#0F0E47]"
                    >
                      {DEMO_DOCTORS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} — {d.city} ({formatNaira(d.consultationFeeNgn)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="quick-date" className="block text-xs font-semibold text-[#272757] mb-1.5">
                      2. Preferred Date
                    </label>
                    <input
                      id="quick-date"
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-white border border-[#272757]/15 text-sm text-[#0F0E47] tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-semibold text-[#272757] mb-1.5">
                      3. Time Slot (WAT)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {['09:30 WAT', '11:00 WAT', '15:30 WAT'].map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setAppointmentTime(slot)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium tabular-nums transition-colors cursor-pointer ${
                            appointmentTime === slot
                              ? 'bg-[#272757] text-white'
                              : 'bg-white border border-[#272757]/15 text-[#505081] hover:text-[#0F0E47]'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-[#272757] mb-1.5">
                      4. Consultation Format
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {(['In-Person', 'Video Telehealth'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setAppointmentMode(mode)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            appointmentMode === mode
                              ? 'bg-[#272757] text-white'
                              : 'bg-white border border-[#272757]/15 text-[#505081]'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#272757]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-[#505081]">
                      {selectedDoctor.hospital} · {selectedDoctor.city}
                    </p>
                    <p className="text-lg font-bold text-[#0F0E47] tabular-nums">
                      Total: {formatNaira(selectedDoctor.consultationFeeNgn)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openCheckout({
                        title: `Appointment · ${selectedDoctor.name}`,
                        subtitle: `${appointmentMode} · ${appointmentDate} at ${appointmentTime}`,
                        category: 'Consultation',
                        amountNgn: selectedDoctor.consultationFeeNgn,
                        appointmentMeta: {
                          doctorId: selectedDoctor.id,
                          doctorName: selectedDoctor.name,
                          specialty: selectedDoctor.specialty,
                          facilityName: selectedDoctor.hospital,
                          city: selectedDoctor.city,
                          date: appointmentDate,
                          time: appointmentTime,
                          mode: appointmentMode,
                        },
                      })
                    }
                    className="w-full sm:w-auto px-6 py-3 min-h-[46px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Proceed to Appointment Checkout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LocationModal open={locationModalOpen} onClose={() => setLocationModalOpen(false)} />
    </>
  );
}
