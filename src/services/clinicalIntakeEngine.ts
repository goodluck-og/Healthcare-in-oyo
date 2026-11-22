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

const GENERAL_SICK_PATTERNS = [
  /\b(i feel sick|i am sick|i'm sick|feeling sick|not feeling well|feel unwell|feeling unwell|i am ill|i'm ill|feel weak|something is wrong with me|help me i'm sick)\b/i,
  /\b(i have (a )?(fever|headache|cough|stomach pain|body pain|cold|rash|nausea|pain|dizzy|dizziness|vomiting|diarrhea|diarrhoea|burn|cut|injury|accident))\b/i,
];

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

  // Combine recent user messages so multi-turn follow-up remembers context!
  const recentUserContext = [
    ...params.conversationHistory
      .filter((m) => m.role === 'user')
      .slice(-3)
      .map((m) => m.content),
    promptTrimmed,
  ].join(' ');

  const ontologyMatches = searchMedicalOntology(recentUserContext, 3);
  const isVagueSickStart =
    /\b(i feel sick|i am sick|i'm sick|feeling sick|not feeling well|feel unwell|feeling unwell|i am ill|i'm ill)\b/i.test(
      promptTrimmed
    ) && ontologyMatches.length === 0;

  // 2. Vague opening ("I feel sick") -> Start ChatGPT-style clarifying questions
  if (isVagueSickStart) {
    return {
      handled: true,
      reply: [
        `I'm sorry you're not feeling well. Let's work through a few quick questions together so I can give you clear, safe health guidance.`,
        `First, what are your main symptoms right now? (You can tap a quick option below or describe them in your own words.)`,
        `1. Where do you feel unwell (for example: fever/chills, headache, cough/throat, stomach/nausea, skin rash, or body ache)?\n2. When did it start, and are you having any severe pain or breathing trouble?`,
        `Note: I provide general health education grounded in WHO, Human Disease Ontology (DOID), and MedlinePlus — never a medical diagnosis. For any urgent danger sign, dial ${emergencyNum}.`,
      ].join('\n\n'),
      quickReplies: [
        'Fever, chills & headache',
        'Cough, runny nose & sore throat',
        'Stomach pain, nausea or diarrhoea',
        'Headache, dizziness or fatigue',
        'Skin rash or itching',
      ],
      intakeStage: 'triage-start',
      matchedOntology: [],
    };
  }

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
