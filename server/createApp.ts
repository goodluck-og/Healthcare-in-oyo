import express, { type NextFunction, type Request, type Response } from 'express';
import {
  createAuthMiddleware,
  type AuthenticatedRequest,
  type TokenVerifier,
} from './middleware/auth.ts';
import {
  createRateLimiter,
  secureCorsMiddleware,
  securityHeadersMiddleware,
} from './middleware/security.ts';
import { createAiRouter } from './routes/aiRoutes.ts';
import { createHealthRouter } from './routes/healthRoutes.ts';
import { createPaymentRouter } from './routes/paymentRoutes.ts';
import { createVerificationRouter } from './routes/verificationRoutes.ts';
import type { FetchLike } from './services/paymentService.ts';

export interface CreateAppOptions {
  tokenVerifier?: TokenVerifier;
  fetchImpl?: FetchLike;
  rateLimits?: {
    paymentMax?: number;
    webhookMax?: number;
    aiMax?: number;
  };
}

export function createApiApp(options: CreateAppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');

  // Enterprise HTTP Security Headers & Strict CORS Allowlist
  app.use(securityHeadersMiddleware);
  app.use(secureCorsMiddleware);

  // Capture raw request body for cryptographic HMAC-SHA512 webhook signature verification
  app.use(
    express.json({
      limit: '5mb',
      verify: (req, _res, buf) => {
        (req as AuthenticatedRequest).rawBody = buf.toString('utf8');
      },
    })
  );
  // Parse application/x-www-form-urlencoded POST redirects returning from Interswitch Web Checkout
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));

  const { optionalAuth, requireAuth, requireAdmin } = createAuthMiddleware(options.tokenVerifier);

  const paymentRateLimit = createRateLimiter({
    windowMs: 60_000,
    maxRequests: options.rateLimits?.paymentMax ?? 30,
    scope: 'payments',
  });
  const webhookRateLimit = createRateLimiter({
    windowMs: 60_000,
    maxRequests: options.rateLimits?.webhookMax ?? 60,
    scope: 'webhooks',
  });
  const aiRateLimit = createRateLimiter({
    windowMs: 60_000,
    maxRequests: options.rateLimits?.aiMax ?? 30,
    scope: 'ai-assistant',
  });

  app.use(createHealthRouter());
  app.use('/api/ai', aiRateLimit);
  app.use(createAiRouter(optionalAuth));
  app.use(
    createPaymentRouter({
      requireAuth,
      requireAdmin,
      paymentRateLimit,
      webhookRateLimit,
      fetchImpl: options.fetchImpl,
    })
  );
  app.use('/api/verification', paymentRateLimit);
  app.use(createVerificationRouter(requireAuth));

  // Secure Error Handler — never leak internal stack traces or secrets to clients
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const isSyntaxError =
      err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400;
    if (isSyntaxError) {
      res.status(400).json({ error: 'Malformed JSON request payload.' });
      return;
    }
    res.status(500).json({ error: 'An unexpected server error occurred. Please try again.' });
  });

  return app;
}
