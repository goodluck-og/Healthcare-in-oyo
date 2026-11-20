export type PaymentRecordStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'AMOUNT_MISMATCH'
  | 'UNCONFIGURED';

export interface ServerPaymentRecord {
  id: string;
  order_id: string;
  transaction_reference: string;
  merchant_code: string;
  amount: number; // Minor currency units (kobo for NGN)
  amount_ngn: number;
  currency: '566';
  payment_provider: 'interswitch';
  environment: 'sandbox' | 'production';
  payment_status: PaymentRecordStatus;
  payment_method: string;
  customer_uid: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  description: string;
  category: string;
  gateway_response_code?: string;
  gateway_response_description?: string;
  created_at: string;
  updated_at: string;
  verified_at?: string;
}

export interface ServerWebhookEventRecord {
  id: string;
  event_id: string;
  event_type: string;
  transaction_reference: string;
  processing_status: 'PROCESSED' | 'DUPLICATE_IGNORED' | 'VERIFICATION_PENDING' | 'FAILED';
  received_at: string;
  processed_at?: string;
}

export interface AuthoritativeCatalogOrder {
  orderId: string;
  title: string;
  category:
    | 'Subscription'
    | 'Consultation'
    | 'Laboratory'
    | 'Pharmacy'
    | 'Equipment Rental'
    | 'Wallet Top-Up';
  amountNgn: number;
}

/**
 * Authoritative server-side catalog prices (NGN).
 * When a browser sends an orderId from this catalog, the server ALWAYS computes the
 * amount from this table and NEVER trusts a browser-supplied price.
 */
export const AUTHORITATIVE_ORDER_CATALOG: Record<string, AuthoritativeCatalogOrder> = {
  'plan-oyo-individual-monthly': {
    orderId: 'plan-oyo-individual-monthly',
    title: 'HealthConnect Oyo State — Individual Plan (Monthly)',
    category: 'Subscription',
    amountNgn: 16000,
  },
  'plan-oyo-family-monthly': {
    orderId: 'plan-oyo-family-monthly',
    title: 'HealthConnect Oyo State — Family Plan of 5 (Monthly)',
    category: 'Subscription',
    amountNgn: 50000,
  },
  'consult-uch-cardiology': {
    orderId: 'consult-uch-cardiology',
    title: 'Cardiology Consultation · UCH Ibadan',
    category: 'Consultation',
    amountNgn: 18000,
  },
  'consult-bodija-obgyn': {
    orderId: 'consult-bodija-obgyn',
    title: 'OB-GYN & PCOS Consultation · Bodija Ibadan',
    category: 'Consultation',
    amountNgn: 16500,
  },
  'consult-ogbomoso-family': {
    orderId: 'consult-ogbomoso-family',
    title: 'Family Medicine Consultation · Ogbomoso',
    category: 'Consultation',
    amountNgn: 12000,
  },
  'consult-physio-rehab': {
    orderId: 'consult-physio-rehab',
    title: 'Remote Physiotherapy Follow-Up (Video)',
    category: 'Consultation',
    amountNgn: 18500,
  },
  'consult-cardiology-lagos': {
    orderId: 'consult-cardiology-lagos',
    title: 'Consultation · Dr. Adewale Ogunleye',
    category: 'Consultation',
    amountNgn: 25000,
  },
  'lab-malaria-typhoid': {
    orderId: 'lab-malaria-typhoid',
    title: 'Fever, Malaria RDT & Typhoid Panel',
    category: 'Laboratory',
    amountNgn: 12500,
  },
  'lab-sickle-genotype': {
    orderId: 'lab-sickle-genotype',
    title: 'Genotype, Blood Group & Sickle Cell Screening (Oyo Hub)',
    category: 'Laboratory',
    amountNgn: 8500,
  },
  'lab-wellness-hba1c': {
    orderId: 'lab-wellness-hba1c',
    title: 'Executive Wellness & HbA1c Screening',
    category: 'Laboratory',
    amountNgn: 34000,
  },
  'lab-antenatal-bundle': {
    orderId: 'lab-antenatal-bundle',
    title: 'Maternal Antenatal Screening Bundle',
    category: 'Laboratory',
    amountNgn: 24500,
  },
  'rx-chronic-refill': {
    orderId: 'rx-chronic-refill',
    title: 'Chronic Care Medication Refill Pack (30-Day)',
    category: 'Pharmacy',
    amountNgn: 9500,
  },
  'plan-individual-annual': {
    orderId: 'plan-individual-annual',
    title: 'Individual Annual HealthConnect Plan',
    category: 'Subscription',
    amountNgn: 45000,
  },
  'plan-family-annual': {
    orderId: 'plan-family-annual',
    title: 'Family Care Annual Plan (Up to 5 Members)',
    category: 'Subscription',
    amountNgn: 95000,
  },
};

const paymentsByRef = new Map<string, ServerPaymentRecord>();
const webhookEventsByEventId = new Map<string, ServerWebhookEventRecord>();

export function savePaymentRecord(record: ServerPaymentRecord): ServerPaymentRecord {
  if (paymentsByRef.has(record.transaction_reference)) {
    throw new Error(`Duplicate transaction reference: ${record.transaction_reference}`);
  }
  paymentsByRef.set(record.transaction_reference, record);
  return record;
}

export function getPaymentByReference(reference: string): ServerPaymentRecord | null {
  return paymentsByRef.get(reference) || null;
}

export function updatePaymentRecord(
  reference: string,
  updates: Partial<Omit<ServerPaymentRecord, 'id' | 'transaction_reference' | 'created_at'>>
): ServerPaymentRecord | null {
  const existing = paymentsByRef.get(reference);
  if (!existing) return null;
  const updated: ServerPaymentRecord = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  paymentsByRef.set(reference, updated);
  return updated;
}

export function listAllPaymentRecords(): ServerPaymentRecord[] {
  return Array.from(paymentsByRef.values()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
}

export function getWebhookEventByEventId(eventId: string): ServerWebhookEventRecord | null {
  return webhookEventsByEventId.get(eventId) || null;
}

export function saveWebhookEvent(record: ServerWebhookEventRecord): ServerWebhookEventRecord {
  webhookEventsByEventId.set(record.event_id, record);
  return record;
}

export function listAllWebhookEvents(): ServerWebhookEventRecord[] {
  return Array.from(webhookEventsByEventId.values()).sort((a, b) =>
    b.received_at.localeCompare(a.received_at)
  );
}

export function clearPaymentStoreForTests(): void {
  paymentsByRef.clear();
  webhookEventsByEventId.clear();
}
