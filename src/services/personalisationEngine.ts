import type {
  AgeLifeStage,
  ConfirmedGender,
  FamilyProfile,
  HealthNeedPreferences,
} from '../types/healthcare';

export type FeatureDomain =
  | 'age_child'
  | 'age_teen'
  | 'age_young_adult'
  | 'age_adult'
  | 'age_older_adult'
  | 'female_health'
  | 'male_health'
  | 'general_ai'
  | 'general_wearable'
  | 'general_nutrition'
  | 'general_medical'
  | 'general_safety';

export interface PersonalisedModuleSpec {
  id: string;
  title: string;
  summary: string;
  domain: FeatureDomain;
  /** Minimum calculated age required before this module is ever visible */
  minAge: number;
  /** Maximum age for age-stage default prioritization (undefined = no upper cap) */
  maxAge?: number;
  /** True if adult-only sensitive content that must NEVER appear for minors */
  adultOnly?: boolean;
  /** Capabilities from the 120-feature HealthConnect Blueprint organized inside this module */
  capabilities: string[];
  actionRoute: '/dashboard' | '/ai-assistant' | '/monitoring' | '/emergency' | '/find-healthcare';
  actionLabel: string;
}

export interface AgeStageProfileSummary {
  stage: AgeLifeStage;
  label: string;
  ageRangeLabel: string;
  calculatedAge: number;
  isGuardianManaged: boolean;
  minorSafetyRestricted: boolean;
  guidanceNote: string;
}

export interface PersonalisedDashboardPlan {
  ageInfo: AgeStageProfileSummary;
  genderConfirmed: ConfirmedGender;
  preferences: HealthNeedPreferences;
  /** Focused primary modules actively prioritized for this user's profile */
  primaryModules: PersonalisedModuleSpec[];
  /** Additional safe modules available to toggle on/off in the Personalise drawer */
  optionalModules: PersonalisedModuleSpec[];
  /** Total capabilities unlocked across the user's personalised setup */
  activeCapabilityCount: number;
  /** Total catalog capabilities represented across the HealthConnect Blueprint */
  totalBlueprintCapabilities: number;
  /** True when Women's Health / adult reproductive tabs must be strictly hidden */
  hideAdultReproductiveTabs: boolean;
}

export const GLOBAL_EMERGENCY_PRESETS: Array<{
  countryCode: string;
  countryName: string;
  emergencyNumber: string;
}> = [
  { countryCode: 'NG', countryName: 'Nigeria', emergencyNumber: '112' },
  { countryCode: 'GH', countryName: 'Ghana', emergencyNumber: '112' },
  { countryCode: 'KE', countryName: 'Kenya', emergencyNumber: '999' },
  { countryCode: 'ZA', countryName: 'South Africa', emergencyNumber: '10111' },
  { countryCode: 'GB', countryName: 'United Kingdom', emergencyNumber: '999' },
  { countryCode: 'US', countryName: 'United States / Canada', emergencyNumber: '911' },
  { countryCode: 'EU', countryName: 'European Union (Universal)', emergencyNumber: '112' },
  { countryCode: 'IN', countryName: 'India', emergencyNumber: '112' },
  { countryCode: 'AU', countryName: 'Australia', emergencyNumber: '000' },
];

/**
 * Strictly calculates age in whole years from Date of Birth (ISO YYYY-MM-DD).
 * Never assumes age when DOB is available.
 */
export function calculateAgeFromDob(
  dateOfBirth?: string,
  fallbackAge?: number,
  referenceDate: Date = new Date()
): number {
  if (dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
    const [yearStr, monthStr, dayStr] = dateOfBirth.trim().split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (
      Number.isFinite(year) &&
      Number.isFinite(month) &&
      Number.isFinite(day) &&
      year >= 1900 &&
      year <= referenceDate.getFullYear()
    ) {
      let age = referenceDate.getFullYear() - year;
      const monthDiff = referenceDate.getMonth() + 1 - month;
      if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < day)) {
        age -= 1;
      }
      return Math.max(0, Math.min(120, age));
    }
  }
  return Math.max(0, Math.min(120, Math.round(Number(fallbackAge) || 25)));
}

