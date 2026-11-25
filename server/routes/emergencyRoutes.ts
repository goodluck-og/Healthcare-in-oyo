import { Router, type RequestHandler } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { recordServerAudit } from '../services/auditService.ts';
import type { FetchLike } from '../services/paymentService.ts';
import { dispatchEmergencySmsViaTwilio } from '../services/twilioEmergencyService.ts';
import { emergencySmsDispatchSchema } from '../validators/schemas.ts';

interface EmergencyRouterDeps {
  requireAuth: RequestHandler;
  emergencySmsRateLimit: RequestHandler;
  fetchImpl?: FetchLike;
}

export function createEmergencyRouter(deps: EmergencyRouterDeps): Router {
  const router = Router();

  router.post(
    '/api/emergency/sms/dispatch',
    deps.emergencySmsRateLimit,
    deps.requireAuth,
    async (req: AuthenticatedRequest, res) => {
      const parsed = emergencySmsDispatchSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: parsed.error.issues[0]?.message || 'Invalid emergency SMS payload.',
        });
        return;
      }

      const result = await dispatchEmergencySmsViaTwilio(parsed.data, deps.fetchImpl);

      recordServerAudit({
        actorUid: req.authUser?.uid || 'unknown',
        action: result.ok
          ? 'EMERGENCY_SMS_DISPATCHED'
          : result.configured
            ? 'EMERGENCY_SMS_FAILED'
            : 'EMERGENCY_SMS_UNCONFIGURED',
        endpoint: '/api/emergency/sms/dispatch',
        statusCode: result.httpStatus,
        summary: `Emergency SMS (${parsed.data.emergencyType}) for ${parsed.data.contacts.length} contact(s): ${result.dispatchedCount} sent.`,
      });

      res.status(result.httpStatus).json(result);
    }
  );

  return router;
}
