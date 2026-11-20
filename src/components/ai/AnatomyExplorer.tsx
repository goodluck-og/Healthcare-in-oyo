import React, { useState } from 'react';
import { Activity, Eye, Layers, Sparkles } from 'lucide-react';

export interface AnatomyRegion {
  id: string;
  view: 'front' | 'back';
  label: string;
  system: string;
  topPercent: number;
  leftPercent: number;
  guidanceNote: string;
  suggestedPrompt: string;
}

const ANATOMY_REGIONS: AnatomyRegion[] = [
  {
    id: 'front-head',
    view: 'front',
    label: 'Head, Eyes & Neck',
    system: 'Neurological, ENT & Vascular',
    topPercent: 18,
    leftPercent: 50,
    guidanceNote:
      'Common questions include tension vs migraine headaches, sinus pressure, dizziness, or sore throat evaluation.',
    suggestedPrompt:
      'What questions help distinguish a tension headache from migraine or high-blood-pressure related headache, and when should I see a Nigerian doctor urgently?',
  },
  {
    id: 'front-chest',
    view: 'front',
    label: 'Chest, Heart & Lungs',
    system: 'Cardiopulmonary',
    topPercent: 31,
    leftPercent: 50,
    guidanceNote:
      'Covers blood pressure heart strain, persistent cough, mild breathlessness, or preparing for an ECG or echocardiogram.',
    suggestedPrompt:
      'What questions should I ask a cardiologist or pulmonologist about chest discomfort or elevated blood pressure, and what red-flag symptoms require immediate emergency care?',
  },
  {
    id: 'front-abdomen',
    view: 'front',
    label: 'Abdomen & Digestion',
    system: 'Gastrointestinal, Liver & Kidneys',
    topPercent: 45,
    leftPercent: 50,
    guidanceNote:
      'Covers upper stomach pain, reflux, typhoid/malaria differentiation questions, hydration, and liver enzyme lab terms.',
    suggestedPrompt:
      'Explain common causes of abdominal discomfort that doctors evaluate during a clinic visit, and what stool, urine, or blood lab tests usually mean.',
  },
  {
    id: 'front-pelvis',
    view: 'front',
    label: 'Pelvis & Maternal Wellness',
    system: 'Reproductive, Antenatal & Urinary',
    topPercent: 55,
    leftPercent: 50,
    guidanceNote:
      'Supports antenatal check-up prep, urinary discomfort questions, and maternal wellness screening.',
    suggestedPrompt:
      'What routine antenatal screenings and warning signs should expectant mothers discuss with their OB-GYN or midwife in Nigeria?',
  },
  {
    id: 'front-arms',
    view: 'front',
    label: 'Shoulders, Arms & Hands',
    system: 'Musculoskeletal & Peripheral',
    topPercent: 39,
    leftPercent: 25,
    guidanceNote:
      'Covers blood pressure cuff placement, repetitive strain, joint stiffness, or numbness checks.',
    suggestedPrompt:
      'How do I position an upper-arm blood pressure cuff properly at home, and when should shoulder or arm tingling be evaluated by a clinician?',
  },
  {
    id: 'front-legs',
    view: 'front',
    label: 'Knees, Legs & Ankles',
    system: 'Orthopaedic, Physiotherapy & Circulation',
    topPercent: 74,
    leftPercent: 43,
    guidanceNote:
      'Covers joint mobility, ankle swelling checks (important in hypertension), and physiotherapy recovery.',
    suggestedPrompt:
      'What could persistent ankle swelling or knee joint stiffness indicate, and what should I mention to a physiotherapist or physician?',
  },
  {
    id: 'back-cervical',
    view: 'back',
    label: 'Upper Spine & Neck',
    system: 'Cervical Spine & Trapezius',
    topPercent: 25,
    leftPercent: 50,
    guidanceNote:
      'Focuses on posture strain, neck stiffness, and ergonomics for desk or healthcare workers.',
    suggestedPrompt:
      'What stretches or ergonomic adjustments help posture-related upper back stiffness, and what neck symptoms require urgent evaluation?',
  },
  {
    id: 'back-lumbar',
    view: 'back',
    label: 'Lower Back & Kidneys',
    system: 'Lumbar Spine & Renal Region',
    topPercent: 46,
    leftPercent: 50,
    guidanceNote:
      'Helps prepare for physiotherapy vs urinalysis questions when experiencing flank or lower back ache.',
    suggestedPrompt:
      'How do clinicians differentiate muscular lower back strain from kidney-related flank discomfort during an examination?',
  },
  {
    id: 'back-hips',
    view: 'back',
    label: 'Hips, Glutes & Hamstrings',
    system: 'Sciatic & Lower Limb Mobility',
    topPercent: 60,
    leftPercent: 50,
    guidanceNote:
      'Supports sciatica questions, post-injury rehabilitation, and mobility planning.',
    suggestedPrompt:
      'What questions should I ask a physiotherapist about radiating hip-to-leg discomfort or post-injury rehabilitation?',
  },
];

interface AnatomyExplorerProps {
  onAskRegion: (promptText: string, regionLabel: string) => void;
}

