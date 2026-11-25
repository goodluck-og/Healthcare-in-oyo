/**
 * Shared real-time regex-based PII & off-policy input filter for HealthConnect chat.
 * Detects and masks:
 *  - Phone numbers ([MASKED_PHONE])
 *  - Bank / financial account & card numbers ([MASKED_ACCOUNT])
 *  - Physical location coordinates & map pins ([MASKED_COORDINATES])
 *
 * Carefully designed to preserve legitimate clinical numbers such as blood pressure
 * (120/80), glucose (110 mg/dL), temperature (37.5°C), HbA1c (5.4%), and emergency
 * short codes (112, 911, 999).
 */

export type ChatPiiCategory = 'phone' | 'account' | 'coordinates';

export interface ChatPiiFilterResult {
  maskedText: string;
  hasSensitiveData: boolean;
  detectedCategories: ChatPiiCategory[];
  matchCount: number;
  policyNotice: string | null;
}

export const MASK_TOKENS: Record<ChatPiiCategory, string> = {
  phone: '[MASKED_PHONE]',
  account: '[MASKED_ACCOUNT]',
  coordinates: '[MASKED_COORDINATES]',
};

// 1. Physical location coordinates & map pin URLs
const MAP_PIN_URL_REGEX =
  /\b(?:https?:\/\/)?(?:www\.)?(?:maps\.google\.com[/?][^\s]+|google\.com\/maps[/?][^\s]+|goo\.gl\/maps\/[^\s]+|maps\.app\.goo\.gl\/[^\s]+|geo:-?\d{1,2}\.\d+,-?\d{1,3}\.\d+)\b/gi;

