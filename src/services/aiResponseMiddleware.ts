import {
  buildEmergencyEscalationReply,
  EMERGENCY_PAGE_ROUTE,
  scanTextForMedicalRedFlags,
  URGENT_CARE_FOOTER,
  type RedFlagScanResult,
} from '../../shared/medicalRedFlags';
import type { HybridAiResponse } from './hybridAiRouter';

/**
 * Builds an immediate safety-intercepted HybridAiResponse when a medical
 * red-flag keyword is detected, halting the educational dialogue instead of
 * returning routine health education.
 */
export function buildInterceptedRedFlagResponse(
  scan: RedFlagScanResult,
  startedAt: number,
  source: 'input-filter' | 'response-filter'
): HybridAiResponse {
  return {
    reply: buildEmergencyEscalationReply(scan),
    actualPath: 'safety-middleware',
    indicatorLabel: URGENT_CARE_FOOTER,
    indicatorDetail:
      source === 'input-filter'
        ? `Medical red-flag middleware halted educational chat (${scan.matchedKeywords.join(', ')}).`
        : `AI response safety middleware intercepted red-flag output (${scan.matchedKeywords.join(', ')}).`,
    provider: 'safety-middleware',
    model: 'Medical Red-Flag Keyword Filter',
    latencyMs: Math.max(1, Date.now() - startedAt),
    redFlag: {
      isUrgent: true,
      matchedSignals: scan.matchedCategories,
      matchedKeywords: scan.matchedKeywords,
      headline: scan.headline,
      immediateGuidance: scan.immediateGuidance,
    },
    haltEducationalDialogue: true,
    urgentFooter: URGENT_CARE_FOOTER,
    emergencyRoute: EMERGENCY_PAGE_ROUTE,
    citedGuides: [],
    profileContextSharedWithCloud: false,
  };
}

/**
 * Client-side AI response middleware layer applied to EVERY Hybrid AI reply
 * (Local Library, On-Device Gemini Nano, Express Cloud AI, and Firebase AI Logic).
 *
 * Scans the AI's reply text for medical red-flag keywords (e.g., "shortness of breath",
 * "unconscious"). If detected, it halts the educational dialogue, automatically
 * appends the "Urgent: Seek Professional Care" footer, and links the user
 * directly to EmergencyPage (`/emergency`).
 */
export function applyAiResponseRedFlagMiddleware(
  response: HybridAiResponse,
  startedAt: number
): HybridAiResponse {
  if (response.haltEducationalDialogue) {
    // Ensure the exact footer and emergency route are always guaranteed present
    const hasFooter = response.reply.includes(URGENT_CARE_FOOTER);
    return {
      ...response,
      reply: hasFooter ? response.reply : `${response.reply}\n\n---\n${URGENT_CARE_FOOTER}`,
      urgentFooter: URGENT_CARE_FOOTER,
      emergencyRoute: EMERGENCY_PAGE_ROUTE,
    };
  }

  // Static pre-approved WHO/Nigeria reference cards include educational "When to Seek Care"
  // lists; user inputs were already strictly screened before reaching these static cards.
  if (response.actualPath === 'local-library' || response.actualPath === 'offline-library') {
    return response;
  }

  const scan = scanTextForMedicalRedFlags(response.reply);
  if (!scan.detected) {
    return response;
  }

  return buildInterceptedRedFlagResponse(scan, startedAt, 'response-filter');
}
