import { callAiHealthAssistant } from './apiClient';
import {
  applyAiResponseRedFlagMiddleware,
  buildInterceptedRedFlagResponse,
} from './aiResponseMiddleware';
import {
  buildInteractiveLocalIntake,
  deriveFollowUpChipsForReply,
  isVagueSickPrompt,
} from './clinicalIntakeEngine';
import {
  detectOnDeviceAiCapability,
  runFirebaseHybridInference,
  type OnDeviceCapabilityInfo,
} from './firebaseHybridAi';
import {
  buildLocalKnowledgeResponse,
  detectUrgentRedFlags,
  evaluatePromptForRouting,
  type UrgentRedFlagAssessment,
} from './localHealthAi';
import type { HybridRoutingPreference } from './offlineLibraryStore';
import type { HealthGuideCategory } from '../data/offlineHealthLibrary';
import { searchMedicalOntology } from '../data/medicalOntologyData';
import type { ChatImageAttachment } from '../types/healthcare';
import {
  EMERGENCY_PAGE_ROUTE,
  scanTextForMedicalRedFlags,
  URGENT_CARE_FOOTER,
} from '../../shared/medicalRedFlags';

/**
 * Reflects the ACTUAL execution path used to produce a response
 * (never merely the user's selected preference).
 */
export type ActualAiProcessingPath =
  | 'local-on-device'
  | 'local-library'
  | 'hybrid'
  | 'cloud'
  | 'offline-library'
  | 'safety-middleware';

export interface CitedOfflineGuide {
  id: string;
  title: string;
  source: string;
  category: HealthGuideCategory;
}

export interface CitedOntologyEntry {
  doid: string;
  icd11: string;
  name: string;
  sources: string[];
}

export interface HybridAiResponse {
  reply: string;
  actualPath: ActualAiProcessingPath;
  indicatorLabel: string;
  indicatorDetail: string;
  provider: string;
  model: string;
  latencyMs: number;
  redFlag: UrgentRedFlagAssessment;
  haltEducationalDialogue?: boolean;
  urgentFooter?: string;
  emergencyRoute?: typeof EMERGENCY_PAGE_ROUTE;
  citedGuides: CitedOfflineGuide[];
  citedOntology?: CitedOntologyEntry[];
  quickReplies?: string[];
  intakeStage?: 'triage-start' | 'clarifying' | 'summary' | 'image-offline-triage' | 'none';
  profileContextSharedWithCloud: boolean;
  fallbackNotice?: string;
}

export interface HybridAiRouterInput {
  prompt: string;
  mode: string;
  routingPreference: HybridRoutingPreference;
  cloudProvider: 'gemini' | 'openrouter';
  openRouterModel?: 'openai/gpt-4o' | 'google/gemini-2.5-flash';
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  patientContext?: string;
  image?: ChatImageAttachment | null;
  emergencyNumber?: string;
  includeProfileContext: boolean;
  cloudConsentGranted: boolean;
  isOnline: boolean;
  serverCloudConfigured: boolean;
  forceCloudEscalation?: boolean;
}

export interface HybridAiRouterDeps {
  detectOnDevice?: () => Promise<OnDeviceCapabilityInfo>;
  runFirebaseHybrid?: typeof runFirebaseHybridInference;
  callServerCloudAi?: typeof callAiHealthAssistant;
  timeoutMs?: number;
}

