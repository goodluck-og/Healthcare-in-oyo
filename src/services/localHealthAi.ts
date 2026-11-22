import {
  OFFLINE_HEALTH_LIBRARY,
  type HealthGuideCategory,
  type OfflineHealthGuide,
} from '../data/offlineHealthLibrary';
import { scanTextForMedicalRedFlags } from '../../shared/medicalRedFlags';

export interface UrgentRedFlagAssessment {
  isUrgent: boolean;
  matchedSignals: string[];
  matchedKeywords?: string[];
  headline: string;
  immediateGuidance: string;
}

export interface LocalLibraryMatch {
  guide: OfflineHealthGuide;
  score: number;
}

const CLINICAL_SYNONYMS: Record<string, string[]> = {
  bp: ['blood', 'pressure', 'hypertension', 'systolic', 'diastolic'],
  sugar: ['glucose', 'diabetes', 'hba1c', 'insulin'],
  a1c: ['hba1c', 'glucose', 'diabetes', 'lab'],
  period: ['menstrual', 'cycle', 'pcos', 'cramps'],
  pregnant: ['pregnancy', 'antenatal', 'maternal', 'preeclampsia'],
  baby: ['child', 'infant', 'vaccine', 'immunization', 'pregnancy'],
  sickle: ['sickle', 'cell', 'genotype', 'hbss', 'crisis'],
  ss: ['genotype', 'sickle', 'hbss'],
  as: ['genotype', 'sickle', 'trait'],
  ors: ['ors', 'rehydration', 'diarrhoea', 'dehydration', 'vomiting'],
  stool: ['diarrhoea', 'ors', 'dehydration', 'typhoid'],
  rat: ['lassa', 'rodent', 'ncdc'],
  cost: ['subscription', 'plan', '16000', '50000', 'interswitch'],
  price: ['subscription', 'plan', '16000', '50000', 'interswitch'],
  navigate: ['how', 'use', 'navigate', 'plan', 'family', 'offline'],
  help: ['how', 'use', 'navigate', 'offline'],
};

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'what',
  'does',
  'mean',
  'about',
  'have',
  'your',
  'when',
  'should',
  'into',
  'please',
  'tell',
  'explain',
  'help',
  'can',
  'you',
  'are',
  'how',
  'why',
]);

/**
 * Deterministic, zero-latency (<1ms) local clinical red-flag screen backed by
 * the shared medicalRedFlags scanner.
 */
export function detectUrgentRedFlags(input: string): UrgentRedFlagAssessment {
  const scan = scanTextForMedicalRedFlags(input);
  if (!scan.detected) {
    return {
      isUrgent: false,
      matchedSignals: [],
      matchedKeywords: [],
      headline: '',
      immediateGuidance: '',
    };
  }
  return {
    isUrgent: true,
    matchedSignals: scan.matchedCategories,
    matchedKeywords: scan.matchedKeywords,
    headline: scan.headline,
    immediateGuidance: scan.immediateGuidance,
  };
}

function tokenizeQuery(query: string): string[] {
  const baseTokens = query
    .toLowerCase()
    .replace(/[^a-z0-9/+\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));

  const expanded = new Set<string>(baseTokens);
  for (const tok of baseTokens) {
    const syns = CLINICAL_SYNONYMS[tok];
    if (syns) {
      syns.forEach((s) => expanded.add(s));
    }
  }
  return Array.from(expanded);
}

/**
 * Searches the bundled WHO & Nigeria offline health reference library locally
 * with weighted keyword, title, and body scoring. Works 100% offline.
 */
export function searchOfflineHealthLibrary(
  query: string,
  category?: HealthGuideCategory | 'ALL',
  guides: OfflineHealthGuide[] = OFFLINE_HEALTH_LIBRARY
): LocalLibraryMatch[] {
  const pool =
    category && category !== 'ALL' ? guides.filter((g) => g.category === category) : guides;

  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return pool.map((guide) => ({ guide, score: 1 }));
  }

  const tokens = tokenizeQuery(trimmed);
  const scored: LocalLibraryMatch[] = [];

  for (const guide of pool) {
    let score = 0;
    const titleLower = guide.title.toLowerCase();
    const summaryLower = guide.summary.toLowerCase();
    const bodyLower = `${guide.keyPoints.join(' ')} ${guide.whenToSeekCare.join(' ')} ${guide.oyoCarePathway}`.toLowerCase();

    if (titleLower.includes(trimmed)) score += 16;
    if (summaryLower.includes(trimmed)) score += 10;

    for (const kw of guide.keywords) {
      const kwLower = kw.toLowerCase();
      if (trimmed.includes(kwLower)) {
        score += 12;
      }
      for (const tok of tokens) {
        if (kwLower === tok) score += 7;
        else if (kwLower.includes(tok) || tok.includes(kwLower)) score += 3;
      }
    }

    for (const tok of tokens) {
      if (titleLower.includes(tok)) score += 5;
      if (summaryLower.includes(tok)) score += 3;
      if (bodyLower.includes(tok)) score += 1.5;
    }

    if (score >= 4) {
      scored.push({ guide, score });
    }
  }

  return scored.sort((a, b) => b.score - a.score);
}

