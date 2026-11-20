import { Router, type RequestHandler } from 'express';
import { type AuthenticatedRequest } from '../middleware/auth';
import { AiGatewayError, runAiGateway } from '../services/aiGateway';
import { recordServerAudit } from '../services/auditService';
import { aiHealthAssistantSchema } from '../validators/schemas';

export function createAiRouter(optionalAuthMiddleware: RequestHandler) {
  const router = Router();

  router.post('/api/ai/health-assistant', optionalAuthMiddleware, async (req: AuthenticatedRequest, res) => {
    const parsed = aiHealthAssistantSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid AI assistant request payload.',
      });
      return;
    }

    const actorUid = req.authUser?.uid || 'guest-preview';

    try {
      const result = await runAiGateway({
        provider: parsed.data.provider,
        model: parsed.data.model,
        mode: parsed.data.mode,
        patientContext: parsed.data.patientContext,
        messages: parsed.data.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      recordServerAudit({
        actorUid,
        action: 'AI_HEALTH_ASSISTANT_QUERY',
        endpoint: '/api/ai/health-assistant',
        statusCode: 200,
        summary: `AI response via ${result.provider} (${result.model}) in mode "${parsed.data.mode || 'default'}".`,
      });

      res.json({
        reply: result.reply,
        provider: result.provider,
        model: result.model,
        authenticatedUid: req.authUser?.uid || null,
      });
    } catch (err) {
      if (err instanceof AiGatewayError) {
        recordServerAudit({
          actorUid,
          action: 'AI_HEALTH_ASSISTANT_ERROR',
          endpoint: '/api/ai/health-assistant',
          statusCode: err.statusCode,
          summary: err.message.slice(0, 180),
        });
        res.status(err.statusCode).json({ error: err.message });
        return;
      }

      const message = err instanceof Error ? err.message : 'Unexpected server error';
      recordServerAudit({
        actorUid,
        action: 'AI_HEALTH_ASSISTANT_ERROR',
        endpoint: '/api/ai/health-assistant',
        statusCode: 500,
        summary: message.slice(0, 180),
      });
      res.status(500).json({
        error: `Unable to reach the AI Health Assistant right now: ${message}`,
      });
    }
  });

  return router;
}
