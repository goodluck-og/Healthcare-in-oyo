import type { NextFunction, Response } from 'express';
import {
  buildEmergencyEscalationReply,
  EMERGENCY_PAGE_ROUTE,
  scanTextForMedicalRedFlags,
  URGENT_CARE_FOOTER,
  type RedFlagScanResult,
} from '../../shared/medicalRedFlags.ts';
import { recordServerAudit } from '../services/auditService.ts';
import type { AuthenticatedRequest } from './auth.ts';

export interface RedFlagMiddlewarePayload {
  reply: string;
  provider: string;
  model: string;
  authenticatedUid: string | null;
  redFlagDetected: boolean;
  haltEducationalDialogue: boolean;
  matchedKeywords: string[];
  matchedCategories: string[];
  urgentFooter: string;
  emergencyRoute: typeof EMERGENCY_PAGE_ROUTE;
}

function buildServerEscalationPayload(
  scan: RedFlagScanResult,
  authenticatedUid: string | null,
  source: 'request' | 'response'
): RedFlagMiddlewarePayload {
  return {
    reply: buildEmergencyEscalationReply(scan),
    provider: 'safety-middleware',
    model: source === 'request' ? 'red-flag-request-filter' : 'red-flag-response-filter',
    authenticatedUid,
    redFlagDetected: true,
    haltEducationalDialogue: true,
    matchedKeywords: scan.matchedKeywords,
    matchedCategories: scan.matchedCategories,
    urgentFooter: URGENT_CARE_FOOTER,
    emergencyRoute: EMERGENCY_PAGE_ROUTE,
  };
}

/**
 * Express middleware layer for `/api/ai/health-assistant` that performs keyword
 * filtering for medical red-flags (e.g., "shortness of breath", "unconscious")
 * on BOTH incoming user messages and outgoing AI responses.
 *
 * When a medical red-flag is detected:
 * 1. Halts educational AI dialogue immediately (short-circuits before LLM call
 *    if detected on input, or intercepts `res.json` if detected in AI output).
 * 2. Automatically appends the "Urgent: Seek Professional Care" footer.
 * 3. Returns `emergencyRoute: '/emergency'` and `haltEducationalDialogue: true`
 *    so the client routes/links the user directly to EmergencyPage.
 */
export function medicalRedFlagAiMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const actorUid = req.authUser?.uid || 'guest-preview';

  // 1. Pre-LLM filter: inspect latest user turn (if present in request body)
  const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const lastUserMessage = [...rawMessages]
    .reverse()
    .find(
      (m): m is { role: string; content: string } =>
        Boolean(m) && m.role === 'user' && typeof m.content === 'string'
    );

  if (lastUserMessage) {
    const requestScan = scanTextForMedicalRedFlags(lastUserMessage.content);
    if (requestScan.detected) {
      recordServerAudit({
        actorUid,
        action: 'AI_RED_FLAG_INTERCEPTED',
        endpoint: '/api/ai/health-assistant',
        statusCode: 200,
        summary: `Halted educational dialogue on input red-flag keywords: ${requestScan.matchedKeywords.join(', ')}.`,
      });
      res.status(200).json(
        buildServerEscalationPayload(requestScan, req.authUser?.uid || null, 'request')
      );
      return;
    }
  }

  // 2. Post-LLM response filter: wrap res.json to scan outgoing AI replies
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (
      body &&
      typeof body === 'object' &&
      'reply' in body &&
      typeof (body as { reply?: unknown }).reply === 'string' &&
      !(body as { redFlagDetected?: boolean }).redFlagDetected
    ) {
      const replyText = (body as { reply: string }).reply;
      const responseScan = scanTextForMedicalRedFlags(replyText);

      if (responseScan.detected) {
        recordServerAudit({
          actorUid,
          action: 'AI_RESPONSE_RED_FLAG_INTERCEPTED',
          endpoint: '/api/ai/health-assistant',
          statusCode: 200,
          summary: `Intercepted AI output containing red-flag keywords: ${responseScan.matchedKeywords.join(', ')}.`,
        });
        return originalJson(
          buildServerEscalationPayload(responseScan, req.authUser?.uid || null, 'response')
        );
      }

      return originalJson({
        ...(body as Record<string, unknown>),
        redFlagDetected: false,
        haltEducationalDialogue: false,
      });
    }

    return originalJson(body);
  }) as Response['json'];

  next();
}