export function resolveAgeStage(calculatedAge: number): AgeStageProfileSummary {
  if (calculatedAge <= 12) {
    return {
      stage: 'child',
      label: 'Child Care (Guardian-Managed)',
      ageRangeLabel: 'Ages 0–12',
      calculatedAge,
      isGuardianManaged: true,
      minorSafetyRestricted: true,
      guidanceNote:
        'Guardian safety lock is active. Adult reproductive and sensitive adult modules are hidden automatically.',
    };
  }
  if (calculatedAge <= 17) {
    return {
      stage: 'teen',
      label: 'Teenager Wellness',
      ageRangeLabel: 'Ages 13–17',
      calculatedAge,
      isGuardianManaged: false,
      minorSafetyRestricted: true,
      guidanceNote:
        'Adolescent-safe mode is active. Focuses on sleep, activity, hydration, mood balance, and age-appropriate guidance.',
    };
  }
  if (calculatedAge <= 30) {
    return {
      stage: 'young_adult',
      label: 'Young Adult Vitality',
      ageRangeLabel: 'Ages 18–30',
      calculatedAge,
      isGuardianManaged: false,
      minorSafetyRestricted: false,
      guidanceNote:
        'Prioritises daily steps, heart rate, sleep quality, nutrition, fitness habits, and preventive screenings.',
    };
  }
  if (calculatedAge <= 50) {
    return {
      stage: 'adult',
      label: 'Adult Preventive & Metabolic Care',
      ageRangeLabel: 'Ages 31–50',
      calculatedAge,
      isGuardianManaged: false,
      minorSafetyRestricted: false,
      guidanceNote:
        'Prioritises blood pressure, glucose, cholesterol records, cardiovascular risk awareness, stress balance, and family care.',
    };
  }
  return {
    stage: 'older_adult',
    label: 'Older Adult Heart, Mobility & Caregiver Support',
    ageRangeLabel: 'Ages 51+',
    calculatedAge,
    isGuardianManaged: false,
    minorSafetyRestricted: false,
    guidanceNote:
      'Prioritises heart & BP monitoring, daily medication reminders, mobility & fall-risk safety, and caregiver emergency access.',
  };
}

export function normalizeConfirmedGender(profile?: Partial<FamilyProfile> | null): ConfirmedGender {
  if (profile?.genderConfirmed === 'female' || profile?.genderConfirmed === 'male') {
    return profile.genderConfirmed;
  }
  const g = (profile?.gender || '').trim().toLowerCase();
  if (g === 'female' || g === 'woman' || g === 'girl' || g === 'f') return 'female';
  if (g === 'male' || g === 'man' || g === 'boy' || g === 'm') return 'male';
  return 'not_specified';
}

export function deriveDefaultPreferences(
  stage: AgeLifeStage,
  gender: ConfirmedGender,
  saved?: HealthNeedPreferences
): HealthNeedPreferences {
  const isChild = stage === 'child';
  const isTeen = stage === 'teen';
  if (saved) {
    return {
      ...saved,
      // Strict child protection: never enable adult reproductive modules for children 0-12
      includeFemaleHealth: isChild ? false : saved.includeFemaleHealth,
      includeMaleHealth: isChild || isTeen ? false : saved.includeMaleHealth,
    };
  }
  return {
    includeFemaleHealth: !isChild && gender === 'female',
    includeMaleHealth: !isChild && !isTeen && gender === 'male',
    includeChronicCare: stage === 'adult' || stage === 'older_adult',
    includeFitnessAndNutrition: stage === 'teen' || stage === 'young_adult' || stage === 'adult',
    includeWearableMonitoring: stage !== 'child',
    includeCaregiverTools: stage === 'child' || stage === 'older_adult',
  };
}

/**
 * Full 120-Capability HealthConnect Personalised Blueprint organized into clean,
 * actionable modules (never dumped raw onto every user).
 * - 40 Age-Based Capabilities (8 per life stage across 5 stages)
 * - 20 Female Health Capabilities
 * - 20 Male Health Capabilities
 * - 40 Universal General Health Capabilities (AI, Wearables, Nutrition, Medical, Safety)
 */
