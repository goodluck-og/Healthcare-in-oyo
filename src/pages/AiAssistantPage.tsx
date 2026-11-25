import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookmarkCheck,
  BookmarkPlus,
  BookOpen,
  Bot,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Cloud,
  Cpu,
  History,
  Loader2,
  Lock,
  MessageSquare,
  MessageSquarePlus,
  Mic,
  MicOff,
  PhoneCall,
  Pill,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  User,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AnatomyExplorer } from '../components/ai/AnatomyExplorer';
import { OfflineHealthLibraryPanel } from '../components/ai/OfflineHealthLibraryPanel';
import { AiConsentModal } from '../components/ai/AiConsentModal';
import {
  OFFLINE_HEALTH_LIBRARY,
  type OfflineHealthGuide,
} from '../data/offlineHealthLibrary';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { lookupOpenFdaDrug, type OpenFdaDrugEntry } from '../services/apiClient';
import {
  detectOnDeviceAiCapability,
  type OnDeviceCapabilityInfo,
} from '../services/firebaseHybridAi';
import {
  routeHybridHealthQuery,
  type ActualAiProcessingPath,
  type CitedOfflineGuide,
  type CitedOntologyEntry,
} from '../services/hybridAiRouter';
import type { UrgentRedFlagAssessment } from '../services/localHealthAi';
import {
  AI_CONSENT_POLICY_VERSION,
  loadAiPrivacyPreferences,
  loadBookmarkedGuideIds,
  loadPublicHealthGuides,
  saveAiPrivacyPreferences,
  saveBookmarkedGuideIds,
  type AiPrivacyPreferences,
  type HybridRoutingPreference,
} from '../services/offlineLibraryStore';
import type { AiConsultation, ChatImageAttachment } from '../types/healthcare';
import {
  filterAndMaskChatPii,
  type ChatPiiCategory,
} from '../../shared/chatPiiFilter';
import { evaluateModeratorBot } from '../../shared/moderatorBot';

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

const IMAGE_CATEGORY_HINTS = [
  'Accident / Cut',
  'Burn / Scald',
  'Swelling / Sprain',
  'Skin Rash / Bite',
  'Medication / Lab Sheet',
] as const;