const DMS_COORDINATE_REGEX =
  /\b\d{1,3}\s*°\s*\d{1,2}\s*['′]\s*(?:\d{1,2}(?:\.\d+)?\s*["″]?)?\s*[NS]\s*[,;\s]+\s*\d{1,3}\s*°\s*\d{1,2}\s*['′]\s*(?:\d{1,2}(?:\.\d+)?\s*["″]?)?\s*[EW]\b/gi;

const LABELED_COORD_REGEX =
  /\b(?:lat(?:itude)?|gps|coords?|location)\s*[:=]?\s*-?(?:[1-8]?\d(?:\.\d{2,})|90(?:\.0+)?)\s*°?\s*[NS]?\s*[,;\s/]+\s*(?:lon(?:gitude)?|lng)?\s*[:=]?\s*-?(?:1[0-7]\d(?:\.\d{2,})|180(?:\.0+)?|[1-9]?\d(?:\.\d{2,}))\s*°?\s*[EW]?\b/gi;

const DECIMAL_COORD_PAIR_REGEX =
  /(?<![\w/.-])(-?(?:[1-8]?\d\.\d{3,}|90\.0{3,}))\s*°?\s*([NS])?\s*,\s*(-?(?:1[0-7]\d\.\d{3,}|180\.0{3,}|[1-9]?\d\.\d{3,}))\s*°?\s*([EW])?(?![\w-]|\.\d)/gi;

// 2. Bank / financial account numbers, IBANs, BVNs, and payment cards
const LABELED_ACCOUNT_REGEX =
  /\b(?:account(?:\s*(?:no|num|number|#))?|acct(?:\s*(?:no|num|number|#))?|iban|routing(?:\s*number)?|bvn|nin|bank\s*(?:acct|account))\s*[:#=-]?\s*(?:[A-Z]{2}\d{2}[A-Z0-9]{10,26}|(?:\d[\s-]?){9,18}\d)\b/gi;

const IBAN_STANDALONE_REGEX = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,26}\b/g;

// Payment card numbers (13–19 digits with optional spaces or dashes)
const PAYMENT_CARD_REGEX = /(?<!\d)(?:\d{4}[\s-]){3}\d{1,7}(?!\d)|(?<!\d)\d{13,19}(?!\d)/g;

// Standalone 10-digit NUBAN / bank account numbers (excluding Nigerian mobile prefixes 070/080/081/090/091)
const STANDALONE_ACCOUNT_10_REGEX = /(?<![+\d-])(?!0(?:70|80|81|90|91)\d{7})(?:\d{10})(?!\d)/g;

// 3. Phone numbers (international, Nigerian 11-digit, and formatted 10-digit numbers)
const INTL_PHONE_REGEX =
  /(?<!\w)\+\d{1,3}[\s.-]?(?:\(\d{1,4}\)[\s.-]?)?(?:\d[\s.-]?){7,12}\d(?!\d)/g;

const NIGERIA_LOCAL_PHONE_REGEX =
  /(?<!\d)0(?:70|80|81|90|91)\d[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g;

const FORMATTED_LOCAL_PHONE_REGEX =
  /(?<!\d)(?:\(\d{3}\)\s?\d{3}[\s.-]\d{4}|\d{3}[\s.-]\d{3}[\s.-]\d{4})(?!\d)/g;

const LABELED_PHONE_REGEX =
  /\b(?:phone|tel|call\s+me(?:\s+at)?|whatsapp|mobile|cell|number)\s*[:#=-]?\s*(?:\+?\d[\d\s().-]{7,15}\d)\b/gi;

function isValidLatLngPair(latStr: string, lngStr: string): boolean {
  const lat = Number.parseFloat(latStr);
  const lng = Number.parseFloat(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

const CATEGORY_LABELS: Record<ChatPiiCategory, string> = {
  phone: 'Phone Number',
  account: 'Account / Financial Number',
  coordinates: 'Location Coordinates',
};

export function filterAndMaskChatPii(input: string): ChatPiiFilterResult {
  if (!input) {
    return {
      maskedText: '',
      hasSensitiveData: false,
      detectedCategories: [],
      matchCount: 0,
      policyNotice: null,
    };
  }

  let output = input;
  const detected = new Set<ChatPiiCategory>();
  let matchCount = 0;

  const replaceWith = (regex: RegExp, category: ChatPiiCategory) => {
    output = output.replace(regex, () => {
      detected.add(category);
      matchCount += 1;
      return MASK_TOKENS[category];
    });
  };

  // Pass 1: Physical location coordinates (before phone/account so coordinate digits don't collide)
  replaceWith(MAP_PIN_URL_REGEX, 'coordinates');
  replaceWith(DMS_COORDINATE_REGEX, 'coordinates');
  replaceWith(LABELED_COORD_REGEX, 'coordinates');
  output = output.replace(
    DECIMAL_COORD_PAIR_REGEX,
    (fullMatch, latStr: string, _ns: string | undefined, lngStr: string) => {
      if (!isValidLatLngPair(latStr, lngStr)) return fullMatch;
      detected.add('coordinates');
      matchCount += 1;
      return MASK_TOKENS.coordinates;
    }
  );

  // Pass 2: Explicitly labeled account numbers, IBANs, and card numbers
  replaceWith(LABELED_ACCOUNT_REGEX, 'account');
  replaceWith(IBAN_STANDALONE_REGEX, 'account');
  replaceWith(PAYMENT_CARD_REGEX, 'account');

  // Pass 3: Phone numbers (international, Nigerian 11-digit, formatted 10-digit, labeled)
  replaceWith(LABELED_PHONE_REGEX, 'phone');
  replaceWith(INTL_PHONE_REGEX, 'phone');
  replaceWith(NIGERIA_LOCAL_PHONE_REGEX, 'phone');
  replaceWith(FORMATTED_LOCAL_PHONE_REGEX, 'phone');

  // Pass 4: Standalone 10-digit bank account numbers (NUBAN)
  replaceWith(STANDALONE_ACCOUNT_10_REGEX, 'account');

  const detectedCategories = Array.from(detected);
  const hasSensitiveData = detectedCategories.length > 0;
  const policyNotice = hasSensitiveData
    ? `Health-Focused Chat Policy: ${detectedCategories
        .map((c) => CATEGORY_LABELS[c])
        .join(', ')} detected and automatically masked for your privacy.`
    : null;

  return {
    maskedText: output,
    hasSensitiveData,
    detectedCategories,
    matchCount,
    policyNotice,
  };
}
