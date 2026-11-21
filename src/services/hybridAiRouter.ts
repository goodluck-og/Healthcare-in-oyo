import { callAiHealthAssistant } from './apiClient';
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

/**
 * Reflects the ACTUAL execution path used to produce a response
 * (never merely the user's selected preference).
 */
export type ActualAiProcessingPath =
  | 'local-on-device'
  | 'local-library'
  | 'hybrid'
  | 'cloud'
  | 'offline-library';

export interface CitedOfflineGuide {
  id: string;
  title: string;
  source: string;
  category: HealthGuideCategory;
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
  citedGuides: CitedOfflineGuide[];
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

const HYBRID_SAFETY_SYSTEM_INSTRUCTION = `You are HealthConnect Oyo State's responsible Health Information Assistant serving patients and families across Oyo State, Nigeria.
Strict Healthcare Safety Rules:
1. Provide clear, calm, plain-language general health education only—NEVER claim a confirmed medical diagnosis, NEVER prescribe medication, and NEVER advise stopping prescribed medicines.
2. Communicate uncertainty honestly and recommend consulting a verified Oyo State doctor or licensed pharmacist.
3. For urgent warning signs (chest pain, stroke signs, severe bleeding, breathing distress, seizures, pregnancy emergencies), tell the user immediately to call Nigeria Emergency 112 or go to the nearest emergency hospital.
4. NEVER invent hospitals, doctor names, or emergency phone numbers.
5. Keep answers concise, structured with short bullets, and accessible to all digital literacy levels.`;

function buildGroundedReferenceSnippet(
  guides: Array<{ title: string; source: string; summary: string; keyPoints: string[] }>
): string {
  if (guides.length === 0) return '';
  return guides
    .slice(0, 2)
    .map(
      (g) =>
        `[Verified Local Reference: ${g.title} — ${g.source}]\nSummary: ${g.summary}\nKey points: ${g.keyPoints
          .slice(0, 3)
          .join(' ')}`
    )
    .join('\n\n');
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
 * Central Unified Hybrid AI Router for HealthConnect Oyo State.
 *
 * Decision pipeline:
 * 1. Instant local clinical Red-Flag detector (<1ms) — never delays urgent alerts.
 * 2. Offline Health Library grounding & task complexity evaluation.
 * 3. Connectivity + On-Device Gemini Nano (Firebase AI Logic) + Privacy Consent routing.
 * 4. Automatic, honest fallback to approved Local Health Library on network/API failure or timeout.
 */
export async function routeHybridHealthQuery(
  input: HybridAiRouterInput,
  deps: HybridAiRouterDeps = {}
): Promise<HybridAiResponse> {
  const startedAt = Date.now();
  const timeoutMs = deps.timeoutMs ?? 18000;
  const detectOnDevice = deps.detectOnDevice ?? detectOnDeviceAiCapability;
  const runFirebaseHybrid = deps.runFirebaseHybrid ?? runFirebaseHybridInference;
  const callServerCloudAi = deps.callServerCloudAi ?? callAiHealthAssistant;

  // Step 1: Deterministic instant red-flag check
  const redFlag = detectUrgentRedFlags(input.prompt);

  // Step 2: Evaluate task complexity & gather verified local reference guides
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
  const groundedReferenceBlock = buildGroundedReferenceSnippet(matchedGuides);

  const localCapability = await detectOnDevice().catch(
    (): OnDeviceCapabilityInfo => ({
      status: 'unavailable',
      label: 'Offline Health Library Ready',
      detail: 'Local reference library active.',
      browserSupportsPromptApi: false,
    })
  );

  const onDeviceReady = localCapability.status === 'available';

  // Helper: Build Local Health Library response
  const respondFromLocalLibrary = (
    actualPath: 'local-library' | 'offline-library',
    fallbackNotice?: string
  ): HybridAiResponse => {
    const localResult = buildLocalKnowledgeResponse(
      input.prompt,
      redFlag,
      evaluation.topLibraryMatches
    );
    const isOfflinePath = actualPath === 'offline-library';
    return {
      reply: localResult.reply,
      actualPath,
      indicatorLabel: isOfflinePath
        ? 'Offline Mode: Online services unavailable'
        : 'Local AI: Processed on your device',
      indicatorDetail: isOfflinePath
        ? 'Answered locally from your cached WHO & Nigeria Health Reference Library.'
        : 'Answered on-device from curated WHO & Nigeria health guides (zero cloud transfer).',
      provider: 'local-knowledge',
      model: 'Curated WHO/Nigeria Local Health Engine',
      latencyMs: Math.max(1, Date.now() - startedAt),
      redFlag,
      citedGuides: localResult.citedGuides,
      profileContextSharedWithCloud: false,
      fallbackNotice,
    };
  };

  // Step 3: Offline OR explicit Local-Only mode -> NEVER send to cloud
  if (!input.isOnline || input.routingPreference === 'local-only') {
    if (onDeviceReady) {
      try {
        const promptWithRefs = groundedReferenceBlock
          ? `Use these verified local WHO/Nigeria health references when relevant:\n${groundedReferenceBlock}\n\nPatient Question (${input.mode}): ${input.prompt}`
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
            : 'Executed 100% on-device via Firebase AI Logic (Chrome Gemini Nano) with local health references.',
          provider: 'firebase-ai-logic',
          model: onDeviceResult.model,
          latencyMs: Date.now() - startedAt,
          redFlag,
          citedGuides,
          profileContextSharedWithCloud: false,
        };
      } catch {
        // Fall through cleanly to local curated library
      }
    }

    return respondFromLocalLibrary(
      !input.isOnline ? 'offline-library' : 'local-library',
      !input.isOnline
        ? 'No internet connection detected. Using locally cached WHO & Nigeria health reference guides.'
        : undefined
    );
  }

  // Step 4: Online + Smart Hybrid routing
  if (input.routingPreference === 'smart-hybrid' && !input.forceCloudEscalation) {
    // 4a. Prefer on-device Gemini Nano via Firebase AI Logic when browser supports it and task is local-suitable
    if (evaluation.suitableForLocal && onDeviceReady) {
      try {
        const promptWithRefs = groundedReferenceBlock
          ? `Verified local health references:\n${groundedReferenceBlock}\n\nQuestion (${input.mode}): ${input.prompt}`
          : `Question (${input.mode}): ${input.prompt}`;

        const hybridRes = await runFirebaseHybrid({
          prompt: promptWithRefs,
          systemInstruction: HYBRID_SAFETY_SYSTEM_INSTRUCTION,
          mode: 'prefer_on_device',
          timeoutMs,
        });

        const ranOnDevice = hybridRes.inferenceSource === 'on_device';
        const usedHybridGrounding = !ranOnDevice && citedGuides.length > 0;

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
            ? 'Grounded with local WHO/Nigeria health guides and processed via Firebase AI Logic Cloud fallback.'
            : 'Processed via Firebase AI Logic Cloud fallback.',
          provider: 'firebase-ai-logic',
          model: hybridRes.model,
          latencyMs: Date.now() - startedAt,
          redFlag,
          citedGuides,
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
    groundedReferenceBlock ? `Local WHO/Nigeria Reference Context:\n${groundedReferenceBlock}` : '',
    allowProfileContext ? input.patientContext : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const cloudErrors: string[] = [];

  // 5a. Try existing secure Express backend Cloud AI first when configured (keeps API keys server-side)
  if (input.serverCloudConfigured) {
    try {
      const serverMessages = [
        ...input.conversationHistory.slice(-10),
        { role: 'user' as const, content: input.prompt },
      ];
      const serverRes = await withTimeout(
        callServerCloudAi({
          provider: input.cloudProvider,
          model: input.cloudProvider === 'openrouter' ? input.openRouterModel : undefined,
          mode: input.mode,
          patientContext: safeCloudContext || undefined,
          messages: serverMessages,
        }),
        timeoutMs,
        'Cloud AI backend'
      );

      const usedHybrid = citedGuides.length > 0;
      const finalReply = redFlag.isUrgent
        ? `URGENT SAFETY ALERT (${redFlag.matchedSignals.join(', ')}):\n${redFlag.immediateGuidance}\n\n${serverRes.reply}`
        : serverRes.reply;

      return {
        reply: finalReply,
        actualPath: usedHybrid ? 'hybrid' : 'cloud',
        indicatorLabel: usedHybrid
          ? 'Hybrid AI: Combined local and cloud processing'
          : 'Cloud AI: Processed using online AI',
        indicatorDetail: usedHybrid
          ? 'Local WHO/Nigeria health guides combined with secure backend Cloud AI.'
          : 'Processed through the secure rate-limited HealthConnect Oyo backend.',
        provider: serverRes.provider,
        model: serverRes.model || input.cloudProvider,
        latencyMs: Date.now() - startedAt,
        redFlag,
        citedGuides,
        profileContextSharedWithCloud: allowProfileContext,
      };
    } catch (err) {
      cloudErrors.push(err instanceof Error ? err.message : 'Backend Cloud AI unavailable.');
    }
  }

  // 5b. Try Firebase AI Logic Hybrid Inference (PREFER_ON_DEVICE or ONLY_IN_CLOUD)
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
    const usedHybrid = !ranOnDevice && citedGuides.length > 0;
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
        ? 'Grounded with local WHO/Nigeria health guides and completed via Firebase AI Logic Cloud.'
        : 'Processed online via Firebase AI Logic Cloud.',
      provider: 'firebase-ai-logic',
      model: fbRes.model,
      latencyMs: Date.now() - startedAt,
      redFlag,
      citedGuides,
      profileContextSharedWithCloud: !ranOnDevice && allowProfileContext,
    };
  } catch (err) {
    cloudErrors.push(err instanceof Error ? err.message : 'Firebase AI Logic unavailable.');
  }

  // Step 6: Graceful fallback to approved Local Health Library if all cloud paths fail or time out
  const reasonText =
    cloudErrors[0] ||
    'Cloud AI service could not be reached right now (check internet or server AI configuration).';

  return respondFromLocalLibrary(
    'offline-library',
    `Cloud AI unavailable (${reasonText}) — automatically fell back to your approved Offline Health Reference Library.`
  );
}
