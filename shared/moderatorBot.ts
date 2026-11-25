import { filterAndMaskChatPii, type ChatPiiCategory } from './chatPiiFilter.ts';
import { scanTextForMedicalRedFlags } from './medicalRedFlags.ts';

export type ModeratorBotAction =
  | 'allowed'
  | 'pii_masked'
  | 'red_flag_escalated'
  | 'policy_warning';

export interface BotManagedServiceSummary {
  id: string;
  name: string;
  category: 'Care Team' | 'Clinical Service' | 'Emergency Desk' | 'Community Support';
  leadSpecialty: string;
  botModerationEnabled: boolean;
  botAutoMaskPii: boolean;
  botAutoEscalateRedFlags: boolean;
  active: boolean;
}

export interface ModeratorBotDecision {
  botName: 'HealthConnect Sentinel Bot';
  action: ModeratorBotAction;
  maskedText: string;
  detectedCategories: string[];
  piiCategories: ChatPiiCategory[];
  redFlagKeywords: string[];
  policyFlags: string[];
  routedServiceName: string | null;
  botNotice: string | null;
}

const OFF_PLATFORM_SOLICITATION_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  {
    label: 'off_platform_contact',
    regex: /\b(?:whatsapp\s+me|dm\s+me\s+on|text\s+me\s+privately|call\s+my\s+personal\s+line)\b/i,
  },
  {
    label: 'unauthorized_payment_solicitation',
    regex: /\b(?:send\s+(?:money|cash|funds)\s+to|transfer\s+to\s+my\s+account|wire\s+money\s+to|pay\s+into\s+my\s+personal)\b/i,
  },
];

function matchRelevantService(
  text: string,
  services: BotManagedServiceSummary[]
): BotManagedServiceSummary | null {
  const activeBotServices = services.filter((s) => s.active && s.botModerationEnabled);
  if (activeBotServices.length === 0) return null;

  const lower = text.toLowerCase();
  for (const svc of activeBotServices) {
    const tokens = `${svc.name} ${svc.leadSpecialty} ${svc.category}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 4);
    if (tokens.some((tok) => lower.includes(tok))) {
      return svc;
    }
  }
  return activeBotServices[0] || null;
}

/**
 * HealthConnect Sentinel Bot — Automated Moderator Engine.
 * Runs deterministically across chat inputs and active Admin-configured
 * Care Teams & Website Services to enforce:
 *  1) Real-time PII masking (phone, account, coordinates)
 *  2) Medical Red-Flag emergency escalation
 *  3) Off-platform contact / payment solicitation policy guards
 */
export function evaluateModeratorBot(
  rawText: string,
  services: BotManagedServiceSummary[] = []
): ModeratorBotDecision {
  const matchedService = matchRelevantService(rawText, services);
  const autoMask = matchedService ? matchedService.botAutoMaskPii : true;
  const autoEscalate = matchedService ? matchedService.botAutoEscalateRedFlags : true;

  const piiResult = filterAndMaskChatPii(rawText);
  const workingText = autoMask ? piiResult.maskedText : rawText;
  const redFlagScan = autoEscalate ? scanTextForMedicalRedFlags(workingText) : null;
  const redFlags = redFlagScan?.detected ? redFlagScan.matchedKeywords : [];

  const policyFlags: string[] = [];
  for (const rule of OFF_PLATFORM_SOLICITATION_PATTERNS) {
    if (rule.regex.test(workingText)) {
      policyFlags.push(rule.label);
    }
  }

  if (redFlags.length > 0) {
    return {
      botName: 'HealthConnect Sentinel Bot',
      action: 'red_flag_escalated',
      maskedText: workingText,
      detectedCategories: Array.from(new Set([...redFlags, ...piiResult.detectedCategories])),
      piiCategories: piiResult.detectedCategories,
      redFlagKeywords: redFlags,
      policyFlags,
      routedServiceName: matchedService?.name || null,
      botNotice: `HealthConnect Sentinel Bot escalated emergency indicators (${redFlags.join(', ')}) to urgent care guidance.`,
    };
  }

  if (policyFlags.length > 0) {
    return {
      botName: 'HealthConnect Sentinel Bot',
      action: 'policy_warning',
      maskedText: workingText,
      detectedCategories: Array.from(new Set([...policyFlags, ...piiResult.detectedCategories])),
      piiCategories: piiResult.detectedCategories,
      redFlagKeywords: [],
      policyFlags,
      routedServiceName: matchedService?.name || null,
      botNotice:
        'HealthConnect Sentinel Bot flagged off-platform contact or payment solicitation. Please keep all healthcare consultations and verified payments inside HealthConnect.',
    };
  }

  if (piiResult.hasSensitiveData && autoMask) {
    return {
      botName: 'HealthConnect Sentinel Bot',
      action: 'pii_masked',
      maskedText: piiResult.maskedText,
      detectedCategories: piiResult.detectedCategories,
      piiCategories: piiResult.detectedCategories,
      redFlagKeywords: [],
      policyFlags: [],
      routedServiceName: matchedService?.name || null,
      botNotice: piiResult.policyNotice,
    };
  }

  return {
    botName: 'HealthConnect Sentinel Bot',
    action: 'allowed',
    maskedText: workingText,
    detectedCategories: [],
    piiCategories: [],
    redFlagKeywords: [],
    policyFlags: [],
    routedServiceName: matchedService?.name || null,
    botNotice: null,
  };
}
