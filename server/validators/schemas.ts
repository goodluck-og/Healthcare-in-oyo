import { z } from 'zod';

export const ALLOWED_OPENROUTER_MODELS = [
  'openai/gpt-4o',
  'google/gemini-2.5-flash',
] as const;

export const aiImageAttachmentSchema = z.object({
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  base64Data: z
    .string()
    .min(16, 'Image payload is too small')
    .max(3_200_000, 'Image must be compressed under 2.4MB before uploading')
    .regex(/^[A-Za-z0-9+/=\s]+$/, 'Invalid base64 image encoding'),
  categoryHint: z.string().trim().max(80).optional(),
});

export const aiHealthAssistantSchema = z.object({
  provider: z.enum(['gemini', 'openrouter']).default('gemini'),
  model: z.enum(ALLOWED_OPENROUTER_MODELS).optional(),
  mode: z.string().trim().max(120).optional(),
  patientContext: z.string().trim().max(2500).optional(),
  image: aiImageAttachmentSchema.optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1, 'Message content cannot be empty').max(4000),
      })
    )
    .min(1, 'At least one message is required')
    .max(20, 'Conversation window cannot exceed 20 turns'),
});

export const drugLookupQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters for a medication name')
    .max(80, 'Medication query is too long')
    .regex(/^[a-zA-Z0-9\s\-+/.()]+$/, 'Medication name contains unsupported characters'),
});

export const paymentInitSchema = z.object({
  orderId: z.string().trim().min(2).max(80).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  amountNgn: z.number().finite().positive().max(10_000_000),
  category: z.enum([
    'Subscription',
    'Consultation',
    'Laboratory',
    'Pharmacy',
    'Equipment Rental',
    'Wallet Top-Up',
  ]),
  description: z.string().trim().min(2).max(200),
  method: z.enum(['Interswitch Card', 'Interswitch Bank Transfer', 'Interswitch USSD']),
  customerName: z.string().trim().max(100).optional(),
  customerPhone: z.string().trim().max(24).optional(),
});

export const interswitchInitSchema = z.object({
  orderId: z.string().trim().min(2).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  amountNgn: z.number().finite().positive().max(2_000_000).optional(),
  category: z
    .enum([
      'Subscription',
      'Consultation',
      'Laboratory',
      'Pharmacy',
      'Equipment Rental',
      'Wallet Top-Up',
    ])
    .optional(),
  description: z.string().trim().min(2).max(200).optional(),
  method: z
    .enum(['Interswitch Card', 'Interswitch Bank Transfer', 'Interswitch USSD'])
    .optional(),
  customerName: z.string().trim().max(100).optional(),
  customerPhone: z.string().trim().max(24).optional(),
  siteRedirectUrl: z.string().trim().url().max(300).optional(),
});

export const interswitchRefParamSchema = z
  .string()
  .trim()
  .min(6)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid transaction reference format');

export const paymentVerifySchema = z.object({
  reference: z.string().trim().min(4).max(80),
  amountNgn: z.number().finite().nonnegative().max(10_000_000),
});

export const smsOtpSendSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{7,20}$/, 'Enter a valid Nigerian or international phone number'),
});

export const smsOtpVerifySchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{7,20}$/, 'Enter a valid phone number'),
  code: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, 'Verification code must be 6 digits'),
});
