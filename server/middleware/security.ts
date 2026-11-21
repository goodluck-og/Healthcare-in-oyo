import type { NextFunction, Request, Response } from 'express';
import { getServerConfig } from '../config/env.ts';
import { recordServerAudit } from '../services/auditService.ts';

/**
 * Security headers middleware protecting against XSS, clickjacking, MIME sniffing,
 * insecure referrer leakage, and framing attacks while preserving Firebase Auth
 * Google Sign-In popups and official Interswitch Inline Checkout scripts.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  const cfg = getServerConfig();

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=(self), payment=(self)'
  );
  // Required so Firebase Google Sign-In popup can communicate with window.opener safely
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  const cspDirectives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.usercontent.goog https://*.run.app https://*.cloud.google.com",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://newwebpay-sandbox.interswitchng.com https://newwebpay.interswitchng.com https://apis.google.com https://www.gstatic.com https://accounts.google.com https://*.firebaseapp.com https://maps.googleapis.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.googleusercontent.com https://*.gstatic.com https://*.google.com https://maps.gstatic.com https://maps.googleapis.com",
    "connect-src 'self' ws: wss: https://*.googleapis.com https://firebasevertexai.googleapis.com https://generativelanguage.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://www.gstatic.com https://accounts.google.com https://apis.google.com https://*.google.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://sandbox.interswitchng.com https://webpay.interswitchng.com https://newwebpay-sandbox.interswitchng.com https://newwebpay.interswitchng.com",
    "frame-src 'self' https://newwebpay-sandbox.interswitchng.com https://newwebpay.interswitchng.com https://*.firebaseapp.com https://accounts.google.com https://*.google.com",
  ];
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (cfg.isProduction || isHttps) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

/**
 * Explicit CORS allowlist protecting API endpoints against unauthorized cross-origin calls.
 */
export function secureCorsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (!origin) {
    next();
    return;
  }

  const cfg = getServerConfig();
  const allowedOrigins = new Set<string>([
    cfg.appUrl.replace(/\/$/, ''),
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]);

  const requestHost = req.headers.host;
  if (requestHost) {
    allowedOrigins.add(`https://${requestHost}`);
    allowedOrigins.add(`http://${requestHost}`);
  }

  const isAllowedOrigin =
    allowedOrigins.has(origin) ||
    /^https:\/\/ais-(dev|pre)-[a-z0-9-]+\.[a-z0-9-]+\.run\.app$/i.test(origin);

  if (isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Interswitch-Signature');
    res.setHeader('Access-Control-Max-Age', '600');
  }

  if (req.method === 'OPTIONS') {
    res.status(isAllowedOrigin ? 204 : 403).end();
    return;
  }

  if (!isAllowedOrigin && req.path.startsWith('/api/') && !req.path.startsWith('/api/webhooks/')) {
    res.status(403).json({ error: 'Cross-origin request blocked by server CORS policy.' });
    return;
  }

  next();
}

interface RateBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  scope: string;
}

/**
 * In-memory sliding-window rate limiter protecting payment, webhook, auth/verification,
 * and AI endpoints from brute-force and automated API abuse.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const buckets = new Map<string, RateBucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim()) ||
      req.socket.remoteAddress ||
      'unknown';
    const key = `${options.scope}:${ip}`;

    const existing = buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.maxRequests - 1)));
      next();
      return;
    }

    existing.count += 1;
    const remaining = Math.max(0, options.maxRequests - existing.count);
    res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (existing.count > options.maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      recordServerAudit({
        actorUid: `ip:${ip}`,
        action: 'RATE_LIMIT_EXCEEDED',
        endpoint: req.path,
        statusCode: 429,
        summary: `Rate limit exceeded on ${options.scope} (${existing.count}/${options.maxRequests}).`,
      });
      res.status(429).json({
        error: `Too many requests to ${options.scope}. Please wait ${retryAfterSec} seconds before retrying.`,
      });
      return;
    }

    next();
  };
}
