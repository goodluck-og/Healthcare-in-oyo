import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookmarkCheck,
  BookmarkPlus,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  History,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Mic,
  MicOff,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { callAiHealthAssistant } from '../services/apiClient';
import { AnatomyExplorer } from '../components/ai/AnatomyExplorer';
import type { AiConsultation } from '../types/healthcare';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

const VOICE_LANGUAGES = [
  { code: 'en-NG', label: 'English (Nigeria)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'fr-FR', label: 'Français' },
] as const;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  model?: string;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hello! I am the HealthConnect Oyo State AI Health Information Assistant. I can help you understand medical terms or lab reports, prepare for online doctor consultations and physical exams in Oyo State, or organise vital reminders.\n\nImportant: I provide general health information only and do not diagnose conditions or replace a qualified doctor, pharmacist, or emergency team.',
};

const ASSISTANT_MODES = [
  'General Symptom Guidance',
  'Medical Document Explainer',
  'Health Record Summary',
  'Appointment & Referral Prep',
  'Medication & Vitals Reminders',
] as const;

const OPENROUTER_MODELS = [
  { id: 'openai/gpt-4o', label: 'OpenAI GPT-4o (via OpenRouter)' },
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (via OpenRouter)' },
] as const;

const QUICK_PROMPTS = [
  'Explain what HbA1c 5.4% and Total Cholesterol 184 mg/dL mean in plain language.',
  'What questions should I ask my cardiologist about my recent blood pressure readings?',
  'Which healthcare services on HealthConnect Oyo State support maternal & child wellness in Ibadan or Ogbomoso?',
  'Help me structure a daily medication and blood pressure check reminder routine.',
];

function deriveConsultationTopic(prompt: string, fallbackMode: string): string {
  const cleaned = prompt
    .replace(/^\[Anatomy Region:[^\]]+\]\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return fallbackMode;
  const firstSentence = cleaned.split(/(?<=[.?!])\s+/)[0] || cleaned;
  return firstSentence.length > 110 ? `${firstSentence.slice(0, 107).trim()}...` : firstSentence;
}

