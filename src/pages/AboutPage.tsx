import React from 'react';
import { Globe, ShieldCheck, Layers, ArrowRight, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProjectDocsDrivePanel } from '../components/docs/ProjectDocsDrivePanel';

export function AboutPage() {
  const { navigate } = useApp();

  return (
    <div className="min-h-screen bg-[#F5F6FC] py-12 sm:py-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 space-y-12">
        <section className="rounded-3xl bg-[#0F0E47] text-white p-8 sm:p-12 space-y-5">
          <p className="text-xs font-semibold text-[#FFB585]">About HealthConnect · Universal Hybrid AI Healthcare</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight max-w-3xl">
            Connected healthcare for every age, device, and town — online and offline.
          </h1>
          <p className="text-sm sm:text-base text-[#D7D8EE] max-w-2xl leading-relaxed">
            HealthConnect unifies Hybrid On-Device &amp; Cloud AI triage, dual-layer medical red-flag emergency safety, smartwatch Web Bluetooth monitoring, offline Emergency Medical QR codes, doctor physical consultation calendars, hospital-isolated doctor rosters, least-privilege admin governance, and Oyo State monthly subscriptions.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <a
              href="#project-documentation"
              className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-sm font-semibold cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Export Project Doc to Google Drive
            </a>
            <button
              type="button"
              onClick={() => navigate('/find-healthcare')}
              className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-white text-[#0F0E47] text-sm font-semibold cursor-pointer"
            >
              Explore Oyo State Care Network <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Project Documentation Generator & Google Drive Export Studio */}
        <ProjectDocsDrivePanel />

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-3">
            <Globe className="w-6 h-6 text-[#272757]" />
            <h2 className="text-lg font-bold text-[#0F0E47]">Every Town Across Oyo State</h2>
            <p className="text-sm text-[#505081] leading-relaxed">
              Built specifically for all 27 major Oyo State cities and towns — including Ibadan, Ogbomoso, Oyo Town, Iseyin, Saki, Eruwa, Igbo-Ora, Kishi, Okeho, Lalupon, Moniya, Fiditi, Igbeti, and Igboho.
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-3">
            <ShieldCheck className="w-6 h-6 text-[#E8702A]" />
            <h2 className="text-lg font-bold text-[#0F0E47]">Online Doctor First, Physical Exam When Needed</h2>
            <p className="text-sm text-[#505081] leading-relaxed">
              Start by talking to an MDCN-verified Oyo State doctor online at ₦0 per visit. Together, you and your doctor decide when to book a physical examination synced straight to the Doctor Physical Calendar.
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-3">
            <Layers className="w-6 h-6 text-[#505081]" />
            <h2 className="text-lg font-bold text-[#0F0E47]">Simple Monthly Subscriptions &amp; Interswitch Checkout</h2>
            <p className="text-sm text-[#505081] leading-relaxed">
              No surprise per-visit fees. Choose the ₦16,000/month Individual Plan or the ₦50,000/month Netflix-style Family Plan (up to 5 profiles), processed securely through Interswitch Web Redirect with full Payment History tracking.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
