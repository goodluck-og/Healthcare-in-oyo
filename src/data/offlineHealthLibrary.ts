export type HealthGuideCategory =
  | 'WHO & Nigeria Core'
  | 'Maternal, Women & PCOS'
  | 'Chronic Care'
  | 'Infectious & Vaccines'
  | 'Emergency & First Aid'
  | 'Terms, Labs & App Guide';

export interface OfflineHealthGuide {
  id: string;
  title: string;
  category: HealthGuideCategory;
  source: string;
  readingMinutes: number;
  summary: string;
  keywords: string[];
  keyPoints: string[];
  whenToSeekCare: string[];
  oyoCarePathway: string;
}

export const HEALTH_GUIDE_CATEGORIES: readonly HealthGuideCategory[] = [
  'WHO & Nigeria Core',
  'Maternal, Women & PCOS',
  'Chronic Care',
  'Infectious & Vaccines',
  'Emergency & First Aid',
  'Terms, Labs & App Guide',
] as const;

export const OFFLINE_HEALTH_LIBRARY_VERSION = '2026.11.oyo-v1';

/**
 * Curated offline educational health reference handbook grounded in public
 * World Health Organization (WHO), Nigeria Centre for Disease Control (NCDC),
 * and Federal Ministry of Health educational guidelines.
 *
 * Non-diagnostic educational material only — never replaces qualified clinicians.
 */
