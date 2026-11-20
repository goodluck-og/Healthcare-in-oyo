import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { getServerConfig } from '../config/env';

export interface AiChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiGatewayParams {
  provider: 'gemini' | 'openrouter';
  model?: 'openai/gpt-4o' | 'google/gemini-2.5-flash';
  mode?: string;
  patientContext?: string;
  messages: AiChatTurn[];
}

export interface AiGatewayResult {
  reply: string;
  provider: 'gemini' | 'openrouter';
  model: string;
}

export class AiGatewayError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

const SYSTEM_INSTRUCTION = `You are HealthConnect Africa's AI Health Information Assistant, supporting patients across Nigeria (Lagos, Abuja, Port Harcourt, Kano, Ibadan, Enugu) and expanding African healthcare networks.

Core clinical & communication principles:
1. Always be clear, compassionate, structured, and accessible to users of all digital literacy levels.
2. Explicitly remind users when discussing symptoms or medical documents that you provide general health information and guidance—not a medical diagnosis, prescription, or replacement for a qualified physician, pharmacist, or emergency service.
3. If the user describes red-flag emergency symptoms (e.g., severe chest pain, difficulty breathing, sudden weakness/slurred speech, heavy bleeding, unconsciousness, severe pregnancy complications), immediately advise them to use the HealthConnect Emergency Centre or seek immediate in-person emergency care.
4. When explaining medical documents, lab values (e.g., HbA1c, blood pressure, malaria RDT, lipid profile), or prescriptions, translate medical jargon into plain everyday language and suggest focused questions to ask their doctor.
5. Note when referencing Nigeria-specific clinical pathways (MDCN-verified specialists, NAFDAC-registered medications, NHIA/HMO coverage).
6. Keep responses concise, scannable with short paragraphs and bullet points, and calm in tone.`;

const GEMINI_MODEL_PRIORITY = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseGeminiUpstreamError(err: unknown): {
  status: number;
  codeName: string;
  message: string;
} {
  const rawErr = err as { status?: number; code?: number; message?: string };
  const rawMessage = rawErr?.message || String(err || 'Unknown AI service error');

  let parsedStatus = Number(rawErr?.status || rawErr?.code || 0);
  let codeName = '';
  let cleanMessage = rawMessage;

  const jsonStart = rawMessage.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const parsed = JSON.parse(rawMessage.slice(jsonStart)) as {
        error?: { code?: number; message?: string; status?: string };
      };
      if (parsed?.error) {
        if (typeof parsed.error.code === 'number') parsedStatus = parsed.error.code;
        if (typeof parsed.error.status === 'string') codeName = parsed.error.status;
        if (typeof parsed.error.message === 'string') cleanMessage = parsed.error.message;
      }
    } catch {
      // Keep original message if not valid JSON
    }
  }

  return {
    status: parsedStatus >= 400 && parsedStatus <= 599 ? parsedStatus : 502,
    codeName,
    message: cleanMessage,
  };
}

function isTransientCapacityError(status: number, codeName: string, message: string): boolean {
  const normalized = `${codeName} ${message}`.toLowerCase();
  return (
    status === 503 ||
    status === 429 ||
    normalized.includes('unavailable') ||
    normalized.includes('high demand') ||
    normalized.includes('overloaded') ||
    normalized.includes('try again later')
  );
}

export async function runAiGateway(params: AiGatewayParams): Promise<AiGatewayResult> {
  const config = getServerConfig();
  const modeNote = params.mode ? `Active assistant focus: ${params.mode}.` : '';
  const contextNote = params.patientContext
    ? `\n\nPatient context provided by user:\n${params.patientContext}`
    : '';
  const fullSystemPrompt = `${SYSTEM_INSTRUCTION}\n${modeNote}${contextNote}`;

  if (params.provider === 'openrouter') {
    if (!config.openRouterApiKey) {
      throw new AiGatewayError(
        503,
        'OpenRouter routing is not configured on this server (OPENROUTER_API_KEY missing). Add OPENROUTER_API_KEY in Settings > Secrets or switch to Gemini.'
      );
    }

    const chosenModel = params.model || 'openai/gpt-4o';
    const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': config.appUrl,
        'X-Title': 'HealthConnect Africa',
      },
      body: JSON.stringify({
        model: chosenModel,
        messages: [
          { role: 'system', content: fullSystemPrompt },
          ...params.messages.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
        ],
      }),
    });

    if (!orResponse.ok) {
      const errText = await orResponse.text();
      throw new AiGatewayError(
        orResponse.status,
        `OpenRouter request failed (${orResponse.status}): ${errText.slice(0, 180)}`
      );
    }

    const orData = (await orResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = orData.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw new AiGatewayError(502, 'OpenRouter returned an empty response.');
    }

    return {
      reply,
      provider: 'openrouter',
      model: chosenModel,
    };
  }

  if (!config.geminiApiKey) {
    throw new AiGatewayError(
      503,
      'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets to enable live AI health responses.'
    );
  }

  const ai = new GoogleGenAI({
    apiKey: config.geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const formattedContents = params.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  let lastParsedError: { status: number; codeName: string; message: string } | null = null;
  const retryDelaysMs = [0, 700, 1500];

  for (const modelName of GEMINI_MODEL_PRIORITY) {
    for (let attempt = 0; attempt < retryDelaysMs.length; attempt++) {
      if (retryDelaysMs[attempt] > 0) {
        await sleep(retryDelaysMs[attempt]);
      }

      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: formattedContents,
          config: {
            systemInstruction: fullSystemPrompt,
            ...(modelName === 'gemini-4-hydrogen'
              ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM } }
              : {}),
          },
        });

        const text = response.text?.trim();
        if (!text) {
          throw new AiGatewayError(502, 'The Gemini model returned an empty response. Please try again.');
        }

        return {
          reply: text,
          provider: 'gemini',
          model: modelName,
        };
      } catch (err) {
        if (err instanceof AiGatewayError) {
          throw err;
        }
        const parsed = parseGeminiUpstreamError(err);
        lastParsedError = parsed;

        if (!isTransientCapacityError(parsed.status, parsed.codeName, parsed.message)) {
          if (parsed.status === 403 || parsed.status === 400) {
            throw new AiGatewayError(
              parsed.status,
              'Gemini API rejected the request. Check that GEMINI_API_KEY in Settings > Secrets is valid.'
            );
          }
          throw new AiGatewayError(parsed.status, parsed.message);
        }
      }
    }
  }

  if (lastParsedError && isTransientCapacityError(lastParsedError.status, lastParsedError.codeName, lastParsedError.message)) {
    throw new AiGatewayError(
      lastParsedError.status === 429 ? 429 : 503,
      'Gemini AI servers are temporarily busy due to high demand. Please wait a few seconds and try sending your message again.'
    );
  }

  throw new AiGatewayError(
    503,
    lastParsedError?.message || 'Unable to reach Gemini AI right now. Please try again shortly.'
  );
}
