import { Router, type RequestHandler } from 'express';
import { type AuthenticatedRequest } from '../middleware/auth';
import { recordServerAudit } from '../services/auditService';
import { sendSmsVerificationOtp, verifySmsVerificationOtp } from '../services/verificationService';
import { smsOtpSendSchema, smsOtpVerifySchema } from '../validators/schemas';

export function createVerificationRouter(requireAuthMiddleware: RequestHandler) {
  const router = Router();

  router.post('/api/verification/sms/send', requireAuthMiddleware, (req: AuthenticatedRequest, res) => {
    const parsed = smsOtpSendSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid phone number.',
      });
      return;
    }

    const result = sendSmsVerificationOtp(parsed.data.phone);
    recordServerAudit({
      actorUid: req.authUser!.uid,
      action: 'SMS_OTP_REQUEST',
      endpoint: '/api/verification/sms/send',
      statusCode: result.statusCode,
      summary: result.configured ? 'SMS OTP requested.' : 'SMS OTP requested but provider is unconfigured.',
    });

    res.status(result.statusCode).json({
      sent: result.sent,
      configured: result.configured,
      message: result.message,
    });
  });

  router.post('/api/verification/sms/verify', requireAuthMiddleware, (req: AuthenticatedRequest, res) => {
    const parsed = smsOtpVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid phone number or 6-digit verification code.',
      });
      return;
    }

    const result = verifySmsVerificationOtp(parsed.data.phone, parsed.data.code);
    recordServerAudit({
      actorUid: req.authUser!.uid,
      action: 'SMS_OTP_VERIFY',
      endpoint: '/api/verification/sms/verify',
      statusCode: result.statusCode,
      summary: result.message,
    });

    res.status(result.statusCode).json({
      verified: result.verified,
      configured: result.configured,
      message: result.message,
    });
  });

  return router;
}
