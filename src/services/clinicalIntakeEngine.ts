import {
  searchMedicalOntology,
  type VerifiedDiseaseOntologyEntry,
} from '../data/medicalOntologyData';
import type { ChatImageAttachment } from '../types/healthcare';

export interface ClinicalIntakeResponse {
  handled: boolean;
  reply: string;
  quickReplies: string[];
  intakeStage: 'triage-start' | 'clarifying' | 'summary' | 'image-offline-triage' | 'none';
  matchedOntology: VerifiedDiseaseOntologyEntry[];
}

const VAGUE_SICK_PHRASE_REGEX =
  /\b(i feel sick|i am sick|i'm sick|am sick|feeling sick|not feeling well|not feeling fine|feel unwell|feeling unwell|i am unwell|i'm unwell|i am ill|i'm ill|don'?t feel well|don'?t feel good|body is not fine|my body (is )?not (fine|well|good)|feel bad|feeling weak|under the weather|something is wrong with me|help me i'?m sick)\b/i;

const SHORT_SICK_ONLY_REGEX = /^(?:i'?m\s+|i\s+am\s+|am\s+)?(?:very\s+|really\s+|so\s+)?(sick|ill|unwell)[.!?\s]*$/i;

const GENERAL_SICK_PATTERNS = [
  VAGUE_SICK_PHRASE_REGEX,
  SHORT_SICK_ONLY_REGEX,
  /\b(i have (a )?(fever|headache|cough|stomach pain|body pain|cold|rash|nausea|pain|dizzy|dizziness|vomiting|diarrhea|diarrhoea|burn|cut|injury|accident))\b/i,
];

/**
 * Returns true when the user reports feeling sick or unwell in general terms
 * without yet naming a specific condition or symptom matched in the ontology.
 * Always evaluates ONLY the current prompt so earlier chat turns never block intake.
 */
export function isVagueSickPrompt(prompt: string): boolean {
  const trimmed = prompt.trim();
  if (!trimmed) return false;
  const matchesSickPhrase =
    VAGUE_SICK_PHRASE_REGEX.test(trimmed) || SHORT_SICK_ONLY_REGEX.test(trimmed);
  if (!matchesSickPhrase) return false;
  const currentPromptMatches = searchMedicalOntology(trimmed, 1);
  return currentPromptMatches.length === 0;
}

/**
 * Generates ChatGPT-style step-by-step interactive symptom intake questions
 * for Local AI (100% offline-ready) backed by verified Human Disease Ontology (DOID),
 * WHO ICD-11, and MedlinePlus entries.
 *
 * Also supports safe offline first-aid photo triage when an emergency/accident image
 * is attached without internet connectivity.
 */
export function buildInteractiveLocalIntake(params: {
  prompt: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  image?: ChatImageAttachment | null;
  emergencyNumber?: string;
}): ClinicalIntakeResponse {
  const emergencyNum = params.emergencyNumber || '112';
  const promptTrimmed = params.prompt.trim();
  const userTurnCount = params.conversationHistory.filter((m) => m.role === 'user').length;

  // 1. Offline accident/injury photo attached -> structured first-aid triage guide
  if (params.image) {
    const traumaMatches = searchMedicalOntology(
      `${promptTrimmed} ${params.image.categoryHint || ''} accident injury wound burn rash`,
      2
    );
    const primary = traumaMatches[0]?.entry;

    const replyParts: string[] = [
      `Photo received locally (${params.image.fileName}) — Offline First-Aid Triage Mode.`,
      `Because Cloud Vision is offline right now, I cannot inspect pixels directly, so let's quickly verify safety step-by-step so you know what to do immediately:`,
      `Step 1 — Immediate Safety Check:\n• Is the person fully awake, responsive, and breathing comfortably?\n• Is there active heavy bleeding, deep gaping tissue, a facial/large burn, or a suspected head/neck/bone injury?\n• If YES to any of these, call emergency services (${emergencyNum}) or open the Emergency Centre right away.`,
    ];

    if (primary) {
      replyParts.push(
        `Verified Offline First-Aid Reference — ${primary.name} (${primary.doid} · ICD-11 ${primary.icd11}):\n${primary.safeHomeMeasures
          .map((m) => `• ${m}`)
          .join('\n')}`
      );
    }

    replyParts.push(
      `Tell me what type of situation this photo shows so I can walk you through the exact next steps (or reconnect online for Cloud AI visual assistance):`
    );

    return {
      handled: true,
      reply: replyParts.join('\n\n'),
      quickReplies: [
        'Minor cut or bleeding',
        'Thermal burn or scald',
        'Fall, sprain or swelling',
        'Skin rash or insect bite',
        'Medication bottle or lab sheet',
      ],
      intakeStage: 'image-offline-triage',
      matchedOntology: traumaMatches.map((m) => m.entry),
    };
  }

  // 2. Vague opening ("I am sick" / "I feel sick") -> Immediately ask what they are feeling, symptoms, duration, and rest
  if (isVagueSickPrompt(promptTrimmed)) {
    return {
      handled: true,
      reply: [
        `I'm really sorry you're not feeling well. Please sit or lie down comfortably, take a few slow sips of clean water, and let's go through a few quick questions so I can help guide you safely.`,
        `What are you feeling right now? Please tell me your symptoms and a few quick details:`,
        `1. Main symptoms: Where in your body do you feel unwell (for example: fever or chills, headache, body aches, cough or sore throat, stomach pain, nausea/vomiting, dizziness, or skin rash)?\n2. Timeline & severity: When did it start, and how strong does it feel from 1 (mild) to 10 (severe)?\n3. Rest, fluids & medicines: Are you able to rest and drink fluids right now, and have you taken any medication or do you have any existing health conditions?\n4. Safety check: Are you having any urgent warning signs such as trouble breathing, chest pain, severe pain, persistent vomiting, fainting, or confusion?`,
        `You can tap one of the symptom options below or type what you feel in your own words. (General health guidance grounded in WHO, DOID & MedlinePlus — not a medical diagnosis. Dial ${emergencyNum} for any emergency.)`,
      ].join('\n\n'),
      quickReplies: [
        'Fever, chills & body aches',
        'Headache, dizziness or fatigue',
        'Cough, runny nose & sore throat',
        'Stomach pain, nausea or diarrhoea',
        'Skin rash or itching',
      ],
      intakeStage: 'triage-start',
      matchedOntology: [],
    };
  }

  // Combine recent user messages so multi-turn follow-up remembers context!
  const recentUserContext = [
    ...params.conversationHistory
      .filter((m) => m.role === 'user')
      .slice(-3)
      .map((m) => m.content),
    promptTrimmed,
  ].join(' ');

  const ontologyMatches = searchMedicalOntology(recentUserContext, 3);

  const isSymptomReport =
    GENERAL_SICK_PATTERNS.some((rx) => rx.test(promptTrimmed)) ||
    (userTurnCount >= 1 &&
      userTurnCount <= 3 &&
      ontologyMatches.length > 0 &&
      promptTrimmed.split(/\s+/).length <= 18);

  if (!isSymptomReport || ontologyMatches.length === 0) {
    return {
      handled: false,
      reply: '',
      quickReplies: [],
      intakeStage: 'none',
      matchedOntology: ontologyMatches.map((m) => m.entry),
    };
  }

  const primary = ontologyMatches[0].entry;

  // 3. First clarifying turn on a matched symptom/condition -> ask focused follow-up questions
  if (userTurnCount < 2) {
    const questions = primary.intakeQuestions.slice(0, 2);
    return {
      handled: true,
      reply: [
        `Thank you for sharing that. To give you more relevant educational guidance (referencing **${primary.name}** · ${primary.doid} / ICD-11 ${primary.icd11}), could you answer two quick follow-up questions?`,
        questions.map((q, idx) => `${idx + 1}. ${q}`).join('\n'),
        `While we check details, here is immediate safe guidance:\n${primary.safeHomeMeasures
          .slice(0, 2)
          .map((m) => `• ${m}`)
          .join('\n')}`,
        `Seek urgent care (${emergencyNum}) immediately if you notice: ${primary.redFlagSymptoms
          .slice(0, 2)
          .join('; ')}.`,
      ].join('\n\n'),
      quickReplies: primary.quickReplyHints.slice(0, 4),
      intakeStage: 'clarifying',
      matchedOntology: ontologyMatches.map((m) => m.entry),
    };
  }

  // 4. Follow-up summary turn -> provide structured verified ontology education + doctor prep
  return {
    handled: true,
    reply: [
      `Thank you for those details. Here is a verified educational summary from **${primary.name}** (${primary.doid} · ICD-11 ${primary.icd11}):`,
      `Overview:\n${primary.definition}`,
      `Practical Safe Next Steps:\n${primary.safeHomeMeasures.map((m) => `• ${m}`).join('\n')}`,
      `When to See a Clinician:\n${primary.whenToSeekDoctor.map((w) => `• ${w}`).join('\n')}`,
      `Red-Flag Warning Signs (Call ${emergencyNum} / Emergency Centre):\n${primary.redFlagSymptoms
        .map((r) => `• ${r}`)
        .join('\n')}`,
      `Sources: ${primary.sources.join(' · ')}.\nDisclaimer: Educational information only — not a medical diagnosis or prescription. Book a licensed clinician through HealthConnect for personal care.`,
    ].join('\n\n'),
    quickReplies: [
      'Questions to ask my doctor',
      'Check a medication safety label',
      'Book an online consultation',
      'Start a new symptom check',
    ],
    intakeStage: 'summary',
    matchedOntology: ontologyMatches.map((m) => m.entry),
  };
}

/**
 * Generates contextual clickable follow-up chips for Cloud AI responses as well,
 * so users get a consistent ChatGPT-style guided experience in both Local & Cloud modes.
 */
export function deriveFollowUpChipsForReply(
  prompt: string,
  reply: string
): string[] {
  const combined = `${prompt} ${reply}`.toLowerCase();
  const matched = searchMedicalOntology(combined, 1)[0]?.entry;

  if (/\?/.test(reply)) {
    if (matched && matched.quickReplyHints.length > 0) {
      return matched.quickReplyHints.slice(0, 4);
    }
    return [
      'Started today, mild (3/10)',
      'Started 2–3 days ago, moderate (6/10)',
      'No fever or breathing trouble',
      'What questions should I ask a doctor?',
    ];
  }

  if (matched) {
    return [
      `When should I see a doctor for ${matched.name.split('(')[0].trim()}?`,
      'What safe home care helps?',
      'Questions to ask my doctor',
      'Start a new symptom check',
    ];
  }

  return [
    'Explain this more simply',
    'What warning signs should I watch for?',
    'Questions to ask a clinician',
  ];
}
