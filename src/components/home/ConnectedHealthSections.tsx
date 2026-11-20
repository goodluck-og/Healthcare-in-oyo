import React from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  FileText,
  FlaskConical,
  Lock,
  PhoneCall,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { LAB_AND_PHARMACY_PACKAGES } from '../../data/mockNigeriaData';
import { formatNaira, useApp } from '../../context/AppContext';
import { ClinicalDiagnosticsArtwork, MobileAppShowcaseArtwork } from '../ui/VisualArtwork';

export function ConnectedHealthSections() {
  const { navigate, openCheckout, bpReadings, glucoseReadings, documents } = useApp();
  const latestBp = bpReadings[0];
  const latestGlucose = glucoseReadings[0];

  return (
    <>
      {/* 14. Ambulance and Emergency Services */}
      <section id="emergency-preview" className="py-16 lg:py-20 bg-white border-y border-[#272757]/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="rounded-3xl bg-[#0F0E47] text-white p-8 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <p className="text-xs font-semibold text-[#FFB585]">24/7 Emergency Coordination</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Transparent ambulance & hospital emergency triage
              </h2>
              <p className="text-sm sm:text-base text-[#D7D8EE] leading-relaxed max-w-2xl">
                Share your coordinates or street address with accredited emergency hospitals, notify family emergency contacts, and follow every step clearly from <strong>Submitted Request</strong> to <strong>Accepted Request</strong> and <strong>Confirmed Dispatch</strong>.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/emergency')}
                  className="inline-flex items-center gap-2 px-5 py-3 min-h-[46px] rounded-xl bg-[#E5484D] hover:bg-[#C9363B] text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  Open Emergency Centre
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 gap-3">
              {[
                { step: '01. Submitted Request', desc: 'Location & symptoms queued to emergency desk.' },
                { step: '02. Accepted Request', desc: 'Partner hospital confirms trauma bay & unit assignment.' },
                { step: '03. Confirmed Dispatch', desc: 'Ambulance partner en route with live ETA updates.' },
              ].map((s) => (
                <div
                  key={s.step}
                  className="rounded-xl bg-white/8 border border-white/15 px-4 py-3"
                >
                  <p className="text-xs font-semibold text-white">{s.step}</p>
                  <p className="text-xs text-[#C7C8E6] mt-0.5">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 15. Blood Pressure & Glucose Tracking + 16. Health Records & Reports */}
      <section id="vitals-preview" className="py-16 lg:py-20 bg-[#F5F6FC]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Vitals Preview */}
          <div className="lg:col-span-6 rounded-2xl bg-white border border-[#272757]/10 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#505081]">15. Chronic Care Monitoring</p>
                <Activity className="w-5 h-5 text-[#272757]" />
              </div>
              <h2 className="text-2xl font-bold text-[#0F0E47]">
                Blood pressure & glucose tracking
              </h2>
              <p className="text-sm text-[#505081] leading-relaxed">
                Log readings manually from your validated upper-arm BP cuff or blood glucometer, view longitudinal charts, set reminders, and export clinician-ready summaries.
              </p>
              <p className="text-xs text-[#7E3308] bg-[#E8702A]/10 border border-[#E8702A]/20 rounded-xl p-3">
                Clinical Accuracy Note: An ordinary smartphone cannot measure blood pressure or blood glucose directly without a compatible validated medical device.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-[#F5F6FC] p-4">
                <p className="text-xs text-[#505081]">Latest Demo BP</p>
                <p className="text-xl font-bold text-[#0F0E47] tabular-nums mt-1">
                  {latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : '120/78'} mmHg
                </p>
              </div>
              <div className="rounded-xl bg-[#F5F6FC] p-4">
                <p className="text-xs text-[#505081]">Latest Demo Glucose</p>
                <p className="text-xl font-bold text-[#0F0E47] tabular-nums mt-1">
                  {latestGlucose ? `${latestGlucose.valueMgDl}` : '91'} mg/dL
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/monitoring')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Open BP & Glucose Monitor <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Health Records Preview */}
          <div id="records-preview" className="lg:col-span-6 rounded-2xl bg-white border border-[#272757]/10 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#505081]">16. Unified Patient Vault</p>
                <FileText className="w-5 h-5 text-[#272757]" />
              </div>
              <h2 className="text-2xl font-bold text-[#0F0E47]">
                Health records, lab reports & family profiles
              </h2>
              <p className="text-sm text-[#505081] leading-relaxed">
                Keep discharge notes, ECG screenings, prescriptions, and child immunisation cards organised for you and your dependents—ready to share or summarise with AI.
              </p>
            </div>

            <div className="space-y-2.5">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-xl bg-[#F5F6FC] px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#0F0E47] truncate">{doc.title}</p>
                    <p className="text-[11px] text-[#505081] truncate">
                      {doc.category} · {doc.issuer}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-[#505081] tabular-nums shrink-0">
                    {doc.date}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-xl border border-[#272757]/20 hover:bg-[#F5F6FC] text-[#0F0E47] text-sm font-semibold transition-colors cursor-pointer"
            >
              Open Patient Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 17. Pharmacy and Laboratory Services */}
      <section id="pharmacy-lab" className="py-16 lg:py-20 bg-white border-y border-[#272757]/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-10">
            <div className="lg:col-span-6 space-y-3">
              <p className="text-xs font-semibold text-[#505081]">Diagnostics & NAFDAC-Verified Dispensing</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F0E47]">
                Pharmacy fulfilment and accredited laboratory panels
              </h2>
              <p className="text-sm sm:text-base text-[#505081] leading-relaxed">
                Order transparent diagnostic panels with optional home phlebotomy or schedule chronic prescription refills from PCN-licensed partner pharmacies.
              </p>
            </div>
            <div className="lg:col-span-6">
              <ClinicalDiagnosticsArtwork className="h-[220px]" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {LAB_AND_PHARMACY_PACKAGES.map((pkg) => (
              <article
                key={pkg.id}
                className="rounded-2xl bg-[#F5F6FC] border border-[#272757]/10 p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#505081]">
                    <span className="font-semibold text-[#272757]">{pkg.category}</span>
                    <FlaskConical className="w-4 h-4 text-[#505081]" />
                  </div>
                  <h3 className="text-base font-bold text-[#0F0E47] mt-3">{pkg.name}</h3>
                  <p className="text-xs text-[#505081] mt-2 leading-relaxed">{pkg.details}</p>
                  <p className="text-xs text-[#272757] font-medium mt-3">{pkg.turnaround}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-[#272757]/10 flex items-center justify-between gap-2">
                  <span className="text-base font-bold text-[#0F0E47] tabular-nums">
                    {formatNaira(pkg.priceNgn)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      openCheckout({
                        title: pkg.name,
                        subtitle: `${pkg.category} · ${pkg.turnaround}`,
                        category: pkg.category,
                        amountNgn: pkg.priceNgn,
                      })
                    }
                    className="px-3.5 py-2 min-h-[40px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold cursor-pointer"
                  >
                    Order Now
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 18. HealthConnect Mobile App Promotion */}
      <section id="mobile-app" className="py-16 lg:py-20 bg-[#F5F6FC]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <p className="text-xs font-semibold text-[#505081]">Mobile & Low-Bandwidth Access</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F0E47]">
                Your family health passport—built for Nigeria’s connectivity realities
              </h2>
              <p className="text-sm sm:text-base text-[#505081] leading-relaxed max-w-2xl">
                Access your emergency blood-group & allergy card offline, receive WhatsApp or SMS appointment reminders, and pair low-data mobile screens with USSD continuity (*347*88# concept).
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-[#0F0E47]">
                {[
                  'Offline Emergency Card & Allergies',
                  'WhatsApp & SMS Appointment Reminders',
                  'Multi-dependent Family Switcher',
                  'Interswitch Receipts & NHIA Reference',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#E8702A] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-sm font-semibold cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  Launch Web App Experience
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <MobileAppShowcaseArtwork />
            </div>
          </div>
        </div>
      </section>

      {/* 19. Trust, Security & Provider Verification */}
      <section id="trust-security" className="py-16 lg:py-20 bg-white border-t border-[#272757]/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold text-[#505081]">Governance & Clinical Integrity</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F0E47] mt-1">
              Trust, security & regulatory alignment
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-[#F5F6FC] border border-[#272757]/10 p-6 space-y-2.5">
              <ShieldCheck className="w-6 h-6 text-[#272757]" />
              <h3 className="text-base font-bold text-[#0F0E47]">Provider Credentialing</h3>
              <p className="text-sm text-[#505081] leading-relaxed">
                Structured verification workflows for MDCN-licensed physicians, PCN-registered pharmacies, and MLSCN-accredited diagnostic laboratories.
              </p>
            </div>
            <div className="rounded-2xl bg-[#F5F6FC] border border-[#272757]/10 p-6 space-y-2.5">
              <Lock className="w-6 h-6 text-[#272757]" />
              <h3 className="text-base font-bold text-[#0F0E47]">NDPA Data Protection</h3>
              <p className="text-sm text-[#505081] leading-relaxed">
                Consent-first location sharing, server-side AI API key isolation, and strict role-based patient record governance aligned with Nigeria Data Protection Act standards.
              </p>
            </div>
            <div className="rounded-2xl bg-[#F5F6FC] border border-[#272757]/10 p-6 space-y-2.5">
              <Activity className="w-6 h-6 text-[#E8702A]" />
              <h3 className="text-base font-bold text-[#0F0E47]">Responsible Prototype Clarity</h3>
              <p className="text-sm text-[#505081] leading-relaxed">
                All Nigerian hospital listings, doctor slots, patient logs, and Interswitch checkout records shown in this workspace are clearly labelled demonstration data.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
