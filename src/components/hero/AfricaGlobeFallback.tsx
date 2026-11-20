import React, { useState } from 'react';
import { Building2, Pill, Stethoscope, MapPin } from 'lucide-react';

export interface GlobeHub {
  id: string;
  city: string;
  country: string;
  type: 'Hospital' | 'Pharmacy' | 'Clinic';
  x: number;
  y: number;
  lat: number;
  lon: number;
  highlight?: boolean;
  summary: string;
}

export const AFRICA_HUBS: GlobeHub[] = [
  {
    id: 'hub-ibadan',
    city: 'Ibadan',
    country: 'Oyo State',
    type: 'Hospital',
    x: 205,
    y: 196,
    lat: 7.3775,
    lon: 3.947,
    highlight: true,
    summary: 'UCH, Adeoyo, Ring Road & Jericho Specialist · Primary Oyo State clinical hub',
  },
  {
    id: 'hub-ogbomoso',
    city: 'Ogbomoso',
    country: 'Oyo State',
    type: 'Hospital',
    x: 220,
    y: 184,
    lat: 8.1333,
    lon: 4.25,
    highlight: true,
    summary: 'Bowen University Teaching Hospital · Specialist clinics & physical exams',
  },
  {
    id: 'hub-oyo-town',
    city: 'Oyo Town',
    country: 'Oyo State',
    type: 'Clinic',
    x: 214,
    y: 190,
    lat: 7.85,
    lon: 3.9333,
    highlight: true,
    summary: 'State Hospital Oyo · Maternal, family care & coordinated referrals',
  },
  {
    id: 'hub-saki',
    city: 'Saki',
    country: 'Oyo State',
    type: 'Clinic',
    x: 204,
    y: 176,
    lat: 8.6676,
    lon: 3.3939,
    highlight: true,
    summary: 'Oke-Ogun regional network · Telehealth consultations & community diagnostics',
  },
  {
    id: 'hub-accra',
    city: 'Accra',
    country: 'Ghana (Expansion)',
    type: 'Clinic',
    x: 190,
    y: 198,
    lat: 5.6,
    lon: -0.18,
    summary: 'West African expansion node · Telehealth & diagnostics',
  },
  {
    id: 'hub-nairobi',
    city: 'Nairobi',
    country: 'Kenya (Expansion)',
    type: 'Hospital',
    x: 325,
    y: 224,
    lat: -1.29,
    lon: 36.82,
    summary: 'East African clinical corridor · Specialist referral network',
  },
  {
    id: 'hub-kigali',
    city: 'Kigali',
    country: 'Rwanda (Expansion)',
    type: 'Pharmacy',
    x: 300,
    y: 226,
    lat: -1.94,
    lon: 30.06,
    summary: 'Digital health records & laboratory logistics hub',
  },
];

