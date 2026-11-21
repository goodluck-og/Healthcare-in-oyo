import { Router, type RequestHandler } from 'express';
import { type AuthenticatedRequest } from '../middleware/auth.ts';
import { recordServerAudit } from '../services/auditService.ts';
import {
  getAdminPaymentDashboardSummary,
  initializeInterswitchPayment,
  initializeInterswitchWebCheckout,
  processInterswitchWebhook,
  verifyInterswitchPayment,
  verifyInterswitchTransactionByRef,
  type FetchLike,
  type InterswitchWebhookPayload,
} from '../services/paymentService.ts';
import {
  interswitchInitSchema,
  interswitchRefParamSchema,
  paymentInitSchema,
  paymentVerifySchema,
} from '../validators/schemas.ts';

export interface PaymentRouterOptions {
  requireAuth: RequestHandler;
  requireAdmin: RequestHandler;
  paymentRateLimit?: RequestHandler;
  webhookRateLimit?: RequestHandler;
  fetchImpl?: FetchLike;
}

export function createPaymentRouter(options: PaymentRouterOptions) {
  const { requireAuth, requireAdmin, paymentRateLimit, webhookRateLimit, fetchImpl } = options;
  const router = Router();
  const payGuard: RequestHandler[] = paymentRateLimit ? [paymentRateLimit] : [];
  const whGuard: RequestHandler[] = webhookRateLimit ? [webhookRateLimit] : [];

  /**
   * Official Interswitch Web Checkout Initialization
   * POST /api/payments/interswitch/initialize
   * Resolves authoritative server-side pricing, validates credentials, generates unique txn_ref,
   * and returns ONLY safe frontend inline-checkout parameters (never INTERSWITCH_SECRET_KEY).
   */
  router.post(
    '/api/payments/interswitch/initialize',
    ...payGuard,
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      const parsed = interswitchInitSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: parsed.error.issues[0]?.message || 'Invalid Interswitch initialization payload.',
        });
        return;
      }

      try {
        const result = initializeInterswitchWebCheckout({
          orderId: parsed.data.orderId,
          amountNgn: parsed.data.amountNgn,
          category: parsed.data.category,
          description: parsed.data.description,
          method: parsed.data.method,
          customerUid: req.authUser!.uid,
          customerName: parsed.data.customerName,
          customerEmail: req.authUser?.email,
          customerPhone: parsed.data.customerPhone,
          siteRedirectUrl: parsed.data.siteRedirectUrl,
        });

        recordServerAudit({
          actorUid: req.authUser!.uid,
          action: 'INTERSWITCH_INIT',
          endpoint: '/api/payments/interswitch/initialize',
          statusCode: result.configured ? 200 : 503,
          summary: `Interswitch init (${result.mode}) ref=${result.reference} order=${result.orderId} amount=NGN ${result.amountNgn}.`,
        });

        if (!result.configured) {
          res.status(503).json({
            ...result,
            error: result.message,
          });
          return;
        }

        res.status(200).json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to initialize payment.';
        res.status(400).json({ error: message });
      }
    }
  );

  /**
   * Interswitch Option 2 Web Redirect Return Receiver
   * POST /payment-response
   * Interswitch submits form-encoded fields back to site_redirect_url.
   * Redirect via HTTP 303 to GET /payment-response?... so the React SPA verifies server-side.
   */
  router.post('/payment-response', (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const query = (req.query || {}) as Record<string, unknown>;
    const pick = (...keys: string[]): string => {
      for (const key of keys) {
        const val = body[key] ?? query[key];
        if (typeof val === 'string' && val.trim()) {
          return val.trim().slice(0, 140);
        }
      }
      return '';
    };

    const params = new URLSearchParams();
    const txnref = pick('txnref', 'txn_ref', 'ref', 'merchantReference');
    const resp = pick('resp', 'responseCode', 'ResponseCode');
    const desc = pick('desc', 'respDesc', 'ResponseDescription');
    const payRef = pick('payRef', 'retRef', 'PaymentReference');
    if (txnref) params.set('txnref', txnref);
    if (resp) params.set('resp', resp);
    if (desc) params.set('desc', desc);
    if (payRef) params.set('payRef', payRef);

    const qs = params.toString();
    res.redirect(303, qs ? `/payment-response?${qs}` : '/payment-response');
  });

  /**
   * Official Server-to-Server Interswitch Verification
   * GET /api/payments/interswitch/verify/:transactionReference
   */
  router.get(
    '/api/payments/interswitch/verify/:transactionReference',
    ...payGuard,
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      const refParse = interswitchRefParamSchema.safeParse(req.params.transactionReference);
      if (!refParse.success) {
        res.status(400).json({ error: 'Invalid transaction reference format.' });
        return;
      }

      try {
        const result = await verifyInterswitchTransactionByRef(refParse.data, { fetchImpl });
        recordServerAudit({
          actorUid: req.authUser!.uid,
          action: 'INTERSWITCH_VERIFY',
          endpoint: `/api/payments/interswitch/verify/${refParse.data}`,
          statusCode: result.httpStatus,
          summary: `Verified ${refParse.data}: status=${result.status} verified=${String(result.verified)}.`,
        });
        res.status(result.httpStatus).json(result);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to complete Interswitch verification.';
        recordServerAudit({
          actorUid: req.authUser!.uid,
          action: 'INTERSWITCH_VERIFY_ERROR',
          endpoint: `/api/payments/interswitch/verify/${refParse.data}`,
          statusCode: 502,
          summary: message,
        });
        res.status(502).json({ error: 'Payment gateway verification failed. Please retry shortly.' });
      }
    }
  );

  /**
   * Official Interswitch Webhook Receiver
   * POST /api/webhooks/interswitch
   * Validates HMAC-SHA512 X-Interswitch-Signature over the raw request body.
   */
  router.post(
    '/api/webhooks/interswitch',
    ...whGuard,
    async (req: AuthenticatedRequest, res) => {
      const rawBody =
        typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.body || {});
      const signature = req.header('x-interswitch-signature') || req.header('X-Interswitch-Signature');
      const payload = (req.body || {}) as InterswitchWebhookPayload;

      try {
        const result = await processInterswitchWebhook(rawBody, signature, payload, fetchImpl);
        res.status(result.httpStatus).json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Webhook processing failed.';
        recordServerAudit({
          actorUid: 'interswitch-webhook',
          action: 'WEBHOOK_ERROR',
          endpoint: '/api/webhooks/interswitch',
          statusCode: 500,
          summary: message,
        });
        res.status(500).json({ error: 'Internal webhook processing error.' });
      }
    }
  );

  /**
   * Administrator-Only Payment Management Endpoint
   * GET /api/admin/payments
   */
  router.get(
    '/api/admin/payments',
    ...payGuard,
    requireAdmin,
    (req: AuthenticatedRequest, res) => {
      const data = getAdminPaymentDashboardSummary();
      recordServerAudit({
        actorUid: req.authUser!.uid,
        action: 'ADMIN_PAYMENTS_VIEW',
        endpoint: '/api/admin/payments',
        statusCode: 200,
        summary: `Administrator inspected payment ledger (${data.summary.totalTransactions} records).`,
      });
      res.json(data);
    }
  );

  // Backwards-compatible payment endpoints preserved for existing callers
  router.post(
    '/api/payments/initialize',
    ...payGuard,
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      const parsed = paymentInitSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: parsed.error.issues[0]?.message || 'Invalid payment initialization payload.',
        });
        return;
      }

      const result = initializeInterswitchPayment({
        orderId: parsed.data.orderId,
        amountNgn: parsed.data.amountNgn,
        category: parsed.data.category,
        description: parsed.data.description,
        method: parsed.data.method,
        customerUid: req.authUser!.uid,
        customerName: parsed.data.customerName,
        customerEmail: req.authUser?.email,
        customerPhone: parsed.data.customerPhone,
      });

      recordServerAudit({
        actorUid: req.authUser!.uid,
        action: 'PAYMENT_INITIALIZE',
        endpoint: '/api/payments/initialize',
        statusCode: 200,
        summary: `Initialized ${result.mode} payment ${result.reference} for NGN ${parsed.data.amountNgn}.`,
      });

      res.json(result);
    }
  );

  router.post(
    '/api/payments/verify',
    ...payGuard,
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      const parsed = paymentVerifySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: parsed.error.issues[0]?.message || 'Invalid payment verification payload.',
        });
        return;
      }

      try {
        const result = await verifyInterswitchPayment(
          parsed.data.reference,
          parsed.data.amountNgn,
          fetchImpl
        );
        recordServerAudit({
          actorUid: req.authUser!.uid,
          action: 'PAYMENT_VERIFY',
          endpoint: '/api/payments/verify',
          statusCode: 200,
          summary: `Verification check for ${parsed.data.reference}: ${result.status}.`,
        });
        res.json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to verify payment.';
        res.status(502).json({ error: message });
      }
    }
  );

  return router;
}