export const OFFLINE_HEALTH_LIBRARY: OfflineHealthGuide[] = [
  // =========================================================================
  // 1. WHO & Nigeria Primary Care Core Guides
  // =========================================================================
  {
    id: 'who-ors-dehydration',
    title: 'Oral Rehydration Salts (ORS) & Dehydration Prevention',
    category: 'WHO & Nigeria Core',
    source: 'WHO Diarrhoeal Disease & Rehydration Guidelines',
    readingMinutes: 3,
    summary:
      'How to recognise mild vs. severe dehydration early, prepare standard WHO low-osmolarity ORS safely, and know when urgent hospital fluids are required.',
    keywords: [
      'ors',
      'oral rehydration',
      'diarrhoea',
      'diarrhea',
      'dehydration',
      'vomiting',
      'watery stool',
      'zinc',
      'fluid',
      'cholera',
      'stomach',
    ],
    keyPoints: [
      'Use clean, boiled and cooled drinking water when mixing a NAFDAC-registered WHO low-osmolarity ORS sachet; follow the exact water volume printed on the packet (usually 1 litre).',
      'Give small, frequent sips using a clean cup or spoon—especially if vomiting is present—and continue breastfeeding or light nutritious meals.',
      'For children under 5 with acute watery diarrhoea, WHO recommends zinc supplementation alongside ORS under pharmacist or clinician guidance.',
      'Discard unused mixed ORS solution after 24 hours and store covered in a cool place.',
    ],
    whenToSeekCare: [
      'Sunken eyes, very dry mouth, crying with few or no tears, or no urine for 6–8 hours.',
      'Unable to drink or keep fluids down due to repeated vomiting.',
      'Blood in stool, high persistent fever, extreme drowsiness, or difficulty waking.',
    ],
    oyoCarePathway:
      'Start an online consultation in HealthConnect Oyo State for guided assessment, or visit the nearest primary health centre or partner hospital immediately if danger signs appear.',
  },
  {
    id: 'who-fever-home-care',
    title: 'Safe Fever Monitoring & General Home Comfort',
    category: 'WHO & Nigeria Core',
    source: 'WHO Primary Care Symptom Guidance',
    readingMinutes: 3,
    summary:
      'Understanding normal vs. elevated body temperature, safe cooling habits, hydration, and why fever in Oyo State should always be evaluated for malaria or infection.',
    keywords: [
      'fever',
      'temperature',
      'hot body',
      'chills',
      'thermometer',
      'paracetamol',
      'sweating',
      'cold',
      'flu',
    ],
    keyPoints: [
      'A fever is generally defined as an oral or axillary temperature of 38.0°C (100.4°F) or higher and is a sign that the body is responding to an infection or inflammation.',
      'Dress in light breathable cotton clothing, keep the room ventilated, drink plenty of fluids, and rest rather than bundling under heavy blankets.',
      'Avoid cold-water immersion or alcohol rubs, which can cause shivering or harm—lukewarm sponging is safer for comfort.',
      'In Nigeria, do not assume every fever is malaria without a rapid diagnostic test (RDT) or microscopy, and never self-medicate with unprescribed antibiotics.',
    ],
    whenToSeekCare: [
      'Any fever in a newborn or infant under 3 months old requires immediate medical evaluation.',
      'Fever lasting more than 48 hours, temperature above 39.5°C, stiff neck, rash, confusion, or convulsions.',
      'Fever during pregnancy or in a person with sickle cell disease (HbSS/HbSC).',
    ],
    oyoCarePathway:
      'Log temperatures with timestamps, then talk to an online Oyo State doctor under your monthly plan to decide whether malaria RDT or an in-person exam is needed.',
  },
  {
    id: 'ng-safe-medicines-nafdac',
    title: 'Safe Medicine Use & NAFDAC Verification in Nigeria',
    category: 'WHO & Nigeria Core',
    source: 'NAFDAC & WHO Medication Safety Education',
    readingMinutes: 3,
    summary:
      'Practical steps to check medicine authenticity, avoid antibiotic resistance, store temperature-sensitive drugs like insulin, and prevent dangerous drug interactions.',
    keywords: [
      'medicine',
      'medication',
      'drug',
      'nafdac',
      'antibiotic',
      'pharmacy',
      'prescription',
      'dosage',
      'side effect',
      'insulin',
      'expiry',
    ],
    keyPoints: [
      'Always verify the NAFDAC Registration Number, intact seal, batch number, and expiry date on every medicine pack bought from a licensed pharmacy.',
      'Never stop prescribed chronic medicines (such as blood pressure, diabetes, or seizure tablets) abruptly without speaking to your doctor.',
      'Never share antibiotics or use leftover prescriptions—misuse fuels antimicrobial resistance and can mask serious conditions.',
      'Keep an up-to-date list of all medicines, herbal remedies, and known allergies inside your HealthConnect Profile before every consultation.',
    ],
    whenToSeekCare: [
      'Swelling of lips, tongue, or throat, hives, or wheezing after taking a medicine (possible allergic emergency).',
      'Unexpected severe rash, yellowing of the eyes, severe stomach pain, or dizziness after starting a new medication.',
    ],
    oyoCarePathway:
      'Use Medication Reminders in your Dashboard to stay consistent and ask your online doctor or licensed Oyo pharmacist before combining prescriptions with herbal preparations.',
  },

  // =========================================================================
  // 2. Maternal, Women's Health & PCOS Care
  // =========================================================================
  {
    id: 'womens-cycle-tracking',
    title: 'Menstrual Cycle Health & Understanding Irregular Periods',
    category: 'Maternal, Women & PCOS',
    source: 'WHO Sexual & Reproductive Health Education',
    readingMinutes: 4,
    summary:
      'What a typical menstrual cycle looks like, why logging flow and symptoms helps clinicians, and common reasons cycles shift or become painful.',
    keywords: [
      'period',
      'menstrual',
      'cycle',
      'cramps',
      'irregular period',
      'missed period',
      'heavy bleeding',
      'ovulation',
      'women health',
      'gynecology',
      'gynaecology',
    ],
    keyPoints: [
      'A typical adult menstrual cycle ranges from 21 to 35 days from the first day of one period to the first day of the next, with bleeding usually lasting 2 to 7 days.',
      'Temporary cycle shifts can be linked to stress, significant weight change, thyroid conditions, PCOS, fibroids, hormonal contraception, or pregnancy.',
      'Recording start dates, flow heaviness, pelvic pain, headaches, and fatigue over 3+ months gives an OB-GYN actionable clinical evidence.',
      'Your cycle logs in HealthConnect Women’s Health are strictly owner-only and private unless you explicitly choose to share them.',
    ],
    whenToSeekCare: [
      'Soaking through one or more pads/tampons every hour for several hours, or passing large clots frequently.',
      'Severe pelvic pain that disrupts daily activity or does not improve with routine care.',
      'Bleeding between periods, bleeding after menopause, or missing three or more consecutive periods when not pregnant.',
    ],
    oyoCarePathway:
      'Track privately inside Dashboard → Women’s Health, then consult an Oyo State OB-GYN online first before scheduling any ultrasound or physical exam at Adeoyo Maternity or partner clinics.',
  },
  {
    id: 'womens-pcos-care',
    title: 'Polycystic Ovary Syndrome (PCOS): Plain-Language Guide',
    category: 'Maternal, Women & PCOS',
    source: 'International Evidence-Based Guideline for PCOS & WHO',
    readingMinutes: 4,
    summary:
      'Key features of PCOS, why both reproductive and metabolic health matter, supportive nutrition and movement habits, and questions to bring to an OB-GYN.',
    keywords: [
      'pcos',
      'polycystic',
      'ovary',
      'acne',
      'hirsutism',
      'facial hair',
      'insulin resistance',
      'fertility',
      'hormone',
      'irregular cycles',
    ],
    keyPoints: [
      'PCOS is a common hormonal condition that can involve irregular or infrequent periods, signs of elevated androgens (such as persistent acne or excess facial/body hair), or polycystic-appearing ovaries on ultrasound.',
      'Diagnosis requires a qualified doctor reviewing symptoms, medical history, blood tests, and imaging—AI or self-checklists cannot confirm PCOS.',
      'Balanced meals rich in high-fibre vegetables, beans/legumes, lean protein, and regular physical activity help support insulin sensitivity and long-term heart health.',
      'Long-term care often includes periodic screening for blood pressure, blood glucose (HbA1c), cholesterol, and emotional wellbeing.',
    ],
    whenToSeekCare: [
      'Fewer than 8 periods per year or cycles consistently longer than 35 days.',
      'Difficulty conceiving, worsening acne/hair growth, dark velvety skin patches on the neck/underarms, or persistent fatigue.',
    ],
    oyoCarePathway:
      'Use the private Women’s Health workspace and book an online OB-GYN review under your monthly subscription to plan targeted hormone or metabolic lab tests.',
  },
  {
    id: 'maternal-antenatal-danger-signs',
    title: 'Pregnancy Wellness & Antenatal Danger Signs',
    category: 'Maternal, Women & PCOS',
    source: 'WHO Antenatal Care Recommendations for a Positive Pregnancy Experience',
    readingMinutes: 4,
    summary:
      'Core antenatal checkup habits (iron/folate, blood pressure checks, malaria IPTp) and urgent pregnancy warning signs that require same-day hospital care.',
    keywords: [
      'pregnancy',
      'pregnant',
      'antenatal',
      'anc',
      'maternal',
      'preeclampsia',
      'swelling',
      'baby movement',
      'postpartum',
      'trimester',
      'folic acid',
    ],
    keyPoints: [
      'WHO recommends regular scheduled antenatal visits starting in the first trimester to monitor maternal blood pressure, anaemia, urine protein, and fetal growth.',
      'Discuss folic acid, iron supplementation, tetanus vaccination, and malaria prevention (sleeping under insecticide-treated nets and clinician-guided IPTp) during antenatal visits.',
      'Postpartum care in the first 6 weeks after delivery is equally important for monitoring blood pressure, wound healing, and emotional health.',
    ],
    whenToSeekCare: [
      'Vaginal bleeding or fluid leaking at any stage of pregnancy.',
      'Severe headache, blurred vision, flashing lights, upper abdominal pain, or sudden swelling of the face and hands (possible pre-eclampsia emergency).',
      'Reduced or absent baby movements in the second half of pregnancy, high fever, or convulsions.',
    ],
    oyoCarePathway:
      'For urgent pregnancy danger signs, go immediately to a maternity emergency centre (such as Adeoyo Maternity Teaching Hospital or UCH Ibadan) or use the Emergency Desk.',
  },

  // =========================================================================
  // 3. Chronic Care: Blood Pressure, Diabetes & Sickle Cell
  // =========================================================================
  {
    id: 'chronic-blood-pressure',
    title: 'Blood Pressure Ranges, Home Cuff Technique & Hypertension Care',
    category: 'Chronic Care',
    source: 'WHO Guideline for Pharmacological & Lifestyle Management of Hypertension',
    readingMinutes: 4,
    summary:
      'How to measure blood pressure accurately with a validated cuff, understand normal vs. elevated readings, and recognise hypertensive emergency signs.',
    keywords: [
      'blood pressure',
      'bp',
      'hypertension',
      'systolic',
      'diastolic',
      'mmhg',
      'cuff',
      'salt',
      'heart',
      'cardiology',
      'high bp',
    ],
    keyPoints: [
      'Before measuring BP, sit quietly for 5 minutes with feet flat on the floor, back supported, bladder empty, and the upper-arm cuff resting at heart level. Avoid caffeine or exercise for 30 minutes beforehand.',
      'General adult reference categories: Normal is below 120/80 mmHg; Elevated is 120–129 / <80 mmHg; Hypertension starts at 130/80 to 140/90 mmHg depending on clinical guidelines—your doctor sets your personal target.',
      'Take 2 readings 1–2 minutes apart and log both in HealthConnect Vitals Monitoring to track trends rather than reacting to a single isolated reading.',
      'Reducing dietary salt/seasoning cubes, staying physically active, limiting alcohol, managing stress, and taking prescribed medicines consistently protect the heart, brain, and kidneys.',
    ],
    whenToSeekCare: [
      'Blood pressure ≥ 180/120 mmHg, ESPECIALLY if accompanied by chest pain, shortness of breath, severe headache, vision changes, numbness, or weakness (seek emergency care immediately).',
      'Repeated home readings ≥ 140/90 mmHg over several days—book an online consultation to review your care plan.',
    ],
    oyoCarePathway:
      'Log cuff readings in Vitals Monitoring (/monitoring), then review your trend chart with an online Oyo State doctor before adjusting any medication.',
  },
  {
    id: 'chronic-diabetes-glucose',
    title: 'Blood Glucose Monitoring, HbA1c & Diabetes Self-Care',
    category: 'Chronic Care',
    source: 'WHO & International Diabetes Federation Patient Education',
    readingMinutes: 4,
    summary:
      'Understanding fasting vs. post-meal glucose readings, what HbA1c represents, recognising low blood sugar (hypoglycaemia), and protecting feet and eyes.',
    keywords: [
      'diabetes',
      'glucose',
      'blood sugar',
      'hba1c',
      'a1c',
      'fasting',
      'hypoglycaemia',
      'hypoglycemia',
      'insulin',
      'glucometer',
      'mg/dl',
      'mmol',
    ],
    keyPoints: [
      'Fasting blood glucose is measured after at least 8 hours without caloric food/drink; typical non-diabetic fasting values are roughly 70–99 mg/dL (3.9–5.5 mmol/L), while personal diabetes targets are set individually by your doctor.',
      'HbA1c reflects average blood sugar over the previous 2–3 months (general reference: below 5.7% normal, 5.7%–6.4% pre-diabetes range, ≥6.5% diabetes diagnostic range when confirmed clinically).',
      'Know low blood sugar (hypoglycaemia < 70 mg/dL) signs: shakiness, cold sweats, sudden hunger, fast heartbeat, or confusion. Prompt fast-acting sugar (such as glucose tablets or sweet juice if fully awake and able to swallow) followed by re-checking in 15 minutes is standard first response.',
      'Check feet daily for cuts or blisters, wear protective footwear, and schedule annual eye, kidney, and lipid checks.',
    ],
    whenToSeekCare: [
      'Blood glucose > 300 mg/dL with nausea, vomiting, rapid deep breathing, fruity breath, or abdominal pain (possible DKA emergency).',
      'Severe low blood sugar with confusion, inability to swallow, or fainting—seek emergency care immediately.',
    ],
    oyoCarePathway:
      'Track fasting and post-meal glucometer entries in HealthConnect Vitals Monitoring and share trends during your online internal medicine visit.',
  },
  {
    id: 'chronic-sickle-cell-genotype',
    title: 'Sickle Cell Care, Genotype Education & Crisis Prevention',
    category: 'Chronic Care',
    source: 'WHO Africa & Federal Ministry of Health Nigeria Sickle Cell Guidelines',
    readingMinutes: 4,
    summary:
      'Plain-language explanation of AA, AS, AC, SS, and SC genotypes, everyday habits that reduce painful vaso-occlusive crises, and urgent hospital triggers.',
    keywords: [
      'sickle cell',
      'genotype',
      'hbss',
      'hbsc',
      'as',
      'aa',
      'ss',
      'crisis',
      'bone pain',
      'anaemia',
      'anemia',
      'folic acid',
      'hydration',
    ],
    keyPoints: [
      'Knowing your verified haemoglobin genotype (AA, AS, AC, SS, SC) from an accredited laboratory supports informed family planning and proactive medical care.',
      'People living with HbSS or HbSC benefit from daily hydration, avoiding sudden extreme cold or overheating, prompt malaria prevention, routine vaccinations (including pneumococcal/meningococcal per clinician advice), and regular haematology follow-up.',
      'Keep genotype, blood group, steady-state PCV/haemoglobin, and current medications updated on every family profile in HealthConnect.',
    ],
    whenToSeekCare: [
      'Fever ≥ 38.0°C in anyone with sickle cell disease—treat as urgent due to infection risk.',
      'Chest pain, cough, or shortness of breath (possible acute chest syndrome), severe headache, sudden limb weakness, sudden severe paleness, or pain not controlled at home.',
    ],
    oyoCarePathway:
      'Store each family member’s genotype in Family Profiles and use your online doctor consultation or UCH Ibadan Haematology referral pathway for ongoing sickle cell care.',
  },

  // =========================================================================
  // 4. Infectious Diseases & Vaccines (Nigeria Focus)
  // =========================================================================
  {
    id: 'infectious-malaria-guide',
    title: 'Malaria Prevention, Rapid Testing (RDT) & Safe Treatment',
    category: 'Infectious & Vaccines',
    source: 'WHO Guidelines for Malaria & Nigeria NMEP',
    readingMinutes: 4,
    summary:
      'Why test-before-treat matters, mosquito bite prevention in Oyo State, completing prescribed ACT courses, and recognising severe malaria warning signs.',
    keywords: [
      'malaria',
      'mosquito',
      'rdt',
      'act',
      'artemether',
      'lumefantrine',
      'fever',
      'chills',
      'body ache',
      'net',
      'itn',
    ],
    keyPoints: [
      'WHO and Nigeria’s National Malaria Elimination Programme recommend confirming suspected malaria with a Malaria Rapid Diagnostic Test (RDT) or blood smear microscopy before starting antimalarial medicine.',
      'If confirmed uncomplicated malaria, complete the full prescribed Artemisinin-based Combination Therapy (ACT) course—stopping early allows parasites to return and encourages drug resistance.',
      'Prevention habits: sleep under an insecticide-treated mosquito net (ITN), clear standing water around compounds, and use window/door screens.',
    ],
    whenToSeekCare: [
      'Repeated vomiting (unable to keep oral medicines down), extreme weakness, yellow eyes/dark cola-coloured urine, confusion, convulsions, or breathing difficulty (signs of severe malaria—emergency hospital care needed).',
      'Suspected malaria in pregnant women or children under 5 requires prompt clinician evaluation.',
    ],
    oyoCarePathway:
      'Consult a HealthConnect Oyo doctor online first to guide testing and treatment, or seek immediate hospital care for any severe malaria warning sign.',
  },
  {
    id: 'infectious-typhoid-hygiene',
    title: 'Typhoid Fever, Safe Water & Food Hygiene',
    category: 'Infectious & Vaccines',
    source: 'WHO & NCDC Enteric Fever Public Health Guidance',
    readingMinutes: 3,
    summary:
      'How typhoid spreads through contaminated food and water, why Widal tests alone are often over-interpreted, and safe prevention habits.',
    keywords: [
      'typhoid',
      'enteric fever',
      'widal',
      'salmonella',
      'stomach pain',
      'water',
      'hygiene',
      'handwashing',
      'sanitation',
    ],
    keyPoints: [
      'Typhoid fever is caused by Salmonella Typhi bacteria spread via contaminated water or food—not by mosquitoes.',
      'Symptoms can include sustained step-wise fever, abdominal discomfort, headache, weakness, and constipation or diarrhoea; blood culture (not a single Widal test alone) is the medical gold standard for confirmation.',
      'Prevention: drink safe treated/boiled water, wash hands with soap after toilet use and before eating, wash raw produce thoroughly, and eat freshly cooked hot food.',
    ],
    whenToSeekCare: [
      'Persistent fever lasting several days, severe abdominal pain or tenderness, persistent vomiting, confusion, or black/bloody stools.',
    ],
    oyoCarePathway:
      'Speak with an online doctor before taking antibiotics so you get accurate lab guidance rather than unnecessary empirical drugs.',
  },
  {
    id: 'infectious-lassa-ncdc',
    title: 'Lassa Fever Prevention & Early Warning Signs (NCDC)',
    category: 'Infectious & Vaccines',
    source: 'Nigeria Centre for Disease Control (NCDC) Public Advisory',
    readingMinutes: 3,
    summary:
      'Food storage hygiene to prevent rodent contamination, recognising early symptoms that mimic malaria, and safe isolation steps.',
    keywords: [
      'lassa',
      'ncdc',
      'rodent',
      'rat',
      'bleeding',
      'viral fever',
      'food storage',
      'sore throat',
      'garri',
    ],
    keyPoints: [
      'Lassa fever is spread mainly through food or household surfaces contaminated by urine or faeces of infected multimammate rats, and can also spread person-to-person through body fluids.',
      'Store grains, garri, rice, and leftover food in tightly covered rodent-proof containers, keep homes clean, dispose of garbage away from living spaces, and avoid drying food openly along roadsides.',
      'Early symptoms resemble malaria or typhoid (fever, weakness, headache, sore throat, muscle ache); early medical evaluation saves lives.',
    ],
    whenToSeekCare: [
      'Persistent fever that does not improve after confirmed malaria evaluation, especially with sore throat, chest/abdominal pain, vomiting, facial swelling, or unexplained bleeding from gums, nose, or urine—go to a designated hospital immediately and inform triage staff.',
    ],
    oyoCarePathway:
      'If experiencing persistent high fever with bleeding or severe weakness, contact Nigeria 112 / NCDC guidance and seek immediate hospital isolation triage.',
  },
  {
    id: 'vaccines-nigeria-schedule',
    title: 'Nigeria Routine Immunization Overview (0–5, 10–15 & 15+ Years)',
    category: 'Infectious & Vaccines',
    source: 'WHO & NPHCDA Nigeria Routine Immunization Schedule',
    readingMinutes: 4,
    summary:
      'Key vaccine milestones from newborn BCG/OPV/HepB through childhood Pentavalent/Measles/Yellow Fever, adolescent HPV, and adult boosters.',
    keywords: [
      'vaccine',
      'immunization',
      'immunisation',
      'bcg',
      'polio',
      'pentavalent',
      'measles',
      'yellow fever',
      'hpv',
      'tetanus',
      'hepatitis b',
      'baby',
      'child',
    ],
    keyPoints: [
      'Infants (0–5 years): Key milestones include At Birth (BCG, OPV0, HepB0), 6/10/14 Weeks (Pentavalent, PCV, Rotavirus, OPV/IPV), 9 Months (Measles 1, Yellow Fever, Meningitis A), and 15 Months (Measles 2).',
      'Adolescents (10–15 years): HPV vaccination (for eligible girls per NPHCDA rollout) and Tetanus-Diphtheria (Td) boosters help prevent cervical cancer and tetanus.',
      'Adults (15+ years): Verify Hepatitis B immunity, Tetanus boosters (especially during pregnancy or wound care), Yellow Fever documentation, and clinician-advised seasonal/risk vaccines.',
    ],
    whenToSeekCare: [
      'If a child misses a scheduled dose, visit a clinic for a catch-up schedule—you generally do not need to restart from scratch.',
      'Seek urgent care for rare severe allergic reactions (hives, facial swelling, breathing trouble) following vaccination.',
    ],
    oyoCarePathway:
      'Track each child’s and adult’s doses inside Dashboard → Vaccines & Special Care across up to 5 Netflix-style family profiles.',
  },

  // =========================================================================
  // 5. Emergency First Aid & Red-Flag Warning Signs
  // =========================================================================
  {
    id: 'emergency-stroke-befast',
    title: 'Stroke Red Flags (BE-FAST) & Immediate Action',
    category: 'Emergency & First Aid',
    source: 'WHO & World Stroke Organization Public Guidance',
    readingMinutes: 2,
    summary:
      'How to spot stroke signs within seconds using BE-FAST and why immediate hospital transport—never waiting or giving oral pills—is critical.',
    keywords: [
      'stroke',
      'fast',
      'be-fast',
      'slurred speech',
      'face drooping',
      'arm weakness',
      'numbness',
      'one side',
      'sudden confusion',
      'emergency',
    ],
    keyPoints: [
      'B — Balance: Sudden loss of balance, coordination, or severe dizziness.',
      'E — Eyes: Sudden blurred, double, or lost vision in one or both eyes.',
      'F — Face: One side of the face droops or feels numb when trying to smile.',
      'A — Arms: Weakness or numbness in one arm (drifts downward when both arms are raised).',
      'S — Speech: Slurred speech, inability to speak, or trouble understanding simple words.',
      'T — Time: Note the exact time symptoms started and seek emergency hospital care IMMEDIATELY. Do not give food, water, or unprescribed blood pressure pills by mouth while awaiting emergency care.',
    ],
    whenToSeekCare: [
      'ANY single BE-FAST sign—even if it improves after a few minutes (possible TIA)—is a medical emergency.',
    ],
    oyoCarePathway:
      'Call Nigeria Emergency 112 immediately and proceed to the nearest emergency trauma/stroke-capable centre (such as UCH Ibadan A&E).',
  },
  {
    id: 'emergency-chest-breathing',
    title: 'Chest Pain, Severe Breathing Distress & Allergic Emergency',
    category: 'Emergency & First Aid',
    source: 'WHO Emergency Care & First Aid Basics',
    readingMinutes: 3,
    summary:
      'Immediate warning signs for heart attacks, severe asthma attacks, and anaphylaxis, plus safe positioning while arranging emergency help.',
    keywords: [
      'chest pain',
      'heart attack',
      'shortness of breath',
      'breathing',
      'asthma',
      'wheezing',
      'anaphylaxis',
      'allergy',
      'swelling',
      'tight chest',
    ],
    keyPoints: [
      'Heart attack warning signs include crushing/squeezing central chest pain or pressure lasting more than a few minutes, pain spreading to the jaw/neck/left arm/back, cold sweat, nausea, or shortness of breath.',
      'Help the person sit upright or semi-reclined in a calm position, loosen tight clothing around the neck/chest, and do not let them exert themselves or drive themselves to hospital.',
      'For someone with diagnosed asthma experiencing an attack, help them use their prescribed reliever inhaler upright while arranging urgent care if symptoms do not rapidly ease.',
    ],
    whenToSeekCare: [
      'Any sudden severe chest pain, gasping for air, bluish lips/fingertips, or tongue/throat swelling requires IMMEDIATE emergency transport—do not wait for an AI reply.',
    ],
    oyoCarePathway:
      'Call Nigeria 112 immediately or open the HealthConnect Oyo Emergency Centre (/emergency) for nearest Oyo State hospital routing.',
  },
  {
    id: 'emergency-bleeding-seizure-burns',
    title: 'First Aid: Severe Bleeding, Seizures, Choking & Burns',
    category: 'Emergency & First Aid',
    source: 'IFRC / WHO Basic First Aid Principles',
    readingMinutes: 4,
    summary:
      'Evidence-based first-aid do’s and don’ts for heavy bleeding, convulsion safety, minor vs. major burns, and choking while emergency help is on the way.',
    keywords: [
      'bleeding',
      'burn',
      'seizure',
      'convulsion',
      'choking',
      'fainting',
      'unconscious',
      'first aid',
      'wound',
      'accident',
    ],
    keyPoints: [
      'Severe Bleeding: Apply firm, continuous direct pressure over the wound with a clean cloth or sterile gauze. Do not remove soaked cloths—add fresh layers on top and get urgent medical care.',
      'Seizures / Convulsions: Clear hard objects away, cushion the head, and once movements stop, gently roll the person onto their side (recovery position). NEVER force spoons, fingers, or objects into the mouth and never restrain limbs.',
      'Burns: Cool the burn immediately under clean cool running water for 20 minutes; remove tight rings/watches gently. NEVER apply toothpaste, palm oil, raw egg, ice, or butter to a burn.',
      'Unconscious but Breathing: Place in the recovery position on their side, monitor breathing continuously, and call Nigeria 112.',
    ],
    whenToSeekCare: [
      'Uncontrolled bleeding, deep/large burns or burns on the face/hands/genitals, a first-time seizure or seizure lasting over 5 minutes, or unconsciousness.',
    ],
    oyoCarePathway:
      'Call Nigeria 112 immediately for life-threatening emergencies and coordinate nearest Oyo hospital routing via the Emergency Centre.',
  },

  // =========================================================================
  // 6. Medical Terms, Lab Values & HealthConnect Oyo App Guide
  // =========================================================================
  {
    id: 'labs-common-values-explainer',
    title: 'Understanding Common Lab Tests (HbA1c, Lipids, CBC & Genotype)',
    category: 'Terms, Labs & App Guide',
    source: 'WHO Clinical Laboratory Reference Education',
    readingMinutes: 4,
    summary:
      'Plain-language guide to common pathology panel terms so you can read lab printouts confidently and prepare clear questions for your doctor.',
    keywords: [
      'lab',
      'test',
      'result',
      'hba1c',
      'cholesterol',
      'lipid',
      'ldl',
      'hdl',
      'triglycerides',
      'cbc',
      'pcv',
      'haemoglobin',
      'hemoglobin',
      'wbc',
      'platelet',
      'urinalysis',
    ],
    keyPoints: [
      'HbA1c: Shows average blood sugar over 2–3 months (general reference: <5.7% normal; 5.7%–6.4% pre-diabetes; ≥6.5% diabetes range when confirmed by a physician).',
      'Lipid Profile: Total Cholesterol (often targeted <200 mg/dL), LDL ("bad" cholesterol that can build up in arteries), HDL ("protective" cholesterol), and Triglycerides.',
      'CBC / Full Blood Count: Measures Haemoglobin/PCV (oxygen-carrying red blood cells; low levels suggest anaemia), White Blood Cells (WBC, immune response), and Platelets (clotting).',
      'Always interpret lab numbers together with the exact reference range printed by your accredited MLSCN laboratory and your doctor’s clinical context.',
    ],
    whenToSeekCare: [
      'Never start or stop medication solely from a lab printout—share the full report with an online HealthConnect Oyo doctor to confirm next steps.',
    ],
    oyoCarePathway:
      'Upload or log lab results in Dashboard → Medical Records or Lab Results, then use Medical Document Explainer mode to prepare doctor questions.',
  },
  {
    id: 'glossary-medical-terms',
    title: 'Plain-Language Medical Terminology Glossary',
    category: 'Terms, Labs & App Guide',
    source: 'HealthConnect Oyo Patient Literacy Handbook',
    readingMinutes: 3,
    summary:
      'Everyday definitions for frequently encountered clinical terms including Hypertension, Anaemia, Telehealth, Triage, Benign, Chronic, and Acute.',
    keywords: [
      'glossary',
      'meaning',
      'definition',
      'term',
      'terminology',
      'what is',
      'define',
      'acute',
      'chronic',
      'benign',
      'triage',
      'telehealth',
      'anaemia',
      'edema',
      'oedema',
    ],
    keyPoints: [
      'Acute vs. Chronic: "Acute" describes a condition that starts suddenly and usually lasts a short time (e.g., acute malaria), while "Chronic" means a long-term condition managed over months or years (e.g., hypertension or diabetes).',
      'Triage: The clinical process of assessing urgency first so life-threatening problems receive immediate care before routine visits.',
      'Anaemia: Lower-than-normal red blood cells or haemoglobin, which can cause tiredness, dizziness, or pale palms/conjunctiva.',
      'Oedema (Edema): Swelling caused by excess fluid trapped in body tissues, commonly around the ankles, feet, or hands.',
      'Telehealth / Online-First Care: Consulting a verified doctor by video, voice, or chat first so routine care happens quickly from home and physical exams are scheduled purposely when needed.',
    ],
    whenToSeekCare: [
      'If a clinician uses an unfamiliar diagnosis or prescription instruction, ask them to write it down and explain what symptoms should prompt an early return.',
    ],
    oyoCarePathway:
      'Ask the Local AI assistant to define any medical word offline, or switch to Hybrid/Cloud AI when online for deeper plain-language breakdowns.',
  },
  {
    id: 'app-navigation-oyo-guide',
    title: 'How to Use HealthConnect Oyo State (Online & Offline Guide)',
    category: 'Terms, Labs & App Guide',
    source: 'HealthConnect Oyo State Platform Guide',
    readingMinutes: 3,
    summary:
      'Clear guide to HealthConnect Oyo State’s monthly plans, Netflix-style 5-seat Family Profiles, Online Doctors First workflow, and which features work offline vs. online.',
    keywords: [
      'how to use',
      'navigate',
      'navigation',
      'subscription',
      'plan',
      '16000',
      '50000',
      'family',
      'netflix',
      'interswitch',
      'physical exam',
      'doctor',
      'offline',
      'install',
      'oyo',
      'ibadan',
      'ogbomoso',
    ],
    keyPoints: [
      'Monthly Plans: Individual Plan is ₦16,000/month (1 profile) and Family Plan is ₦50,000/month (up to 5 Netflix-style household profiles), paid cleanly via Interswitch Option 2 Web Redirect in Plans & History (/payments → /checkout).',
      'Online Doctors First: Talk to verified Oyo State doctors online at ₦0 per visit under your plan, then decide together with your doctor when to click "Schedule Physical Exam" at UCH Ibadan, Adeoyo Maternity, Ring Road State Hospital, Jericho Specialist, or Bowen Ogbomoso.',
      'Fully Offline Features: Previously loaded app shell, Offline Health Reference Library (all 6 books), Local AI education/terminology/app guidance, Emergency First Aid guides, and instant local Red-Flag Safety Checks.',
      'Internet-Dependent Features: Cloud AI escalation, live doctor booking sync, Firestore cloud medical records sync, and Interswitch subscription checkout.',
    ],
    whenToSeekCare: [
      'In any life-threatening emergency in Nigeria, call 112 immediately and do not delay care waiting for an app or internet connection.',
    ],
    oyoCarePathway:
      'Use the bottom navigation bar on mobile (or top navigation on desktop) to move directly between Dashboard, Oyo Care Directory, Hybrid AI, Offline Library, and Emergency.',
  },
];
