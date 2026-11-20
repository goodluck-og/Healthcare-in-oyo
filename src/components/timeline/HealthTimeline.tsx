import React, { useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  Calendar,
  Clock,
  Dumbbell,
  FileText,
  Search,
  Syringe,
  Wallet,
} from 'lucide-react';
import { formatNaira, useApp } from '../../context/AppContext';

type TimelineCategory =
  | 'All'
  | 'Visits'
  | 'Vitals'
  | 'Rehab'
  | 'Vaccines'
  | 'Records'
  | 'AI & Wallet';

interface TimelineEvent {
  id: string;
  date: string;
  category: Exclude<TimelineCategory, 'All'>;
  title: string;
  subtitle: string;
  meta: string;
}

interface HealthTimelineProps {
  limit?: number;
  onViewAll?: () => void;
}

export function HealthTimeline({ limit, onViewAll }: HealthTimelineProps) {
  const {
    familyProfiles,
    activeProfileId,
    appointments,
    bpReadings,
    glucoseReadings,
    documents,
    rehabSessions,
    vaccinationRecords,
    aiConsultations,
    walletTransactions,
  } = useApp();

  const activeProfile =
    familyProfiles.find((p) => p.id === activeProfileId) || familyProfiles[0] || null;

  const [categoryFilter, setCategoryFilter] = useState<TimelineCategory>('All');
  const [query, setQuery] = useState('');

  const events = useMemo<TimelineEvent[]>(() => {
    const profileMatch = (pid?: string) =>
      !activeProfile || !pid || pid === activeProfile.id || pid === 'default';

    const items: TimelineEvent[] = [];

    appointments
      .filter((a) => profileMatch(a.profileId))
      .forEach((a) => {
        items.push({
          id: `apt-${a.id}`,
          date: a.date || '2026-11-01',
          category: 'Visits',
          title: `${a.doctorName} (${a.specialty})`,
          subtitle: `${a.facilityName} · ${a.mode}`,
          meta: `${a.status} · ${a.time}`,
        });
      });

    bpReadings
      .filter((b) => profileMatch(b.profileId))
      .forEach((b) => {
        items.push({
          id: `bp-${b.id}`,
          date: b.recordedAt.slice(0, 10),
          category: 'Vitals',
          title: `Blood Pressure ${b.systolic}/${b.diastolic} mmHg`,
          subtitle: b.note || b.deviceType,
          meta: `Pulse ${b.pulse} bpm`,
        });
      });

    glucoseReadings
      .filter((g) => profileMatch(g.profileId))
      .forEach((g) => {
        items.push({
          id: `glu-${g.id}`,
          date: g.recordedAt.slice(0, 10),
          category: 'Vitals',
          title: `Blood Glucose ${g.valueMgDl} mg/dL`,
          subtitle: `${g.context}${g.note ? ` · ${g.note}` : ''}`,
          meta: g.deviceType,
        });
      });

    rehabSessions
      .filter((r) => profileMatch(r.profileId))
      .forEach((r) => {
        items.push({
          id: `reh-${r.id}`,
          date: r.completedDate,
          category: 'Rehab',
          title: r.exerciseName,
          subtitle: `${r.bodyArea} · ${r.durationMinutes} min (${r.assignedByClinician})`,
          meta: `Mobility ${r.mobilityScore}/10 · Pain ${r.painScore}/10`,
        });
      });

    vaccinationRecords
      .filter((v) => profileMatch(v.profileId))
      .forEach((v) => {
        items.push({
          id: `vax-${v.id}`,
          date: v.date,
          category: 'Vaccines',
          title: `${v.vaccineName} (${v.doseLabel})`,
          subtitle: v.facilityName || `Age group ${v.ageGroup} yrs`,
          meta: v.status,
        });
      });

    documents
      .filter((d) => profileMatch(d.profileId))
      .forEach((d) => {
        items.push({
          id: `doc-${d.id}`,
          date: d.date,
          category: 'Records',
          title: d.title,
          subtitle: `${d.category} · ${d.issuer}`,
          meta: d.plainSummary.slice(0, 72),
        });
      });

    aiConsultations
      .filter((c) => profileMatch(c.profileId))
      .forEach((c) => {
        items.push({
          id: `ai-${c.id}`,
          date: (c.createdAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
          category: 'AI & Wallet',
          title: `AI Health Review: ${c.topic}`,
          subtitle: c.assistantSummary.slice(0, 110),
          meta: c.mode,
        });
      });

    walletTransactions.forEach((w) => {
      items.push({
        id: `wal-${w.id}`,
        date: w.date,
        category: 'AI & Wallet',
        title: `${w.source}: ${w.type === 'credit' ? '+' : '-'}${formatNaira(w.amountNgn)}`,
        subtitle: w.description,
        meta: w.reference,
      });
    });

    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [
    activeProfile,
    appointments,
    bpReadings,
    glucoseReadings,
    rehabSessions,
    vaccinationRecords,
    documents,
    aiConsultations,
    walletTransactions,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = events.filter((ev) => {
      if (categoryFilter !== 'All' && ev.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.subtitle.toLowerCase().includes(q) ||
        ev.meta.toLowerCase().includes(q)
      );
    });
    return limit ? list.slice(0, limit) : list;
  }, [events, categoryFilter, query, limit]);

  const iconForCategory = (cat: TimelineEvent['category']) => {
    switch (cat) {
      case 'Visits':
        return Calendar;
      case 'Vitals':
        return Activity;
      case 'Rehab':
        return Dumbbell;
      case 'Vaccines':
        return Syringe;
      case 'Records':
        return FileText;
      case 'AI & Wallet':
        return Wallet;
    }
  };

  return (
    <section className="rounded-2xl bg-[#13124A] border border-white/10 p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8EF5] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Personal Health Timeline
          </p>
          <h3 className="text-lg font-bold text-white mt-0.5">
            Chronological Care &amp; Vitals History
          </h3>
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-[#FFB585] hover:underline shrink-0 cursor-pointer"
          >
            Open Full Timeline ({events.length}) →
          </button>
        )}
      </div>

      {!limit && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              ['All', 'Visits', 'Vitals', 'Rehab', 'Vaccines', 'Records', 'AI & Wallet'] as const
            ).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#E8702A] text-white'
                    : 'bg-[#0B0A33] text-[#C7C8E6] hover:text-white border border-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-[#8686AC] absolute left-3 top-3" />
            <input
              type="search"
              placeholder="Filter timeline events..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 min-h-[38px] rounded-xl bg-[#0B0A33] border border-white/15 text-xs text-white placeholder:text-[#8686AC]"
            />
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-[#0B0A33] border border-white/10 p-6 text-center text-xs text-[#A6A8D6]">
          No timeline events match the current filter. Log vitals, rehab sessions, or appointments to build your unified record.
        </div>
      ) : (
        <ol className="relative space-y-2.5">
          {filtered.map((ev) => {
            const Icon = ev.title.startsWith('AI Health Review')
              ? Bot
              : iconForCategory(ev.category);
            return (
              <li
                key={ev.id}
                className="rounded-xl bg-[#0B0A33]/90 border border-white/10 p-3.5 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#272757] text-[#FFB585] flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{ev.title}</p>
                    <p className="text-[#C7C8E6] mt-0.5 line-clamp-1">{ev.subtitle}</p>
                    <p className="text-[11px] text-[#8A8EF5] mt-0.5">{ev.meta}</p>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-[#A6A8D6] tabular-nums shrink-0">
                  {ev.date}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