export function AnatomyExplorer({ onAskRegion }: AnatomyExplorerProps) {
  const [activeView, setActiveView] = useState<'front' | 'back'>('front');
  const [visualMode, setVisualMode] = useState<'anatomical' | 'schematic'>('anatomical');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('front-chest');

  const viewRegions = ANATOMY_REGIONS.filter((r) => r.view === activeView);
  const selectedRegion =
    viewRegions.find((r) => r.id === selectedRegionId) || viewRegions[0] || ANATOMY_REGIONS[0];

  const handleViewSwitch = (view: 'front' | 'back') => {
    setActiveView(view);
    const firstInView = ANATOMY_REGIONS.find((r) => r.view === view);
    if (firstInView) setSelectedRegionId(firstInView.id);
  };

  // Both provided reference images place Front View on the left half and Back View on the right half.
  const imageSrc =
    visualMode === 'anatomical'
      ? '/assets/aistudio/Screenshot_20261119_001602_ChatGPT_6c3ccb5d.jpg'
      : '/assets/aistudio/images__5__bd6e6492.jpeg';

  return (
    <section
      aria-label="Interactive Front and Back Anatomy Explorer"
      className="rounded-2xl bg-white border border-[#272757]/10 p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-[#0F0E47] flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#E8702A]" />
            Interactive Anatomy Explorer
          </p>
          <p className="text-[11px] text-[#505081] mt-0.5">
            Tap a body zone on Front or Back view to ask guided educational questions.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleViewSwitch('front')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
              activeView === 'front'
                ? 'bg-[#272757] text-white'
                : 'bg-[#F5F6FC] text-[#505081] hover:text-[#0F0E47]'
            }`}
          >
            Front View
          </button>
          <button
            type="button"
            onClick={() => handleViewSwitch('back')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
              activeView === 'back'
                ? 'bg-[#272757] text-white'
                : 'bg-[#F5F6FC] text-[#505081] hover:text-[#0F0E47]'
            }`}
          >
            Back View
          </button>
        </div>
      </div>

      {/* Mode toggle between Full Anatomy & Schematic Line Reference */}
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-[#505081] flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" />
          Reference Layer:
        </span>
        <button
          type="button"
          onClick={() =>
            setVisualMode((prev) => (prev === 'anatomical' ? 'schematic' : 'anatomical'))
          }
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F6FC] border border-[#272757]/12 font-semibold text-[#272757] hover:bg-[#E8EAF7] cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5" />
          {visualMode === 'anatomical' ? 'Switch to Schematic Outline' : 'Switch to Organ Atlas'}
        </button>
      </div>

      {/* Cropped Single-View Stage (Front left-half vs Back right-half) + Interactive Hotspots */}
      <div className="relative mx-auto w-full max-w-[260px] h-[300px] rounded-2xl overflow-hidden border border-[#272757]/15 bg-[#0F0E47]">
        <div className="w-full h-full overflow-hidden relative">
          <img
            src={imageSrc}
            alt={
              activeView === 'front'
                ? 'Human anatomy front view reference'
                : 'Human anatomy back view reference'
            }
            className="w-[200%] max-w-none h-full object-cover select-none pointer-events-none transition-transform duration-300"
            style={{
              transform: activeView === 'front' ? 'translateX(0%)' : 'translateX(-50%)',
              objectPosition: visualMode === 'anatomical' ? 'center 58%' : 'center center',
            }}
          />
          <div
            className={`absolute inset-0 pointer-events-none ${
              visualMode === 'schematic'
                ? 'bg-[#0F0E47]/15'
                : 'bg-gradient-to-t from-[#0F0E47]/55 via-transparent to-[#0F0E47]/20'
            }`}
          />

          {/* Interactive Region Markers */}
          {viewRegions.map((region) => {
            const isSelected = region.id === selectedRegion.id;
            return (
              <button
                key={region.id}
                type="button"
                aria-label={`Select ${region.label}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedRegionId(region.id)}
                style={{
                  top: `${region.topPercent}%`,
                  left: `${region.leftPercent}%`,
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#E8702A] text-white ring-4 ring-[#E8702A]/40 scale-110 z-20'
                    : 'bg-white/90 text-[#0F0E47] border border-[#272757]/40 hover:scale-110 z-10'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current" />
              </button>
            );
          })}

          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-semibold text-white bg-[#0F0E47]/80 backdrop-blur-xs px-2.5 py-1 rounded-lg">
            <span>{activeView === 'front' ? 'Front View' : 'Back View'}</span>
            <span className="text-[#FFB585] truncate max-w-[145px]">{selectedRegion.label}</span>
          </div>
        </div>
      </div>

      {/* Accessible Region Pills */}
      <div className="flex flex-wrap gap-1.5">
        {viewRegions.map((region) => {
          const isSelected = region.id === selectedRegion.id;
          return (
            <button
              key={region.id}
              type="button"
              onClick={() => setSelectedRegionId(region.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#272757] text-white'
                  : 'bg-[#F5F6FC] text-[#505081] hover:text-[#0F0E47]'
              }`}
            >
              {region.label}
            </button>
          );
        })}
      </div>

      {/* Selected Region Detail & Action */}
      <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-[#0F0E47]">{selectedRegion.label}</span>
          <span className="text-[10px] font-semibold text-[#505081]">{selectedRegion.system}</span>
        </div>
        <p className="text-[11px] text-[#505081] leading-relaxed">{selectedRegion.guidanceNote}</p>
        <button
          type="button"
          onClick={() => onAskRegion(selectedRegion.suggestedPrompt, selectedRegion.label)}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ask AI About {selectedRegion.label}</span>
        </button>
      </div>
    </section>
  );
}
