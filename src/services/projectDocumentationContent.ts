import { ADMIN_GMAIL_ACCOUNT, DEMO_SANDBOX_ACCOUNTS } from '../data/demoAccounts';

export interface ProjectFeatureScreenshot {
  id: string;
  number: string;
  title: string;
  route: string;
  category: string;
  imagePath: string;
  summary: string;
  highlights: string[];
}

export const PROJECT_FEATURE_SCREENSHOTS: ProjectFeatureScreenshot[] = [
  {
    id: 'home-hero',
    number: '01',
    title: 'Landing Hero & Interactive 3D DNA Double Helix',
    route: '/',
    category: 'Landing & Brand Experience',
    imagePath: '/screenshots/01_home_hero.png',
    summary:
      'Full-bleed Midnight Blue Eclipse landing page introducing HealthConnect — an offline-first Hybrid AI healthcare PWA with quick-launch routes, installable PWA prompt, and interactive 3D DNA showcase.',
    highlights: [
      'Responsive desktop & mobile-first shell with PWA install trigger',
      'Direct access to Hybrid AI, Care Directory, Smartwatch Safety, and Emergency Centre',
    ],
  },
  {
    id: 'home-care-strip',
    number: '02',
    title: 'Home Care Pathways & Universal Directory Strip',
    route: '/',
    category: 'Landing & Brand Experience',
    imagePath: '/screenshots/02_home_care_directory.png',
    summary:
      'Structured quick-entry care cards connecting users directly to Hybrid AI triage, Smartwatch GPS Auto-SOS, Age-Safe Personalised Dashboard, and 24/7 Emergency & Offline Medical QR.',
    highlights: [
      'Highlights offline WHO/DOID/MedlinePlus library and online-first clinical care',
      'One-tap routing to core clinical modules',
    ],
  },
  {
    id: 'auth-admin-demo',
    number: '03',
    title: 'Authentication, Administrator Account Sign-In & Demo Sandbox Accounts',
    route: '/login',
    category: 'Identity, Admin Account & RBAC',
    imagePath: '/screenshots/15_auth_admin_and_demo_accounts.png',
    summary:
      'Firebase Authentication workspace featuring Google Sign-In, dedicated Admin Sign-In for the verified Administrator account (amesinlolagoodluck@gmail.com), Email/Password login, interactive 3D DNA double-helix, and 5 isolated Demo Sandbox Accounts for instant testing.',
    highlights: [
      `Dedicated Administrator Account button: Admin Sign-In (Google · ${ADMIN_GMAIL_ACCOUNT})`,
      'Admin privileges require cryptographic verified Google/Firebase Auth — never granted to demo sandbox sessions',
      '5 isolated Demo Sandbox accounts (Adult Patient, Child Guardian Mode Age 8, Senior Care Age 67, Verified Doctor, Partner Hospital)',
    ],
  },
  {
    id: 'find-healthcare',
    number: '04',
    title: 'Oyo State Care Directory — All 27 Towns & Online Doctors First',
    route: '/find-healthcare',
    category: 'Care Directory & Booking',
    imagePath: '/screenshots/03_find_healthcare_oyo.png',
    summary:
      'Searchable directory covering all 27 Oyo State cities and towns with verified clinicians, partner hospitals, specialty filters, and inline Video Telehealth or In-Person physical appointment booking that syncs directly into Doctor Calendars.',
    highlights: [
      'Covers Ibadan Metro, Ogbomoso, Oyo Town, Oke-Ogun, and Ibarapa corridors',
      'Books Video Telehealth (₦0 in-plan) or In-Person physical appointments synced live to Doctor Calendar',
    ],
  },
  {
    id: 'dashboard-overview',
    number: '05',
    title: 'Midnight Blue Eclipse Patient Dashboard Overview',
    route: '/dashboard',
    category: 'Patient Workspace',
    imagePath: '/screenshots/04_dashboard_overview.png',
    summary:
      'Adaptive clinical command center featuring radial KPI rings (Monthly Plan & seats, Latest BP, Rehab Mobility, Vaccines & Visits), patient identity summary, blood pressure analytics chart, personal timeline, and medication reminders.',
    highlights: [
      'Adapts capabilities dynamically across 5 life stages (Children 0–12, Teens 13–17, Young Adults 18–30, Adults 31–50, Seniors 51+)',
      'Collapsible sidebar with instant module search across all patient tools',
    ],
  },
  {
    id: 'child-guardian-safety',
    number: '06',
    title: 'Age-Adaptive Dashboard & Guardian Child Safety Mode (Ages 0–12)',
    route: '/dashboard (Child Profile)',
    category: 'Child Safety & Personalisation',
    imagePath: '/screenshots/20_child_guardian_safety_mode.png',
    summary:
      'Automatically activates strict Guardian Child Safety Lock for profiles aged 0–12, hiding adult reproductive and adult-only health modules while surfacing pediatric immunization, growth, and guardian-safe tools.',
    highlights: [
      'Enforces 32 child-safe capabilities out of the 120-capability healthcare blueprint',
      'Locks Women’s Health and adult reproductive modules automatically based on confirmed Date of Birth',
    ],
  },
  {
    id: 'netflix-family-profiles',
    number: '07',
    title: 'Netflix-Style Family Profiles Hub ("Who\'s Accessing Care?")',
    route: '/dashboard → Family Profiles',
    category: 'Family Care Management',
    imagePath: '/screenshots/05_netflix_family_profiles.png',
    summary:
      'Multi-member household hub covering up to 5 independent family profiles under one ₦50,000/month Family Plan, with isolated vitals, allergies, genotypes, immunizations, and clinical records per member.',
    highlights: [
      'Visual 5-slot profile switcher with live seat usage meter',
      'One-click switching dynamically scopes all dashboard charts, appointments, and QR Medical IDs',
    ],
  },
  {
    id: 'appointments-physical',
    number: '08',
    title: 'Online Consultations & Physical Examination Booking',
    route: '/dashboard → Appointments',
    category: 'Telehealth & Clinic Scheduling',
    imagePath: '/screenshots/06_appointments_physical_exam.png',
    summary:
      'Unified booking tracker for Video Telehealth consultations and doctor-scheduled In-Person physical exams at partner hospitals such as UCH Ibadan, Adeoyo Maternity, Ring Road State Hospital, and Bowen Ogbomoso.',
    highlights: [
      'Online-first care workflow with seamless escalation to physical exams when clinically needed',
      'Automatic sync to the assigned doctor’s Physical Consultations Calendar',
    ],
  },
  {
    id: 'doctor-physical-calendar',
    number: '09',
    title: 'Verified Doctor Portal & Physical Consultations Calendar',
    route: '/dashboard → Doctor Calendar & Portal',
    category: 'Clinician Portal',
    imagePath: '/screenshots/16_doctor_physical_calendar.png',
    summary:
      'Dedicated interactive schedule for verified doctors featuring Month Grid, Week Hourly Time-Slot Grid, and Day Agenda views showing every scheduled physical consultation with exact From → To time windows, overlap conflict alerts, and a synced Patient Appointment Details inspector.',
    highlights: [
      'Displays exact day, From → To time block, duration, clinic, and patient booking reference synced live from the booking system',
      'Clinicians can block physical slots, edit clinical notes, mark visits Completed/Cancelled, and review patient-shared BP, glucose, and lab records',
    ],
  },
  {
    id: 'hospital-doctor-roster',
    number: '10',
    title: 'Partner Hospital Portal — Own Doctor Roster & EMS Triage Queue',
    route: '/dashboard → Hospital EMS Portal',
    category: 'Hospital Governance & EMS',
    imagePath: '/screenshots/17_hospital_doctor_roster.png',
    summary:
      'Facility-isolated portal where partner hospitals register and manage ONLY their own hospital doctors (enforced by Firestore rules via hospitalOwnerUid) and coordinate live Emergency Ambulance Dispatch requests.',
    highlights: [
      'Strict Firestore isolation: each hospital can create, view, edit, and delete only doctors tied to its own Facility UID',
      'Live EMS Emergency Triage Queue with Accept Request, Confirm Dispatch, and Resolve controls',
    ],
  },
  {
    id: 'hybrid-ai-assistant',
    number: '11',
    title: 'Hybrid AI Health Assistant, Red-Flag Middleware, Photo Triage & openFDA',
    route: '/ai-assistant',
    category: 'Hybrid AI & Clinical Safety',
    imagePath: '/screenshots/13_ai_health_assistant.png',
    summary:
      'Multi-layer Hybrid AI Health Assistant combining Chrome On-Device Gemini Nano (Firebase AI Logic), Cloud Gemini/OpenRouter, and a bundled 18-chapter offline WHO/DOID/MedlinePlus medical knowledge engine with transparent execution badges, interactive symptom follow-ups, multimodal injury/rash photo triage, openFDA drug lookup, and real-time regex chat policy masking.',
    highlights: [
      'Dual-layer deterministic Medical Red-Flag Safety Middleware (frontend + Express backend) interrupts emergencies (chest pain, breathing difficulty, unconsciousness, severe bleeding, seizures)',
      'Real-time regex chat filter detects and masks phone numbers, bank/account numbers, and physical GPS coordinates while logging policy notices to Sentinel Bot',
      'Interactive 3D Anatomy Explorer, voice dictation, and NDPA-informed privacy consent controls',
    ],
  },
  {
    id: 'wearable-smartwatch',
    number: '12',
    title: 'Smartwatch & Wearable Integration Hub (Web Bluetooth GATT + Auto-SOS)',
    route: '/dashboard → Smartwatch & GPS',
    category: 'Wearables & Remote Safety',
    imagePath: '/screenshots/18_wearable_smartwatch_hub.png',
    summary:
      'Connects compatible heart-rate smartwatches via Web Bluetooth GATT or runs realistic telemetry simulator presets with configurable critical thresholds, a 15-second cancellable emergency countdown, and GPS-ranked nearest 24/7 hospitals.',
    highlights: [
      'Real-time Heart Rate, SpO2, estimated Blood Pressure, Skin Temperature, Steps & Sleep tracking',
      'Automatic 15-second emergency escalation countdown when vital readings breach configured safety thresholds',
    ],
  },
  {
    id: 'offline-medical-qr',
    number: '13',
    title: 'Offline Emergency Medical ID QR Code Generator (Zero Cloud Transfer)',
    route: '/dashboard → Emergency QR ID',
    category: 'Offline Emergency Safety',
    imagePath: '/screenshots/19_offline_medical_qr_id.png',
    summary:
      'Generates a high-contrast scannable Emergency Medical ID QR code 100% locally inside the browser without sending patient health information to any external QR server, with Phone Lock Screen and Smartwatch Face layouts and PNG export.',
    highlights: [
      'Granular privacy checkboxes for Full Name, DOB/Age/Sex, Blood Group & Genotype, Allergies, Chronic Conditions, Medications, and ICE Contact',
      'Instant PNG export and decoded text preview readable offline by any paramedic or ER camera',
    ],
  },
  {
    id: 'vitals-monitoring',
    number: '14',
    title: 'Blood Pressure & Blood Glucose Monitoring Studio',
    route: '/monitoring',
    category: 'Chronic Care Tracking',
    imagePath: '/screenshots/12_vitals_monitoring.png',
    summary:
      'Structured home blood pressure cuff and glucometer logging workspace with interactive Recharts trend graphs, clinical threshold guidance, doctor sharing, and CSV vitals report export.',
    highlights: [
      'Tracks Systolic/Diastolic/Pulse and Fasting/Post-meal glucose per family profile',
      'Explicit per-record doctor sharing via verified doctor UID',
    ],
  },
  {
    id: 'womens-health-pcos',
    number: '15',
    title: "Women's Health — Private Cycle Tracker & PCOS Care Pathway",
    route: '/dashboard → Women’s Health',
    category: 'Specialised Clinical Care',
    imagePath: '/screenshots/07_womens_health_pcos.png',
    summary:
      'Strictly owner-only menstrual cycle tracker and PCOS educational care pathway protected by Firestore owner-only rules and automatically locked for minors under Guardian Child Safety Mode.',
    highlights: [
      'Logs cycle start date, cycle length, flow intensity, symptoms, and private notes',
      'Direct OB-GYN consultation routing and verified WHO/MedlinePlus guidance',
    ],
  },
  {
    id: 'rehab-studio',
    number: '16',
    title: 'Rehabilitation Progress Studio — Guided Timer & Recovery Charts',
    route: '/dashboard → Rehab Studio',
    category: 'Physiotherapy & Recovery',
    imagePath: '/screenshots/08_rehab_studio.png',
    summary:
      'Home physiotherapy workspace with clinician-prescribed exercises, live countdown timer, pain (0–10) and mobility (0–10) scoring, Recharts recovery trajectory graphs, and clinician sharing.',
    highlights: [
      'Tracks adherence and mobility improvements over time',
      'Supports direct online physiotherapy follow-up scheduling',
    ],
  },
  {
    id: 'subscription-plans',
    number: '17',
    title: 'Monthly Subscription Plans — Individual (₦16k) & Family of 5 (₦50k)',
    route: '/payments',
    category: 'Subscriptions & Billing',
    imagePath: '/screenshots/09_subscription_plans.png',
    summary:
      'Transparent subscription-only healthcare billing eliminating surprise per-visit fees — choose Individual Monthly (₦16,000/mo) or Family of 5 Monthly (₦50,000/mo, saving ₦30,000/mo).',
    highlights: [
      'Server-authoritative pricing prevents client-side price tampering',
      'Instant seat entitlement sync across Netflix-style Family Profiles',
    ],
  },
  {
    id: 'payment-history',
    number: '18',
    title: 'Payment History & Printable Interswitch Receipts',
    route: '/payments',
    category: 'Subscriptions & Billing',
    imagePath: '/screenshots/10_payment_history.png',
    summary:
      'Full billing transparency with All / Success / Pending status filters, unique ISW-OYO transaction references, server-side verification triggers, and printable receipt cards.',
    highlights: [
      'Idempotent server verification against Interswitch gettransaction.json API',
      'Zero payment card PAN/CVV/PIN storage in Firestore or browser',
    ],
  },
  {
    id: 'interswitch-checkout',
    number: '19',
    title: 'Dedicated Interswitch Option 2 (Web Redirect) Checkout',
    route: '/checkout',
    category: 'Payments Architecture',
    imagePath: '/screenshots/11_interswitch_checkout.png',
    summary:
      'Official Interswitch Option 2 Web Redirect checkout with server-generated transaction references, kobo-denominated NGN (566) POST form submission, sandbox Verve test card guide, and HMAC-SHA512 webhook verification.',
    highlights: [
      'Official sandbox defaults (Merchant MX6072 / Pay Item 9405967) ready out-of-the-box',
      'Express POST /payment-response handler with 303 redirect and replay-safe verification',
    ],
  },
  {
    id: 'emergency-centre',
    number: '20',
    title: '24/7 Emergency & Ambulance Triage Centre',
    route: '/emergency',
    category: 'Emergency Response',
    imagePath: '/screenshots/14_oyo_emergency_centre.png',
    summary:
      'Rapid-response emergency coordination desk with one-tap universal emergency dialing (112 / 911 / 999), browser GPS or 27-town manual locator, Haversine nearest-hospital distance sorting, and 4-stage live SOS dispatch tracking.',
    highlights: [
      '4-stage EMS lifecycle: submitted → accepted → dispatched → resolved',
      'Direct integration with Smartwatch critical vital alerts and Red-Flag AI escalations',
    ],
  },
];

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface BuildProjectDocHtmlOptions {
  generatedDate?: string;
  screenshotDataUrls?: Record<string, string>;
  liveAppUrl?: string;
}

