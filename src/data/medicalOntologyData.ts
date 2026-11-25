/**
 * Curated, verified offline medical reference dataset grounded in:
 * - Human Disease Ontology (DiseaseOntology/HumanDiseaseOntology — DOID)
 * - World Health Organization (WHO ICD-11 & Primary Care Guidelines)
 * - U.S. National Library of Medicine MedlinePlus Patient Education
 *
 * Strictly educational, non-diagnostic reference entries used by both
 * Local AI (offline on-device) and Hybrid Cloud AI grounding.
 */

export type BodySystemCategory =
  | 'Infectious & Parasitic'
  | 'Cardiovascular'
  | 'Respiratory'
  | 'Endocrine & Metabolic'
  | 'Gastrointestinal'
  | 'Neurological'
  | 'Hematological'
  | 'Reproductive & Endocrine'
  | 'Pediatric & Adolescent'
  | 'Musculoskeletal & Trauma'
  | 'Dermatological & Allergy'
  | 'Mental & Sleep Health';

export interface VerifiedDiseaseOntologyEntry {
  doid: string;
  icd11: string;
  name: string;
  synonyms: string[];
  bodySystem: BodySystemCategory;
  ageRelevance: Array<'child' | 'teen' | 'young_adult' | 'adult' | 'older_adult'>;
  definition: string;
  commonSymptoms: string[];
  intakeQuestions: string[];
  quickReplyHints: string[];
  safeHomeMeasures: string[];
  whenToSeekDoctor: string[];
  redFlagSymptoms: string[];
  sources: string[];
}