export function AfricaGlobeFallback({
  selectedHubId,
  onSelectHub,
}: {
  selectedHubId: string;
  onSelectHub: (hub: GlobeHub) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const active =
    AFRICA_HUBS.find((h) => h.id === (hoveredId || selectedHubId)) || AFRICA_HUBS[0];

  const lagos = AFRICA_HUBS[0];

  return (
    <div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] flex flex-col items-center justify-between rounded-2xl bg-[radial-gradient(ellipse_at_center,_#242468_0%,_#151452_60%,_#0D0C3D_100%)] p-4 sm:p-6 overflow-hidden">
      <div className="relative w-full max-w-[380px] aspect-square flex items-center justify-center">
        <svg
          viewBox="0 0 520 520"
          className="w-full h-full"
          role="img"
          aria-label="Interactive map of Africa showing HealthConnect Nigeria launch hubs and regional nodes"
        >
          <defs>
            <radialGradient id="globeSphereGrad" cx="42%" cy="38%" r="60%">
              <stop offset="0%" stopColor="#2D2D78" />
              <stop offset="65%" stopColor="#191855" />
              <stop offset="100%" stopColor="#0E0D3B" />
            </radialGradient>
            <radialGradient id="globeHaloGrad" cx="50%" cy="50%" r="50%">
              <stop offset="76%" stopColor="#505081" stopOpacity="0" />
              <stop offset="94%" stopColor="#8686AC" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#C7C8E6" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Outer Atmospheric Rim */}
          <circle cx="260" cy="260" r="236" fill="url(#globeHaloGrad)" />

          {/* 3D Globe Sphere Base */}
          <circle
            cx="260"
            cy="260"
            r="214"
            fill="url(#globeSphereGrad)"
            stroke="#8686AC"
            strokeOpacity="0.35"
            strokeWidth="1.5"
          />

          {/* Subtle Latitude / Longitude Graticule */}
          <g stroke="#8686AC" strokeOpacity="0.16" strokeWidth="1" fill="none">
            <ellipse cx="260" cy="260" rx="214" ry="72" />
            <ellipse cx="260" cy="260" rx="214" ry="144" />
            <ellipse cx="260" cy="260" rx="76" ry="214" />
            <ellipse cx="260" cy="260" rx="148" ry="214" />
            <line x1="46" y1="260" x2="474" y2="260" />
            <line x1="260" y1="46" x2="260" y2="474" />
          </g>

          {/* Africa Continent Silhouette */}
          <path
            d="M 186 98 L 226 88 L 266 96 L 306 94 L 332 104 L 348 134 L 372 174 L 402 184 L 392 214 L 366 238 L 354 272 L 352 308 L 330 342 L 304 378 L 284 402 L 262 396 L 246 364 L 236 322 L 232 276 L 224 236 L 194 218 L 154 214 L 128 194 L 122 164 L 138 134 L 164 114 Z"
            fill="#343474"
            stroke="#9FA0CC"
            strokeOpacity="0.65"
            strokeWidth="1.6"
          />

          {/* Madagascar */}
          <path
            d="M 378 308 L 392 296 L 396 326 L 384 352 L 372 344 Z"
            fill="#343474"
            stroke="#9FA0CC"
            strokeOpacity="0.6"
            strokeWidth="1.3"
          />

          {/* Nigeria Launch Highlight Region */}
          <path
            d="M 196 184 L 222 166 L 244 170 L 242 196 L 226 212 L 200 206 Z"
            fill="#E8702A"
            fillOpacity="0.88"
            stroke="#FFB585"
            strokeWidth="1.5"
          />

          {/* Curved Pan-African Healthcare Corridor Arcs */}
          {AFRICA_HUBS.slice(1).map((hub) => {
            const mx = (lagos.x + hub.x) / 2;
            const my = Math.min(lagos.y, hub.y) - 24;
            return (
              <path
                key={`arc-${hub.id}`}
                d={`M ${lagos.x} ${lagos.y} Q ${mx} ${my} ${hub.x} ${hub.y}`}
                fill="none"
                stroke={hub.highlight ? '#FFB585' : '#A5B4FC'}
                strokeOpacity={hub.highlight ? 0.8 : 0.55}
                strokeWidth={hub.highlight ? 1.8 : 1.3}
                strokeDasharray={hub.highlight ? undefined : '4 3'}
              />
            );
          })}

          {/* Interactive Hub Nodes */}
          {AFRICA_HUBS.map((hub) => {
            const isSelected = hub.id === active.id;
            return (
              <g
                key={hub.id}
                transform={`translate(${hub.x}, ${hub.y})`}
                onClick={() => onSelectHub(hub)}
                onMouseEnter={() => setHoveredId(hub.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`${hub.city}, ${hub.country} — ${hub.type}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectHub(hub);
                  }
                }}
              >
                <circle
                  r={isSelected ? 12 : 8}
                  fill={hub.highlight ? '#E8702A' : '#C7C8E6'}
                  fillOpacity={isSelected ? 0.35 : 0.2}
                />
                <circle
                  r={isSelected ? 6 : 4.5}
                  fill={hub.highlight ? '#E8702A' : '#FFFFFF'}
                  stroke="#0F0E47"
                  strokeWidth="1.5"
                />
                {(isSelected || hub.id === 'hub-ibadan' || hub.id === 'hub-nairobi') && (
                  <text
                    x="10"
                    y="4"
                    fontSize="11"
                    fontWeight="600"
                    fill="#FFFFFF"
                    style={{ pointerEvents: 'none' }}
                  >
                    {hub.city}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Active Hub Readout */}
      <div className="w-full mt-2 rounded-xl bg-[#0F0E47]/95 border border-white/15 p-3.5 text-left text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {active.type === 'Hospital' && <Building2 className="w-4 h-4 text-[#E8702A]" />}
            {active.type === 'Pharmacy' && <Pill className="w-4 h-4 text-[#E8702A]" />}
            {active.type === 'Clinic' && <Stethoscope className="w-4 h-4 text-[#E8702A]" />}
            <span className="text-sm font-semibold">
              {active.city}, {active.country}
            </span>
          </div>
          <span className="text-xs text-[#C7C8E6] flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {active.type}
          </span>
        </div>
        <p className="text-xs text-[#C7C8E6] mt-1 leading-relaxed">{active.summary}</p>
      </div>
    </div>
  );
}