export const HEALTHCONNECT_MODULE_CATALOG: PersonalisedModuleSpec[] = [
  // ── 1. AGE-BASED MODULES (40 Capabilities: 8 × 5 stages) ──────────────────
  {
    id: 'child-pediatric-core',
    title: 'Child Growth, Immunisation & Paediatric Care',
    summary: 'Guardian-managed growth percentiles, vaccine tracking, developmental milestones, and safe fever/hydration routines.',
    domain: 'age_child',
    minAge: 0,
    maxAge: 12,
    capabilities: [
      'Child growth and development tracking',
      'Height and weight percentile charts',
      'Childhood vaccination schedule tracker',
      'Immunisation reminder alerts',
      'Child nutrition and balanced meal guidance',
      'Child sleep duration monitoring',
      'Fever and pediatric symptom guidance',
      'Developmental milestone & guardian-managed account controls',
    ],
    actionRoute: '/dashboard',
    actionLabel: 'Open Vaccines & Growth',
  },
  {
    id: 'teen-wellness-core',
    title: 'Teen Sleep, Activity, Hydration & Mind Balance',
    summary: 'Age-appropriate adolescent wellness focusing on healthy sleep, movement, stress check-ins, and balanced screen habits.',
    domain: 'age_teen',
    minAge: 13,
    maxAge: 17,
    capabilities: [
      'Adolescent growth & healthy lifestyle education',
      'Teen sleep pattern & bedtime consistency tracking',
      'Daily physical activity and sports movement goals',
      'Balanced nutrition guidance for growing teens',
      'Daily hydration reminder check-ins',
      'Stress, study balance & mood check-ins',
      'Screen-time wellness & eye-rest reminders',
      'Age-appropriate educational symptom guidance',
    ],
    actionRoute: '/ai-assistant',
    actionLabel: 'Ask Teen Wellness AI',
  },
  {
    id: 'young-adult-vitality',
    title: 'Daily Steps, Heart Rate, Sleep & Preventive Vitality',
    summary: 'High-energy habit tracking for daily activity, sleep recovery, hydration, nutrition, and preventive wellness checks.',
    domain: 'age_young_adult',
    minAge: 18,
    maxAge: 30,
    capabilities: [
      'Daily steps and active movement tracking',
      'Resting and active heart rate trend awareness',
      'Sleep duration and recovery quality insights',
      'Nutrition and hydration goal tracking',
      'Structured workout & fitness routine tracking',
      'Stress management and mindfulness check-ins',
      'Preventive young-adult screening reminders',
      'Energy, lifestyle & metabolic wellness scorecards',
    ],
    actionRoute: '/monitoring',
    actionLabel: 'Open Vitals & Watch',
  },
  {
    id: 'adult-preventive-metabolic',
    title: 'Blood Pressure, Glucose, Heart Risk & Family Health',
    summary: 'Preventive metabolic monitoring, annual health screening reminders, stress/weight balance, and household profile care.',
    domain: 'age_adult',
    minAge: 31,
    maxAge: 50,
    capabilities: [
      'Blood pressure cuff & trend tracking',
      'Blood glucose and HbA1c record tracking',
      'Cholesterol & lipid profile logbook',
      'Cardiovascular risk awareness summaries',
      'Sustainable weight and metabolic management',
      'Work-life stress and recovery tracking',
      'Annual preventive health checkup reminders',
      'Multi-member family health profile management',
    ],
    actionRoute: '/monitoring',
    actionLabel: 'Track BP & Glucose',
  },
  {
    id: 'older-adult-longevity',
    title: 'Heart Health, Medication Adherence & Mobility Safety',
    summary: 'Calm, high-legibility senior care focusing on heart/BP tracking, pill reminders, fall-risk awareness, and caregiver access.',
    domain: 'age_older_adult',
    minAge: 51,
    capabilities: [
      'Heart health and blood pressure priority monitoring',
      'Daily medication adherence schedules & taken check-ins',
      'Mobility, balance, and gentle physiotherapy tracking',
      'Fall-risk awareness & home safety checklists',
      'Hydration and bone/joint health reminders',
      'Chronic condition care plan summaries',
      'Vision, hearing & annual senior screening reminders',
      'Trusted caregiver & family emergency access',
    ],
    actionRoute: '/dashboard',
    actionLabel: 'Open Care Plan',
  },

  // ── 2. FEMALE HEALTH MODULES (20 Capabilities — Customizable, never assumed) ─
  {
    id: 'female-cycle-reproductive',
    title: 'Menstrual Cycle, PCOS & Hormonal Wellness',
    summary: 'Private owner-only cycle tracking, symptom logging, PCOS guidance, and period/hydration awareness.',
    domain: 'female_health',
    minAge: 13,
    capabilities: [
      'Menstrual cycle calendar & period logbook',
      'Cycle length and regularity pattern insights',
      'Period symptoms (cramps, fatigue, mood) tracking',
      'Flow intensity and spotting records',
      'Hormonal balance and wellness education',
      'PCOS awareness and clinician-prep tracker',
      'Iron-rich nutrition & hydration guidance during cycles',
      'Private owner-only cycle log encryption & export',
      'Pain & comfort relief tracking',
      'Abnormal bleeding warning sign alerts',
    ],
    actionRoute: '/dashboard',
    actionLabel: 'Open Cycle Tracker',
  },
  {
    id: 'female-maternal-preventive',
    title: 'Maternal, Breast, Bone & Life-Stage Care',
    summary: 'Adult women’s preventive screenings, antenatal/postnatal checklists, bone density, and menopause support.',
    domain: 'female_health',
    minAge: 18,
    adultOnly: true,
    capabilities: [
      'Fertility & preconception wellness checklist',
      'Pregnancy week-by-week antenatal visit tracker',
      'Maternal danger-sign red-flag monitoring',
      'Postpartum recovery and pelvic floor rehab logs',
      'Breast self-awareness & mammogram reminders',
      'Cervical health & HPV screening reminders',
      'Perimenopause & menopause symptom tracking',
      'Bone health, calcium & vitamin D reminders',
      'Thyroid and anemia lab awareness',
      'Clinician-ready women’s health summary export',
    ],
    actionRoute: '/ai-assistant',
    actionLabel: 'Women’s Health Guide',
  },

  // ── 3. MALE HEALTH MODULES (20 Capabilities — Customizable, never assumed) ──
  {
    id: 'male-cardio-metabolic-fitness',
    title: 'Cardiovascular Fitness, Strength & Metabolic Health',
    summary: 'Heart health, blood pressure resilience, strength & recovery tracking, sleep quality, and stress management.',
    domain: 'male_health',
    minAge: 18,
    capabilities: [
      'Cardiovascular endurance & resting heart rate focus',
      'Hypertension & vascular risk tracking',
      'Strength, mobility & active recovery logging',
      'Protein, hydration & metabolic nutrition tracking',
      'Waist & healthy body-composition awareness',
      'Sleep apnea & snoring quality awareness',
      'Stress resilience & mental wellness check-ins',
      'Blood lipid & glucose screening tracker',
      'Hair, skin & sun-protection awareness',
      'Work-ergonomics & back-care rehab exercises',
    ],
    actionRoute: '/monitoring',
    actionLabel: 'Open Fitness & Heart',
  },
  {
    id: 'male-preventive-prostate',
    title: 'Prostate, Urinary & Men’s Preventive Screening',
    summary: 'Age-appropriate men’s screenings, urinary symptom awareness, testicular self-checks, and preventive lab reminders.',
    domain: 'male_health',
    minAge: 18,
    adultOnly: true,
    capabilities: [
      'Testicular self-awareness reminders (ages 18–45)',
      'Prostate health education & screening prep (ages 45+)',
      'Urinary frequency & nighttime symptom tracker',
      'Hormonal energy & fatigue check-in log',
      'Annual preventive blood panel checklist',
      'Colon & gastrointestinal screening reminders (45+)',
      'Sexual & reproductive wellness doctor-prep guide',
      'Liver & kidney wellness lifestyle reminders',
      'Alcohol/smoking reduction wellness milestones',
      'Doctor-ready men’s preventive summary export',
    ],
    actionRoute: '/ai-assistant',
    actionLabel: 'Men’s Health Guide',
  },

  // ── 4. GENERAL UNIVERSAL HEALTH MODULES (40 Capabilities: 5 × 8) ────────────
  {
    id: 'general-hybrid-ai',
    title: 'Hybrid AI Symptom Triage & Emergency Photo Aid',
    summary: 'Interactive ChatGPT-style follow-up questioning, verified DOID/WHO/MedlinePlus offline guides, openFDA drug lookup, and accident photo analysis.',
    domain: 'general_ai',
    minAge: 0,
    capabilities: [
      'Interactive step-by-step symptom follow-up questioning',
      'Offline Human Disease Ontology (DOID) & WHO reference AI',
      'Multimodal accident, wound & rash photo first-aid analysis',
      'Real-time Medical Red-Flag keyword safety middleware',
      'Plain-language lab report & prescription explainer',
      'openFDA verified medication safety & label lookup',
      'Voice-to-text symptom dictation in multiple accents',
      'Doctor visit preparation & referral question builder',
    ],
    actionRoute: '/ai-assistant',
    actionLabel: 'Open Hybrid AI',
  },
  {
    id: 'general-wearable-vitals',
    title: 'Smartwatch Live Vitals & GPS Critical-Vital Escalation',
    summary: 'Web Bluetooth smartwatch pairing + live telemetry simulator tracking HR, SpO₂, BP, temperature, steps, and auto-alerting nearest hospitals via GPS.',
    domain: 'general_wearable',
    minAge: 0,
    capabilities: [
      'Web Bluetooth smartwatch heart-rate & SpO₂ sync',
      'Explicitly labeled smartwatch telemetry simulator & manual log',
      'Live heart rate, SpO₂, BP, and temperature dashboards',
      'Configurable low/high critical vital alert thresholds',
      '15-second cancellable emergency auto-escalation countdown',
      'GPS nearest 24/7 hospital distance & route finder',
      '1-tap direct device emergency calling (112 / 911 / 999)',
      'Transparent data-source & non-medical-grade labeling',
    ],
    actionRoute: '/monitoring',
    actionLabel: 'Launch Smartwatch Hub',
  },
  {
    id: 'general-nutrition-fitness',
    title: 'Nutrition, Hydration, Sleep & Rehabilitation Studio',
    summary: 'Daily hydration reminders, physiotherapy mobility exercises, sleep tracking, and balanced lifestyle logs.',
    domain: 'general_nutrition',
    minAge: 0,
    capabilities: [
      'Daily water & oral hydration tracker',
      'Balanced nutrition and glycemic meal education',
      'Sleep duration and bedtime routine logs',
      'Daily steps and active minutes tracking',
      'Clinician-guided physiotherapy & rehab exercise logs',
      'Pain & mobility 1–10 recovery progress charts',
      'Weight & BMI trend tracking',
      'Habit streaks & gentle wellness nudges',
    ],
    actionRoute: '/dashboard',
    actionLabel: 'Open Rehab & Habits',
  },
  {
    id: 'general-medical-records',
    title: 'Medical Records, Prescriptions, Appointments & Wallet',
    summary: 'Unified health timeline, lab summaries, online & physical doctor bookings, medication reminders, and family profiles.',
    domain: 'general_medical',
    minAge: 0,
    capabilities: [
      'Verified online & in-person doctor booking directory',
      'Unified chronological personal health timeline',
      'Encrypted medical documents & lab result vault',
      'Daily medication & vitals reminder scheduler',
      'Multi-member family profile switcher (up to 5)',
      'Clinician record sharing with revocable consent',
      'CSV vitals export for clinic consultations',
      'Transparent subscription & health wallet history',
    ],
    actionRoute: '/find-healthcare',
    actionLabel: 'Find Care & Doctors',
  },
  {
    id: 'general-emergency-qr-safety',
    title: 'Offline Emergency Medical QR Code & Privacy Control',
    summary: '100% locally generated scannable Medical QR Code for phone lock-screen & smartwatch display so any ER sees lifesaving blood group, allergies, and contacts.',
    domain: 'general_safety',
    minAge: 0,
    capabilities: [
      'Offline-generated scannable Emergency Medical QR Code',
      'Smartwatch face & phone wallet emergency card layouts',
      'Blood group, genotype & severe allergy ER summary',
      'Current medications & chronic conditions quick-view',
      'One-tap emergency contact & local ambulance dialing',
      'First-responder "What ER Staff See" scan preview',
      'Granular privacy toggle for QR-encoded fields',
      'NDPA-informed cloud AI consent & offline-first security',
    ],
    actionRoute: '/emergency',
    actionLabel: 'Open Emergency QR',
  },
];