export const VERIFIED_MEDICAL_ONTOLOGY: VerifiedDiseaseOntologyEntry[] = [
  {
    doid: 'DOID:12365',
    icd11: '1F40',
    name: 'Malaria',
    synonyms: ['plasmodium infection', 'malaria fever', 'paludism'],
    bodySystem: 'Infectious & Parasitic',
    ageRelevance: ['child', 'teen', 'young_adult', 'adult', 'older_adult'],
    definition:
      'A parasitic infectious disease caused by Plasmodium species transmitted by infected Anopheles mosquitoes, causing cyclical fever, chills, headache, and body aches.',
    commonSymptoms: ['fever', 'chills', 'headache', 'sweating', 'body aches', 'nausea', 'fatigue', 'bitter mouth'],
    intakeQuestions: [
      'How many days have you had the fever or chills?',
      'Have you done a Malaria Rapid Diagnostic Test (RDT) or blood smear yet?',
      'Are you able to drink fluids without repeated vomiting?',
    ],
    quickReplyHints: ['Fever for 2 days', 'Chills and headache', 'No test done yet', 'Able to keep fluids down'],
    safeHomeMeasures: [
      'Confirm malaria with an RDT or microscopy before starting antimalarial medicines.',
      'Drink clean water or Oral Rehydration Solution (ORS) frequently and rest.',
      'Use an insecticide-treated mosquito net to prevent further bites.',
    ],
    whenToSeekDoctor: [
      'Any fever lasting more than 24–48 hours, especially in children under 5 or during pregnancy.',
      'Positive RDT requiring clinician-guided Artemisinin-based Combination Therapy (ACT).',
    ],
    redFlagSymptoms: [
      'Confusion, drowsiness, or inability to wake up (cerebral malaria warning)',
      'Seizures or convulsions',
      'Difficulty breathing or dark cola-colored urine',
      'Repeated vomiting preventing oral fluids',
    ],
    sources: ['Human Disease Ontology (DOID:12365)', 'WHO Guidelines for Malaria', 'MedlinePlus'],
  },
  {
    doid: 'DOID:13258',
    icd11: '1A07',
    name: 'Typhoid Fever',
    synonyms: ['enteric fever', 'salmonella typhi', 'typhoid'],
    bodySystem: 'Infectious & Parasitic',
    ageRelevance: ['child', 'teen', 'young_adult', 'adult', 'older_adult'],
    definition:
      'A systemic bacterial infection caused by Salmonella enterica serotype Typhi spread through contaminated food or water, causing sustained rising fever and abdominal symptoms.',
    commonSymptoms: ['persistent fever', 'abdominal pain', 'constipation', 'diarrhea', 'headache', 'loss of appetite', 'weakness'],
    intakeQuestions: [
      'Has your fever been gradually rising over several days?',
      'Do you have stomach cramps, constipation, or watery stool?',
      'Have you had a blood or stool test ordered by a clinic (note: single Widal tests are often inaccurate)?',
    ],
    quickReplyHints: ['Fever 4+ days', 'Stomach pain & weakness', 'Loss of appetite', 'No lab test yet'],
    safeHomeMeasures: [
      'Maintain strict oral hydration with clean boiled/safe water and ORS.',
      'Avoid self-medicating with unprescribed antibiotics, which increases drug resistance.',
      'Wash hands thoroughly with soap and safe water before eating and after toilet use.',
    ],
    whenToSeekDoctor: [
      'Sustained fever lasting 3 or more days with stomach discomfort or weakness.',
      'Need for proper clinician evaluation and blood/stool culture rather than relying only on Widal.',
    ],
    redFlagSymptoms: [
      'Severe, sudden abdominal pain or rigid swollen abdomen',
      'Blood in stool or black tarry stools',
      'Confusion, extreme drowsiness, or collapse',
    ],
    sources: ['Human Disease Ontology (DOID:13258)', 'WHO Typhoid Fact Sheet', 'MedlinePlus'],
  },
  {
    doid: 'DOID:10763',
    icd11: 'BA00',
    name: 'Essential Hypertension (High Blood Pressure)',
    synonyms: ['hypertension', 'high bp', 'elevated blood pressure'],
    bodySystem: 'Cardiovascular',
    ageRelevance: ['young_adult', 'adult', 'older_adult'],
    definition:
      'A chronic cardiovascular condition characterized by persistently elevated arterial blood pressure (typically ≥140/90 mmHg on repeat resting measurements), often without noticeable symptoms.',
    commonSymptoms: ['high blood pressure reading', 'headache', 'dizziness', 'blurred vision', 'fatigue', 'no symptoms'],
    intakeQuestions: [
      'What was your exact systolic/diastolic reading, and did you rest quietly for 5 minutes beforehand?',
      'Do you take prescribed blood pressure medication daily, and have you missed any doses?',
      'Are you experiencing any chest tightness, severe headache, or vision changes right now?',
    ],
    quickReplyHints: ['BP around 145/92', 'Rested 5 mins before reading', 'Mild headache only', 'Take daily BP meds'],
    safeHomeMeasures: [
      'Measure blood pressure morning and evening while seated calmly with arm supported at heart level.',
      'Reduce dietary sodium (salt & seasoning cubes), eat potassium-rich fruits/vegetables, and walk regularly if cleared.',
      'Never stop prescribed antihypertensive medicines abruptly without clinician review.',
    ],
    whenToSeekDoctor: [
      'Repeated resting readings ≥140/90 mmHg over several days.',
      'Medication side effects or need for dosage review.',
    ],
    redFlagSymptoms: [
      'BP ≥180/120 mmHg accompanied by chest pain, shortness of breath, or neurological deficits',
      'Sudden face droop, arm weakness, or slurred speech',
      'Sudden severe headache or vision loss',
    ],
    sources: ['Human Disease Ontology (DOID:10763)', 'WHO Hypertension Guidelines', 'MedlinePlus'],
  },
  {
    doid: 'DOID:9352',
    icd11: '5A11',
    name: 'Type 2 Diabetes Mellitus',
    synonyms: ['diabetes', 'high blood sugar', 'hyperglycemia', 'sugar disease'],
    bodySystem: 'Endocrine & Metabolic',
    ageRelevance: ['young_adult', 'adult', 'older_adult'],
    definition:
      'A chronic metabolic disorder marked by insulin resistance and elevated blood glucose levels, increasing long-term risk to blood vessels, kidneys, eyes, and nerves if unmanaged.',
    commonSymptoms: ['frequent urination', 'excessive thirst', 'fatigue', 'blurred vision', 'slow healing wounds', 'tingling feet', 'high glucose'],
    intakeQuestions: [
      'What was your latest blood sugar reading (mg/dL or mmol/L), and was it fasting or after eating?',
      'Have you noticed unusual thirst, frequent urination, or unexplained fatigue?',
      'Are you currently using insulin or oral diabetes tablets?',
    ],
    quickReplyHints: ['Fasting glucose check', 'Thirsty & frequent urination', 'Not on diabetes meds', 'Checking HbA1c meaning'],
    safeHomeMeasures: [
      'Log fasting and 2-hour post-meal glucose readings consistently to share with your clinician.',
      'Prioritize fiber-rich meals, water over sugary drinks, and daily moderate physical activity.',
      'Inspect feet daily for cuts, redness, or numbness.',
    ],
    whenToSeekDoctor: [
      'Fasting glucose repeatedly ≥126 mg/dL (7.0 mmol/L) or HbA1c ≥6.5%.',
      'Recurring low blood sugar (<70 mg/dL) episodes requiring medication adjustment.',
    ],
    redFlagSymptoms: [
      'Blood glucose >300 mg/dL with vomiting, abdominal pain, fruity breath, or rapid deep breathing (DKA warning)',
      'Severe low blood sugar (<54 mg/dL) with confusion, shakiness, or fainting',
    ],
    sources: ['Human Disease Ontology (DOID:9352)', 'WHO Diabetes Fact Sheet', 'MedlinePlus'],
  },
  {
    doid: 'DOID:2841',
    icd11: 'CA23',
    name: 'Asthma',
    synonyms: ['bronchial asthma', 'wheezing', 'reactive airway'],
    bodySystem: 'Respiratory',
    ageRelevance: ['child', 'teen', 'young_adult', 'adult', 'older_adult'],
    definition:
      'A chronic inflammatory airway disease characterized by reversible airway narrowing, causing episodes of wheezing, coughing (often worse at night), chest tightness, and breathlessness.',
    commonSymptoms: ['wheezing', 'dry cough', 'chest tightness', 'nighttime cough', 'dust trigger'],
    intakeQuestions: [
      'Are you able to speak in full sentences comfortably right now?',
      'Do you have a prescribed reliever inhaler (such as salbutamol), and has it helped?',
      'Did dust, smoke, cold air, or a respiratory infection trigger these symptoms?',
    ],
    quickReplyHints: ['Mild wheezing at night', 'Can speak full sentences', 'Have reliever inhaler', 'Triggered by dust/cold'],
    safeHomeMeasures: [
      'Follow your clinician-prescribed asthma action plan and keep your reliever inhaler accessible.',
      'Avoid smoke, strong chemical fumes, heavy dust, and known personal triggers.',
      'Sit upright and stay calm while monitoring breathing.',
    ],
    whenToSeekDoctor: [
      'Needing your reliever inhaler more than twice a week or waking up at night coughing.',
      'Reviewing controller inhaler therapy to prevent flare-ups.',
    ],
    redFlagSymptoms: [
      'Severe shortness of breath or inability to speak full sentences',
      'Bluish lips or fingernails',
      'Reliever inhaler gives little or no relief',
    ],
    sources: ['Human Disease Ontology (DOID:2841)', 'WHO Asthma Key Facts', 'MedlinePlus'],
  },
  {
    doid: 'DOID:10459',
    icd11: 'CA00',
    name: 'Acute Upper Respiratory Tract Infection (Common Cold / Viral Flu)',
    synonyms: ['common cold', 'catarrh', 'flu', 'sore throat', 'runny nose', 'upper respiratory infection'],
    bodySystem: 'Respiratory',
    ageRelevance: ['child', 'teen', 'young_adult', 'adult', 'older_adult'],
    definition:
      'A self-limiting viral infection of the nose, sinuses, and throat causing nasal congestion, sneezing, sore throat, mild cough, and sometimes low-grade fever.',
    commonSymptoms: ['runny nose', 'sneezing', 'sore throat', 'mild cough', 'mild fever', 'blocked nose', 'catarrh'],
    intakeQuestions: [
      'How long have your cold or sore throat symptoms lasted?',
      'Do you have a fever, ear pain, or a productive cough with colored phlegm?',
      'Is your breathing completely comfortable at rest?',
    ],
    quickReplyHints: ['Started 2 days ago', 'Runny nose & sore throat', 'Mild cough, breathing fine', 'Low fever'],
    safeHomeMeasures: [
      'Rest, drink warm fluids (water, broth, honey-lemon tea for ages >1 year only—never give honey to infants <12 months).',
      'Use saline nasal drops or steam inhalation for nasal congestion.',
      'Antibiotics do not treat viral colds; use clinician- or pharmacist-guided symptom relief only.',
    ],
    whenToSeekDoctor: [
      'Symptoms worsening after 7–10 days, high persistent fever, severe earache, or painful swallowing.',
      'Infants under 3 months with any fever must be evaluated promptly by a doctor.',
    ],
    redFlagSymptoms: [
      'Shortness of breath, fast/labored breathing, or chest pain',
      'Persistent high fever with stiff neck or confusion',
      'Inability to swallow fluids or drooling',
    ],
    sources: ['Human Disease Ontology (DOID:10459)', 'MedlinePlus Common Cold', 'WHO Primary Care'],
  },
  {
    doid: 'DOID:2326',
    icd11: '1A40',
    name: 'Acute Gastroenteritis (Diarrhoea & Vomiting)',
    synonyms: ['stomach flu', 'diarrhea', 'diarrhoea', 'food poisoning', 'vomiting', 'running stomach'],
    bodySystem: 'Gastrointestinal',
    ageRelevance: ['child', 'teen', 'young_adult', 'adult', 'older_adult'],
    definition:
      'Inflammation of the stomach and intestines caused by viral, bacterial, or parasitic infections, resulting in watery diarrhoea, nausea, vomiting, and abdominal cramps with risk of dehydration.',
    commonSymptoms: ['diarrhea', 'diarrhoea', 'vomiting', 'stomach cramps', 'nausea', 'dehydration', 'watery stool'],
    intakeQuestions: [
      'How many episodes of watery stool or vomiting have occurred in the last 24 hours?',
      'Are you able to take small sips of Oral Rehydration Solution (ORS) or water?',
      'Have you noticed any blood in the stool, high fever, or signs of dehydration (very dry mouth, little urine)?',
    ],
    quickReplyHints: ['Watery stool 3-4 times today', 'Mild cramps, no blood', 'Can sip ORS/water', 'Started after a meal'],
    safeHomeMeasures: [
      'Sip WHO low-osmolarity Oral Rehydration Solution (ORS) frequently after each loose stool.',
      'For children, zinc supplementation (as guided by clinician/pharmacist) alongside ORS reduces duration.',
      'Eat light bland foods (rice, bananas, oats, broth) once vomiting settles; avoid unpasteurized or greasy foods.',
    ],
    whenToSeekDoctor: [
      'Diarrhoea lasting >48 hours in adults or >24 hours in young children.',
      'High fever, persistent abdominal pain, or inability to keep oral fluids down.',
    ],
    redFlagSymptoms: [
      'Signs of severe dehydration: sunken eyes, no urine for 8+ hours, extreme weakness, or confusion',
      'Bloody diarrhoea or black stools',
      'Infant or elderly person becoming lethargic or unresponsive',
    ],
    sources: ['Human Disease Ontology (DOID:2326)', 'WHO Diarrhoeal Disease Guidelines', 'MedlinePlus'],
  },
  {
    doid: 'DOID:10923',
    icd11: '3A51',
    name: 'Sickle Cell Disease',
    synonyms: ['sickle cell', 'hbss', 'hbsc', 'vaso-occlusive crisis', 'sickle cell anemia'],
    bodySystem: 'Hematological',
    ageRelevance: ['child', 'teen', 'young_adult', 'adult', 'older_adult'],
    definition:
      'An inherited red blood cell hemoglobin disorder (commonly HbSS or HbSC) where red blood cells can become sickle-shaped, causing episodic pain crises, anemia, and higher infection risk.',
    commonSymptoms: ['bone pain', 'joint pain', 'fatigue', 'pale palms', 'yellow eyes', 'jaundice', 'crisis'],
    intakeQuestions: [
      'Where is the pain located and how severe is it on a scale of 1 to 10?',
      'Do you have a fever (≥38.0°C / 100.4°F), cough, or chest discomfort right now?',
      'Have you been able to stay well hydrated and keep warm?',
    ],
    quickReplyHints: ['Mild limb/joint ache', 'No fever right now', 'Drinking plenty of water', 'Taking routine folic acid'],
    safeHomeMeasures: [
      'Maintain generous daily hydration, avoid extreme cold/overexertion, and continue routine prescribed folic acid or hydroxyurea.',
      'Use clinician-approved pain guidance for mild early aches and rest warmly.',
      'Keep up with recommended pneumococcal, meningococcal, and annual vaccinations.',
    ],
    whenToSeekDoctor: [
      'Any fever ≥38°C in someone with Sickle Cell Disease requires urgent medical review.',
      'Pain not improving with home comfort measures or worsening fatigue/paleness.',
    ],
    redFlagSymptoms: [
      'Chest pain, fever, or shortness of breath (Acute Chest Syndrome warning)',
      'Sudden severe headache, weakness on one side, or slurred speech (stroke warning)',
      'Sudden abdominal swelling (splenic sequestration) or painful erection lasting >2 hours',
    ],
    sources: ['Human Disease Ontology (DOID:10923)', 'WHO Sickle Cell Disease', 'MedlinePlus'],
  },
  {
    doid: 'DOID:11612',
    icd11: '5A80.1',
    name: 'Polycystic Ovary Syndrome (PCOS)',
    synonyms: ['pcos', 'irregular periods', 'ovarian cysts', 'hormonal imbalance'],
    bodySystem: 'Reproductive & Endocrine',
    ageRelevance: ['young_adult', 'adult'],
    definition:
      'A common hormonal and metabolic condition in women of reproductive age involving irregular menstrual cycles, elevated androgen levels, and insulin resistance.',
    commonSymptoms: ['irregular periods', 'missed period', 'acne', 'excess facial hair', 'weight changes', 'pelvic discomfort'],
    intakeQuestions: [
      'How many days apart have your recent menstrual cycles been?',
      'Are you also noticing skin changes, hair changes, fatigue, or pelvic cramps?',
      'Have you discussed hormone or ultrasound evaluations with a gynecologist?',
    ],
    quickReplyHints: ['Cycles over 35 days apart', 'Tracking cycle patterns', 'Managing nutrition & exercise', 'Questions for gynecologist'],
    safeHomeMeasures: [
      'Track cycle dates, flow intensity, and symptoms consistently in HealthConnect to share with your doctor.',
      'Balanced low-glycemic nutrition, strength/cardio activity, and consistent sleep support insulin sensitivity.',
    ],
    whenToSeekDoctor: [
      'Absent periods for 3+ months, very heavy bleeding soaking pads hourly, or fertility/metabolic questions.',
    ],
    redFlagSymptoms: [
      'Severe sudden lower abdominal pain with fever or fainting',
      'Uncontrolled heavy vaginal bleeding with dizziness',
    ],
    sources: ['Human Disease Ontology (DOID:11612)', 'WHO PCOS Fact Sheet', 'MedlinePlus'],
  },
  {
    doid: 'DOID:6364',
    icd11: '8A80',
    name: 'Migraine & Tension Headache',
    synonyms: ['migraine', 'headache', 'throbbing headache', 'tension headache'],
    bodySystem: 'Neurological',
    ageRelevance: ['teen', 'young_adult', 'adult', 'older_adult'],
    definition:
      'Primary headache disorders ranging from bilateral tight band-like tension headaches to throbbing unilateral migraines often accompanied by light/sound sensitivity or nausea.',
    commonSymptoms: ['headache', 'throbbing head pain', 'light sensitivity', 'nausea', 'neck tension'],
    intakeQuestions: [
      'Did the headache build gradually, or did it hit suddenly like a thunderclap?',
      'How severe is it (1–10), and is it accompanied by nausea, light sensitivity, or fever?',
      'Have you been dehydrated, stressed, or missing sleep recently?',
    ],
    quickReplyHints: ['Gradual throbbing headache', 'Moderate (5/10)', 'Sensitive to bright light', 'No fever or neck stiffness'],
    safeHomeMeasures: [
      'Rest in a quiet, dim room, apply a cool compress, and hydrate well.',
      'Track headache triggers (sleep, skipped meals, stress, screen glare) in your wellness log.',
    ],
    whenToSeekDoctor: [
      'Frequent headaches occurring more than twice weekly or needing regular pain relievers.',
      'New headache pattern starting after age 50.',
    ],
    redFlagSymptoms: [
      'Sudden explosive "worst headache of life" (thunderclap)',
      'Headache with fever, stiff neck, confusion, vision loss, or weakness on one side',
      'Headache following a head injury',
    ],
    sources: ['Human Disease Ontology (DOID:6364)', 'WHO Headache Disorders', 'MedlinePlus'],
  },
  {
    doid: 'DOID:13148',
    icd11: 'GC08',
    name: 'Urinary Tract Infection (UTI)',
    synonyms: ['uti', 'bladder infection', 'burning urination', 'cystitis'],
    bodySystem: 'Gastrointestinal',
    ageRelevance: ['child', 'teen', 'young_adult', 'adult', 'older_adult'],
    definition:
      'A bacterial infection affecting the urinary tract (most commonly the bladder), causing burning during urination, urinary urgency, and lower pelvic discomfort.',
    commonSymptoms: ['burning urination', 'frequent urination', 'cloudy urine', 'pelvic discomfort', 'urgent urination'],
    intakeQuestions: [
      'How long have you noticed burning or frequent urination?',
      'Do you have any fever, chills, nausea, or back/flank pain?',
      'Could you be pregnant? (UTIs during pregnancy require prompt medical care.)',
    ],
    quickReplyHints: ['Burning for 2 days', 'No fever or back pain', 'Frequent urge to urinate', 'Not pregnant'],
    safeHomeMeasures: [
      'Drink plenty of clean water to help flush bacteria and avoid holding urine.',
      'Schedule a urinalysis with a doctor so targeted antibiotics can be prescribed if confirmed.',
    ],
    whenToSeekDoctor: [
      'Any suspected UTI needs clinician assessment and urine testing rather than guesswork antibiotics.',
      'Especially urgent in pregnant women, children, men, and older adults.',
    ],
    redFlagSymptoms: [
      'High fever, shaking chills, vomiting, or pain in the lower back/side (possible kidney infection)',
      'Inability to pass urine or severe confusion in an older adult',
    ],
    sources: ['Human Disease Ontology (DOID:13148)', 'MedlinePlus UTI', 'WHO Essential Care'],
  },
  {
    doid: 'DOID:0050117',
    icd11: 'NB50',
    name: 'Acute Trauma, Wounds, Burns & Accident First Aid',
    synonyms: ['accident', 'injury', 'cut', 'wound', 'burn', 'sprain', 'fracture', 'bleeding', 'bite', 'fall', 'rash'],
    bodySystem: 'Musculoskeletal & Trauma',
    ageRelevance: ['child', 'teen', 'young_adult', 'adult', 'older_adult'],
    definition:
      'Immediate non-diagnostic first-aid triage for everyday injuries—minor cuts, thermal burns, sprains, insect stings, and blunt falls—while screening strictly for life-threatening trauma.',
    commonSymptoms: ['cut', 'scrape', 'burn', 'blister', 'swelling', 'bruise', 'sprain', 'pain after fall', 'accident'],
    intakeQuestions: [
      'Is the person awake, alert, and breathing normally right now?',
      'Is there active heavy bleeding, deep wound edges, visible bone/deformity, or a large/facial burn?',
      'When and how did the injury or accident happen?',
    ],
    quickReplyHints: ['Person is awake & breathing', 'Minor cut or scrape', 'Small thermal burn', 'Twisted ankle / swelling'],
    safeHomeMeasures: [
      'Minor cuts: wash hands, gently rinse wound with clean running water, apply firm pressure with clean gauze until bleeding stops, and cover cleanly.',
      'Minor thermal burns: cool under cool (NOT ice-cold) running water for 20 minutes; never apply toothpaste, butter, oil, or raw egg; cover loosely with clean non-stick wrap.',
      'Mild sprains: Rest, apply a cloth-wrapped cool pack for 15–20 mins, gentle compression if comfortable, and elevate.',
    ],
    whenToSeekDoctor: [
      'Deep/gaping cuts needing stitches, dirty/rusty wounds (tetanus booster check), animal/human bites, or burns larger than the person’s palm.',
      'Inability to bear weight or move a joint after a fall.',
    ],
    redFlagSymptoms: [
      'Uncontrolled or spurting severe bleeding',
      'Unconsciousness, head/neck impact, confusion, or vomiting after a fall',
      'Burns to the face, airway, hands, groin, or electrical/chemical burns',
      'Suspected spinal/neck injury (do NOT move the person unless in immediate fire/traffic danger)',
    ],
    sources: ['Human Disease Ontology (DOID:0050117)', 'WHO Basic Emergency Care', 'Red Cross & MedlinePlus First Aid'],
  },
  {
    doid: 'DOID:1498',
    icd11: 'CA40',
    name: 'Childhood Fever & Pediatric Wellness',
    synonyms: ['child fever', 'baby fever', 'pediatric fever', 'teething', 'toddler sick'],
    bodySystem: 'Pediatric & Adolescent',
    ageRelevance: ['child'],
    definition:
      'Elevated body temperature (≥38.0°C / 100.4°F) in infants and children, most often part of the immune response to common viral or bacterial infections, requiring careful hydration and danger-sign monitoring.',
    commonSymptoms: ['child fever', 'warm forehead', 'irritable child', 'poor appetite', 'child cough'],
    intakeQuestions: [
      'How old is the child, and what was the measured thermometer temperature?',
      'Is the child alert, drinking fluids, and wetting diapers/urinating normally?',
      'Are there any rashes, ear pulling, breathing changes, or vomiting?',
    ],
    quickReplyHints: ['Child is 3-8 years old', 'Temp around 38.5°C', 'Drinking fluids & alert', 'Started today'],
    safeHomeMeasures: [
      'Dress the child lightly in breathable clothing and offer frequent fluids, breastmilk, or ORS.',
      'Never give aspirin to children or teenagers; confirm exact weight-based dosing of paracetamol/ibuprofen with a doctor or pharmacist.',
      'Avoid cold-water baths or alcohol rubs, which can cause shivering and distress.',
    ],
    whenToSeekDoctor: [
      'ANY baby under 3 months with temperature ≥38.0°C needs immediate same-day hospital evaluation.',
      'Fever lasting more than 48 hours or child refusing fluids.',
    ],
    redFlagSymptoms: [
      'Fast or labored breathing (ribs pulling in), grunting, or bluish lips',
      'Convulsion/seizure, extreme drowsiness, or difficulty waking',
      'Non-blanching purple/red rash or stiff neck',
    ],
    sources: ['WHO IMCI Pediatric Guidelines', 'MedlinePlus Fever in Children'],
  },
  {
    doid: 'DOID:1596',
    icd11: '6A70',
    name: 'Stress, Anxiety & Sleep Disruption',
    synonyms: ['stress', 'anxiety', 'insomnia', 'cant sleep', 'overwhelmed', 'burnout', 'panic'],
    bodySystem: 'Mental & Sleep Health',
    ageRelevance: ['teen', 'young_adult', 'adult', 'older_adult'],
    definition:
      'Emotional and physiological responses to prolonged stress, worry, or disrupted circadian sleep patterns that can affect concentration, mood, blood pressure, and immune resilience.',
    commonSymptoms: ['stress', 'worry', 'trouble sleeping', 'insomnia', 'racing thoughts', 'fatigue', 'irritability'],
    intakeQuestions: [
      'How long have you been experiencing stress, worry, or disrupted sleep?',
      'Is this affecting your daily routine, studies, work, or appetite?',
      'Are you feeling safe right now, or having any thoughts of harming yourself?',
    ],
    quickReplyHints: ['Trouble sleeping for 1-2 weeks', 'Work/school stress', 'Feeling safe, just tired', 'Looking for sleep habits'],
    safeHomeMeasures: [
      'Try paced breathing (inhale 4 seconds, exhale 6 seconds) for 3–5 minutes to settle the nervous system.',
      'Keep a consistent wake/sleep time, reduce screens and caffeine 6+ hours before bedtime, and take brief daylight walks.',
      'Talk openly with a trusted family member, counselor, or clinician.',
    ],
    whenToSeekDoctor: [
      'Persistent low mood, anxiety, or insomnia lasting more than 2 weeks or disrupting daily life.',
    ],
    redFlagSymptoms: [
      'Any thoughts of self-harm or suicide — contact emergency services or a crisis line immediately',
      'Sudden chest pain or breathing distress (always evaluate physical causes too)',
    ],
    sources: ['Human Disease Ontology (DOID:1596)', 'WHO Mental Health & Self-Help+', 'MedlinePlus'],
  },
  {
    doid: 'DOID:1205',
    icd11: 'EB13',
    name: 'Allergic Reaction, Hives & Skin Rash',
    synonyms: ['rash', 'hives', 'itchy skin', 'allergy', 'eczema', 'skin swelling'],
    bodySystem: 'Dermatological & Allergy',
    ageRelevance: ['child', 'teen', 'young_adult', 'adult', 'older_adult'],
    definition:
      'Immune-mediated skin inflammation causing itching, redness, raised hives (urticaria), or dry patches triggered by foods, medicines, insect bites, soaps, or environmental allergens.',
    commonSymptoms: ['itchy rash', 'hives', 'red skin', 'mild swelling', 'dry patches'],
    intakeQuestions: [
      'Did the rash appear after a new food, medication, soap, or insect bite?',
      'Is there any swelling of the lips, tongue, or throat, or any trouble breathing?',
      'Is the rash spreading rapidly, blistering, or accompanied by fever?',
    ],
    quickReplyHints: ['Itchy rash on arms/legs', 'No lip/throat swelling', 'Breathing completely fine', 'Possible new soap/food'],
    safeHomeMeasures: [
      'Remove or avoid the suspected trigger immediately and rinse skin with cool plain water.',
      'Apply a cool damp compress and avoid scratching to prevent secondary infection.',
      'Consult a pharmacist or doctor about safe antihistamines or gentle moisturizers.',
    ],
    whenToSeekDoctor: [
      'Rash accompanied by fever, widespread blistering, signs of pus/infection, or no improvement after 48 hours.',
    ],
    redFlagSymptoms: [
      'Swelling of lips, tongue, face, or throat, hoarse voice, wheezing, or dizziness (Anaphylaxis emergency!)',
      'Rapidly spreading purple spots that do not fade when pressed with a clear glass',
    ],
    sources: ['Human Disease Ontology (DOID:1205)', 'MedlinePlus Allergies & Rashes', 'WHO Primary Care'],
  },
  {
    doid: 'DOID:10283',
    icd11: 'GA90',
    name: 'Men’s Preventive, Prostate & Metabolic Health',
    synonyms: ['prostate', 'mens health', 'urinary stream', 'testicular check', 'erectile', 'mens checkup'],
    bodySystem: 'Reproductive & Endocrine',
    ageRelevance: ['young_adult', 'adult', 'older_adult'],
    definition:
      'Preventive health education covering cardiovascular screening, metabolic fitness, prostate urinary awareness (especially ages 45+), and self-awareness of testicular or urinary changes.',
    commonSymptoms: ['weak urine stream', 'nighttime urination', 'fatigue', 'pelvic ache', 'preventive checkup'],
    intakeQuestions: [
      'Are you asking about routine preventive checks or a specific urinary/pelvic symptom?',
      'How long have you noticed any changes (such as waking frequently at night to urinate)?',
      'Do you have any fever, pain, or blood in the urine?',
    ],
    quickReplyHints: ['Routine preventive screening', 'Waking up at night to urinate', 'No pain or fever', 'Heart & fitness checks'],
    safeHomeMeasures: [
      'Schedule periodic blood pressure, fasting glucose, and lipid checks alongside active exercise and balanced nutrition.',
      'Avoid excessive evening caffeine or alcohol if nighttime urination is bothersome.',
    ],
    whenToSeekDoctor: [
      'New urinary stream difficulty, pelvic pain, any painless testicular lump, or discussing PSA screening from age 45–50 (or 40 with family history).',
    ],
    redFlagSymptoms: [
      'Sudden severe testicular pain or swelling (surgical emergency — seek ER care immediately)',
      'Complete inability to pass urine or visible blood in urine',
    ],
    sources: ['Human Disease Ontology (DOID:10283)', 'WHO Men’s Health Guidance', 'MedlinePlus'],
  },
];