const HYBRID_SAFETY_SYSTEM_INSTRUCTION = `You are HealthConnect's responsible Universal Health Information Assistant supporting patients and families worldwide.
Strict Healthcare Safety & Interactive Rules:
1. When a user says "I am sick", "I feel sick", "not feeling well", or reports vague illness without detailed symptoms, ALWAYS respond with empathy, remind them to rest and sip water, and ask clear numbered follow-up questions first before giving broad advice: (1) What specific symptoms are you feeling right now (fever, headache, cough, body aches, stomach pain, nausea, dizziness, rash)? (2) When did it start and how severe is it (1-10)? (3) Are you able to rest/hydrate and have you taken any medicines or have existing conditions? (4) Any urgent warning signs?
2. Provide clear, calm, plain-language general health education grounded in WHO, Human Disease Ontology (DOID), and MedlinePlus—NEVER claim a confirmed medical diagnosis, NEVER prescribe medication, and NEVER advise stopping prescribed medicines.
3. For urgent warning signs (chest pain, shortness of breath, stroke signs, severe bleeding, unconsciousness, seizures, pregnancy emergencies, anaphylaxis), tell the user immediately to call local emergency services (112 / 911 / 999) or open the Emergency Centre.
4. NEVER invent hospitals, doctor names, or emergency phone numbers.
5. Keep answers concise, structured with short bullets, and age-appropriate.`;

