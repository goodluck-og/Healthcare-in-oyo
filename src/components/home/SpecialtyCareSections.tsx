import React, { useState } from 'react';
import {
  ArrowRight,
  Bot,
  Brain,
  Droplets,
  HeartHandshake,
  Home,
  Package,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { BLOOD_DONOR_HUBS, MEDICAL_EQUIPMENT_RENTALS } from '../../data/mockNigeriaData';
import { formatNaira, useApp } from '../../context/AppContext';
import { MaternalCareArtwork } from '../ui/VisualArtwork';

export function SpecialtyCareSections() {
  const { navigate, openCheckout } = useApp();
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>('All');
  const [donorRegistered, setDonorRegistered] = useState(false);

  const filteredBloodHubs = BLOOD_DONOR_HUBS.filter(
    (hub) =>
      selectedBloodGroup === 'All' ||
      hub.neededGroups.includes(selectedBloodGroup) ||
      hub.availableGroups.includes(selectedBloodGroup)
  );

  return (
    <>
      {/* 7. AI Health Assistant Preview */}
      <section id="ai-assistant-preview" className="py-16 lg:py-20 bg-[#0F0E47] text-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-5">
              <p className="text-xs font-semibold text-[#C7C8E6]">Guided Health Information</p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                AI Health Assistant for plain-language clarity
              </h2>
              <p className="text-sm sm:text-base text-[#D7D8EE] leading-relaxed max-w-xl">
                Understand lab reports, organise questions before a specialist visit, review general symptom guidance, and discover relevant Nigerian care services—powered by a secure server-side Gemini & OpenRouter architecture.
              </p>

              <div className="rounded-xl bg-white/8 border border-white/15 p-4 flex items-start gap-3 text-xs text-[#E6E8F6]">
                <ShieldAlert className="w-4 h-4 text-[#E8702A] shrink-0 mt-0.5" />
                <span>
                  Clinical Safety Notice: HealthConnect AI provides educational health information only and is not a replacement for a qualified physician, pharmacist, or emergency response team.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/ai-assistant')}
                  className="inline-flex items-center gap-2 px-5 py-3 min-h-[46px] rounded-xl bg-white text-[#0F0E47] hover:bg-[#F5F6FC] text-sm font-semibold transition-colors cursor-pointer"
                >
                  <Bot className="w-4 h-4" />
                  Open AI Health Assistant
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl bg-[#1A195E] border border-white/15 p-6 space-y-4">
                <p className="text-xs font-semibold text-[#C7C8E6]">Try a Guided Conversation Topic</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    'Explain my HbA1c & lipid lab report',
                    'Prepare questions for a Lagos cardiologist',
                    'General guidance on persistent fever & hydration',
                    'Summarise my blood pressure log trends',
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => navigate('/ai-assistant')}
                      className="text-left rounded-xl bg-white/8 hover:bg-white/15 border border-white/12 p-3.5 text-xs text-white transition-colors cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Blood Donor Network */}
      <section id="blood-network" className="py-16 lg:py-20 bg-[#F5F6FC]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold text-[#505081]">Community Life Support</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F0E47] mt-1">
                Verified Blood Donor & Safe Screening Network
              </h2>
              <p className="text-sm text-[#505081] mt-2 max-w-2xl">
                Connect with accredited blood screening units in Lagos, Abuja, and Port Harcourt for voluntary donation scheduling or hospital-coordinated blood matching.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDonorRegistered(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#E5484D] hover:bg-[#C9363B] text-white text-xs sm:text-sm font-semibold transition-colors self-start lg:self-auto cursor-pointer"
            >
              <Droplets className="w-4 h-4" />
              {donorRegistered ? 'Voluntary Donor Pledge Saved (Demo)' : 'Pledge as Voluntary Donor'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            {['All', 'O-', 'O+', 'A+', 'B+', 'AB+'].map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setSelectedBloodGroup(group)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                  selectedBloodGroup === group
                    ? 'bg-[#272757] text-white'
                    : 'bg-white border border-[#272757]/15 text-[#505081] hover:text-[#0F0E47]'
                }`}
              >
                {group === 'All' ? 'All Blood Groups' : group}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredBloodHubs.map((hub) => (
              <div
                key={hub.id}
                className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-[#505081]">
                  <span className="font-semibold text-[#272757]">{hub.city}, {hub.state}</span>
                  <span>Screened Centre</span>
                </div>
                <h3 className="text-base font-bold text-[#0F0E47]">{hub.name}</h3>
                <p className="text-xs text-[#505081]">
                  Priority Needed: <strong className="text-[#E5484D]">{hub.neededGroups.join(' · ')}</strong>
                </p>
                <p className="text-xs text-[#505081]">
                  Currently Screened Units: {hub.availableGroups.join(' · ')}
                </p>
                <p className="text-xs text-[#505081] pt-2 border-t border-[#272757]/10">
                  {hub.screeningHours}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Maternal and Child Health + 10. Mental Healthcare */}
      <section id="maternal-child" className="py-16 lg:py-20 bg-white border-y border-[#272757]/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 space-y-16">
          {/* Maternal & Child */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <MaternalCareArtwork />
            </div>
            <div className="lg:col-span-6 space-y-4">
              <p className="text-xs font-semibold text-[#505081]">09. Maternal & Child Health</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F0E47]">
                Safer pregnancies and tracked childhood immunisations
              </h2>
              <p className="text-sm sm:text-base text-[#505081] leading-relaxed">
                Pair mothers with obstetricians and paediatricians across Lagos, Abuja, and Port Harcourt. Keep digital antenatal milestone records, newborn wellness schedules, and emergency obstetric escalation plans in one family profile.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/find-healthcare')}
                  className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-sm font-semibold cursor-pointer"
                >
                  Find OB-GYN & Paediatricians
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm font-semibold text-[#272757] hover:bg-[#F5F6FC] cursor-pointer"
                >
                  View Child Profile Demo
                </button>
              </div>
            </div>
          </div>

          {/* 10. Mental Healthcare + 11. Home Nursing + 12. Rehab & Physiotherapy */}
          <div id="mental-health" className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
            <article className="rounded-2xl bg-[#F5F6FC] border border-[#272757]/10 p-6 flex flex-col justify-between">
              <div>
                <Brain className="w-6 h-6 text-[#272757]" />
                <p className="text-xs text-[#505081] mt-4">Confidential Tele-Therapy</p>
                <h3 className="text-lg font-bold text-[#0F0E47] mt-1">Mental Healthcare</h3>
                <p className="text-sm text-[#505081] leading-relaxed mt-2">
                  Private video or audio sessions with licensed Nigerian clinical psychologists and psychiatrists for stress, burnout, anxiety, and postpartum support.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  openCheckout({
                    title: 'Private Tele-Therapy Session · Dr. Tunde Bakare',
                    subtitle: '50-minute encrypted video session · Clinical Psychology',
                    category: 'Consultation',
                    amountNgn: 18500,
                    appointmentMeta: {
                      doctorId: 'doc-tunde',
                      doctorName: 'Dr. Tunde Bakare',
                      specialty: 'Clinical Psychology & Mental Health',
                      facilityName: 'Serene Mind Telehealth Practice',
                      city: 'Lagos',
                      date: '2026-11-26',
                      time: '18:30 WAT',
                      mode: 'Video Telehealth',
                    },
                  })
                }
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#272757] hover:text-[#E8702A] cursor-pointer"
              >
                Book Confidential Session ({formatNaira(18500)}) <ArrowRight className="w-4 h-4" />
              </button>
            </article>

            <article id="home-nursing" className="rounded-2xl bg-[#F5F6FC] border border-[#272757]/10 p-6 flex flex-col justify-between">
              <div>
                <Home className="w-6 h-6 text-[#E8702A]" />
                <p className="text-xs text-[#505081] mt-4">In-Home Clinical Support</p>
                <h3 className="text-lg font-bold text-[#0F0E47] mt-1">Home Nursing & Elderly Care</h3>
                <p className="text-sm text-[#505081] leading-relaxed mt-2">
                  Vetted registered nurses for elderly vitals visits, wound dressing, post-surgical recovery, and chronic care check-ins at home—ideal for diaspora families supporting parents in Nigeria.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  openCheckout({
                    title: 'Home Nursing Visit · Registered Nurse (Single Visit)',
                    subtitle: 'Vitals check, medication review & family report · Lagos/Abuja/Enugu',
                    category: 'Consultation',
                    amountNgn: 16000,
                  })
                }
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#272757] hover:text-[#E8702A] cursor-pointer"
              >
                Schedule Home Visit ({formatNaira(16000)}) <ArrowRight className="w-4 h-4" />
              </button>
            </article>

            <article id="rehab-physio" className="rounded-2xl bg-[#F5F6FC] border border-[#272757]/10 p-6 flex flex-col justify-between">
              <div>
                <HeartHandshake className="w-6 h-6 text-[#505081]" />
                <p className="text-xs text-[#505081] mt-4">Mobility & Recovery</p>
                <h3 className="text-lg font-bold text-[#0F0E47] mt-1">Rehabilitation & Physiotherapy</h3>
                <p className="text-sm text-[#505081] leading-relaxed mt-2">
                  Structured orthopaedic, stroke-recovery, and sports physiotherapy sessions coordinated with Cedarcrest and Lagos rehab specialists.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  openCheckout({
                    title: 'Physiotherapy Assessment & Mobility Plan',
                    subtitle: 'Clinic or home session · Licensed Physiotherapist',
                    category: 'Consultation',
                    amountNgn: 20000,
                  })
                }
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#272757] hover:text-[#E8702A] cursor-pointer"
              >
                Book Rehab Assessment ({formatNaira(20000)}) <ArrowRight className="w-4 h-4" />
              </button>
            </article>
          </div>
        </div>
      </section>

      {/* 13. Medical Equipment Rental */}
      <section id="equipment-rental" className="py-16 lg:py-20 bg-[#F5F6FC]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold text-[#505081]">Calibrated Clinical Devices</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F0E47] mt-1">
                Medical equipment rental for home recovery & monitoring
              </h2>
            </div>
            <span className="text-xs text-[#505081] inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#E8702A]" />
              Sanitised & calibrated before every dispatch
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {MEDICAL_EQUIPMENT_RENTALS.map((eq) => (
              <article
                key={eq.id}
                className="rounded-2xl bg-white border border-[#272757]/10 p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#505081]">
                    <span>{eq.category}</span>
                    <Package className="w-4 h-4 text-[#272757]" />
                  </div>
                  <h3 className="text-base font-bold text-[#0F0E47] mt-3">{eq.name}</h3>
                  <p className="text-xs text-[#505081] leading-relaxed mt-2">{eq.calibrationNote}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-[#272757]/10 space-y-3">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-[#505081]">Weekly Rental</span>
                    <span className="text-base font-bold text-[#0F0E47] tabular-nums">
                      {formatNaira(eq.weeklyRateNgn)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openCheckout({
                        title: `Equipment Rental (7 Days) · ${eq.name}`,
                        subtitle: `${eq.category} · Sanitised home delivery`,
                        category: 'Equipment Rental',
                        amountNgn: eq.weeklyRateNgn,
                      })
                    }
                    className="w-full py-2.5 min-h-[42px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Reserve Equipment
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