function formatConsultationDate(iso: string): string {
  try {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return dt.toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function AiAssistantPage() {
  const {
    navigate,
    user,
    familyProfiles,
    activeProfileId,
    bpReadings,
    glucoseReadings,
    labResults,
    aiConsultations,
    saveAiConsultation,
    deleteAiConsultation,
    integrationStatus,
    isGuestDemo,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const [provider, setProvider] = useState<'gemini' | 'openrouter'>('gemini');
  const [openRouterModel, setOpenRouterModel] = useState<
    'openai/gpt-4o' | 'google/gemini-2.5-flash'
  >('openai/gpt-4o');
  const [mode, setMode] = useState<string>(ASSISTANT_MODES[0]);
  const [includeProfileContext, setIncludeProfileContext] = useState(true);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [speechLang, setSpeechLang] = useState<string>('en-NG');

  // History & persistence UI state
  const [savingHistory, setSavingHistory] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [historyModeFilter, setHistoryModeFilter] = useState<string>('ALL');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const manualStopRef = useRef(false);
  const latestInputRef = useRef(input);
  latestInputRef.current = input;
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const speechSupported = Boolean(getSpeechRecognitionConstructor());

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);

  useEffect(() => {
    return () => {
      manualStopRef.current = true;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      setLoadingSeconds(0);
      return;
    }
    const timer = window.setInterval(() => {
      setLoadingSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length, loading, errorMsg, activeTab]);

  useEffect(() => {
    if (!saveFeedback) return;
    const t = window.setTimeout(() => setSaveFeedback(null), 4000);
    return () => window.clearTimeout(t);
  }, [saveFeedback]);

  const activeProfile =
    familyProfiles.find((p) => p.id === activeProfileId) || familyProfiles[0] || null;

  const filteredConsultations = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return aiConsultations.filter((item) => {
      if (historyModeFilter !== 'ALL' && item.mode !== historyModeFilter) return false;
      if (!q) return true;
      return (
        item.topic.toLowerCase().includes(q) ||
        item.userPrompt.toLowerCase().includes(q) ||
        item.assistantSummary.toLowerCase().includes(q) ||
        item.mode.toLowerCase().includes(q)
      );
    });
  }, [aiConsultations, historySearch, historyModeFilter]);

  const conversationTurns = useMemo(
    () => messages.filter((m) => m.id !== 'welcome'),
    [messages]
  );

  const canSaveConversation = useMemo(
    () =>
      conversationTurns.some((m) => m.role === 'user') &&
      conversationTurns.some((m) => m.role === 'assistant'),
    [conversationTurns]
  );

  const buildPatientContext = () => {
    if (!includeProfileContext || !activeProfile) return '';
    const latestBp = bpReadings.find((b) => b.profileId === activeProfile.id);
    const latestGlu = glucoseReadings.find((g) => g.profileId === activeProfile.id);
    const latestLab = labResults.find((l) => l.profileId === activeProfile.id);

    return [
      `Profile: ${activeProfile.fullName} (${activeProfile.age} yrs, ${activeProfile.city}, Blood Group ${activeProfile.bloodGroup}, Genotype ${activeProfile.genotype}, Allergies: ${activeProfile.allergies.join(', ') || 'None recorded'})`,
      latestBp
        ? `Latest BP Log: ${latestBp.systolic}/${latestBp.diastolic} mmHg, Pulse ${latestBp.pulse} bpm (${latestBp.recordedAt})`
        : '',
      latestGlu
        ? `Latest Glucose Log: ${latestGlu.valueMgDl} mg/dL (${latestGlu.context}, ${latestGlu.recordedAt})`
        : '',
      latestLab ? `Recent Lab Summary: ${latestLab.testName} — ${latestLab.summary}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  };

  const persistConsultationSummary = async (params: {
    prompt: string;
    reply: string;
    replyProvider: string;
    replyModel: string;
    totalTurns: number;
    silent?: boolean;
  }) => {
    // Only auto-persist to Firestore when signed in & verified (or in guest session)
    if (user.signedIn && !user.emailVerified) {
      if (!params.silent) {
        setSaveFeedback('Verify your email in Dashboard to archive consultations in Firestore.');
      }
      return;
    }

    setSavingHistory(true);
    try {
      await saveAiConsultation({
        profileId: activeProfile?.id || 'default',
        mode,
        topic: deriveConsultationTopic(params.prompt, mode),
        userPrompt: params.prompt,
        assistantSummary: params.reply,
        provider: params.replyProvider === 'openrouter' ? 'openrouter' : 'gemini',
        model:
          params.replyModel ||
          (provider === 'openrouter' ? openRouterModel : 'gemini-3.1-flash-lite'),
        messageCount: Math.max(2, params.totalTurns),
      });
      setSaveFeedback(
        params.silent ? 'Saved to Consultation History' : 'Consultation summary saved to Firestore'
      );
    } catch (err) {
      if (!params.silent) {
        setSaveFeedback(
          err instanceof Error ? err.message : 'Unable to save consultation right now.'
        );
      }
    } finally {
      setSavingHistory(false);
    }
  };

  const sendMessage = async (textToSend?: string, options?: { isRetry?: boolean }) => {
    const content = (textToSend ?? input).trim();
    if (!content || loading) return;

    if (activeTab !== 'chat') {
      setActiveTab('chat');
    }

    if (isListening) {
      manualStopRef.current = true;
      recognitionRef.current?.stop();
      setIsListening(false);
      setInterimTranscript('');
    }

    setErrorMsg(null);
    setLastFailedPrompt(null);

    let updatedHistory = messages;
    if (!options?.isRetry) {
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: 'user',
        content,
      };
      updatedHistory = [...messages, userMsg];
      setMessages(updatedHistory);
    }
    if (!textToSend) setInput('');
    setLoading(true);
    setLoadingSeconds(0);

    try {
      const response = await callAiHealthAssistant({
        provider,
        model: provider === 'openrouter' ? openRouterModel : undefined,
        mode,
        patientContext: buildPatientContext(),
        messages: updatedHistory
          .filter((m) => m.id !== 'welcome')
          .map((m) => ({ role: m.role, content: m.content })),
      });

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        provider: response.provider,
        model: response.model,
      };
      const nextThread = [...updatedHistory, assistantMsg];
      setMessages(nextThread);

      // Automatically archive completed exchange in Firestore Consultation History
      const turnCount = nextThread.filter((m) => m.id !== 'welcome').length;
      void persistConsultationSummary({
        prompt: content,
        reply: response.reply,
        replyProvider: response.provider || provider,
        replyModel: response.model || (provider === 'openrouter' ? openRouterModel : 'gemini'),
        totalTurns: turnCount,
        silent: true,
      });
    } catch (err) {
      setLastFailedPrompt(content);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not reach the backend AI gateway (/api/ai/health-assistant).'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualSaveCurrentChat = async () => {
    if (!canSaveConversation || savingHistory) return;
    const lastUser = [...conversationTurns].reverse().find((m) => m.role === 'user');
    const lastAssistant = [...conversationTurns].reverse().find((m) => m.role === 'assistant');
    if (!lastUser || !lastAssistant) return;

    await persistConsultationSummary({
      prompt: lastUser.content,
      reply: lastAssistant.content,
      replyProvider: lastAssistant.provider || provider,
      replyModel: lastAssistant.model || (provider === 'openrouter' ? openRouterModel : 'gemini'),
      totalTurns: conversationTurns.length,
      silent: false,
    });
  };

  const handleStartNewChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setErrorMsg(null);
    setLastFailedPrompt(null);
    setSaveFeedback(null);
    setActiveTab('chat');
  };

  const handleLoadConsultationIntoChat = (item: AiConsultation) => {
    setMode(item.mode);
    setMessages([
      WELCOME_MESSAGE,
      {
        id: `hist-u-${item.id}`,
        role: 'user',
        content: item.userPrompt,
      },
      {
        id: `hist-a-${item.id}`,
        role: 'assistant',
        content: item.assistantSummary,
        provider: item.provider,
        model: item.model,
      },
    ]);
    setErrorMsg(null);
    setLastFailedPrompt(null);
    setActiveTab('chat');
  };

  const handleDeleteConsultation = async (consultationId: string) => {
    setHistoryError(null);
    setDeletingId(consultationId);
    try {
      await deleteAiConsultation(consultationId);
    } catch (err) {
      setHistoryError(
        err instanceof Error ? err.message : 'Unable to delete consultation summary.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleAskAnatomyRegion = (promptText: string, regionLabel: string) => {
    setMode('General Symptom Guidance');
    setActiveTab('chat');
    void sendMessage(`[Anatomy Region: ${regionLabel}] ${promptText}`);
  };

  const stopVoiceDictation = (andSend = false) => {
    manualStopRef.current = true;
    const interim = interimTranscript.trim();
    if (interim) {
      const merged = [latestInputRef.current.trim(), interim].filter(Boolean).join(' ');
      latestInputRef.current = merged;
      setInput(merged);
      setInterimTranscript('');
    }
    recognitionRef.current?.stop();
    setIsListening(false);
    if (andSend) {
      const text = latestInputRef.current.trim();
      if (text) {
        void sendMessage(text);
        setInput('');
      }
    }
  };

  const toggleVoiceDictation = () => {
    if (isListening) {
      stopVoiceDictation(false);
      return;
    }

    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      setVoiceError(
        'Voice-to-Text is not supported in this browser. Please use Chrome, Edge, or Safari, or type your symptoms below.'
      );
      return;
    }

    setVoiceError(null);
    setInterimTranscript('');
    manualStopRef.current = false;

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let finalChunk = '';
        let interimChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || '';
          if (result.isFinal) {
            finalChunk += transcript;
          } else {
            interimChunk += transcript;
          }
        }

        if (finalChunk.trim()) {
          setInput((prev) => {
            const combined = [prev.trim(), finalChunk.trim()].filter(Boolean).join(' ');
            latestInputRef.current = combined;
            return combined;
          });
        }
        setInterimTranscript(interimChunk.trim());
      };

      recognition.onerror = (event) => {
        if (event.error === 'aborted' && manualStopRef.current) return;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceError(
            'Microphone access was blocked. Allow microphone permission in your browser settings to dictate symptoms.'
          );
        } else if (event.error === 'audio-capture') {
          setVoiceError('No working microphone was detected on this device.');
        } else if (event.error === 'no-speech') {
          setVoiceError(
            'No speech detected. Speak clearly closer to your microphone and try again.'
          );
        } else if (event.error === 'network') {
          setVoiceError(
            'Speech recognition network error. Please check your connection or type below.'
          );
        } else {
          setVoiceError(
            `Voice recognition stopped (${event.error}). You can try again or type below.`
          );
        }
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceError(
        'Unable to start browser SpeechRecognition. Check microphone permissions and try again.'
      );
    }
  };

  const selectedProviderConfigured =
    provider === 'gemini'
      ? integrationStatus.geminiConfigured
      : integrationStatus.openrouterConfigured;

  return (
    <div className="min-h-screen bg-[#F5F6FC] py-8 sm:py-10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 space-y-6">
        {/* Top Safety Banner */}
        <div className="rounded-2xl bg-[#0F0E47] text-white p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#FFB585] shrink-0 mt-0.5" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold">HealthConnect AI Health Assistant</h1>
              <p className="text-xs sm:text-sm text-[#D7D8EE] mt-1 leading-relaxed">
                Informational guidance only — AI is not a replacement for a qualified doctor,
                pharmacist, or emergency medical team. For urgent symptoms, contact the Emergency
                Centre immediately.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/emergency')}
            className="px-4 py-2.5 min-h-[42px] rounded-xl bg-[#E5484D] hover:bg-[#C9363B] text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Go to Emergency Centre
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Configuration, Anatomy Explorer & Quick Prompts */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl bg-white border border-[#272757]/10 p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[#272757]">Server-Side AI Gateway</p>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      selectedProviderConfigured
                        ? 'bg-[#1D7A4C]/12 text-[#1D7A4C]'
                        : 'bg-[#E8702A]/12 text-[#9C4410]'
                    }`}
                  >
                    {selectedProviderConfigured ? 'Key Detected' : 'Key Not Configured'}
                  </span>
                </div>
                <p className="text-[11px] text-[#505081] mt-1">
                  All prompts route through `/api/ai/health-assistant` with Firebase Bearer
                  authentication and audit logging.
                </p>

                <div className="grid grid-cols-2 gap-2 mt-2.5">
                  <button
                    type="button"
                    onClick={() => setProvider('gemini')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      provider === 'gemini'
                        ? 'bg-[#272757] text-white'
                        : 'bg-[#F5F6FC] text-[#505081]'
                    }`}
                  >
                    Gemini ({integrationStatus.geminiConfigured ? 'Ready' : 'Unset'})
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvider('openrouter')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      provider === 'openrouter'
                        ? 'bg-[#272757] text-white'
                        : 'bg-[#F5F6FC] text-[#505081]'
                    }`}
                  >
                    OpenRouter ({integrationStatus.openrouterConfigured ? 'Ready' : 'Unset'})
                  </button>
                </div>

                {provider === 'openrouter' && (
                  <div className="mt-3">
                    <label
                      htmlFor="openrouter-model"
                      className="block text-[11px] font-semibold text-[#272757] mb-1"
                    >
                      OpenRouter Model
                    </label>
                    <select
                      id="openrouter-model"
                      value={openRouterModel}
                      onChange={(e) =>
                        setOpenRouterModel(
                          e.target.value as 'openai/gpt-4o' | 'google/gemini-2.5-flash'
                        )
                      }
                      className="w-full px-3 py-2 min-h-[40px] rounded-xl bg-[#F5F6FC] border border-[#272757]/15 text-xs text-[#0F0E47]"
                    >
                      {OPENROUTER_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {!selectedProviderConfigured && (
                  <p className="mt-2.5 text-[11px] text-[#9C4410] bg-[#E8702A]/10 border border-[#E8702A]/20 rounded-xl p-2.5 leading-relaxed">
                    {provider === 'gemini'
                      ? 'GEMINI_API_KEY is not configured in server secrets. Configure it in Settings > Secrets or switch providers.'
                      : 'OPENROUTER_API_KEY is not configured in server secrets. Add it in Settings > Secrets (never paste raw secrets into source code).'}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-[#272757]/10">
                <label
                  htmlFor="ai-focus"
                  className="block text-xs font-semibold text-[#272757] mb-1.5"
                >
                  Assistant Focus
                </label>
                <select
                  id="ai-focus"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#F5F6FC] border border-[#272757]/15 text-xs font-medium text-[#0F0E47]"
                >
                  {ASSISTANT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-[#272757]/10">
                <label className="flex items-start gap-2.5 text-xs text-[#0F0E47] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeProfileContext}
                    onChange={(e) => setIncludeProfileContext(e.target.checked)}
                    disabled={!activeProfile}
                    className="mt-0.5 rounded border-[#272757]/30"
                  />
                  <span>
                    {activeProfile
                      ? `Include ${isGuestDemo ? 'demonstration' : 'signed-in'} profile context (${activeProfile.fullName.split(' ')[0]} · recent BP/Glucose & labs)`
                      : 'No profile saved yet — add a health profile in Dashboard to include vitals context.'}
                  </span>
                </label>
              </div>
            </div>

            {/* Interactive Front / Back Anatomy Explorer */}
            <AnatomyExplorer onAskRegion={handleAskAnatomyRegion} />

            <div className="rounded-2xl bg-white border border-[#272757]/10 p-5 space-y-2.5">
              <p className="text-xs font-semibold text-[#272757] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#E8702A]" />
                Suggested Topics
              </p>
              <div className="space-y-2">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={loading}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left rounded-xl bg-[#F5F6FC] hover:bg-[#E8EAF7] disabled:opacity-60 disabled:cursor-not-allowed p-3 text-xs text-[#0F0E47] leading-relaxed transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Right Workspace: Live Assistant & Consultation History Tabs */}
          <div className="lg:col-span-8 rounded-2xl bg-white border border-[#272757]/10 flex flex-col min-h-[600px] lg:sticky lg:top-24 max-h-[820px]">
            {/* Tab Bar & Context Strip */}
            <div className="px-4 sm:px-5 pt-3.5 pb-3 border-b border-[#272757]/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div
                  role="tablist"
                  aria-label="AI Assistant Views"
                  className="inline-flex rounded-xl bg-[#F5F6FC] p-1 border border-[#272757]/10"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'chat'}
                    onClick={() => setActiveTab('chat')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'chat'
                        ? 'bg-[#272757] text-white'
                        : 'text-[#505081] hover:text-[#0F0E47]'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Live Assistant
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'history'}
                    onClick={() => setActiveTab('history')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'history'
                        ? 'bg-[#272757] text-white'
                        : 'text-[#505081] hover:text-[#0F0E47]'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    Consultation History
                    <span
                      className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                        activeTab === 'history'
                          ? 'bg-white/20 text-white'
                          : 'bg-[#272757]/10 text-[#272757]'
                      }`}
                    >
                      {aiConsultations.length}
                    </span>
                  </button>
                </div>

                {activeTab === 'chat' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!canSaveConversation || savingHistory}
                      onClick={() => void handleManualSaveCurrentChat()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F5F6FC] hover:bg-[#E8EAF7] disabled:opacity-45 disabled:cursor-not-allowed border border-[#272757]/15 text-[11px] font-semibold text-[#272757] transition-colors cursor-pointer"
                    >
                      {savingHistory ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <BookmarkPlus className="w-3.5 h-3.5" />
                      )}
                      Save Summary
                    </button>
                    <button
                      type="button"
                      onClick={handleStartNewChat}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F5F6FC] hover:bg-[#E8EAF7] border border-[#272757]/15 text-[11px] font-semibold text-[#272757] transition-colors cursor-pointer"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      New Chat
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#505081]">
                <span className="font-semibold text-[#0F0E47] flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#272757]" />
                  {activeTab === 'chat'
                    ? mode
                    : `Stored AI Health Summaries (${aiConsultations.length})`}
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  {saveFeedback && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1D7A4C]">
                      <BookmarkCheck className="w-3.5 h-3.5" />
                      {saveFeedback}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[11px] text-[#505081]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#272757]" />
                    {isGuestDemo ? 'Guest Demo Session' : 'Firestore Sync Active'}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-[#0F0E47]">
                    <FileText className="w-3.5 h-3.5" />
                    {provider === 'gemini' ? 'Gemini' : `OpenRouter · ${openRouterModel}`}
                  </span>
                </div>
              </div>
            </div>

            {/* TAB 1: LIVE CHAT */}
            {activeTab === 'chat' ? (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {m.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-lg bg-[#272757] text-white flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                          m.role === 'user'
                            ? 'bg-[#272757] text-white'
                            : 'bg-[#F5F6FC] text-[#0F0E47] border border-[#272757]/10'
                        }`}
                      >
                        {m.content}
                        {m.role === 'assistant' && m.provider && (
                          <p className="mt-2 pt-1.5 border-t border-[#272757]/10 text-[10px] text-[#505081]">
                            Routed via {m.provider}
                            {m.model ? ` (${m.model})` : ''}
                          </p>
                        )}
                      </div>
                      {m.role === 'user' && (
                        <div className="w-8 h-8 rounded-lg bg-[#E8702A] text-white flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div role="status" aria-live="polite" className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-lg bg-[#272757] text-white flex items-center justify-center shrink-0">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                      <div className="max-w-[85%] sm:min-w-[280px] rounded-2xl bg-[#F5F6FC] border border-[#272757]/12 px-4 py-3 space-y-2.5">
                        <div className="flex items-center justify-between gap-4 text-xs">
                          <span className="font-semibold text-[#0F0E47] flex items-center gap-2">
                            <span>
                              {loadingSeconds < 3
                                ? 'Reviewing your health question...'
                                : loadingSeconds < 7
                                  ? 'Checking clinical context & Nigerian care guidance...'
                                  : 'Still working — retrying busy AI capacity if needed...'}
                            </span>
                          </span>
                          <span className="font-mono text-[11px] text-[#505081] tabular-nums shrink-0">
                            {loadingSeconds}s
                          </span>
                        </div>
                        <div className="space-y-1.5 animate-pulse" aria-hidden="true">
                          <div className="h-2.5 rounded-md bg-[#272757]/12 w-full" />
                          <div className="h-2.5 rounded-md bg-[#272757]/10 w-5/6" />
                          <div className="h-2.5 rounded-md bg-[#272757]/8 w-2/3" />
                        </div>
                      </div>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#9C2327]">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold">AI Service Notice</p>
                          <p>{errorMsg}</p>
                        </div>
                      </div>
                      {lastFailedPrompt && (
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => void sendMessage(lastFailedPrompt, { isRetry: true })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5484D]/30 hover:bg-[#FFF5F5] text-[#9C2327] font-semibold shrink-0 cursor-pointer self-start sm:self-center"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Retry
                        </button>
                      )}
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 border-t border-[#272757]/10 space-y-2.5">
                  {/* Voice Dictation Live Status & Language Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#505081]">
                    <div className="flex items-center gap-2">
                      <label htmlFor="voice-lang" className="font-medium text-[#272757]">
                        Voice Language:
                      </label>
                      <select
                        id="voice-lang"
                        value={speechLang}
                        disabled={isListening}
                        onChange={(e) => setSpeechLang(e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-[#F5F6FC] border border-[#272757]/15 text-[11px] text-[#0F0E47] disabled:opacity-60"
                      >
                        {VOICE_LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <span className="text-[11px] text-[#8686AC]">
                      {speechSupported
                        ? isListening
                          ? 'Listening hands-free — speak your symptoms'
                          : 'Tap the mic to dictate symptoms hands-free'
                        : 'Voice dictation unavailable in this browser'}
                    </span>
                  </div>

                  {isListening && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="rounded-xl bg-[#E8702A]/10 border border-[#E8702A]/30 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#E5484D] shrink-0" />
                        <p className="text-xs text-[#0F0E47] truncate">
                          {interimTranscript
                            ? `Hearing: "${interimTranscript}"`
                            : 'Microphone active — describe what you are feeling...'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => stopVoiceDictation(false)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#272757]/20 text-[11px] font-semibold text-[#272757] hover:bg-[#F5F6FC] cursor-pointer"
                        >
                          Stop
                        </button>
                        <button
                          type="button"
                          onClick={() => stopVoiceDictation(true)}
                          disabled={loading || (!input.trim() && !interimTranscript.trim())}
                          className="px-2.5 py-1 rounded-lg bg-[#272757] text-[11px] font-semibold text-white hover:bg-[#0F0E47] disabled:opacity-50 cursor-pointer"
                        >
                          Stop &amp; Send
                        </button>
                      </div>
                    </div>
                  )}

                  {voiceError && (
                    <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 px-3.5 py-2 text-xs text-[#9C2327] flex items-center justify-between gap-2">
                      <span>{voiceError}</span>
                      <button
                        type="button"
                        onClick={() => setVoiceError(null)}
                        className="font-semibold underline shrink-0 cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendMessage();
                    }}
                    className="flex gap-2.5"
                  >
                    <button
                      type="button"
                      onClick={toggleVoiceDictation}
                      disabled={loading || !speechSupported}
                      aria-pressed={isListening}
                      aria-label={
                        isListening ? 'Stop voice dictation' : 'Start voice-to-text dictation'
                      }
                      title={
                        !speechSupported
                          ? 'SpeechRecognition is not supported in this browser'
                          : isListening
                            ? 'Stop voice dictation'
                            : 'Speak your symptoms hands-free'
                      }
                      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-3 min-h-[46px] min-w-[46px] rounded-xl border text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isListening
                          ? 'bg-[#E5484D] hover:bg-[#C9363B] text-white border-[#E5484D]'
                          : 'bg-[#F5F6FC] hover:bg-[#E8EAF7] text-[#272757] border-[#272757]/15'
                      }`}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      <span className="hidden md:inline text-xs">
                        {isListening ? 'Listening' : 'Speak'}
                      </span>
                    </button>

                    <input
                      type="text"
                      aria-label="Ask the AI Health Assistant"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask or tap Speak to describe your symptoms hands-free..."
                      className="flex-1 px-4 py-3 min-h-[46px] rounded-xl bg-[#F5F6FC] border border-[#272757]/15 text-sm text-[#0F0E47]"
                    />
                    <button
                      type="submit"
                      disabled={loading || !input.trim()}
                      className="inline-flex items-center gap-2 px-5 py-3 min-h-[46px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="hidden sm:inline">Thinking...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span className="hidden sm:inline">Send</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              /* TAB 2: CONSULTATION HISTORY (FIRESTORE) */
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {user.signedIn && !user.emailVerified && (
                  <div className="rounded-xl bg-[#E8702A]/10 border border-[#E8702A]/25 p-3.5 text-xs text-[#9C4410] flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Verify your email address in your Dashboard to automatically save and sync new
                      AI health consultations to Cloud Firestore.
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="px-3 py-1.5 rounded-lg bg-[#E8702A] text-white font-semibold cursor-pointer"
                    >
                      Open Dashboard
                    </button>
                  </div>
                )}

                {historyError && (
                  <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-3 text-xs text-[#9C2327] flex items-center justify-between gap-2">
                    <span>{historyError}</span>
                    <button
                      type="button"
                      onClick={() => setHistoryError(null)}
                      className="underline font-semibold cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Search & Mode Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-7 relative">
                    <Search className="w-4 h-4 text-[#505081] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      aria-label="Search past AI consultations"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search topics, questions, or health summaries..."
                      className="w-full pl-9 pr-3.5 py-2.5 min-h-[42px] rounded-xl bg-[#F5F6FC] border border-[#272757]/15 text-xs text-[#0F0E47]"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <select
                      aria-label="Filter consultation history by focus mode"
                      value={historyModeFilter}
                      onChange={(e) => setHistoryModeFilter(e.target.value)}
                      className="w-full px-3 py-2.5 min-h-[42px] rounded-xl bg-[#F5F6FC] border border-[#272757]/15 text-xs font-medium text-[#0F0E47]"
                    >
                      <option value="ALL">All Focus Modes ({aiConsultations.length})</option>
                      {ASSISTANT_MODES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredConsultations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#272757]/20 bg-[#F5F6FC]/70 p-8 text-center space-y-3">
                    <div className="w-11 h-11 rounded-xl bg-[#272757]/10 text-[#272757] mx-auto flex items-center justify-center">
                      <History className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[#0F0E47]">
                        {aiConsultations.length === 0
                          ? 'No saved AI consultations yet'
                          : 'No consultations match your search'}
                      </p>
                      <p className="text-xs text-[#505081] max-w-md mx-auto leading-relaxed">
                        {aiConsultations.length === 0
                          ? 'Every completed conversation with the AI Health Assistant is automatically summarized and stored in your private Firestore history.'
                          : 'Try clearing your search term or switching the focus mode filter.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (aiConsultations.length === 0) {
                          setActiveTab('chat');
                        } else {
                          setHistorySearch('');
                          setHistoryModeFilter('ALL');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold cursor-pointer"
                    >
                      {aiConsultations.length === 0
                        ? 'Start Live Consultation'
                        : 'Clear Filters'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredConsultations.map((item) => {
                      const isExpanded = Boolean(expandedIds[item.id]);
                      const isLong = item.assistantSummary.length > 260;
                      const previewText =
                        isExpanded || !isLong
                          ? item.assistantSummary
                          : `${item.assistantSummary.slice(0, 260).trim()}...`;

                      return (
                        <article
                          key={item.id}
                          className="rounded-2xl bg-[#F5F6FC] border border-[#272757]/12 p-4 space-y-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-[#272757]/10 text-[#272757] text-[10px] font-semibold">
                                  {item.mode}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] text-[#505081]">
                                  <Clock className="w-3 h-3" />
                                  {formatConsultationDate(item.createdAt)}
                                </span>
                              </div>
                              <h3 className="text-sm font-bold text-[#0F0E47] leading-snug">
                                {item.topic}
                              </h3>
                            </div>
                            <span className="text-[10px] font-medium text-[#505081] bg-white border border-[#272757]/10 px-2 py-1 rounded-lg shrink-0">
                              {item.provider} · {item.model} · {item.messageCount} msgs
                            </span>
                          </div>

                          <div className="rounded-xl bg-white border border-[#272757]/10 p-3 space-y-2 text-xs">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#505081]">
                                Question Asked
                              </p>
                              <p className="text-[#0F0E47] mt-0.5 leading-relaxed">
                                {item.userPrompt}
                              </p>
                            </div>
                            <div className="pt-2 border-t border-[#272757]/8">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#505081]">
                                AI Health Summary
                              </p>
                              <p className="text-[#0F0E47] mt-0.5 leading-relaxed whitespace-pre-line">
                                {previewText}
                              </p>
                              {isLong && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedIds((prev) => ({
                                      ...prev,
                                      [item.id]: !prev[item.id],
                                    }))
                                  }
                                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#272757] hover:underline cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <>
                                      Show less <ChevronUp className="w-3.5 h-3.5" />
                                    </>
                                  ) : (
                                    <>
                                      Read full summary <ChevronDown className="w-3.5 h-3.5" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleLoadConsultationIntoChat(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Continue in Chat
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === item.id}
                              onClick={() => void handleDeleteConsultation(item.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#FFF5F5] border border-[#E5484D]/25 text-[#9C2327] text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              {deletingId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              Delete
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