async function compressImageFileToAttachment(
  file: File,
  categoryHint: string
): Promise<ChatImageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected photo.'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file is not a supported image.'));
      img.onload = () => {
        const maxDim = 1024;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Unable to prepare photo for upload.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
        const base64Data = compressedDataUrl.replace(/^data:image\/jpeg;base64,/, '');
        resolve({
          mimeType: 'image/jpeg',
          base64Data,
          previewDataUrl: compressedDataUrl,
          fileName: file.name || 'incident-photo.jpg',
          categoryHint,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imagePreviewUrl?: string;
  imageCategoryHint?: string;
  actualPath?: ActualAiProcessingPath;
  indicatorLabel?: string;
  indicatorDetail?: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
  redFlag?: UrgentRedFlagAssessment;
  haltEducationalDialogue?: boolean;
  urgentFooter?: string;
  emergencyRoute?: '/emergency';
  citedGuides?: CitedOfflineGuide[];
  citedOntology?: CitedOntologyEntry[];
  quickReplies?: string[];
  profileContextSharedWithCloud?: boolean;
  fallbackNotice?: string;
  promptForEscalation?: string;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hello! I am the HealthConnect Hybrid AI Health Assistant. Tell me how you feel (even simply "I feel sick") and I will ask clear step-by-step follow-up questions in BOTH Local AI and Cloud AI — or attach an accident/wound photo for immediate first-aid safety guidance.\n\nGrounded in Human Disease Ontology (DOID), WHO ICD-11, MedlinePlus, and openFDA drug labels. General health education only — never a confirmed diagnosis. For life-threatening emergencies, call your local emergency number immediately.',
  actualPath: 'local-library',
  indicatorLabel: 'Local AI + DOID Ontology: Ready on your device',
  indicatorDetail: 'Verified offline medical guides + interactive intake ready online and offline.',
  quickReplies: [
    'I am sick',
    'Fever, chills & body aches',
    'Accident / injury first aid',
    'Explain a lab result',
  ],
};

const ASSISTANT_MODES = [
  'General Symptom Guidance',
  'Emergency First Aid & Photo Aid',
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
  'I feel sick — ask me follow-up questions to help narrow it down.',
  'What do normal blood pressure readings mean and when is BP an emergency?',
  'Explain malaria RDT testing, ACT medicines, and typhoid warning signs.',
  'Explain what HbA1c 5.4% and Total Cholesterol 184 mg/dL mean in plain language.',
  'What are the BE-FAST signs of stroke and emergency first aid steps?',
];

const ROUTING_MODE_OPTIONS: Array<{
  id: HybridRoutingPreference;
  label: string;
  shortDesc: string;
}> = [
  {
    id: 'smart-hybrid',
    label: 'Smart Hybrid',
    shortDesc: 'Local AI first for speed & privacy; Cloud AI for complex care questions.',
  },
  {
    id: 'local-only',
    label: 'Local Only',
    shortDesc: '100% on-device Gemini Nano & Offline Health Library. Zero cloud transfer.',
  },
  {
    id: 'cloud-only',
    label: 'Cloud AI',
    shortDesc: 'Online deeper reasoning (falls back safely to local guides if offline).',
  },
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

function getPathStyle(path?: ActualAiProcessingPath) {
  switch (path) {
    case 'local-on-device':
      return {
        textClass: 'text-[#15803D]',
        icon: Cpu,
      };
    case 'local-library':
      return {
        textClass: 'text-[#15803D]',
        icon: BookOpen,
      };
    case 'hybrid':
      return {
        textClass: 'text-[#4B50D6]',
        icon: Sparkles,
      };
    case 'cloud':
      return {
        textClass: 'text-[#1D4ED8]',
        icon: Cloud,
      };
    case 'offline-library':
      return {
        textClass: 'text-[#B45309]',
        icon: WifiOff,
      };
    case 'safety-middleware':
      return {
        textClass: 'text-[#DC2626]',
        icon: ShieldAlert,
      };
    default:
      return {
        textClass: 'text-[#505081]',
        icon: Bot,
      };
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
    allPlatformServices,
    recordChatModerationEvent,
    integrationStatus,
    isGuestDemo,
  } = useApp();

  const { isOnline } = useOnlineStatus();

  const [activeTab, setActiveTab] = useState<'chat' | 'library' | 'drugs' | 'history'>('chat');
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [showOfflineMatrix, setShowOfflineMatrix] = useState(false);

  // Multimodal emergency/accident photo upload state
  const [attachedImage, setAttachedImage] = useState<ChatImageAttachment | null>(null);
  const [imageCategoryHint, setImageCategoryHint] = useState<string>(IMAGE_CATEGORY_HINTS[0]);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // openFDA Drug Lookup state
  const [drugQuery, setDrugQuery] = useState('');
  const [drugLoading, setDrugLoading] = useState(false);
  const [drugResults, setDrugResults] = useState<OpenFdaDrugEntry[]>([]);
  const [drugSource, setDrugSource] = useState<string>('openFDA Official Drug Labels');
  const [drugMessage, setDrugMessage] = useState<string | null>(null);
  const [drugError, setDrugError] = useState<string | null>(null);

  // Hybrid AI & NDPA Consent preferences (persisted in IndexedDB / localStorage)
  const [privacyPrefs, setPrivacyPrefs] = useState<AiPrivacyPreferences>({
    routingPreference: 'smart-hybrid',
    cloudConsentGranted: false,
    cloudConsentTimestamp: null,
    cloudConsentVersion: AI_CONSENT_POLICY_VERSION,
  });
  const [includeProfileContext, setIncludeProfileContext] = useState(false);
  const [consentModalOpen, setConsentModalOpen] = useState(false);

  // Device capability & offline library state
  const [onDeviceCapability, setOnDeviceCapability] = useState<OnDeviceCapabilityInfo>({
    status: 'unavailable',
    label: 'Checking on-device AI capability...',
    detail: 'Offline WHO & Nigeria Health Library is ready.',
    browserSupportsPromptApi: false,
  });
  const [offlineGuides, setOfflineGuides] = useState<OfflineHealthGuide[]>(OFFLINE_HEALTH_LIBRARY);
  const [bookmarkedGuideIds, setBookmarkedGuideIds] = useState<string[]>([]);

  // Cloud provider & assistant mode state
  const [provider, setProvider] = useState<'gemini' | 'openrouter'>('gemini');
  const [openRouterModel, setOpenRouterModel] = useState<
    'openai/gpt-4o' | 'google/gemini-2.5-flash'
  >('openai/gpt-4o');
  const [mode, setMode] = useState<string>(ASSISTANT_MODES[0]);

  // Chat state
  const [input, setInput] = useState('');
  const [piiMaskAlert, setPiiMaskAlert] = useState<{
    categories: ChatPiiCategory[];
    count: number;
  } | null>(null);
  const pendingPiiCategoriesRef = useRef<Set<ChatPiiCategory>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [botPolicyNotice, setBotPolicyNotice] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);

  // Voice dictation state
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

  const [speechSupported] = useState(() => Boolean(getSpeechRecognitionConstructor()));
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [dialogueHaltedForEmergency, setDialogueHaltedForEmergency] = useState(false);

  const formatPiiCategoryLabel = (cat: ChatPiiCategory): string => {
    if (cat === 'phone') return 'Phone Number';
    if (cat === 'account') return 'Account / Card Number';
    return 'Physical Coordinates';
  };

  const handleChatInputChange = (rawValue: string) => {
    if (!rawValue.trim()) {
      setInput('');
      setPiiMaskAlert(null);
      pendingPiiCategoriesRef.current.clear();
      return;
    }
    const filtered = filterAndMaskChatPii(rawValue);
    setInput(filtered.maskedText);
    if (filtered.hasSensitiveData) {
      filtered.detectedCategories.forEach((c) => pendingPiiCategoriesRef.current.add(c));
      setPiiMaskAlert({
        categories: Array.from(pendingPiiCategoriesRef.current),
        count: filtered.matchCount,
      });
    }
  };

  // Hydrate preferences, bookmarks, offline guides, and on-device Gemini Nano capability
  useEffect(() => {
    let mounted = true;
    void loadAiPrivacyPreferences().then((prefs) => {
      if (mounted) setPrivacyPrefs(prefs);
    });
    void loadBookmarkedGuideIds().then((ids) => {
      if (mounted) setBookmarkedGuideIds(ids);
    });
    void loadPublicHealthGuides().then((guides) => {
      if (mounted && guides.length > 0) setOfflineGuides(guides);
    });
    void detectOnDeviceAiCapability().then((cap) => {
      if (mounted) setOnDeviceCapability(cap);
    });
    return () => {
      mounted = false;
    };
  }, []);

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
      isOnline &&
      (user.signedIn || isGuestDemo) &&
      conversationTurns.some((m) => m.role === 'user') &&
      conversationTurns.some((m) => m.role === 'assistant'),
    [conversationTurns, isOnline, user.signedIn, isGuestDemo]
  );

  // Data-minimized clinical context (NDPA-informed: strips full name, phone, address, email)
  const buildMinimizedPatientContext = () => {
    if (!includeProfileContext || !privacyPrefs.cloudConsentGranted || !activeProfile) return '';
    const latestBp = bpReadings.find((b) => b.profileId === activeProfile.id);
    const latestGlu = glucoseReadings.find((g) => g.profileId === activeProfile.id);
    const latestLab = labResults.find((l) => l.profileId === activeProfile.id);

    return [
      `Minimized Clinical Context: Age ${activeProfile.age} yrs, City: ${activeProfile.city}, Blood Group: ${activeProfile.bloodGroup}, Genotype: ${activeProfile.genotype}, Recorded Allergies: ${activeProfile.allergies.join(', ') || 'None recorded'}`,
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

  const handleSelectRoutingPreference = async (nextPref: HybridRoutingPreference) => {
    const updated = await saveAiPrivacyPreferences({
      ...privacyPrefs,
      routingPreference: nextPref,
    });
    setPrivacyPrefs(updated);
  };

  const handleToggleProfileContext = (checked: boolean) => {
    if (!checked) {
      setIncludeProfileContext(false);
      return;
    }
    if (!privacyPrefs.cloudConsentGranted) {
      setConsentModalOpen(true);
      return;
    }
    setIncludeProfileContext(true);
  };

  const handleAcceptConsent = async () => {
    const updated = await saveAiPrivacyPreferences({
      ...privacyPrefs,
      cloudConsentGranted: true,
      cloudConsentTimestamp: new Date().toISOString(),
    });
    setPrivacyPrefs(updated);
    setIncludeProfileContext(true);
    setConsentModalOpen(false);
  };

  const handleRevokeConsent = async () => {
    const updated = await saveAiPrivacyPreferences({
      ...privacyPrefs,
      cloudConsentGranted: false,
      cloudConsentTimestamp: null,
    });
    setPrivacyPrefs(updated);
    setIncludeProfileContext(false);
  };

  const handleToggleGuideBookmark = async (guideId: string) => {
    const exists = bookmarkedGuideIds.includes(guideId);
    const nextIds = exists
      ? bookmarkedGuideIds.filter((id) => id !== guideId)
      : [...bookmarkedGuideIds, guideId];
    setBookmarkedGuideIds(nextIds);
    await saveBookmarkedGuideIds(nextIds);
  };

  const handleAskAboutGuide = (guide: OfflineHealthGuide) => {
    setActiveTab('chat');
    void sendMessage(`Summarize the key guidance and warning signs for ${guide.title}.`);
  };

  const persistConsultationSummary = async (params: {
    prompt: string;
    reply: string;
    replyProvider: string;
    replyModel: string;
    totalTurns: number;
    silent?: boolean;
  }) => {
    if (!isOnline || (!user.signedIn && !isGuestDemo)) {
      if (!params.silent) {
        setSaveFeedback('Sign in while online to archive consultation summaries in Firestore.');
      }
      return;
    }
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
        model: params.replyModel || 'Hybrid Health AI',
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

  const selectedProviderConfigured =
    provider === 'gemini'
      ? integrationStatus.geminiConfigured
      : integrationStatus.openrouterConfigured;

  const handlePickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageError(null);
    if (!file.type.startsWith('image/')) {
      setImageError('Please select a photo (JPEG, PNG, or WebP).');
      return;
    }
    try {
      const compressed = await compressImageFileToAttachment(file, imageCategoryHint);
      setAttachedImage(compressed);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Unable to process image.');
    }
  };

  const handleDrugLookup = async (e: React.FormEvent, presetQuery?: string) => {
    e.preventDefault();
    const q = (presetQuery ?? drugQuery).trim();
    if (!q) return;
    setDrugQuery(q);
    setDrugError(null);
    setDrugMessage(null);
    if (!isOnline) {
      setDrugError('You are offline. Live openFDA drug label lookup requires internet; use the Offline Library or Local AI tab.');
      return;
    }
    setDrugLoading(true);
    try {
      const res = await lookupOpenFdaDrug(q);
      setDrugResults(res.results);
      setDrugSource(res.source);
      setDrugMessage(res.message || res.disclaimer || null);
    } catch (err) {
      setDrugError(err instanceof Error ? err.message : 'Unable to query openFDA drug database.');
      setDrugResults([]);
    } finally {
      setDrugLoading(false);
    }
  };

  const sendMessage = async (
    textToSend?: string,
    options?: { isRetry?: boolean; forceCloudEscalation?: boolean }
  ) => {
    const rawContent = (textToSend ?? input).trim();
    const submitFiltered = filterAndMaskChatPii(rawContent);
    const sanitizedRawContent = submitFiltered.maskedText.trim();
    const imageToSend = !options?.isRetry && !options?.forceCloudEscalation ? attachedImage : null;
    const content =
      sanitizedRawContent ||
      (imageToSend
        ? `Please review this uploaded ${imageToSend.categoryHint || 'health/injury'} photo and tell me immediate first-aid steps and emergency warning signs.`
        : '');
    if (!content || loading) return;

    const botDecision = evaluateModeratorBot(rawContent, allPlatformServices);
    const triggeredPiiCategories = new Set<ChatPiiCategory>(submitFiltered.detectedCategories);
    if (!textToSend) {
      pendingPiiCategoriesRef.current.forEach((c) => triggeredPiiCategories.add(c));
    }
    if (triggeredPiiCategories.size > 0) {
      const categoriesList = Array.from(triggeredPiiCategories);
      setPiiMaskAlert({
        categories: categoriesList,
        count: Math.max(1, submitFiltered.matchCount),
      });
      void recordChatModerationEvent({
        flagType: 'pii_masked',
        detectedCategories: categoriesList,
        mode,
        maskedExcerpt: content.slice(0, 260),
        botAction: 'Sentinel Bot Auto-Masked PII',
        serviceName: botDecision.routedServiceName || undefined,
      });
    } else if (botDecision.action === 'policy_warning') {
      void recordChatModerationEvent({
        flagType: 'bot_policy_warning',
        detectedCategories: botDecision.policyFlags,
        mode,
        maskedExcerpt: content.slice(0, 260),
        botAction: 'Sentinel Bot Policy Warning',
        serviceName: botDecision.routedServiceName || undefined,
      });
      setBotPolicyNotice(botDecision.botNotice);
    } else {
      setBotPolicyNotice(null);
    }
    pendingPiiCategoriesRef.current.clear();

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
    setImageError(null);
    setLastFailedPrompt(null);

    let updatedHistory = messages;
    if (!options?.isRetry && !options?.forceCloudEscalation) {
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content,
        imagePreviewUrl: imageToSend?.previewDataUrl,
        imageCategoryHint: imageToSend?.categoryHint,
      };
      updatedHistory = [...messages, userMsg];
      setMessages(updatedHistory);
      if (imageToSend) {
        setAttachedImage(null);
      }
    }
    if (!textToSend) setInput('');
    setLoading(true);
    setLoadingSeconds(0);

    try {
      const hybridResponse = await routeHybridHealthQuery({
        prompt: content,
        mode,
        routingPreference: privacyPrefs.routingPreference,
        cloudProvider: provider,
        openRouterModel,
        conversationHistory: updatedHistory
          .filter((m) => m.id !== 'welcome')
          .map((m) => ({ role: m.role, content: m.content })),
        patientContext: buildMinimizedPatientContext(),
        includeProfileContext,
        cloudConsentGranted: privacyPrefs.cloudConsentGranted,
        isOnline,
        serverCloudConfigured: selectedProviderConfigured,
        forceCloudEscalation: options?.forceCloudEscalation,
        image: imageToSend || undefined,
      });

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: hybridResponse.reply,
        actualPath: hybridResponse.actualPath,
        indicatorLabel: hybridResponse.indicatorLabel,
        indicatorDetail: hybridResponse.indicatorDetail,
        provider: hybridResponse.provider,
        model: hybridResponse.model,
        latencyMs: hybridResponse.latencyMs,
        redFlag: hybridResponse.redFlag,
        haltEducationalDialogue: hybridResponse.haltEducationalDialogue,
        urgentFooter: hybridResponse.urgentFooter,
        emergencyRoute: hybridResponse.emergencyRoute,
        citedGuides: hybridResponse.citedGuides,
        citedOntology: hybridResponse.citedOntology,
        quickReplies: hybridResponse.quickReplies,
        profileContextSharedWithCloud: hybridResponse.profileContextSharedWithCloud,
        fallbackNotice: hybridResponse.fallbackNotice,
        promptForEscalation: hybridResponse.haltEducationalDialogue ? undefined : content,
      };

      const nextThread = [...updatedHistory, assistantMsg];
      setMessages(nextThread);

      if (hybridResponse.haltEducationalDialogue) {
        setDialogueHaltedForEmergency(true);
        void recordChatModerationEvent({
          flagType: 'medical_red_flag',
          detectedCategories: ['medical_red_flag'],
          mode,
          maskedExcerpt: content.slice(0, 260),
          botAction: 'Sentinel Bot Escalated Red Flag',
          serviceName: botDecision.routedServiceName || undefined,
        });
      }

      // Persist online signed-in consultations automatically without blocking offline usage
      if (isOnline && ((user.signedIn && user.emailVerified) || isGuestDemo)) {
        const turnCount = nextThread.filter((m) => m.id !== 'welcome').length;
        void persistConsultationSummary({
          prompt: content,
          reply: hybridResponse.reply,
          replyProvider: hybridResponse.provider,
          replyModel: hybridResponse.model,
          totalTurns: turnCount,
          silent: true,
        });
      }
    } catch (err) {
      setLastFailedPrompt(content);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to complete the health query right now. You can browse the Offline Health Library tab anytime.'
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
      replyModel: lastAssistant.model || 'Hybrid Health AI',
      totalTurns: conversationTurns.length,
      silent: false,
    });
  };

  const handleStartNewChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setDialogueHaltedForEmergency(false);
    setErrorMsg(null);
    setBotPolicyNotice(null);
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
        actualPath: 'cloud',
        indicatorLabel: 'Loaded from Consultation History',
        indicatorDetail: `${item.provider} · ${item.model}`,
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
      const filtered = filterAndMaskChatPii(merged);
      if (filtered.hasSensitiveData) {
        filtered.detectedCategories.forEach((c) => pendingPiiCategoriesRef.current.add(c));
        setPiiMaskAlert({
          categories: Array.from(pendingPiiCategoriesRef.current),
          count: filtered.matchCount,
        });
      }
      latestInputRef.current = filtered.maskedText;
      setInput(filtered.maskedText);
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
            const filtered = filterAndMaskChatPii(combined);
            if (filtered.hasSensitiveData) {
              filtered.detectedCategories.forEach((c) => pendingPiiCategoriesRef.current.add(c));
              setPiiMaskAlert({
                categories: Array.from(pendingPiiCategoriesRef.current),
                count: filtered.matchCount,
              });
            }
            latestInputRef.current = filtered.maskedText;
            return filtered.maskedText;
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

  return (
    <div className="min-h-screen bg-[#F5F6FC] py-5 sm:py-8">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 space-y-5">
        {/* Top Clinical Safety & Hybrid Readiness Header */}
        <div className="rounded-2xl bg-[#0F0E47] text-white p-4 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[#FFB585] shrink-0 mt-0.5" />
              <div>
                <h1 className="text-lg sm:text-xl font-bold leading-snug">
                  HealthConnect — Hybrid AI &amp; Emergency Photo Assistant
                </h1>
                <p className="text-xs sm:text-sm text-[#D7D8EE] mt-1 leading-relaxed">
                  Interactive symptom guidance grounded in Human Disease Ontology (DOID), WHO ICD-11, MedlinePlus &amp; openFDA — general health education only, never a medical diagnosis. In an emergency, dial{' '}
                  <strong className="text-white">{activeProfile?.emergencyNumber || '112'}</strong> or open the Emergency Centre immediately.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/emergency')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#E5484D] hover:bg-[#C9363B] text-white text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Emergency Centre ({activeProfile?.emergencyNumber || '112'})</span>
            </button>
          </div>

          {/* Unboxed Runtime Capability Strip */}
          <div className="pt-3 border-t border-white/12 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#D7D8EE]">
            <span className="inline-flex items-center gap-1.5 font-medium">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-[#6EE7B7]" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-[#FCD34D]" />
              )}
              <span>{isOnline ? 'Online — Hybrid AI Active' : 'Offline Mode — Local AI Active'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#A5B4FC]" />
              <span>{onDeviceCapability.label}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#6EE7B7]" />
              <span>{offlineGuides.length} WHO &amp; Nigeria Guides Cached</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#FFB585]" />
              <span>
                {includeProfileContext && privacyPrefs.cloudConsentGranted
                  ? 'Minimized Context Enabled'
                  : 'Profile Context Anonymized'}
              </span>
            </span>
          </div>
        </div>

        {/* Mobile Quick Controls Bar (visible below lg) */}
        <div className="lg:hidden flex items-center justify-between gap-2 rounded-2xl bg-white border border-[#272757]/12 p-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {ROUTING_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => void handleSelectRoutingPreference(opt.id)}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  privacyPrefs.routingPreference === opt.id
                    ? 'bg-[#0F0E47] text-white'
                    : 'bg-[#F5F6FC] text-[#505081]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowMobileSettings((prev) => !prev)}
            aria-expanded={showMobileSettings}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg bg-[#F5F6FC] text-xs font-semibold text-[#272757] shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{showMobileSettings ? 'Hide' : 'Settings'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Configuration, Privacy, Anatomy Explorer & Suggested Topics */}
          <aside
            className={`lg:col-span-4 space-y-4 ${
              showMobileSettings ? 'block' : 'hidden lg:block'
            }`}
          >
            {/* Unified Hybrid AI Routing Card */}
            <div className="rounded-2xl bg-white border border-[#272757]/10 p-5 space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-[#0F0E47]">Hybrid AI Processing Mode</h2>
                <p className="text-xs text-[#505081] leading-relaxed">
                  One unified AI router combining Firebase AI Logic on-device inference, local
                  WHO/Nigeria guides, and secure Cloud AI.
                </p>
              </div>

              <div className="space-y-2" role="radiogroup" aria-label="AI Processing Mode">
                {ROUTING_MODE_OPTIONS.map((opt) => {
                  const selected = privacyPrefs.routingPreference === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => void handleSelectRoutingPreference(opt.id)}
                      className={`w-full text-left rounded-xl p-3 border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#0F0E47] text-white border-[#0F0E47]'
                          : 'bg-[#F5F6FC] text-[#0F0E47] border-[#272757]/10 hover:bg-[#ECEEF9]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold">{opt.label}</span>
                        {opt.id === 'smart-hybrid' && (
                          <span
                            className={`text-[10px] font-semibold ${
                              selected ? 'text-[#FFB585]' : 'text-[#4B50D6]'
                            }`}
                          >
                            Recommended
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] mt-0.5 leading-relaxed ${
                          selected ? 'text-[#D7D8EE]' : 'text-[#505081]'
                        }`}
                      >
                        {opt.shortDesc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Cloud Provider Selection (only when cloud routing is permitted) */}
              {privacyPrefs.routingPreference !== 'local-only' && (
                <div className="pt-3 border-t border-[#272757]/10 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#272757]">Online Cloud Gateway</p>
                    <span className="text-[11px] font-medium text-[#505081]">
                      {selectedProviderConfigured
                        ? 'Backend Key Ready'
                        : 'Firebase AI / Local Fallback'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProvider('gemini')}
                      className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        provider === 'gemini'
                          ? 'bg-[#272757] text-white'
                          : 'bg-[#F5F6FC] text-[#505081]'
                      }`}
                    >
                      Gemini ({integrationStatus.geminiConfigured ? 'Ready' : 'Fallback'})
                    </button>
                    <button
                      type="button"
                      onClick={() => setProvider('openrouter')}
                      className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        provider === 'openrouter'
                          ? 'bg-[#272757] text-white'
                          : 'bg-[#F5F6FC] text-[#505081]'
                      }`}
                    >
                      OpenRouter ({integrationStatus.openrouterConfigured ? 'Ready' : 'Unset'})
                    </button>
                  </div>

                  {provider === 'openrouter' && (
                    <div>
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
                        className="w-full px-3 py-2 min-h-[42px] rounded-xl bg-[#F5F6FC] border border-[#272757]/15 text-xs text-[#0F0E47]"
                      >
                        {OPENROUTER_MODELS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Assistant Focus */}
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

              {/* NDPA Privacy & Profile Context Consent Control */}
              <div className="pt-3 border-t border-[#272757]/10 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#272757] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#15803D]" />
                    <span>NDPA Privacy &amp; Consent</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setConsentModalOpen(true)}
                    className="text-[11px] font-semibold text-[#4B50D6] hover:underline cursor-pointer"
                  >
                    Privacy Notice
                  </button>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-[#0F0E47] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeProfileContext && privacyPrefs.cloudConsentGranted}
                    onChange={(e) => handleToggleProfileContext(e.target.checked)}
                    disabled={!activeProfile || privacyPrefs.routingPreference === 'local-only'}
                    className="mt-0.5 w-4 h-4 rounded border-[#272757]/30 shrink-0"
                  />
                  <span className="leading-relaxed">
                    {privacyPrefs.routingPreference === 'local-only'
                      ? 'Disabled in Local-Only mode (zero data leaves your device).'
                      : activeProfile
                      ? `Share minimized vitals summary (${activeProfile.age}y, ${activeProfile.city}, latest BP/glucose) with online Cloud AI — never sends name, phone, or address.`
                      : 'Sign in and save a profile in Dashboard to enable optional minimized vitals context.'}
                  </span>
                </label>

                {privacyPrefs.cloudConsentGranted && (
                  <div className="flex items-center justify-between gap-2 text-[11px] text-[#505081] bg-[#F5F6FC] rounded-lg px-2.5 py-2">
                    <span>Consent granted</span>
                    <button
                      type="button"
                      onClick={() => void handleRevokeConsent()}
                      className="font-semibold text-[#9C2327] hover:underline cursor-pointer"
                    >
                      Revoke Consent
                    </button>
                  </div>
                )}
              </div>

              {/* Offline vs. Online Feature Clarity Drawer */}
              <div className="pt-3 border-t border-[#272757]/10">
                <button
                  type="button"
                  onClick={() => setShowOfflineMatrix((prev) => !prev)}
                  aria-expanded={showOfflineMatrix}
                  className="w-full flex items-center justify-between text-xs font-semibold text-[#272757] py-1 cursor-pointer"
                >
                  <span>What Works Offline vs. Online</span>
                  {showOfflineMatrix ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {showOfflineMatrix && (
                  <div className="mt-2.5 space-y-2 text-[11px] leading-relaxed text-[#505081]">
                    <p>
                      <strong className="text-[#15803D]">Fully Offline:</strong> 18 WHO &amp;
                      Nigeria health guides, Local AI search, medical terms, urgent red-flag alerts,
                      app navigation help, and on-device Gemini Nano (on supported Chrome).
                    </p>
                    <p>
                      <strong className="text-[#B45309]">Partially Available:</strong> Previously
                      visited pages and saved guide bookmarks (stored in public IndexedDB).
                    </p>
                    <p>
                      <strong className="text-[#1D4ED8]">Internet-Dependent:</strong> Online Cloud
                      AI reasoning, Firestore sync, doctor bookings, Interswitch payments, live
                      maps, and ambulance dispatch.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Front / Back Anatomy Explorer (Preserved) */}
            <AnatomyExplorer onAskRegion={handleAskAnatomyRegion} />

            {/* Suggested Topics */}
            <div className="rounded-2xl bg-white border border-[#272757]/10 p-5 space-y-2.5">
              <p className="text-xs font-semibold text-[#272757] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#E8702A]" />
                <span>Try Asking (Works Online &amp; Offline)</span>
              </p>
              <div className="space-y-2">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={loading}
                    onClick={() => void sendMessage(q)}
                    className="w-full text-left rounded-xl bg-[#F5F6FC] hover:bg-[#E8EAF7] disabled:opacity-60 disabled:cursor-not-allowed p-3 min-h-[44px] text-xs text-[#0F0E47] leading-relaxed transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Right Workspace: Hybrid AI Chat, Offline Health Library & History Tabs */}
          <div className="lg:col-span-8 rounded-2xl bg-white border border-[#272757]/10 flex flex-col min-h-[540px] lg:min-h-[660px] lg:sticky lg:top-20 lg:max-h-[840px]">
            {/* Tab Bar & Actions */}
            <div className="px-4 sm:px-5 pt-3.5 pb-3 border-b border-[#272757]/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div
                  role="tablist"
                  aria-label="AI Assistant Views"
                  className="inline-flex flex-wrap rounded-xl bg-[#F5F6FC] p-1 border border-[#272757]/10 gap-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'chat'}
                    onClick={() => setActiveTab('chat')}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'chat'
                        ? 'bg-[#272757] text-white'
                        : 'text-[#505081] hover:text-[#0F0E47]'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Hybrid AI Chat</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'library'}
                    onClick={() => setActiveTab('library')}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'library'
                        ? 'bg-[#272757] text-white'
                        : 'text-[#505081] hover:text-[#0F0E47]'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Offline Library</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                        activeTab === 'library'
                          ? 'bg-white/20 text-white'
                          : 'bg-[#272757]/10 text-[#272757]'
                      }`}
                    >
                      {offlineGuides.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'drugs'}
                    onClick={() => setActiveTab('drugs')}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'drugs'
                        ? 'bg-[#272757] text-white'
                        : 'text-[#505081] hover:text-[#0F0E47]'
                    }`}
                  >
                    <Pill className="w-3.5 h-3.5" />
                    <span>Drug Lookup</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'history'}
                    onClick={() => setActiveTab('history')}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'history'
                        ? 'bg-[#272757] text-white'
                        : 'text-[#505081] hover:text-[#0F0E47]'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>History</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
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
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg bg-[#F5F6FC] hover:bg-[#E8EAF7] disabled:opacity-45 disabled:cursor-not-allowed border border-[#272757]/15 text-[11px] font-semibold text-[#272757] transition-colors cursor-pointer"
                    >
                      {savingHistory ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <BookmarkPlus className="w-3.5 h-3.5" />
                      )}
                      <span>Save</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStartNewChat}
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg bg-[#F5F6FC] hover:bg-[#E8EAF7] border border-[#272757]/15 text-[11px] font-semibold text-[#272757] transition-colors cursor-pointer"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      <span>New Chat</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#505081]">
                <span className="font-semibold text-[#0F0E47] flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#272757]" />
                  <span>
                    {activeTab === 'chat'
                      ? `${mode} · ${
                          ROUTING_MODE_OPTIONS.find((r) => r.id === privacyPrefs.routingPreference)
                            ?.label
                        }`
                      : activeTab === 'library'
                        ? `Verified DOID & WHO Offline Health Library (${offlineGuides.length} Chapters)`
                        : activeTab === 'drugs'
                          ? 'Verified Medication Label Lookup (openFDA Official API)'
                          : `Stored AI Health Summaries (${aiConsultations.length})`}
                  </span>
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
                    <span>
                      {!isOnline
                        ? 'Offline Local Mode'
                        : user.signedIn
                        ? 'Firestore Sync Active'
                        : isGuestDemo
                        ? 'Guest Demo Session'
                        : 'Public Offline-Ready Mode'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* TAB 1: HYBRID AI CHAT */}
            {activeTab === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                  {messages.map((m) => {
                    const pathStyle = getPathStyle(m.actualPath);
                    const PathIcon = pathStyle.icon;
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-2.5 sm:gap-3 ${
                          m.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {m.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-lg bg-[#272757] text-white flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}

                        <div
                          className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-2.5 ${
                            m.role === 'user'
                              ? 'bg-[#272757] text-white'
                              : 'bg-[#F5F6FC] text-[#0F0E47] border border-[#272757]/10'
                          }`}
                        >
                          {/* Instant Local Red-Flag Emergency Box */}
                          {m.role === 'assistant' && m.redFlag?.isUrgent && (
                            <div className="rounded-xl bg-[#FEF2F2] border border-[#E5484D]/40 p-3 text-xs text-[#991B1B] space-y-2">
                              <div className="flex items-center gap-2 font-bold">
                                <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
                                <span>
                                  Urgent Warning Sign Detected ({m.redFlag.matchedSignals.join(', ')})
                                </span>
                              </div>
                              <p className="leading-relaxed">{m.redFlag.immediateGuidance}</p>
                              <button
                                type="button"
                                onClick={() => navigate('/emergency')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold cursor-pointer"
                              >
                                <PhoneCall className="w-3.5 h-3.5" />
                                <span>Open Emergency Centre (112)</span>
                              </button>
                            </div>
                          )}

                          {/* Attached Incident / Health Photo Thumbnail */}
                          {m.imagePreviewUrl && (
                            <div className="space-y-1">
                              <img
                                src={m.imagePreviewUrl}
                                alt={m.imageCategoryHint || 'Uploaded health photo'}
                                className="max-h-52 rounded-xl object-cover border border-white/20"
                              />
                              {m.imageCategoryHint && (
                                <p className="text-[11px] opacity-80">
                                  Photo context: {m.imageCategoryHint}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Main Message Body */}
                          <div className="whitespace-pre-line">{m.content}</div>

                          {/* Mandatory Middleware Footer & Direct EmergencyPage Link */}
                          {m.role === 'assistant' && m.haltEducationalDialogue && (
                            <div
                              role="alert"
                              className="rounded-xl bg-[#991B1B] text-white p-3.5 space-y-2.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-extrabold tracking-wide uppercase">
                                  {m.urgentFooter || 'Urgent: Seek Professional Care'}
                                </span>
                                {m.redFlag?.matchedKeywords &&
                                  m.redFlag.matchedKeywords.length > 0 && (
                                    <span className="text-[11px] text-[#FECACA]">
                                      Flagged: {m.redFlag.matchedKeywords.join(', ')}
                                    </span>
                                  )}
                              </div>
                              <p className="text-xs text-[#FEE2E2] leading-relaxed">
                                Educational AI dialogue has been stopped. Proceed directly to the
                                Emergency Centre or dial <strong>112</strong> now.
                              </p>
                              <a
                                href={m.emergencyRoute || '/emergency'}
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(m.emergencyRoute || '/emergency');
                                }}
                                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl bg-white hover:bg-[#FEF2F2] text-[#991B1B] text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                              >
                                <PhoneCall className="w-4 h-4" />
                                <span>Go Directly to EmergencyPage</span>
                                <ArrowUpRight className="w-4 h-4" />
                              </a>
                            </div>
                          )}

                          {/* Automatic Fallback Notice */}
                          {m.role === 'assistant' && m.fallbackNotice && (
                            <p className="text-[11px] text-[#92400E] bg-[#FEF3C7] border border-[#F59E0B]/30 rounded-lg px-2.5 py-1.5 leading-relaxed">
                              {m.fallbackNotice}
                            </p>
                          )}

                          {/* Cited Offline Guides */}
                          {m.role === 'assistant' &&
                            m.citedGuides &&
                            m.citedGuides.length > 0 && (
                              <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
                                <span className="font-semibold text-[#505081]">Guides:</span>
                                {m.citedGuides.map((g) => (
                                  <button
                                    key={g.id}
                                    type="button"
                                    onClick={() => setActiveTab('library')}
                                    className="inline-flex items-center gap-1 text-[#272757] hover:text-[#4B50D6] underline underline-offset-2 font-medium cursor-pointer"
                                  >
                                    <span>{g.title}</span>
                                    <ArrowUpRight className="w-3 h-3" />
                                  </button>
                                ))}
                              </div>
                            )}

                          {/* Verified Human Disease Ontology (DOID) & ICD-11 Citations */}
                          {m.role === 'assistant' &&
                            m.citedOntology &&
                            m.citedOntology.length > 0 && (
                              <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#505081]">
                                <span className="font-semibold text-[#272757]">Medical Ontology:</span>
                                {m.citedOntology.map((o) => (
                                  <span key={o.doid} className="font-mono text-[10px]">
                                    {o.name} ({o.doid} · ICD-11 {o.icd11})
                                  </span>
                                ))}
                              </div>
                            )}

                          {/* Interactive ChatGPT-Style Follow-Up Quick-Reply Chips (Latest assistant reply) */}
                          {m.role === 'assistant' &&
                            !dialogueHaltedForEmergency &&
                            !loading &&
                            m.id === messages[messages.length - 1]?.id &&
                            m.quickReplies &&
                            m.quickReplies.length > 0 && (
                              <div className="pt-2 flex flex-wrap gap-1.5">
                                {m.quickReplies.map((replyChip) => (
                                  <button
                                    key={replyChip}
                                    type="button"
                                    onClick={() => void sendMessage(replyChip)}
                                    className="px-3 py-1.5 min-h-[34px] rounded-lg bg-white hover:bg-[#ECEEF9] border border-[#272757]/20 text-[11px] font-semibold text-[#272757] transition-colors cursor-pointer"
                                  >
                                    {replyChip}
                                  </button>
                                ))}
                              </div>
                            )}

                          {/* Honest Actual Processing Source Metadata */}
                          {m.role === 'assistant' && m.indicatorLabel && (
                            <div className="pt-2 border-t border-[#272757]/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                              <div className="space-y-0.5">
                                <p
                                  className={`font-semibold flex items-center gap-1.5 ${pathStyle.textClass}`}
                                >
                                  <PathIcon className="w-3.5 h-3.5 shrink-0" />
                                  <span>{m.indicatorLabel}</span>
                                  {typeof m.latencyMs === 'number' && (
                                    <span className="text-[#6B6B99] font-normal tabular-nums">
                                      · {m.latencyMs < 1000 ? `${m.latencyMs}ms` : `${(m.latencyMs / 1000).toFixed(1)}s`}
                                    </span>
                                  )}
                                </p>
                                {m.indicatorDetail && (
                                  <p className="text-[10px] text-[#505081] leading-snug">
                                    {m.indicatorDetail}
                                    {m.profileContextSharedWithCloud
                                      ? ' · Minimized vitals context included.'
                                      : ''}
                                  </p>
                                )}
                              </div>

                              {/* Optional 1-click Cloud Escalation on Local Library replies when online */}
                              {m.actualPath === 'local-library' &&
                                isOnline &&
                                privacyPrefs.routingPreference !== 'local-only' &&
                                m.promptForEscalation && (
                                  <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() =>
                                      void sendMessage(m.promptForEscalation, {
                                        forceCloudEscalation: true,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#272757]/15 hover:bg-[#ECEEF9] text-[11px] font-semibold text-[#272757] cursor-pointer disabled:opacity-50"
                                  >
                                    <Cloud className="w-3 h-3" />
                                    <span>Ask Cloud AI deeper</span>
                                  </button>
                                )}
                            </div>
                          )}
                        </div>

                        {m.role === 'user' && (
                          <div className="w-8 h-8 rounded-lg bg-[#E8702A] text-white flex items-center justify-center shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {loading && (
                    <div role="status" aria-live="polite" className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-lg bg-[#272757] text-white flex items-center justify-center shrink-0">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                      <div className="max-w-[85%] sm:min-w-[280px] rounded-2xl bg-[#F5F6FC] border border-[#272757]/12 px-4 py-3 space-y-2.5">
                        <div className="flex items-center justify-between gap-4 text-xs">
                          <span className="font-semibold text-[#0F0E47]">
                            {!isOnline || privacyPrefs.routingPreference === 'local-only'
                              ? 'Searching on-device AI & local WHO/Nigeria health guides...'
                              : loadingSeconds < 3
                              ? 'Evaluating local & hybrid AI route...'
                              : loadingSeconds < 8
                              ? 'Checking verified WHO/Nigeria guides & secure Cloud AI...'
                              : 'Still working — will fall back to local guides if Cloud AI is slow...'}
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
                          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-white border border-[#E5484D]/30 hover:bg-[#FFF5F5] text-[#9C2327] font-semibold shrink-0 cursor-pointer self-start sm:self-center"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </button>
                      )}
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Composer OR Halted Emergency Escalation Panel */}
                {dialogueHaltedForEmergency ? (
                  <div
                    role="alert"
                    className="p-4 sm:p-5 border-t-2 border-[#E5484D] bg-[#FEF2F2] space-y-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <ShieldAlert className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-[#991B1B]">
                          Urgent: Seek Professional Care — Educational Chat Paused
                        </p>
                        <p className="text-xs text-[#7F1D1D] leading-relaxed">
                          A medical red-flag keyword was detected. Rather than continuing an
                          educational dialogue, please proceed directly to the Emergency Centre or
                          dial <strong>112</strong> immediately.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => navigate('/emergency')}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-bold transition-colors cursor-pointer"
                      >
                        <PhoneCall className="w-4 h-4" />
                        <span>Open EmergencyPage Now (112)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleStartNewChat}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[46px] rounded-xl bg-white hover:bg-[#FFF5F5] border border-[#DC2626]/30 text-[#991B1B] text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Start New Non-Urgent Chat</span>
                      </button>
                    </div>
                  </div>
                ) : (
                <div className="p-3.5 sm:p-4 border-t border-[#272757]/10 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#505081]">
                    <div className="flex items-center gap-2">
                      <label htmlFor="voice-lang" className="font-medium text-[#272757]">
                        Voice:
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
                    <span className="text-[11px] text-[#6B6B99]">
                      {!isOnline
                        ? 'Offline Mode — answers from Local AI & WHO/Nigeria guides'
                        : speechSupported
                        ? isListening
                          ? 'Listening hands-free...'
                          : 'Type or tap Speak to ask a health question'
                        : 'Type your health question below'}
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
                            : 'Microphone active — describe your question clearly...'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => stopVoiceDictation(false)}
                          className="px-3 py-1.5 rounded-lg bg-white border border-[#272757]/20 text-[11px] font-semibold text-[#272757] hover:bg-[#F5F6FC] cursor-pointer"
                        >
                          Stop
                        </button>
                        <button
                          type="button"
                          onClick={() => stopVoiceDictation(true)}
                          disabled={loading || (!input.trim() && !interimTranscript.trim())}
                          className="px-3 py-1.5 rounded-lg bg-[#272757] text-[11px] font-semibold text-white hover:bg-[#0F0E47] disabled:opacity-50 cursor-pointer"
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

                  {imageError && (
                    <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 px-3.5 py-2 text-xs text-[#9C2327] flex items-center justify-between gap-2">
                      <span>{imageError}</span>
                      <button
                        type="button"
                        onClick={() => setImageError(null)}
                        className="font-semibold underline shrink-0 cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Attached Accident / Health Photo Preview & Category Selector */}
                  {attachedImage && (
                    <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/15 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      <img
                        src={attachedImage.previewDataUrl}
                        alt="Attached photo preview"
                        className="w-16 h-16 rounded-lg object-cover border border-[#272757]/15 shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#0F0E47] truncate">
                            Photo ready: {attachedImage.fileName}
                          </span>
                          <button
                            type="button"
                            onClick={() => setAttachedImage(null)}
                            aria-label="Remove attached photo"
                            className="p-1 rounded-lg hover:bg-white text-[#505081] cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {IMAGE_CATEGORY_HINTS.map((hint) => (
                            <button
                              key={hint}
                              type="button"
                              onClick={() => {
                                setImageCategoryHint(hint);
                                setAttachedImage((prev) =>
                                  prev ? { ...prev, categoryHint: hint } : prev
                                );
                              }}
                              className={`px-2 py-1 rounded-md text-[10px] font-semibold cursor-pointer ${
                                (attachedImage.categoryHint || imageCategoryHint) === hint
                                  ? 'bg-[#272757] text-white'
                                  : 'bg-white border border-[#272757]/15 text-[#505081]'
                              }`}
                            >
                              {hint}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {botPolicyNotice && (
                    <div
                      role="status"
                      className="rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-2.5 flex items-start justify-between gap-3 text-xs text-indigo-950"
                    >
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">HealthConnect Sentinel Bot Policy Notice</p>
                          <p className="text-[11px] text-indigo-900 mt-0.5">{botPolicyNotice}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBotPolicyNotice(null)}
                        aria-label="Dismiss Sentinel Bot policy notice"
                        className="p-1 rounded-lg hover:bg-indigo-200/60 text-indigo-900 cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {piiMaskAlert && (
                    <div
                      role="status"
                      className="rounded-xl bg-amber-50 border border-amber-300 px-3.5 py-2.5 flex items-start justify-between gap-3 text-xs text-amber-950"
                    >
                      <div className="flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">
                            Health-Only Privacy Filter Active — Sensitive Data Masked
                          </p>
                          <p className="text-[11px] text-amber-900 mt-0.5">
                            Detected and automatically masked:{' '}
                            <strong>
                              {piiMaskAlert.categories.map(formatPiiCategoryLabel).join(', ')}
                            </strong>
                            . Please keep chat messages strictly health-focused (do not share phone
                            numbers, bank/account numbers, or GPS coordinates in chat).
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPiiMaskAlert(null)}
                        aria-label="Dismiss privacy filter alert"
                        className="p-1 rounded-lg hover:bg-amber-200/60 text-amber-900 cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendMessage();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => void handlePickPhoto(e)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Upload accident or health photo"
                      title="Upload accident, burn, wound, rash, or medication photo"
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-3 min-h-[46px] min-w-[46px] rounded-xl border text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                        attachedImage
                          ? 'bg-[#E8702A] text-white border-[#E8702A]'
                          : 'bg-[#F5F6FC] hover:bg-[#E8EAF7] text-[#272757] border-[#272757]/15'
                      }`}
                    >
                      <Camera className="w-4 h-4" />
                      <span className="hidden md:inline text-xs">Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleVoiceDictation}
                      disabled={loading || !speechSupported}
                      aria-pressed={isListening}
                      aria-label={
                        isListening ? 'Stop voice dictation' : 'Start voice-to-text dictation'
                      }
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-3 min-h-[46px] min-w-[46px] rounded-xl border text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
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
                      aria-label="Ask the Hybrid AI Health Assistant"
                      value={input}
                      onChange={(e) => handleChatInputChange(e.target.value)}
                      placeholder={
                        attachedImage
                          ? 'Add details about this photo (or tap Send for immediate first-aid guidance)...'
                          : 'Say "I feel sick", ask about symptoms, or attach an emergency photo...'
                      }
                      className="flex-1 min-w-0 px-3.5 py-3 min-h-[46px] rounded-xl bg-[#F5F6FC] border border-[#272757]/15 text-sm text-[#0F0E47]"
                    />
                    <button
                      type="submit"
                      disabled={loading || (!input.trim() && !attachedImage)}
                      className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 min-h-[46px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">{loading ? 'Thinking' : 'Send'}</span>
                    </button>
                  </form>
                </div>
                )}
              </>
            )}

            {/* TAB 2: OFFLINE HEALTH REFERENCE LIBRARY */}
            {activeTab === 'library' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <OfflineHealthLibraryPanel
                  guides={offlineGuides}
                  bookmarkedIds={bookmarkedGuideIds}
                  onToggleBookmark={(id) => void handleToggleGuideBookmark(id)}
                  onAskAboutGuide={handleAskAboutGuide}
                  isOnline={isOnline}
                />
              </div>
            )}

            {/* TAB 2B: VERIFIED MEDICATION LABEL LOOKUP (openFDA) */}
            {activeTab === 'drugs' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/12 p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F0E47] flex items-center gap-2">
                      <Pill className="w-4 h-4 text-[#E8702A]" />
                      Verified Medication Label Lookup (openFDA)
                    </h3>
                    <p className="text-xs text-[#505081] mt-0.5 leading-relaxed">
                      Search official FDA medication label summaries for purpose, warnings, and dosing context. Educational reference only — confirm dosing with a pharmacist or doctor.
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => void handleDrugLookup(e)}
                    className="flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      type="text"
                      value={drugQuery}
                      onChange={(e) => setDrugQuery(e.target.value)}
                      placeholder="Enter generic or brand drug (e.g. Ibuprofen, Metformin, Amlodipine, Amoxicillin)"
                      className="flex-1 px-3.5 py-2.5 min-h-[44px] rounded-xl bg-white border border-[#272757]/20 text-sm text-[#0F0E47]"
                    />
                    <button
                      type="submit"
                      disabled={drugLoading || !drugQuery.trim()}
                      className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                    >
                      {drugLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Search openFDA
                    </button>
                  </form>

                  <div className="flex flex-wrap gap-1.5">
                    {['Ibuprofen', 'Metformin', 'Amlodipine', 'Amoxicillin', 'Acetaminophen'].map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        onClick={(e) => void handleDrugLookup(e, sample)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#272757]/15 text-[11px] font-semibold text-[#272757] hover:bg-[#ECEEF9] cursor-pointer"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>

                {drugError && (
                  <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-3.5 text-xs text-[#9C2327]">
                    {drugError}
                  </div>
                )}

                {drugMessage && (
                  <p className="text-[11px] text-[#505081]">{drugMessage}</p>
                )}

                {drugResults.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold text-[#505081]">
                      Source: {drugSource} ({drugResults.length} label summaries)
                    </p>
                    {drugResults.map((entry, idx) => (
                      <article
                        key={`${entry.brandName}-${idx}`}
                        className="rounded-2xl bg-[#F5F6FC] border border-[#272757]/12 p-4 space-y-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-[#0F0E47]">
                            {entry.brandName}{' '}
                            <span className="font-normal text-[#505081]">({entry.genericName})</span>
                          </h4>
                          <span className="font-mono text-[11px] text-[#272757]">{entry.route}</span>
                        </div>
                        <p className="text-[#0F0E47] leading-relaxed">
                          <strong>Purpose / Indications:</strong> {entry.purpose}
                        </p>
                        <p className="text-[#9C2327] leading-relaxed">
                          <strong>Safety Warnings:</strong> {entry.warnings}
                        </p>
                        <p className="text-[#505081] leading-relaxed">
                          <strong>Dosage Summary:</strong> {entry.dosageSummary}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CONSULTATION HISTORY (FIRESTORE) */}
            {activeTab === 'history' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {!isOnline && (
                  <div className="rounded-xl bg-[#FEF3C7] border border-[#F59E0B]/35 p-3.5 text-xs text-[#92400E]">
                    Cloud consultation history requires an internet connection. Your Offline Health
                    Library and Local AI remain fully usable offline.
                  </div>
                )}

                {!user.signedIn && !isGuestDemo && (
                  <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/15 p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#272757]">
                    <span>
                      Sign in to your HealthConnect Oyo State account to securely sync consultation
                      summaries in Cloud Firestore.
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="px-3.5 py-2 min-h-[40px] rounded-lg bg-[#272757] text-white font-semibold cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                )}

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
                      className="w-full pl-9 pr-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#F5F6FC] border border-[#272757]/15 text-xs text-[#0F0E47]"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <select
                      aria-label="Filter consultation history by focus mode"
                      value={historyModeFilter}
                      onChange={(e) => setHistoryModeFilter(e.target.value)}
                      className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#F5F6FC] border border-[#272757]/15 text-xs font-medium text-[#0F0E47]"
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
                          ? 'Completed online conversations with your verified account are automatically summarized in your private Firestore history.'
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
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[42px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold cursor-pointer"
                    >
                      {aiConsultations.length === 0
                        ? 'Start Hybrid Consultation'
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
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#505081]">
                                <span className="font-semibold text-[#272757]">{item.mode}</span>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatConsultationDate(item.createdAt)}
                                </span>
                              </div>
                              <h3 className="text-sm font-bold text-[#0F0E47] leading-snug">
                                {item.topic}
                              </h3>
                            </div>
                            <span className="text-[10px] font-medium text-[#505081] bg-white border border-[#272757]/10 px-2 py-1 rounded-lg shrink-0">
                              {item.model} · {item.messageCount} msgs
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
                              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Continue in Chat</span>
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === item.id}
                              onClick={() => void handleDeleteConsultation(item.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-white hover:bg-[#FFF5F5] border border-[#E5484D]/25 text-[#9C2327] text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              {deletingId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              <span>Delete</span>
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

      {/* One-time NDPA-Informed Privacy & Cloud AI Consent Modal */}
      <AiConsentModal
        open={consentModalOpen}
        onAccept={() => void handleAcceptConsent()}
        onDecline={() => setConsentModalOpen(false)}
      />
    </div>
  );
}
