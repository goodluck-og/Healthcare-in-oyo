import React from 'react';
import { HeartPulse, ShieldCheck, Stethoscope, Microscope, Activity } from 'lucide-react';
import type { Doctor } from '../../types/healthcare';

export function DoctorAvatarArtwork({
  variant,
  name,
  className = '',
}: {
  variant: Doctor['avatarVariant'];
  name: string;
  className?: string;
}) {
  const paletteMap: Record<Doctor['avatarVariant'], { bg: string; coat: string; accent: string; initials: string }> = {
    adewale: { bg: '#E6E8F6', coat: '#272757', accent: '#505081', initials: 'AO' },
    chioma: { bg: '#EAEAF8', coat: '#0F0E47', accent: '#E8702A', initials: 'CN' },
    ibrahim: { bg: '#E5E8F5', coat: '#33366B', accent: '#8686AC', initials: 'ID' },
    ngozi: { bg: '#ECECF9', coat: '#272757', accent: '#E5484D', initials: 'NO' },
    tunde: { bg: '#E8EAF7', coat: '#505081', accent: '#272757', initials: 'TB' },
    amina: { bg: '#E6E9F6', coat: '#0F0E47', accent: '#505081', initials: 'AB' },
  };

  const theme = paletteMap[variant];

  return (
    <div
      role="img"
      aria-label={`Portrait emblem for ${name}`}
      className={`relative overflow-hidden rounded-xl border border-[#272757]/10 flex items-center justify-center select-none ${className}`}
      style={{ backgroundColor: theme.bg }}
    >
      <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
        <defs>
          <linearGradient id={`grad-${variant}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={theme.coat} stopOpacity="0.16" />
            <stop offset="100%" stopColor={theme.accent} stopOpacity="0.06" />
          </linearGradient>
        </defs>
        <rect width="120" height="120" fill={`url(#grad-${variant})`} />
        <circle cx="96" cy="24" r="22" fill={theme.accent} opacity="0.12" />
        <path
          d="M22 120 C24 90, 42 80, 60 80 C78 80, 96 90, 98 120 Z"
          fill={theme.coat}
          opacity="0.92"
        />
        <circle cx="60" cy="48" r="20" fill={theme.coat} opacity="0.88" />
        <path
          d="M44 92 Q60 105 76 92"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <text
          x="60"
          y="53"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="14"
          fontWeight="600"
          fontFamily="DM Sans, sans-serif"
          letterSpacing="1"
        >
          {theme.initials}
        </text>
      </svg>
    </div>
  );
}

export function ClinicalDiagnosticsArtwork({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F0E47] via-[#1B1A59] to-[#272757] text-white ${className}`}
    >
      <svg
        viewBox="0 0 640 420"
        className="w-full h-full object-cover"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="diagGlow" cx="72%" cy="32%" r="60%">
            <stop offset="0%" stopColor="#8686AC" stopOpacity="0.38" />
            <stop offset="55%" stopColor="#505081" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0F0E47" stopOpacity="0" />
          </radialGradient>
          <pattern id="diagGrid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#8686AC" strokeOpacity="0.14" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="640" height="420" fill="url(#diagGrid)" />
        <rect width="640" height="420" fill="url(#diagGlow)" />
        <path
          d="M 40 245 L 150 245 L 175 210 L 195 280 L 220 175 L 245 275 L 265 245 L 380 245 L 405 220 L 425 268 L 448 190 L 470 258 L 490 245 L 600 245"
          fill="none"
          stroke="#8686AC"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="220" cy="175" r="5" fill="#E8702A" />
        <circle cx="448" cy="190" r="5" fill="#FFFFFF" />
        <rect x="64" y="56" width="220" height="92" rx="14" fill="#FFFFFF" fillOpacity="0.06" stroke="#FFFFFF" strokeOpacity="0.14" />
        <rect x="356" y="294" width="220" height="76" rx="14" fill="#FFFFFF" fillOpacity="0.06" stroke="#FFFFFF" strokeOpacity="0.14" />
      </svg>
      <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none">
        <div className="flex items-center justify-between text-xs text-[#C7C8E6]">
          <span className="flex items-center gap-2 font-medium">
            <Microscope className="w-4 h-4 text-[#E8702A]" />
            Connected Clinical Telemetry
          </span>
          <span className="font-mono tabular-nums">Ibadan · Ogbomoso · Oyo Town</span>
        </div>
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="rounded-xl bg-white/10 border border-white/15 p-3.5">
            <p className="text-[11px] text-[#C7C8E6]">Diagnostic Turnaround</p>
            <p className="text-lg font-semibold tabular-nums mt-0.5">6–12 Hours</p>
          </div>
          <div className="rounded-xl bg-white/10 border border-white/15 p-3.5">
            <p className="text-[11px] text-[#C7C8E6]">Verified Clinical Hubs</p>
            <p className="text-lg font-semibold tabular-nums mt-0.5">140+ Facilities</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MaternalCareArtwork({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#272757] via-[#3B3B73] to-[#505081] text-white p-6 flex flex-col justify-between min-h-[280px] ${className}`}
    >
      <svg
        viewBox="0 0 480 320"
        className="absolute inset-0 w-full h-full opacity-25 pointer-events-none"
        aria-hidden="true"
      >
        <circle cx="380" cy="80" r="110" fill="#FFFFFF" fillOpacity="0.15" />
        <circle cx="110" cy="260" r="85" fill="#E8702A" fillOpacity="0.22" />
        <path
          d="M0 240 Q 120 180 240 230 T 480 200"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeOpacity="0.4"
        />
      </svg>
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-xs font-medium text-white/85 flex items-center gap-2">
          <HeartPulse className="w-4 h-4 text-[#E8702A]" />
          Antenatal & Paediatric Continuity
        </span>
        <ShieldCheck className="w-4 h-4 text-white/80" />
      </div>
      <div className="relative z-10 space-y-3 my-4">
        <div className="rounded-xl bg-white/12 border border-white/15 p-4">
          <p className="text-xs text-white/75">Scheduled Milestone</p>
          <p className="text-sm font-semibold mt-0.5">Trimester 2 Morphology Scan & Iron Check</p>
          <p className="text-xs text-white/75 mt-1">Obstetrician review · UCH &amp; Adeoyo Ibadan clinics</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-white/10 p-2.5">
            <p className="text-[11px] text-white/70">BCG / OPV</p>
            <p className="text-xs font-semibold mt-0.5 tabular-nums">Birth</p>
          </div>
          <div className="rounded-lg bg-white/10 p-2.5">
            <p className="text-[11px] text-white/70">Penta 1–3</p>
            <p className="text-xs font-semibold mt-0.5 tabular-nums">6–14 Wks</p>
          </div>
          <div className="rounded-lg bg-white/10 p-2.5">
            <p className="text-[11px] text-white/70">Measles</p>
            <p className="text-xs font-semibold mt-0.5 tabular-nums">9 Mos</p>
          </div>
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-between text-xs text-white/80">
        <span className="flex items-center gap-1.5">
          <Stethoscope className="w-3.5 h-3.5" />
          OB-GYN & Paediatric Team
        </span>
        <span className="tabular-nums">24/7 Nurse Triage</span>
      </div>
    </div>
  );
}

export function MobileAppShowcaseArtwork({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative mx-auto w-full max-w-[300px] rounded-[2rem] bg-[#0F0E47] p-3 shadow-2xl border border-[#8686AC]/30 ${className}`}
    >
      <div className="rounded-[1.55rem] bg-[#F5F6FC] text-[#0F0E47] overflow-hidden p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-tight text-[#272757]">HealthConnect</span>
          <span className="text-[11px] font-mono text-[#505081] tabular-nums">OFFLINE READY</span>
        </div>
        <div className="rounded-xl bg-[#272757] text-white p-3.5">
          <p className="text-[11px] text-[#C7C8E6]">Emergency Health Card</p>
          <p className="text-sm font-semibold mt-0.5">Chidi E. Okonkwo</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-[#C7C8E6] tabular-nums">
            <span>Blood: O+</span>
            <span>·</span>
            <span>Genotype: AA</span>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-[#272757]/10 p-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-[#505081]">Last Seated BP</p>
            <p className="text-base font-bold tabular-nums text-[#0F0E47]">120 / 78 mmHg</p>
          </div>
          <Activity className="w-5 h-5 text-[#272757]" />
        </div>
        <div className="rounded-xl bg-white border border-[#272757]/10 p-3">
          <p className="text-[11px] text-[#505081]">Upcoming Care</p>
          <p className="text-xs font-semibold text-[#0F0E47] mt-0.5">Dr. Adewale Ogunleye</p>
          <p className="text-[11px] text-[#505081] tabular-nums mt-0.5">22 Nov · 10:30 WAT · Bodija, Ibadan</p>
        </div>
        <div className="rounded-lg bg-[#E8702A]/12 text-[#9E420D] px-3 py-2 text-[11px] font-medium text-center">
          Low-Bandwidth & USSD Companion (*347*88# Demo)
        </div>
      </div>
    </div>
  );
}
