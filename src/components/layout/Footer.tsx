import React from 'react';
import { ShieldCheck, MapPin, PhoneCall } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function Footer() {
  const { navigate } = useApp();

  return (
    <footer id="footer" className="bg-[#0F0E47] text-white border-t border-white/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          <div className="lg:col-span-4 space-y-4">
            <div className="text-xl font-bold tracking-tight">
              HealthConnect
            </div>
            <p className="text-sm text-[#C7C8E6] leading-relaxed max-w-sm">
              Universal Hybrid AI healthcare platform for every age group — personalised care dashboards, verified DOID/WHO offline medical knowledge, smartwatch GPS safety, offline Emergency Medical QR, and Oyo/Nigeria clinical care.
            </p>
            <div className="flex items-start gap-2.5 text-xs text-[#C7C8E6] pt-1">
              <MapPin className="w-4 h-4 text-[#E8702A] shrink-0 mt-0.5" />
              <span>Universal Emergency Presets (112 · 911 · 999) · Nigeria &amp; Oyo State Care Network</span>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-sm font-semibold text-white">Platform</h3>
            <ul className="space-y-2.5 text-sm text-[#C7C8E6]">
              <li>
                <button type="button" onClick={() => navigate('/find-healthcare')} className="hover:text-white transition-colors cursor-pointer">
                  Find Healthcare
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/dashboard')} className="hover:text-white transition-colors cursor-pointer">
                  Patient Dashboard
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/ai-assistant')} className="hover:text-white transition-colors cursor-pointer">
                  AI Health Assistant
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/monitoring')} className="hover:text-white transition-colors cursor-pointer">
                  BP & Glucose Monitor
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/payments')} className="hover:text-white transition-colors cursor-pointer">
                  Payments &amp; Receipts
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/about', 'project-documentation')} className="text-[#FFB585] hover:text-white font-semibold transition-colors cursor-pointer">
                  Project Docs &amp; Google Drive
                </button>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-sm font-semibold text-white">Care Pathways</h3>
            <ul className="space-y-2.5 text-sm text-[#C7C8E6]">
              <li>
                <button type="button" onClick={() => navigate('/', 'maternal-child')} className="hover:text-white transition-colors cursor-pointer">
                  Maternal & Child Health
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/', 'mental-health')} className="hover:text-white transition-colors cursor-pointer">
                  Mental Healthcare
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/', 'home-nursing')} className="hover:text-white transition-colors cursor-pointer">
                  Home Nursing & Elderly Care
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/', 'equipment-rental')} className="hover:text-white transition-colors cursor-pointer">
                  Medical Equipment Rental
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/', 'blood-network')} className="hover:text-white transition-colors cursor-pointer">
                  Blood Donor Network
                </button>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-sm font-semibold text-white">Emergency & Governance</h3>
            <button
              type="button"
              onClick={() => navigate('/emergency')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#E5484D] hover:bg-[#C9363B] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              Open Emergency Centre
            </button>
            <div className="flex items-start gap-2.5 text-xs text-[#C7C8E6] leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-[#8686AC] shrink-0 mt-0.5" />
              <span>
                Architecture aligned with NDPA data privacy principles, MDCN/PCN/MLSCN credentialing workflows, and Interswitch Web Checkout sandbox readiness.
              </span>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#8686AC]">
          <p>© 2026 HealthConnect. Universal Hybrid AI Healthcare &amp; Emergency Safety Platform.</p>
          <p>
            Interswitch Web Redirect Checkout active · Sandbox mode uses official test credentials without charging real funds.
          </p>
        </div>
      </div>
    </footer>
  );
}
