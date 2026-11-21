import { Router } from 'express';
import { getPublicIntegrationStatus } from '../config/env.ts';

export function createHealthRouter() {
  const router = Router();

  router.get('/api/health', (_req, res) => {
    const status = getPublicIntegrationStatus();
    res.json({
      ok: true,
      service: 'healthconnect-africa',
      providers: {
        geminiConfigured: status.geminiConfigured,
        openrouterConfigured: status.openrouterConfigured,
      },
      integrations: status,
    });
  });

  router.get('/api/config/integrations', (_req, res) => {
    res.json(getPublicIntegrationStatus());
  });

  return router;
}