export interface TaskEvaluation {
  suitableForLocal: boolean;
  reason: string;
  topLibraryMatches: LocalLibraryMatch[];
}

/**
 * Evaluates whether a user prompt is a supported local/on-device task
 * (education lookup, terminology, app navigation, first-aid reference, short Q&A)
 * or benefits from Cloud AI (complex multi-document synthesis, deep lab comparison,
 * multi-turn personalized context).
 */
export function evaluatePromptForRouting(
  prompt: string,
  mode: string,
  includeProfileContext: boolean,
  conversationTurnCount: number
): TaskEvaluation {
  const matches = searchOfflineHealthLibrary(prompt);
  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
  const lower = prompt.toLowerCase();

  const isComplexDocOrMultiMetric =
    mode === 'Medical Document Explainer' ||
    mode === 'Health Record Summary' ||
    wordCount > 45 ||
    (includeProfileContext &&
      /\b(my (bp|blood pressure|glucose|sugar|labs|results|records|readings|history)|compare|summarise my|summarize my)\b/i.test(
        lower
      ));

  const isDirectAppOrTerminologyOrBookQuery =
    matches.length > 0 &&
    matches[0].score >= 10 &&
    !isComplexDocOrMultiMetric &&
    conversationTurnCount <= 4;

  if (isDirectAppOrTerminologyOrBookQuery) {
    return {
      suitableForLocal: true,
      reason: `Matched curated offline health guide ("${matches[0].guide.title}") with concise educational scope.`,
      topLibraryMatches: matches.slice(0, 3),
    };
  }

  if (!isComplexDocOrMultiMetric && wordCount <= 35) {
    return {
      suitableForLocal: true,
      reason: 'Short educational or wellness question suitable for on-device inference.',
      topLibraryMatches: matches.slice(0, 3),
    };
  }

  return {
    suitableForLocal: false,
    reason: isComplexDocOrMultiMetric
      ? 'Multi-factor clinical explanation or profile-contextual summary benefits from Cloud AI.'
      : 'Extended multi-turn question routed for Cloud AI depth.',
    topLibraryMatches: matches.slice(0, 3),
  };
}

/**
 * Generates an honest, grounded, non-diagnostic educational answer strictly from
 * the locally stored WHO & Nigeria health reference library.
 * Never fabricates medical facts, hospitals, doctors, or diagnoses.
 */
export function buildLocalKnowledgeResponse(
  prompt: string,
  redFlag: UrgentRedFlagAssessment,
  matches: LocalLibraryMatch[]
): {
  reply: string;
  citedGuides: Array<{ id: string; title: string; source: string; category: HealthGuideCategory }>;
  hadDirectMatch: boolean;
} {
  const top = matches.slice(0, 2);
  const citedGuides = top.map((m) => ({
    id: m.guide.id,
    title: m.guide.title,
    source: m.guide.source,
    category: m.guide.category,
  }));

  const parts: string[] = [];

  if (redFlag.isUrgent) {
    parts.push(
      `URGENT SAFETY ALERT (${redFlag.matchedSignals.join(', ')}):\n${redFlag.immediateGuidance}`
    );
  }

  if (top.length > 0) {
    const primary = top[0].guide;
    parts.push(
      `From your Offline Health Reference Library — ${primary.title} (${primary.source}):\n${primary.summary}`
    );
    parts.push(
      `Key Educational Guidance:\n${primary.keyPoints.map((pt) => `• ${pt}`).join('\n')}`
    );
    parts.push(
      `When to Seek Professional Medical Care:\n${primary.whenToSeekCare.map((w) => `• ${w}`).join('\n')}`
    );
    parts.push(`Oyo State Care Pathway:\n${primary.oyoCarePathway}`);

    if (top[1] && top[1].score >= 8) {
      parts.push(
        `Related Offline Guide: ${top[1].guide.title} — ${top[1].guide.summary}`
      );
    }

    parts.push(
      'Disclaimer: This response is general educational information from locally cached WHO/Nigeria health guides. It is not a medical diagnosis or prescription. Consult a verified doctor for personal medical advice.'
    );

    return {
      reply: parts.join('\n\n'),
      citedGuides,
      hadDirectMatch: true,
    };
  }

  parts.push(
    `Your offline health library does not contain a specific guide matching "${prompt.trim().slice(0, 90)}".`
  );
  parts.push(
    'What you can do right now offline:\n• Open the Offline Health Library tab to browse all 6 curated WHO & Nigeria health volumes (Primary Care, Women’s Health & PCOS, BP/Diabetes/Sickle Cell, Malaria/Typhoid/Lassa/Vaccines, Emergency First Aid, and Lab Terms).\n• Try a specific health topic such as "blood pressure", "malaria RDT", "PCOS", "ORS dehydration", "HbA1c", or "stroke BE-FAST".\n• Reconnect to the internet (or switch to Smart Hybrid / Cloud AI) for broader clinical education, or book an online consultation with a verified Oyo State doctor.'
  );
  parts.push(
    'Disclaimer: HealthConnect Oyo State provides general health education only and never diagnoses conditions or replaces a qualified healthcare professional.'
  );

  return {
    reply: parts.join('\n\n'),
    citedGuides: [],
    hadDirectMatch: false,
  };
}