/**
 * Evaluates the user's profile (DOB-calculated age, confirmed gender, optional
 * health-need preferences, and manual module toggles) to build a clean,
 * age-appropriate, personalised HealthConnect dashboard plan.
 */
export function buildPersonalisedDashboardPlan(
  profile?: Partial<FamilyProfile> | null
): PersonalisedDashboardPlan {
  const calculatedAge = calculateAgeFromDob(profile?.dateOfBirth, profile?.age);
  const ageInfo = resolveAgeStage(calculatedAge);
  const genderConfirmed = normalizeConfirmedGender(profile);
  const preferences = deriveDefaultPreferences(
    ageInfo.stage,
    genderConfirmed,
    profile?.healthNeedPreferences
  );

  // Filter out anything prohibited for the user's calculated age (strict minor safety)
  const ageSafeCatalog = HEALTHCONNECT_MODULE_CATALOG.filter((mod) => {
    if (calculatedAge < mod.minAge) return false;
    if (ageInfo.minorSafetyRestricted && mod.adultOnly) return false;
    return true;
  });

  const userOverrides =
    profile?.enabledModules && profile.enabledModules.length > 0
      ? new Set(profile.enabledModules)
      : null;

  const isDefaultPrimary = (mod: PersonalisedModuleSpec): boolean => {
    // 1. Always prioritize the exact matching life-stage module
    if (mod.domain === `age_${ageInfo.stage}`) return true;

    // 2. Always include core Hybrid AI + Emergency Medical QR safety modules
    if (mod.id === 'general-hybrid-ai' || mod.id === 'general-emergency-qr-safety') {
      return true;
    }

    // 3. Smartwatch & wearable module for teens/adults/seniors when enabled
    if (mod.id === 'general-wearable-vitals' && preferences.includeWearableMonitoring) {
      return true;
    }

    // 4. Female / Male health modules only when age-safe & enabled in preferences
    if (mod.domain === 'female_health' && preferences.includeFemaleHealth) {
      // For teens (13-17), only surface non-adultOnly cycle module
      return !mod.adultOnly || !ageInfo.minorSafetyRestricted;
    }
    if (mod.domain === 'male_health' && preferences.includeMaleHealth) {
      // Prioritize prostate module for 35+, cardiovascular fitness for 18+
      if (mod.id === 'male-preventive-prostate') return calculatedAge >= 35;
      return true;
    }

    // 5. Nutrition & Fitness for young adults/teens or when toggled
    if (mod.id === 'general-nutrition-fitness' && preferences.includeFitnessAndNutrition) {
      return true;
    }

    // 6. Medical Records prioritized for adults, seniors, and children
    if (
      mod.id === 'general-medical-records' &&
      (ageInfo.stage === 'child' || ageInfo.stage === 'adult' || ageInfo.stage === 'older_adult')
    ) {
      return true;
    }

    return false;
  };

  const primaryModules: PersonalisedModuleSpec[] = [];
  const optionalModules: PersonalisedModuleSpec[] = [];

  for (const mod of ageSafeCatalog) {
    const selected = userOverrides
      ? userOverrides.has(mod.id) || mod.domain === `age_${ageInfo.stage}`
      : isDefaultPrimary(mod);
    if (selected) {
      primaryModules.push(mod);
    } else {
      optionalModules.push(mod);
    }
  }

  const activeCapabilityCount = primaryModules.reduce(
    (sum, m) => sum + m.capabilities.length,
    0
  );
  const totalBlueprintCapabilities = HEALTHCONNECT_MODULE_CATALOG.reduce(
    (sum, m) => sum + m.capabilities.length,
    0
  );

  return {
    ageInfo,
    genderConfirmed,
    preferences,
    primaryModules,
    optionalModules,
    activeCapabilityCount,
    totalBlueprintCapabilities,
    hideAdultReproductiveTabs: ageInfo.stage === 'child',
  };
}
