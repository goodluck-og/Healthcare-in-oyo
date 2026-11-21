import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Search,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import {
  HEALTH_GUIDE_CATEGORIES,
  OFFLINE_HEALTH_LIBRARY,
  type HealthGuideCategory,
  type OfflineHealthGuide,
} from '../../data/offlineHealthLibrary';
import { searchOfflineHealthLibrary } from '../../services/localHealthAi';

interface OfflineHealthLibraryPanelProps {
  guides?: OfflineHealthGuide[];
  bookmarkedIds: string[];
  onToggleBookmark: (guideId: string) => void;
  onAskAboutGuide: (guide: OfflineHealthGuide) => void;
  isOnline: boolean;
}

export const OfflineHealthLibraryPanel: React.FC<OfflineHealthLibraryPanelProps> = ({
  guides = OFFLINE_HEALTH_LIBRARY,
  bookmarkedIds,
  onToggleBookmark,
  onAskAboutGuide,
  isOnline,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HealthGuideCategory | 'ALL' | 'SAVED'>(
    'ALL'
  );
  const [expandedId, setExpandedId] = useState<string | null>(guides[0]?.id ?? null);

  const filteredGuides = useMemo(() => {
    const basePool =
      selectedCategory === 'SAVED'
        ? guides.filter((g) => bookmarkedIds.includes(g.id))
        : guides;
    const catFilter =
      selectedCategory === 'SAVED' ? 'ALL' : selectedCategory;
    return searchOfflineHealthLibrary(query, catFilter, basePool).map((m) => m.guide);
  }, [guides, query, selectedCategory, bookmarkedIds]);

  return (
    <div className="space-y-5">
      {/* Header & Search */}
      <div className="rounded-2xl bg-white border border-[#272757]/12 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[#0F0E47]">
              Offline Health Reference Library
            </h2>
            <p className="text-xs sm:text-sm text-[#505081]">
              {guides.length} curated WHO, NCDC &amp; Nigeria educational health chapters stored
              locally on your device — searchable even with zero internet.
            </p>
          </div>
          <div className="text-xs font-medium text-[#15803D] flex items-center gap-1.5 shrink-0">
            {isOnline ? (
              <BookOpen className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4 text-[#B45309]" />
            )}
            <span>{isOnline ? 'Cached locally · Ready offline' : 'Running fully offline'}</span>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-[#6B6B99] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search offline guides (e.g., blood pressure, malaria RDT, PCOS, ORS, HbA1c, stroke)..."
            aria-label="Search offline health guides"
            className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl border border-[#272757]/15 bg-[#F5F6FC] text-sm text-[#0F0E47] placeholder:text-[#6B6B99] focus:outline-none focus:ring-2 focus:ring-[#272757]"
          />
        </div>

        {/* Category Filter Tabs */}
        <div
          role="tablist"
          aria-label="Health guide categories"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === 'ALL'}
            onClick={() => setSelectedCategory('ALL')}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-[#0F0E47] text-white'
                : 'bg-[#F5F6FC] text-[#505081] hover:text-[#0F0E47]'
            }`}
          >
            All Volumes ({guides.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === 'SAVED'}
            onClick={() => setSelectedCategory('SAVED')}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedCategory === 'SAVED'
                ? 'bg-[#0F0E47] text-white'
                : 'bg-[#F5F6FC] text-[#505081] hover:text-[#0F0E47]'
            }`}
          >
            Saved ({bookmarkedIds.length})
          </button>
          {HEALTH_GUIDE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#0F0E47] text-white'
                  : 'bg-[#F5F6FC] text-[#505081] hover:text-[#0F0E47]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results List */}
      {filteredGuides.length === 0 ? (
        <div className="rounded-2xl bg-white border border-[#272757]/12 p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-[#0F0E47]">
            No offline chapters matched your filter.
          </p>
          <p className="text-xs text-[#505081]">
            Try clearing the search term or switching back to All Volumes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGuides.map((guide) => {
            const isExpanded = expandedId === guide.id;
            const isBookmarked = bookmarkedIds.includes(guide.id);
            return (
              <article
                key={guide.id}
                className="rounded-2xl bg-white border border-[#272757]/12 overflow-hidden"
              >
                <div className="p-4 sm:p-5 flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : guide.id)}
                    aria-expanded={isExpanded}
                    className="text-left flex-1 min-w-0 space-y-1 cursor-pointer"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#505081]">
                      <span className="font-semibold text-[#272757]">{guide.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{guide.readingMinutes} min read</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{guide.source}</span>
                    </div>
                    <h3 className="text-base font-bold text-[#0F0E47] leading-snug">
                      {guide.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#505081] leading-relaxed">
                      {guide.summary}
                    </p>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleBookmark(guide.id)}
                      aria-label={isBookmarked ? 'Remove bookmark' : 'Save guide offline'}
                      className={`w-11 h-11 inline-flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                        isBookmarked
                          ? 'text-[#4B50D6] bg-[#F5F6FC]'
                          : 'text-[#6B6B99] hover:bg-[#F5F6FC]'
                      }`}
                    >
                      {isBookmarked ? (
                        <BookmarkCheck className="w-5 h-5" />
                      ) : (
                        <Bookmark className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : guide.id)}
                      aria-label={isExpanded ? 'Collapse chapter' : 'Read full chapter'}
                      className="w-11 h-11 inline-flex items-center justify-center rounded-xl text-[#505081] hover:bg-[#F5F6FC] cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-[#272757]/10 space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-[#272757]">
                        Key Educational Guidance
                      </h4>
                      <ul className="space-y-1.5 text-sm text-[#1E1E4A] list-disc pl-5 leading-relaxed">
                        {guide.keyPoints.map((pt, idx) => (
                          <li key={idx}>{pt}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-xl bg-[#FEF2F2] border border-[#E5484D]/25 p-3.5 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#991B1B]">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>When to Seek Professional Medical Care</span>
                      </div>
                      <ul className="space-y-1 text-xs sm:text-sm text-[#7F1D1D] list-disc pl-5">
                        {guide.whenToSeekCare.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <p className="text-xs text-[#505081] leading-relaxed flex-1">
                        <strong className="text-[#0F0E47]">Oyo State Pathway:</strong>{' '}
                        {guide.oyoCarePathway}
                      </p>
                      <button
                        type="button"
                        onClick={() => onAskAboutGuide(guide)}
                        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Ask Local AI</span>
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