function buildGroundedReferenceSnippet(
  guides: Array<{ title: string; source: string; summary: string; keyPoints: string[] }>,
  ontologyEntries: Array<{ doid: string; icd11: string; name: string; definition: string }>
): string {
  const blocks: string[] = [];
  if (ontologyEntries.length > 0) {
    blocks.push(
      ontologyEntries
        .slice(0, 2)
        .map(
          (o) =>
            `[Verified Medical Ontology: ${o.name} (${o.doid} · ICD-11 ${o.icd11})]\nDefinition: ${o.definition}`
        )
        .join('\n\n')
    );
  }
  if (guides.length > 0) {
    blocks.push(
      guides
        .slice(0, 2)
        .map(
          (g) =>
            `[Verified Local Reference: ${g.title} — ${g.source}]\nSummary: ${g.summary}\nKey points: ${g.keyPoints
              .slice(0, 3)
              .join(' ')}`
        )
        .join('\n\n')
    );
  }
  return blocks.join('\n\n');
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s.`)), timeoutMs);
    }),
  ]);
}

/**
 * Central Unified Hybrid AI Router for HealthConnect.
 *
 * Decision pipeline:
 * 1. Instant local clinical Red-Flag detector (<1ms) — never delays urgent alerts.
 * 2. Verified Human Disease Ontology (DOID) + WHO/MedlinePlus library grounding & ChatGPT-style intake check.
 * 3. Multimodal image upload escalation to Cloud Vision (online) or offline first-aid triage (offline).
 * 4. Connectivity + On-Device Gemini Nano (Firebase AI Logic) + Privacy Consent routing.
 * 5. Automatic, honest fallback to approved Local Ontology & Health Library on network/API failure or timeout.
 */
export async function routeHybridHealthQuery(
  input: HybridAiRouterInput,
  deps: HybridAiRouterDeps = {}
): Promise<HybridAiResponse> {
  const startedAt = Date.now();

  // Step 1: Deterministic red-flag middleware check on incoming prompt.
  // If detected, halt educational dialogue immediately instead of continuing chat.
  const promptRedFlagScan = scanTextForMedicalRedFlags(input.prompt);
  if (promptRedFlagScan.detected) {
    return buildInterceptedRedFlagResponse(promptRedFlagScan, startedAt, 'input-filter');
  }

  const rawResponse = await executeHybridRoute(input, deps, startedAt);

  // Post-execution AI response middleware: filter AI-generated text for medical red-flags.
  return applyAiResponseRedFlagMiddleware(rawResponse, startedAt);
}

async function executeHybridRoute(
  input: HybridAiRouterInput,
  deps: HybridAiRouterDeps,
  startedAt: number
): Promise<HybridAiResponse> {
  const timeoutMs = deps.timeoutMs ?? 20000;
  const detectOnDevice = deps.detectOnDevice ?? detectOnDeviceAiCapability;
  const runFirebaseHybrid = deps.runFirebaseHybrid ?? runFirebaseHybridInference;
  const callServerCloudAi = deps.callServerCloudAi ?? callAiHealthAssistant;

  const redFlag = detectUrgentRedFlags(input.prompt);

  // Step 2: Evaluate task complexity, gather verified local guides + DOID ontology entries
  const evaluation = evaluatePromptForRouting(
    input.prompt,
    input.mode,
    input.includeProfileContext,
    input.conversationHistory.length
  );

  const matchedGuides = evaluation.topLibraryMatches.map((m) => m.guide);
  const citedGuides: CitedOfflineGuide[] = matchedGuides.slice(0, 2).map((g) => ({
    id: g.id,
    title: g.title,
    source: g.source,
    category: g.category,
  }));

  const ontologyMatches = searchMedicalOntology(
    `${input.prompt} ${input.image?.categoryHint || ''}`,
    2
  );
  const citedOntology: CitedOntologyEntry[] = ontologyMatches.map((m) => ({
    doid: m.entry.doid,
    icd11: m.entry.icd11,
    name: m.entry.name,
    sources: m.entry.sources,
  }));

  const groundedReferenceBlock = buildGroundedReferenceSnippet(
    matchedGuides,
    ontologyMatches.map((m) => m.entry)
  );

  const localCapability = await detectOnDevice().catch(
    (): OnDeviceCapabilityInfo => ({
      status: 'unavailable',
      label: 'Offline Medical Ontology & Library Ready',
      detail: 'Local DOID + WHO/MedlinePlus knowledge active.',
      browserSupportsPromptApi: false,
    })
  );

  const onDeviceReady = localCapability.status === 'available';

  // Helper: Build Local Ontology + Interactive ChatGPT-Style Intake or Library response
  const respondFromLocalLibrary = (
    actualPath: 'local-library' | 'offline-library',
    fallbackNotice?: string
  ): HybridAiResponse => {
    const isOfflinePath = actualPath === 'offline-library';

    // First check interactive ChatGPT-style symptom intake or offline accident photo triage
    const intake = buildInteractiveLocalIntake({
      prompt: input.prompt,
      conversationHistory: input.conversationHistory,
      image: input.image,
      emergencyNumber: input.emergencyNumber,
    });

    if (intake.handled) {
      const intakeOntology: CitedOntologyEntry[] = intake.matchedOntology.map((e) => ({
        doid: e.doid,
        icd11: e.icd11,
        name: e.name,
        sources: e.sources,
      }));
      return {
        reply: intake.reply,
        actualPath,
        indicatorLabel: isOfflinePath
          ? 'Offline Mode: Local Interactive Triage'
          : 'Local AI: Interactive Symptom Triage',
        indicatorDetail: isOfflinePath
          ? 'Guided step-by-step intake using verified offline DOID, WHO & MedlinePlus data.'
          : 'Processed on your device using verified DOID, WHO & MedlinePlus clinical intake.',
        provider: 'local-ontology-intake',
        model: 'HealthConnect DOID / WHO Interactive Engine',
        latencyMs: Math.max(1, Date.now() - startedAt),
        redFlag,
        citedGuides,
        citedOntology: intakeOntology.length > 0 ? intakeOntology : citedOntology,
        quickReplies: intake.quickReplies,
        intakeStage: intake.intakeStage,
        profileContextSharedWithCloud: false,
        fallbackNotice,
      };
    }

    const localResult = buildLocalKnowledgeResponse(
      input.prompt,
      redFlag,
      evaluation.topLibraryMatches
    );
    return {
      reply: localResult.reply,
      actualPath,
      indicatorLabel: isOfflinePath
        ? 'Offline Mode: Online services unavailable'
        : 'Local AI: Processed on your device',
      indicatorDetail: isOfflinePath
        ? 'Answered locally from your cached DOID & WHO Health Reference Library.'
        : 'Answered on-device from curated DOID, WHO & MedlinePlus guides (zero cloud transfer).',
      provider: 'local-knowledge',
      model: 'HealthConnect DOID / WHO Local Engine',
      latencyMs: Math.max(1, Date.now() - startedAt),
      redFlag,
      citedGuides: localResult.citedGuides,
      citedOntology,
      quickReplies: deriveFollowUpChipsForReply(input.prompt, localResult.reply),
      intakeStage: 'none',
      profileContextSharedWithCloud: false,
      fallbackNotice,
    };
  };

  // Step 3: Offline OR explicit Local-Only mode -> NEVER send to cloud
  if (!input.isOnline || input.routingPreference === 'local-only') {
    if (onDeviceReady && !input.image) {
      try {
        const promptWithRefs = groundedReferenceBlock
          ? `Use these verified local DOID & WHO health references when relevant:\n${groundedReferenceBlock}\n\nPatient Question (${input.mode}): ${input.prompt}`
          : `Patient Question (${input.mode}): ${input.prompt}`;

        const onDeviceResult = await runFirebaseHybrid({
          prompt: promptWithRefs,
          systemInstruction: HYBRID_SAFETY_SYSTEM_INSTRUCTION,
          mode: 'only_on_device',
          timeoutMs,
        });

        const finalReply = redFlag.isUrgent
          ? `URGENT SAFETY ALERT (${redFlag.matchedSignals.join(', ')}):\n${redFlag.immediateGuidance}\n\n${onDeviceResult.reply}`
          : onDeviceResult.reply;

        return {
          reply: finalReply,
          actualPath: 'local-on-device',
          indicatorLabel: 'Local AI: Processed on your device',
          indicatorDetail: !input.isOnline
            ? 'Offline Mode — executed locally via Firebase AI Logic (Chrome Gemini Nano).'
            : 'Executed 100% on-device via Firebase AI Logic (Chrome Gemini Nano) with DOID/WHO references.',
          provider: 'firebase-ai-logic',
          model: onDeviceResult.model,
          latencyMs: Date.now() - startedAt,
          redFlag,
          citedGuides,
          citedOntology,
          quickReplies: deriveFollowUpChipsForReply(input.prompt, finalReply),
          profileContextSharedWithCloud: false,
        };
      } catch {
        // Fall through cleanly to local interactive intake / curated library
      }
    }

    return respondFromLocalLibrary(
      !input.isOnline ? 'offline-library' : 'local-library',
      !input.isOnline
        ? 'No internet connection detected. Using locally cached DOID, WHO & MedlinePlus medical guides.'
        : undefined
    );
  }

  // Step 4: Online + Smart Hybrid routing (images go directly to Cloud Vision for visual analysis)
  if (input.routingPreference === 'smart-hybrid' && !input.forceCloudEscalation && !input.image) {
    // 4.0 Vague illness opening ("I am sick" / "I feel sick") -> immediately start structured interactive symptom intake
    if (isVagueSickPrompt(input.prompt)) {
      return respondFromLocalLibrary('local-library');
    }

    // 4a. Prefer on-device Gemini Nano via Firebase AI Logic when browser supports it and task is local-suitable
    if (evaluation.suitableForLocal && onDeviceReady) {
      try {
        const promptWithRefs = groundedReferenceBlock
          ? `Verified local DOID & WHO health references:\n${groundedReferenceBlock}\n\nQuestion (${input.mode}): ${input.prompt}`
          : `Question (${input.mode}): ${input.prompt}`;

        const hybridRes = await runFirebaseHybrid({
          prompt: promptWithRefs,
          systemInstruction: HYBRID_SAFETY_SYSTEM_INSTRUCTION,
          mode: 'prefer_on_device',
          timeoutMs,
        });

        const ranOnDevice = hybridRes.inferenceSource === 'on_device';
        const usedHybridGrounding = !ranOnDevice && (citedGuides.length > 0 || citedOntology.length > 0);

        const finalReply = redFlag.isUrgent
          ? `URGENT SAFETY ALERT (${redFlag.matchedSignals.join(', ')}):\n${redFlag.immediateGuidance}\n\n${hybridRes.reply}`
          : hybridRes.reply;

        return {
          reply: finalReply,
          actualPath: ranOnDevice ? 'local-on-device' : usedHybridGrounding ? 'hybrid' : 'cloud',
          indicatorLabel: ranOnDevice
            ? 'Local AI: Processed on your device'
            : usedHybridGrounding
            ? 'Hybrid AI: Combined local and cloud processing'
            : 'Cloud AI: Processed using online AI',
          indicatorDetail: ranOnDevice
            ? 'Processed privately on-device via Firebase AI Logic (Gemini Nano).'
            : usedHybridGrounding
            ? 'Grounded with local DOID/WHO health guides and processed via Firebase AI Logic Cloud fallback.'
            : 'Processed via Firebase AI Logic Cloud fallback.',
          provider: 'firebase-ai-logic',
          model: hybridRes.model,
          latencyMs: Date.now() - startedAt,
          redFlag,
          citedGuides,
          citedOntology,
          quickReplies: deriveFollowUpChipsForReply(input.prompt, finalReply),
          profileContextSharedWithCloud: false,
        };
      } catch {
        // Continue to local library or secure server cloud fallback below
      }
    }

    // 4b. Strong direct local educational/terminology/app-navigation match without needing cloud transfer
    const strongLocalMatch =
      evaluation.suitableForLocal &&
      evaluation.topLibraryMatches.length > 0 &&
      evaluation.topLibraryMatches[0].score >= 12 &&
      !input.includeProfileContext;

    if (strongLocalMatch) {
      return respondFromLocalLibrary('local-library');
    }
  }

  // Step 5: Cloud AI Processing (with strict NDPA consent guard for profile context)
  const allowProfileContext = Boolean(
    input.includeProfileContext && input.cloudConsentGranted && input.patientContext?.trim()
  );
  const safeCloudContext = [
    groundedReferenceBlock ? `Local DOID & WHO Verified Reference Context:\n${groundedReferenceBlock}` : '',
    allowProfileContext ? input.patientContext : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const cloudErrors: string[] = [];

  // 5a. Try existing secure Express backend Cloud AI first when configured (keeps API keys server-side + supports multimodal images)
  if (input.serverCloudConfigured) {
    try {
      const serverMessages = [
        ...input.conversationHistory.slice(-10),
        { role: 'user' as const, content: input.prompt },
      ];
      const serverRes = await withTimeout(
        callServerCloudAi({
          provider: input.image ? 'gemini' : input.cloudProvider,
          model: !input.image && input.cloudProvider === 'openrouter' ? input.openRouterModel : undefined,
          mode: input.mode,
          patientContext: safeCloudContext || undefined,
          image: input.image
            ? {
                mimeType: input.image.mimeType,
                base64Data: input.image.base64Data,
                categoryHint: input.image.categoryHint,
              }
            : undefined,
          messages: serverMessages,
        }),
        timeoutMs,
        'Cloud AI backend'
      );

      if (serverRes.haltEducationalDialogue || serverRes.redFlagDetected) {
        return {
          reply: serverRes.reply,
          actualPath: 'safety-middleware',
          indicatorLabel: serverRes.urgentFooter || URGENT_CARE_FOOTER,
          indicatorDetail: 'Server medical red-flag middleware intercepted this AI response.',
          provider: serverRes.provider || 'safety-middleware',
          model: serverRes.model || 'red-flag-response-filter',
          latencyMs: Date.now() - startedAt,
          redFlag: {
            isUrgent: true,
            matchedSignals: serverRes.matchedCategories || ['Medical red-flag detected'],
            matchedKeywords: serverRes.matchedKeywords || [],
            headline: 'Medical Red-Flag Detected — Educational Dialogue Paused',
            immediateGuidance:
              'Call your local emergency number immediately or open the HealthConnect Emergency Centre.',
          },
          haltEducationalDialogue: true,
          urgentFooter: serverRes.urgentFooter || URGENT_CARE_FOOTER,
          emergencyRoute: serverRes.emergencyRoute || EMERGENCY_PAGE_ROUTE,
          citedGuides: [],
          citedOntology: [],
          profileContextSharedWithCloud: false,
        };
      }

      const usedHybrid = citedGuides.length > 0 || citedOntology.length > 0;
      const finalReply = redFlag.isUrgent
        ? `URGENT SAFETY ALERT (${redFlag.matchedSignals.join(', ')}):\n${redFlag.immediateGuidance}\n\n${serverRes.reply}`
        : serverRes.reply;

      return {
        reply: finalReply,
        actualPath: usedHybrid ? 'hybrid' : 'cloud',
        indicatorLabel: input.image
          ? 'Cloud Vision AI: Photo First-Aid Analysis'
          : usedHybrid
          ? 'Hybrid AI: Combined local and cloud processing'
          : 'Cloud AI: Processed using online AI',
        indicatorDetail: input.image
          ? 'Emergency/health photo analyzed safely via server-side Gemini Vision + Red-Flag safety filter.'
          : usedHybrid
          ? 'Local DOID/WHO verified guides combined with secure backend Cloud AI.'
          : 'Processed through the secure rate-limited HealthConnect backend.',
        provider: serverRes.provider,
        model: serverRes.model || input.cloudProvider,
        latencyMs: Date.now() - startedAt,
        redFlag,
        citedGuides,
        citedOntology,
        quickReplies: deriveFollowUpChipsForReply(input.prompt, finalReply),
        profileContextSharedWithCloud: allowProfileContext,
      };
    } catch (err) {
      cloudErrors.push(err instanceof Error ? err.message : 'Backend Cloud AI unavailable.');
    }
  }

  // 5b. Try Firebase AI Logic Hybrid Inference (PREFER_ON_DEVICE or ONLY_IN_CLOUD)
  if (!input.image) {
    try {
      const firebasePrompt = safeCloudContext
        ? `${safeCloudContext}\n\nUser Question (${input.mode}): ${input.prompt}`
        : `User Question (${input.mode}): ${input.prompt}`;

      const fbRes = await runFirebaseHybrid({
        prompt: firebasePrompt,
        systemInstruction: HYBRID_SAFETY_SYSTEM_INSTRUCTION,
        mode:
          input.routingPreference === 'cloud-only' ? 'only_in_cloud' : 'prefer_on_device',
        timeoutMs,
      });

      const ranOnDevice = fbRes.inferenceSource === 'on_device';
      const usedHybrid = !ranOnDevice && (citedGuides.length > 0 || citedOntology.length > 0);
      const finalReply = redFlag.isUrgent
        ? `URGENT SAFETY ALERT (${redFlag.matchedSignals.join(', ')}):\n${redFlag.immediateGuidance}\n\n${fbRes.reply}`
        : fbRes.reply;

      return {
        reply: finalReply,
        actualPath: ranOnDevice ? 'local-on-device' : usedHybrid ? 'hybrid' : 'cloud',
        indicatorLabel: ranOnDevice
          ? 'Local AI: Processed on your device'
          : usedHybrid
          ? 'Hybrid AI: Combined local and cloud processing'
          : 'Cloud AI: Processed using online AI',
        indicatorDetail: ranOnDevice
          ? 'Processed privately on-device via Firebase AI Logic.'
          : usedHybrid
          ? 'Grounded with local DOID/WHO health guides and completed via Firebase AI Logic Cloud.'
          : 'Processed online via Firebase AI Logic Cloud.',
        provider: 'firebase-ai-logic',
        model: fbRes.model,
        latencyMs: Date.now() - startedAt,
        redFlag,
        citedGuides,
        citedOntology,
        quickReplies: deriveFollowUpChipsForReply(input.prompt, finalReply),
        profileContextSharedWithCloud: !ranOnDevice && allowProfileContext,
      };
    } catch (err) {
      cloudErrors.push(err instanceof Error ? err.message : 'Firebase AI Logic unavailable.');
    }
  }

  // Step 6: Graceful fallback to approved Local Health Library & Interactive Intake if all cloud paths fail
  const reasonText =
    cloudErrors[0] ||
    'Cloud AI service could not be reached right now (check internet or server AI configuration).';

  return respondFromLocalLibrary(
    'offline-library',
    `Cloud AI unavailable (${reasonText}) — automatically fell back to your verified Offline Medical Ontology & Health Library.`
  );
}