/**
 * Generates a rich, Word-compatible & Google-Docs-importable HTML document
 * detailing the entire HealthConnect platform, every feature with embedded
 * screenshots, and the explicit Administrator Account specification.
 */
export function buildProjectDocumentationHtml(
  options: BuildProjectDocHtmlOptions = {}
): string {
  const generatedDate =
    options.generatedDate ||
    new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  const screenshotMap = options.screenshotDataUrls || {};
  const liveAppUrl =
    options.liveAppUrl ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://healthconnect.app');

  const demoAccountsRows = DEMO_SANDBOX_ACCOUNTS.map(
    (acc) => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;font-weight:600;">${escapeHtml(acc.label)}</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;text-transform:capitalize;">${escapeHtml(acc.role)}</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;font-family:monospace;">${escapeHtml(acc.email)}</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;font-family:monospace;">${escapeHtml(acc.password)}</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;">${escapeHtml(acc.description)}</td>
      </tr>`
  ).join('');

  const featureSectionsHtml = PROJECT_FEATURE_SCREENSHOTS.map((feat) => {
    const dataUrl = screenshotMap[feat.imagePath];
    const imageBlock = dataUrl
      ? `<div style="margin:12px 0 10px 0;text-align:center;">
           <img src="${dataUrl}" alt="${escapeHtml(feat.title)}" style="max-width:100%;width:620px;height:auto;border:1px solid #cbd5e1;border-radius:8px;" />
           <p style="font-size:10pt;color:#475569;font-style:italic;margin-top:6px;">Figure ${escapeHtml(feat.number)}: ${escapeHtml(feat.title)} (${escapeHtml(feat.route)})</p>
         </div>`
      : `<p style="font-size:10pt;color:#64748b;font-style:italic;">[Screenshot asset: ${escapeHtml(feat.imagePath)}]</p>`;

    const bullets = feat.highlights
      .map((h) => `<li style="margin-bottom:4px;">${escapeHtml(h)}</li>`)
      .join('');

    return `
      <div style="margin-bottom:26px;page-break-inside:avoid;">
        <h3 style="color:#0F0E47;font-size:14pt;margin:16px 0 4px 0;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">
          ${escapeHtml(feat.number)}. ${escapeHtml(feat.title)}
        </h3>
        <p style="font-size:9.5pt;color:#E8702A;font-weight:bold;margin:0 0 8px 0;">
          Category: ${escapeHtml(feat.category)} &nbsp;|&nbsp; Route: ${escapeHtml(feat.route)}
        </p>
        <p style="font-size:10.5pt;color:#1e293b;line-height:1.55;margin:0 0 8px 0;">
          ${escapeHtml(feat.summary)}
        </p>
        <ul style="font-size:10pt;color:#334155;line-height:1.5;margin:0 0 10px 18px;padding:0;">
          ${bullets}
        </ul>
        ${imageBlock}
      </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>HealthConnect — Complete Project Documentation & Feature Guide</title>
  <style>
    body {
      font-family: 'Segoe UI', Calibri, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.55;
      max-width: 820px;
      margin: 0 auto;
      padding: 28px 36px;
      background: #ffffff;
    }
    h1 { color: #0F0E47; font-size: 24pt; margin-bottom: 6px; }
    h2 {
      color: #0F0E47;
      font-size: 16pt;
      margin-top: 28px;
      margin-bottom: 10px;
      border-bottom: 2px solid #0F0E47;
      padding-bottom: 4px;
    }
    h3 { color: #1e1b4b; font-size: 13pt; margin-top: 18px; margin-bottom: 6px; }
    p { font-size: 10.5pt; margin: 6px 0 10px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 18px 0; font-size: 9.5pt; }
    th {
      background: #0F0E47;
      color: #ffffff;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #0F0E47;
    }
    td { padding: 8px 10px; border: 1px solid #cbd5e1; vertical-align: top; }
    .callout {
      background: #f8fafc;
      border-left: 4px solid #E8702A;
      padding: 12px 16px;
      margin: 14px 0;
    }
    .admin-box {
      background: #ecfdf5;
      border: 2px solid #059669;
      border-radius: 8px;
      padding: 14px 18px;
      margin: 16px 0;
    }
    .badge {
      display: inline-block;
      background: #0F0E47;
      color: #ffffff;
      font-size: 9pt;
      font-weight: bold;
      padding: 3px 8px;
      border-radius: 4px;
      margin-right: 6px;
    }
  </style>
</head>
<body>
  <div style="border-bottom:3px solid #E8702A;padding-bottom:16px;margin-bottom:22px;">
    <p style="font-size:10pt;font-weight:bold;color:#E8702A;text-transform:uppercase;letter-spacing:1px;margin:0;">
      Complete Technical &amp; Product Documentation
    </p>
    <h1>HealthConnect — Offline-First Hybrid AI Healthcare Platform</h1>
    <p style="font-size:11pt;color:#334155;margin:4px 0 10px 0;">
      Universal Installable Healthcare PWA · Hybrid On-Device &amp; Cloud AI · Dual-Layer Emergency Safety Middleware · Role-Based Portals (Patient, Doctor, Hospital &amp; Least-Privilege Administrator) · Oyo State Subscription Care Network
    </p>
    <p style="font-size:9.5pt;color:#475569;margin:0;">
      <strong>Document Generated:</strong> ${escapeHtml(generatedDate)} &nbsp;|&nbsp;
      <strong>Platform URL:</strong> ${escapeHtml(liveAppUrl)} &nbsp;|&nbsp;
      <strong>Verified Administrator Account:</strong> <code>${escapeHtml(ADMIN_GMAIL_ACCOUNT)}</code>
    </p>
  </div>

  <h2>1. Executive Overview &amp; Vision</h2>
  <p>
    <strong>HealthConnect</strong> is an offline-first, Hybrid AI-powered Progressive Web Application (PWA) designed to make reliable healthcare guidance, family clinical management, doctor scheduling, wearable safety monitoring, and emergency readiness accessible regardless of internet connectivity. Built around a 120-capability healthcare blueprint and tailored for Oyo State, Nigeria (covering all 27 major towns) as well as universal emergency standards (112, 911, 999), the platform combines patient-first privacy with deterministic clinical safety guardrails.
  </p>
  <div class="callout">
    <strong>Core Care Philosophy:</strong> Healthcare guidance should remain accessible, intelligent, private, and safety-focused even offline. Members subscribe once per month (₦16,000 Individual or ₦50,000 Family of 5 with Netflix-style profiles), consult verified doctors online first at ₦0 per visit, and seamlessly book in-person physical examinations synced directly into their doctor's Physical Consultations Calendar.
  </div>

  <h2>2. Administrator Account &amp; Least-Privilege Governance</h2>
  <div class="admin-box">
    <h3 style="color:#065f46;margin-top:0;">Official Administrator Account Designation</h3>
    <p style="margin-bottom:8px;">
      <strong>Administrator Account Email:</strong> <code>${escapeHtml(ADMIN_GMAIL_ACCOUNT)}</code><br />
      <strong>Authentication Requirement:</strong> Cryptographic verified <strong>Google Sign-In (Firebase Authentication)</strong> with <code>email_verified == true</code>. On the <code>/login</code> page, this is explicitly exposed via the <strong>"Admin Sign-In (Google · ${escapeHtml(ADMIN_GMAIL_ACCOUNT)})"</strong> button.<br />
      <strong>Sandbox Restriction:</strong> Demo sandbox accounts can <em>never</em> elevate to Administrator privileges and never read or write live Cloud Firestore data.
    </p>
    <p style="margin-bottom:6px;"><strong>Strict Least-Privilege Scope Enforced by Firestore Rules &amp; Backend RBAC:</strong></p>
    <table style="margin:8px 0 4px 0;">
      <thead>
        <tr>
          <th style="width:28%;">Permission Area</th>
          <th style="width:22%;">Admin Access</th>
          <th style="width:50%;">Enforced Policy &amp; Technical Guardrail</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Partner Hospitals Registry</strong> (<code>/hospitals</code>)</td>
          <td style="color:#047857;font-weight:bold;">Allowed (Create / Update / Delete)</td>
          <td>Admin registers, updates, and manages accredited partner hospitals across the network.</td>
        </tr>
        <tr>
          <td><strong>Partner Doctors Registry</strong> (<code>/partnerDoctors</code>)</td>
          <td style="color:#047857;font-weight:bold;">Allowed (Create / Update / Delete)</td>
          <td>Admin can register verified partner doctors; verified Hospitals can separately register and manage ONLY their own facility doctors (<code>hospitalOwnerUid == request.auth.uid</code>).</td>
        </tr>
        <tr>
          <td><strong>Chat Policy Moderation Feed</strong> (<code>/chatModerationEvents</code>)</td>
          <td style="color:#0369a1;font-weight:bold;">Read-Only Monitor</td>
          <td>Admin monitors immutable real-time regex filter &amp; Sentinel Bot policy alerts (masked phone numbers, account numbers, and GPS coordinates). Cannot edit or delete moderation logs (<code>allow update, delete: if false</code>).</td>
        </tr>
        <tr>
          <td><strong>Regular User Profiles &amp; Private PII</strong> (<code>/users</code>, <code>/users/{uid}/private</code>)</td>
          <td style="color:#b91c1c;font-weight:bold;">Strictly Blocked (Denied)</td>
          <td>Admin cannot list, view, modify, or delete regular user accounts or private contact details (<code>allow list: if false</code>, owner-only <code>get</code>/<code>update</code>).</td>
        </tr>
        <tr>
          <td><strong>Patient Medical Records &amp; Payments</strong></td>
          <td style="color:#b91c1c;font-weight:bold;">Strictly Blocked (Denied)</td>
          <td>No <code>isAdmin()</code> bypass exists on <code>familyProfiles</code>, <code>bpReadings</code>, <code>glucoseReadings</code>, <code>medicalDocuments</code>, <code>aiConsultations</code>, <code>wearableReadings</code>, <code>cycleLogs</code>, or <code>payments</code>.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <h2>3. Role Portals &amp; Demo Sandbox Accounts</h2>
  <p>
    In addition to live Google Sign-In and the verified Administrator account (<code>${escapeHtml(ADMIN_GMAIL_ACCOUNT)}</code>), HealthConnect includes five isolated client-side Demo Sandbox Accounts for instant testing of every role and age group without touching live patient records:
  </p>
  <table>
    <thead>
      <tr>
        <th>Account Label</th>
        <th>Role</th>
        <th>Demo Email</th>
        <th>Password</th>
        <th>What It Demonstrates</th>
      </tr>
    </thead>
    <tbody>
      ${demoAccountsRows}
    </tbody>
  </table>

  <h2>4. Core Architecture &amp; Technical Capabilities</h2>
  <table>
    <thead>
      <tr>
        <th style="width:26%;">Subsystem</th>
        <th style="width:74%;">Implementation Details</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Hybrid AI Router</strong></td>
        <td>Unified multi-layer AI router using Firebase AI Logic (<code>InferenceMode.PREFER_ON_DEVICE</code> and <code>ONLY_ON_DEVICE</code> for Chrome Gemini Nano), Cloud Gemini/OpenRouter proxy via Express, and a bundled 18-chapter Offline Medical Knowledge Engine (DOID, WHO ICD-11, MedlinePlus, openFDA). Every response displays a transparent execution badge (Local On-Device, Hybrid, Cloud, Offline Library, or Safety Middleware).</td>
      </tr>
      <tr>
        <td><strong>Dual-Layer Medical Red-Flag Middleware</strong></td>
        <td>Deterministic safety filter running independently on both frontend and Express backend. Detects difficulty breathing, loss of consciousness, chest pain, severe bleeding, and seizures in incoming prompts and outgoing AI replies, halting educational chat and escalating immediately to <strong>Urgent: Seek Professional Care</strong> and the Emergency Centre.</td>
      </tr>
      <tr>
        <td><strong>Real-Time Regex Chat Policy Filter &amp; Sentinel Bot</strong></td>
        <td>Detects and automatically masks phone numbers, bank/account numbers, and physical GPS coordinates before messages enter chat, enforcing health-focused communication policies and logging immutable moderation events for Admin read-only monitoring.</td>
      </tr>
      <tr>
        <td><strong>Multimodal Accident &amp; Visual Triage</strong></td>
        <td>Supports image upload and camera capture for visible injuries, burns, rashes, and medication labels—using server-side Gemini Vision online and structured offline first-aid checklists when offline.</td>
      </tr>
      <tr>
        <td><strong>Age-Adaptive Dashboard &amp; Guardian Lock</strong></td>
        <td>Five life stages (Children 0–12, Teenagers 13–17, Young Adults 18–30, Adults 31–50, Older Adults 51+) powered by a 120-capability blueprint. Ages 0–12 automatically lock and hide adult reproductive modules.</td>
      </tr>
      <tr>
        <td><strong>Smartwatch Web Bluetooth &amp; Auto-SOS</strong></td>
        <td>Pairs compatible heart-rate wearables over Web Bluetooth GATT or runs telemetry simulator presets with configurable critical bounds, a 15-second cancellable emergency countdown, and browser GPS hospital ranking.</td>
      </tr>
      <tr>
        <td><strong>Offline Medical ID QR Code</strong></td>
        <td>Generates high-contrast emergency QR codes 100% locally in the browser with selectable privacy fields, Phone Lock Screen &amp; Smartwatch Face previews, and PNG download (zero external QR server calls).</td>
      </tr>
      <tr>
        <td><strong>Doctor Physical Calendar &amp; Hospital Isolation</strong></td>
        <td>Interactive Month Grid, Week Hourly Time-Slot Grid, and Day Agenda displaying scheduled In-Person consultations synced live from the booking system, with From → To times, overlap conflict alerts, clinical notes, and status controls. Hospitals manage strictly their own doctors via <code>hospitalOwnerUid</code> Firestore rules.</td>
      </tr>
      <tr>
        <td><strong>Subscriptions &amp; Interswitch Web Redirect</strong></td>
        <td>₦16,000/month Individual Plan &amp; ₦50,000/month Family Plan (up to 5 Netflix-style profiles) via Interswitch Option 2 Web Redirect, server-authoritative kobo pricing, POST <code>/payment-response</code> 303 redirect, server-to-server verification, and HMAC-SHA512 webhooks.</td>
      </tr>
      <tr>
        <td><strong>PWA &amp; Privacy-Strict Service Worker</strong></td>
        <td>Installable on Android, iOS, and Desktop via <code>vite-plugin-pwa</code> (Workbox). Enforces <code>NetworkOnly</code> for Firestore, Firebase Auth, Interswitch, and <code>/api/*</code> routes so private patient records are never cached in Service Worker storage.</td>
      </tr>
      <tr>
        <td><strong>Google Drive Documentation Export</strong></td>
        <td>Integrated with Google Drive (<code>drive.file</code> least-privilege permission, in-memory token caching, explicit user confirmation modal) to save this complete documentation with all feature screenshots directly into Google Drive as a Google Doc or Word <code>.doc</code> file.</td>
      </tr>
    </tbody>
  </table>

  <h2>5. Complete Feature-by-Feature Visual Tour (20 Screenshots)</h2>
  <p>
    Every screenshot below was captured directly from the live HealthConnect web application across patient, guardian child, senior wearable, verified doctor, partner hospital, and authentication/admin views.
  </p>
  ${featureSectionsHtml}

  <h2>6. Technology Stack &amp; Repository Structure</h2>
  <table>
    <thead>
      <tr>
        <th style="width:28%;">Layer</th>
        <th style="width:72%;">Technologies</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Frontend &amp; PWA</strong></td>
        <td>React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, Motion, Recharts 3, Three.js / React Three Fiber, vite-plugin-pwa (Workbox)</td>
      </tr>
      <tr>
        <td><strong>Backend &amp; Security</strong></td>
        <td>Node.js, Express 4 (<code>server.ts</code> / <code>server/createApp.ts</code>), Zod 4 validation, Content-Security-Policy, CORS allowlist, Rate Limiting, HMAC-SHA512 Webhooks</td>
      </tr>
      <tr>
        <td><strong>Database, Auth &amp; Workspace</strong></td>
        <td>Firebase Authentication (Google Sign-In + Email/Password), Cloud Firestore (hardened multi-role <code>firestore.rules</code> + <code>firebase-blueprint.json</code>), Firebase AI Logic (<code>firebase/ai</code>), Google Drive API v3</td>
      </tr>
      <tr>
        <td><strong>Medical Knowledge &amp; AI</strong></td>
        <td>@google/genai (Gemini), OpenRouter proxy, Chrome Gemini Nano on-device inference, openFDA Drug API, curated WHO / DOID / MedlinePlus offline library</td>
      </tr>
      <tr>
        <td><strong>Quality &amp; Automated Tests</strong></td>
        <td>Vitest 5 (6 test suites · 62 passing tests covering Hybrid AI, Red-Flag Middleware, Interswitch Checkout, RBAC/Firestore Rules, Doctor Calendar &amp; API security), TypeScript strict check, ESLint Firebase Security Rules plugin</td>
      </tr>
    </tbody>
  </table>

  <h2>7. Clinical Safety &amp; Production Deployment Checklist</h2>
  <p>
    HealthConnect's AI responses, photo triage guidance, and wearable simulator presets are designed for educational health information and emergency workflow readiness—not as a substitute for licensed medical diagnosis or emergency medical services. Before deploying broadly to production patients:
  </p>
  <ul style="font-size:10pt;color:#334155;line-height:1.55;margin:0 0 12px 18px;">
    <li>Review and audit <code>firestore.rules</code> in Firebase Console to confirm access controls match your clinical governance model.</li>
    <li>Switch <code>INTERSWITCH_ENVIRONMENT=production</code> with verified Quickteller Business merchant credentials.</li>
    <li>Configure server-side <code>GEMINI_API_KEY</code>, optional <code>OPENROUTER_API_KEY</code>, and SMS OTP credentials in environment secrets.</li>
    <li>Onboard verified MDCN clinicians and accredited partner hospital referral desks.</li>
  </ul>
</body>
</html>`;
}
