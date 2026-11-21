import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  InferenceSource,
  type AI,
} from 'firebase/ai';
import { app } from '../firebaseConfig';

export type OnDeviceAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable';

export interface OnDeviceCapabilityInfo {
  status: OnDeviceAvailability;
  label: string;
  detail: string;
  browserSupportsPromptApi: boolean;
}

export interface FirebaseHybridResult {
  reply: string;
  inferenceSource: 'on_device' | 'in_cloud';
  model: string;
  latencyMs: number;
}

let cachedAiInstance: AI | null = null;

function getFirebaseAiService(): AI {
  if (!cachedAiInstance) {
    cachedAiInstance = getAI(app, { backend: new GoogleAIBackend() });
  }
  return cachedAiInstance;
}

interface ChromeLanguageModelGlobal {
  availability?: (options?: {
    expectedInputs?: Array<{ type: string; languages?: string[] }>;
    expectedOutputs?: Array<{ type: string; languages?: string[] }>;
  }) => Promise<string>;
}

/**
 * Inspects whether the user's browser exposes Chrome's built-in on-device
 * Gemini Nano LanguageModel API used by Firebase AI Logic Hybrid Inference.
 * Safely returns 'unavailable' on iOS Safari, Firefox, or older mobile browsers
 * without triggering any large model download.
 */
export async function detectOnDeviceAiCapability(): Promise<OnDeviceCapabilityInfo> {
  if (typeof window === 'undefined') {
    return {
      status: 'unavailable',
      label: 'On-device model unavailable',
      detail: 'Server/non-browser environment.',
      browserSupportsPromptApi: false,
    };
  }

  const lm = (globalThis as unknown as { LanguageModel?: ChromeLanguageModelGlobal })
    .LanguageModel;

  if (!lm || typeof lm.availability !== 'function') {
    return {
      status: 'unavailable',
      label: 'Offline Health Library Ready (Browser has no built-in Gemini Nano)',
      detail:
        'This browser does not expose Chrome Prompt API on-device weights. Local AI uses the curated WHO/Nigeria Offline Health Library with zero download penalty.',
      browserSupportsPromptApi: false,
    };
  }

  try {
    const rawStatus = await lm.availability({
      expectedInputs: [{ type: 'text', languages: ['en'] }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
    });

    if (rawStatus === 'available' || rawStatus === 'readily') {
      return {
        status: 'available',
        label: 'On-Device Gemini Nano Ready (Firebase AI Logic)',
        detail:
          'Chrome built-in on-device model is ready for private, zero-latency offline inference via Firebase AI Logic.',
        browserSupportsPromptApi: true,
      };
    }

    if (rawStatus === 'downloading') {
      return {
        status: 'downloading',
        label: 'On-Device Gemini Nano Downloading',
        detail:
          'Chrome is preparing the on-device model in the background. Requests will use the Offline Health Library or Cloud fallback until ready.',
        browserSupportsPromptApi: true,
      };
    }

    if (rawStatus === 'downloadable' || rawStatus === 'after-download') {
      return {
        status: 'downloadable',
        label: 'On-Device Gemini Nano Available on Demand',
        detail:
          'Chrome supports on-device Gemini Nano. First on-device prompt in Chrome may initialize it; Cloud fallback and Offline Health Library remain active.',
        browserSupportsPromptApi: true,
      };
    }

    return {
      status: 'unavailable',
      label: 'Offline Health Library Ready (Device not eligible for Gemini Nano)',
      detail:
        'Hardware or browser settings report on-device model unavailable. Local Health Library and Cloud AI fallback are active.',
      browserSupportsPromptApi: true,
    };
  } catch {
    return {
      status: 'unavailable',
      label: 'Offline Health Library Ready',
      detail: 'Unable to query browser on-device AI capability; falling back safely.',
      browserSupportsPromptApi: false,
    };
  }
}

export async function runFirebaseHybridInference(params: {
  prompt: string;
  systemInstruction: string;
  mode: 'prefer_on_device' | 'only_on_device' | 'only_in_cloud';
  timeoutMs?: number;
}): Promise<FirebaseHybridResult> {
  const ai = getFirebaseAiService();

  const sdkMode =
    params.mode === 'only_on_device'
      ? InferenceMode.ONLY_ON_DEVICE
      : params.mode === 'only_in_cloud'
      ? InferenceMode.ONLY_IN_CLOUD
      : InferenceMode.PREFER_ON_DEVICE;

  const model = getGenerativeModel(ai, {
    mode: sdkMode,
    inCloudParams: {
      model: 'gemini-2.5-flash',
      systemInstruction: params.systemInstruction,
    },
  });

  const combinedPrompt =
    params.mode === 'only_in_cloud'
      ? params.prompt
      : `${params.systemInstruction}\n\nUser Question:\n${params.prompt}`;

  const startedAt = Date.now();
  const timeoutMs = params.timeoutMs ?? 18000;

  const result = await Promise.race([
    model.generateContent(combinedPrompt),
    new Promise<never>((_resolve, reject) => {
      setTimeout(() => reject(new Error('Firebase AI Logic request timed out.')), timeoutMs);
    }),
  ]);

  const replyText = result.response.text()?.trim();
  if (!replyText) {
    throw new Error('Firebase AI Logic returned an empty response.');
  }

  const rawSource = result.response.inferenceSource;
  const inferenceSource: 'on_device' | 'in_cloud' =
    rawSource === InferenceSource.ON_DEVICE ? 'on_device' : 'in_cloud';

  return {
    reply: replyText,
    inferenceSource,
    model:
      inferenceSource === 'on_device'
        ? 'Gemini Nano (On-Device via Firebase AI Logic)'
        : 'Gemini 2.5 Flash (Firebase AI Logic Cloud)',
    latencyMs: Date.now() - startedAt,
  };
}