export interface OntologySearchResult {
  entry: VerifiedDiseaseOntologyEntry;
  score: number;
}

const ONTOLOGY_STOP_WORDS = new Set([
  'am',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'but',
  'by',
  'can',
  'do',
  'does',
  'feel',
  'feeling',
  'fine',
  'for',
  'from',
  'good',
  'had',
  'has',
  'have',
  'he',
  'help',
  'her',
  'him',
  'his',
  'how',
  'if',
  'ill',
  'in',
  'is',
  'it',
  'me',
  'my',
  'no',
  'not',
  'of',
  'on',
  'or',
  'our',
  'please',
  'really',
  'she',
  'sick',
  'so',
  'some',
  'that',
  'the',
  'their',
  'them',
  'they',
  'this',
  'to',
  'unwell',
  'up',
  'us',
  'very',
  'was',
  'we',
  'well',
  'what',
  'when',
  'with',
  'you',
  'your',
]);

function hasWholeWord(haystack: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack);
}

/**
 * Deterministic, offline-ready search across the curated Human Disease Ontology (DOID),
 * WHO ICD-11, and MedlinePlus verified reference database.
 */
export function searchMedicalOntology(
  query: string,
  maxResults = 3
): OntologySearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const tokens = normalized
    .replace(/[^a-z0-9:\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !ONTOLOGY_STOP_WORDS.has(t));

  if (tokens.length === 0) return [];

  const results: OntologySearchResult[] = [];

  for (const entry of VERIFIED_MEDICAL_ONTOLOGY) {
    let score = 0;
    const nameLower = entry.name.toLowerCase();
    const doidLower = entry.doid.toLowerCase();
    const icdLower = entry.icd11.toLowerCase();

    if (normalized.includes(doidLower) || normalized.includes(icdLower)) score += 25;
    if (
      (normalized.length >= 4 && hasWholeWord(nameLower, normalized)) ||
      normalized.includes(nameLower)
    ) {
      score += 18;
    }

    for (const syn of entry.synonyms) {
      const s = syn.toLowerCase();
      if (hasWholeWord(normalized, s)) score += 14;
      for (const tok of tokens) {
        if (s === tok) score += 8;
        else if (tok.length >= 4 && hasWholeWord(s, tok)) score += 3;
      }
    }

    for (const sym of entry.commonSymptoms) {
      const s = sym.toLowerCase();
      if (hasWholeWord(normalized, s)) score += 10;
      for (const tok of tokens) {
        if (tok.length >= 4 && hasWholeWord(s, tok)) score += 2.5;
      }
    }

    for (const tok of tokens) {
      if (tok.length >= 3 && hasWholeWord(nameLower, tok)) score += 5;
      if (tok.length >= 4 && hasWholeWord(entry.definition, tok)) score += 1.5;
    }

    if (score >= 5) {
      results.push({ entry, score });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}
