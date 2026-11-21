import type { NextFunction, Request, Response } from 'express';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getServerConfig } from '../config/env.ts';
import { recordServerAudit } from '../services/auditService.ts';

export interface AuthenticatedRequest extends Request {
  rawBody?: string;
  authUser?: {
    uid: string;
    email: string | null;
    emailVerified: boolean;
    isAdmin: boolean;
  };
}

function getFirebaseAdminAuth() {
  const { firebaseProjectId } = getServerConfig();
  const app = getApps().length ? getApp() : initializeApp({ projectId: firebaseProjectId });
  return getAuth(app);
}

export type TokenVerifier = (idToken: string) => Promise<{
  uid: string;
  email?: string;
  email_verified?: boolean;
  emailVerified?: boolean;
}>;

const defaultTokenVerifier: TokenVerifier = async (idToken: string) => {
  const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);
  return {
    uid: decoded.uid,
    email: decoded.email,
    email_verified: decoded.email_verified,
  };
};

function computeIsAdmin(email: string | null, emailVerified: boolean): boolean {
  if (!email || !emailVerified) return false;
  const { adminEmails } = getServerConfig();
  return adminEmails.includes(email.trim().toLowerCase());
}

export function createAuthMiddleware(verifier: TokenVerifier = defaultTokenVerifier) {
  const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      next();
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res
        .status(401)
        .json({ error: 'Invalid Authorization header format. Expected Bearer <Firebase ID Token>.' });
      return;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      res.status(401).json({ error: 'Empty Bearer token.' });
      return;
    }

    try {
      const decoded = await verifier(token);
      const email = decoded.email || null;
      const emailVerified = Boolean(decoded.email_verified ?? decoded.emailVerified);
      req.authUser = {
        uid: decoded.uid,
        email,
        emailVerified,
        isAdmin: computeIsAdmin(email, emailVerified),
      };
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired Firebase ID token.' });
    }
  };

  const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res
        .status(401)
        .json({ error: 'Authentication required. Include a valid Firebase Bearer token.' });
      return;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      res.status(401).json({ error: 'Authentication token missing.' });
      return;
    }

    try {
      const decoded = await verifier(token);
      const email = decoded.email || null;
      const emailVerified = Boolean(decoded.email_verified ?? decoded.emailVerified);
      req.authUser = {
        uid: decoded.uid,
        email,
        emailVerified,
        isAdmin: computeIsAdmin(email, emailVerified),
      };
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired Firebase ID token.' });
    }
  };

  const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    await requireAuth(req, res, () => {
      if (!req.authUser?.isAdmin) {
        recordServerAudit({
          actorUid: req.authUser?.uid || 'anonymous',
          action: 'ADMIN_ACCESS_DENIED',
          endpoint: req.path,
          statusCode: 403,
          summary: `Blocked unauthorized admin request from ${req.authUser?.email || 'unknown'}.`,
        });
        res.status(403).json({
          error: 'Administrator privileges with a verified email are required to access this endpoint.',
        });
        return;
      }
      next();
    });
  };

  return { optionalAuth, requireAuth, requireAdmin };
}

export const { optionalAuth, requireAuth, requireAdmin } = createAuthMiddleware();
