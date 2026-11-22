import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Lock,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import {
  buildPersonalisedDashboardPlan,
  type PersonalisedModuleSpec,
} from '../../services/personalisationEngine';
import type { AppRoute, FamilyProfile } from '../../types/healthcare';

interface PersonalisedDashboardHubProps {
  profile: FamilyProfile | null;
  onNavigateRoute: (route: AppRoute) => void;
  onOpenDashboardTab?: (tab: string) => void;
  onOpenOnboarding?: () => void;
  onToggleOptionalModule?: (moduleId: string, currentlyEnabled: boolean) => Promise<void> | void;
}

export function PersonalisedDashboardHub({
  profile,
  onNavigateRoute,
  onOpenDashboardTab,
  onOpenOnboarding,
  onToggleOptionalModule,
}: PersonalisedDashboardHubProps) {
  const plan = useMemo(() => buildPersonalisedDashboardPlan(profile), [profile]);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [showCustomise, setShowCustomise] = useState(false);

  const handleModuleAction = (mod: PersonalisedModuleSpec) => {
    if (mod.id === 'female-cycle-reproductive' && onOpenDashboardTab) {
      onOpenDashboardTab('womens');
      return;
    }
    if (mod.id === 'general-emergency-qr' && onOpenDashboardTab) {
      onOpenDashboardTab('qr');
      return;
    }
    if (mod.id === 'general-wearable-vitals' && onOpenDashboardTab) {
      onOpenDashboardTab('wearable');
      return;
    }
    if (mod.id === 'child-growth-vaccines' && onOpenDashboardTab) {
      onOpenDashboardTab('care');
      return;
    }
    if (mod.id === 'older-adult-longevity' && onOpenDashboardTab) {
      onOpenDashboardTab('reminders');
      return;
    }
    onNavigateRoute(mod.actionRoute);
  };

  return (
    <section className="rounded-3xl bg-[#13124A] border border-white/12 p-5 sm:p-6 space-y-5">
      {/* Adaptive Life-Stage Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="font-semibold text-[#FFB585] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              HealthConnect Personalisation Engine
            </span>
            <span className="text-[#8686AC]">·</span>
            <span className="font-mono tabular-nums text-[#C7C8E6]">
              Age {plan.ageInfo.calculatedAge} ({plan.ageInfo.ageRangeLabel})
            </span>
            <span className="text-[#8686AC]">·</span>
            <span className="text-[#6EE7B7] font-medium tabular-nums">
              {plan.activeCapabilityCount} tailored tools active (from {plan.totalBlueprintCapabilities}-capability blueprint)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {plan.ageInfo.label}
          </h2>
          <p className="text-xs text-[#C7C8E6] leading-relaxed max-w-3xl">
            {plan.ageInfo.guidanceNote}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenOnboarding && (
            <button
              type="button"
              onClick={onOpenOnboarding}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl bg-white/8 hover:bg-white/15 border border-white/12 text-xs font-semibold text-white cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-[#6EE7B7]" />
              Update DOB / Profile
            </button>
          )}
          {!plan.ageInfo.isGuardianManaged && plan.optionalModules.length > 0 && (
            <button
              type="button"
              onClick={() => setShowCustomise((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl bg-[#272757] hover:bg-[#353574] border border-white/15 text-xs font-semibold text-white cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#FFB585]" />
              {showCustomise ? 'Hide Customiser' : 'Personalise Modules'}
            </button>
          )}
        </div>
      </div>

      {/* Strict Child Guardian Safety Lock Notice */}
      {plan.ageInfo.isGuardianManaged && (
        <div className="rounded-2xl bg-amber-500/15 border border-amber-400/35 p-4 flex items-start gap-3 text-xs text-amber-100">
          <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-white flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              Child Guardian Safety Mode Active (Ages 0–12)
            </p>
            <p className="mt-0.5 leading-relaxed">
              Adult reproductive, sexual health, and adult-only preventive screening tools are strictly hidden on this profile so children are never exposed to age-inappropriate content.
            </p>
          </div>
        </div>
      )}

      {/* Optional Module Customiser (Adults & Teens — never bypasses Child Safety Lock) */}
      {showCustomise && !plan.ageInfo.isGuardianManaged && (
        <div className="rounded-2xl bg-[#0B0A33] border border-white/12 p-4 space-y-3">
          <div>
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#6EE7B7]" />
              Add Optional Health Modules to Your Focused Dashboard
            </p>
            <p className="text-[11px] text-[#A6A8D6] mt-0.5">
              Toggle additional preventive tools relevant to your personal health needs anytime.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {plan.optionalModules.map((mod) => {
              const enabled = Boolean(profile?.enabledModules?.includes(mod.id));
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => void onToggleOptionalModule?.(mod.id, enabled)}
                  className={`text-left rounded-xl p-3 border text-xs transition-colors cursor-pointer ${
                    enabled
                      ? 'bg-[#E8702A]/20 border-[#FFB585]/50 text-white'
                      : 'bg-[#161554] border-white/10 text-[#C7C8E6] hover:border-white/25'
                  }`}
                >
                  <p className="font-bold text-white">{mod.title}</p>
                  <p className="text-[11px] text-[#A6A8D6] mt-0.5 line-clamp-2">{mod.summary}</p>
                  <span className="inline-block mt-2 text-[11px] font-semibold text-[#FFB585]">
                    {enabled ? 'Enabled — Click to remove' : '+ Add to Dashboard'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Focused Prioritized Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plan.primaryModules.map((mod) => {
          const isExpanded = expandedModuleId === mod.id;
          return (
            <div
              key={mod.id}
              className="rounded-2xl bg-[#0F0E47] border border-white/12 p-4 sm:p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-white leading-snug">{mod.title}</h3>
                  <span className="text-[11px] font-mono tabular-nums text-[#A6A8D6] shrink-0">
                    {mod.capabilities.length} tools
                  </span>
                </div>
                <p className="text-xs text-[#C7C8E6] leading-relaxed">{mod.summary}</p>

                {isExpanded && (
                  <ul className="pt-2 border-t border-white/10 space-y-1.5 text-[11px] text-[#D7D8EE]">
                    {mod.capabilities.map((cap) => (
                      <li key={cap} className="flex items-start gap-2">
                        <span className="text-[#FFB585] font-bold">·</span>
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#A6A8D6] hover:text-white cursor-pointer"
                >
                  {isExpanded ? (
                    <>
                      Hide capabilities <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      View {mod.capabilities.length} capabilities <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleModuleAction(mod)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-lg bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs font-semibold cursor-pointer"
                >
                  <span>{mod.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
