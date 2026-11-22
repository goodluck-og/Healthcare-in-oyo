/**
 * Single source of truth for medical red-flag keyword detection and urgent
 * escalation formatting shared across the Express AI middleware and the
 * client-side Hybrid AI response middleware.
 */

export const URGENT_CARE_FOOTER = 'Urgent: Seek Professional Care';
export const EMERGENCY_PAGE_ROUTE = '/emergency' as const;

export interface RedFlagRule {
  id: string;
  category: string;
  pattern: RegExp;
}

export interface RedFlagScanResult {
  detected: boolean;
  matchedKeywords: string[];
  matchedCategories: string[];
  headline: string;
  immediateGuidance: string;
  footer: string;
  emergencyRoute: typeof EMERGENCY_PAGE_ROUTE;
}

export const MEDICAL_RED_FLAG_RULES: RedFlagRule[] = [
  {
    id: 'breathing-emergency',
    category: 'Difficulty breathing or shortness of breath',
    pattern:
      /\b(shortness of breath|short of breath|can'?t breathe|cannot breathe|difficulty breathing|trouble breathing|struggling to breathe|gasping for air|choking|blue lips|turning blue)\b/gi,
  },
  {
    id: 'unconsciousness',
    category: 'Unconsciousness or unresponsiveness',
    pattern:
      /\b(unconscious|unconsciousness|unresponsive|passed out|fainted and (won'?t|will not) wake|not breathing|stopped breathing|collapsed and not moving)\b/gi,
  },
  {
    id: 'chest-cardiac',
    category: 'Severe chest pain or cardiac warning sign',
    pattern:
      /\b(chest pain|crushing chest|chest tightness|chest pressure|heart attack|pain radiating to (my |the |left )?arm)\b/gi,
  },
  {
    id: 'stroke-befast',
    category: 'Possible stroke warning signs (BE-FAST)',
    pattern:
      /\b(face droop|facial drooping|slurred speech|sudden weakness on one side|cannot lift (my |one )?arm|sudden paralysis|having a stroke)\b/gi,
  },
  {
    id: 'severe-bleeding',
    category: 'Severe or uncontrolled bleeding',
    pattern:
      /\b(heavy bleeding|severe bleeding|uncontrolled bleeding|won'?t stop bleeding|coughing up blood|vomiting blood)\b/gi,
  },
  {
    id: 'seizure-convulsion',
    category: 'Seizure or convulsions',
    pattern: /\b(seizure|seizures|convulsion|convulsions|convulsing|fitting)\b/gi,
  },
  {
    id: 'pregnancy-emergency',
    category: 'Urgent pregnancy danger sign',
    pattern:
      /\b(bleeding (while|during) pregnan\w*|pregnant[^.!?\n]{0,40}(severe headache|blurred vision|bleeding)|baby (stopped|not) moving|eclampsia)\b/gi,
  },
  {
    id: 'anaphylaxis',
    category: 'Severe allergic swelling (anaphylaxis)',
    pattern: /\b(throat swelling|tongue swelling|swollen throat|anaphylaxis|severe allergic reaction)\b/gi,
  },
  {
    id: 'self-harm-crisis',
    category: 'Self-harm or mental health crisis',
    pattern: /\b(suicide|suicidal|kill myself|end my life|self[- ]harm|want to die|overdose)\b/gi,
  },
];

export const EMERGENCY_IMMEDIATE_GUIDANCE =
  'Educational AI chat has been paused because your message or AI output mentions a potentially urgent medical red flag. Do NOT rely on AI chat. Call Nigeria Emergency 112 immediately or go straight to the nearest emergency hospital (such as UCH Ibadan A&E, Ring Road State Hospital, Adeoyo Maternity, or Bowen Ogbomoso), or proceed directly to the HealthConnect Emergency Centre.';

/**
 * Scans any text (incoming patient message or outgoing AI response) for
 * medical red-flag keywords. Runs deterministically in <1ms.
 */
export function scanTextForMedicalRedFlags(text: string): RedFlagScanResult {
  if (!text || !text.trim()) {
    return {
      detected: false,
      matchedKeywords: [],
      matchedCategories: [],
      headline: '',
      immediateGuidance: '',
      footer: URGENT_CARE_FOOTER,
      emergencyRoute: EMERGENCY_PAGE_ROUTE,
    };
  }

  const keywordSet = new Set<string>();
  const categorySet = new Set<string>();

  for (const rule of MEDICAL_RED_FLAG_RULES) {
    // Reset lastIndex because patterns carry the global flag
    rule.pattern.lastIndex = 0;
    const matches = text.match(rule.pattern);
    if (matches && matches.length > 0) {
      categorySet.add(rule.category);
      for (const m of matches) {
        keywordSet.add(m.trim().toLowerCase());
      }
    }
  }

  if (keywordSet.size === 0) {
    return {
      detected: false,
      matchedKeywords: [],
      matchedCategories: [],
      headline: '',
      immediateGuidance: '',
      footer: URGENT_CARE_FOOTER,
      emergencyRoute: EMERGENCY_PAGE_ROUTE,
    };
  }

  return {
    detected: true,
    matchedKeywords: Array.from(keywordSet),
    matchedCategories: Array.from(categorySet),
    headline: 'Medical Red-Flag Detected — Educational Dialogue Paused',
    immediateGuidance: EMERGENCY_IMMEDIATE_GUIDANCE,
    footer: URGENT_CARE_FOOTER,
    emergencyRoute: EMERGENCY_PAGE_ROUTE,
  };
}

/**
 * Builds the standardized emergency escalation reply that replaces normal
 * educational continuation and automatically appends the exact
 * "Urgent: Seek Professional Care" footer with the EmergencyPage route.
 */
export function buildEmergencyEscalationReply(scan: RedFlagScanResult): string {
  const detectedList =
    scan.matchedKeywords.length > 0
      ? scan.matchedKeywords.map((kw) => `"${kw}"`).join(', ')
      : scan.matchedCategories.join(', ');

  return [
    `Medical red-flag detected (${detectedList}). Educational AI guidance has been stopped so you can get immediate medical attention.`,
    scan.immediateGuidance,
    `Direct Emergency Link: Open EmergencyPage (${EMERGENCY_PAGE_ROUTE})`,
    `---\n${URGENT_CARE_FOOTER}`,
  ].join('\n\n');
}
