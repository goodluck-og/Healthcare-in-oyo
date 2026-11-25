import { Router, type RequestHandler } from 'express';
import { type AuthenticatedRequest } from '../middleware/auth.ts';
import { medicalRedFlagAiMiddleware } from '../middleware/medicalRedFlagMiddleware.ts';
import { AiGatewayError, runAiGateway } from '../services/aiGateway.ts';
import { recordServerAudit } from '../services/auditService.ts';
import { aiHealthAssistantSchema, drugLookupQuerySchema } from '../validators/schemas.ts';
import { filterAndMaskChatPii, type ChatPiiCategory } from '../../shared/chatPiiFilter.ts';
import { evaluateModeratorBot } from '../../shared/moderatorBot.ts';

function pickFirstText(arr?: string[], maxLen = 420): string | undefined {
  const first = arr?.find((item) => typeof item === 'string' && item.trim().length > 0);
  if (!first) return undefined;
  const normalized = first.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLen ? `${normalized.slice(0, maxLen - 3)}...` : normalized;
}

export function createAiRouter(optionalAuthMiddleware: RequestHandler) {
  const router = Router();

  router.post(
    '/api/ai/health-assistant',
    optionalAuthMiddleware,
    medicalRedFlagAiMiddleware,
    async (req: AuthenticatedRequest, res) => {
      const parsed = aiHealthAssistantSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: parsed.error.issues[0]?.message || 'Invalid AI assistant request payload.',
        });
        return;
      }

      const actorUid = req.authUser?.uid || 'guest-preview';

      // Defense-in-depth: HealthConnect Sentinel Bot masks phone numbers, financial account numbers,
      // and physical GPS coordinates before forwarding any message to external AI providers.
      const detectedPiiSet = new Set<ChatPiiCategory>();
      let moderatorBotAction: string = 'allowed';
      const sanitizedMessages = parsed.data.messages.map((m) => {
        const filtered = filterAndMaskChatPii(m.content);
        for (const cat of filtered.detectedCategories) {
          detectedPiiSet.add(cat);
        }
        if (m.role === 'user') {
          const decision = evaluateModeratorBot(m.content);
          if (decision.action !== 'allowed') {
            moderatorBotAction = decision.action;
          }
        }
        return {
          role: m.role,
          content: filtered.maskedText,
        };
      });
      const piiMaskedCategories = Array.from(detectedPiiSet);

      try {
        const result = await runAiGateway({
          provider: parsed.data.image ? 'gemini' : parsed.data.provider,
          model: parsed.data.model,
          mode: parsed.data.mode,
          patientContext: parsed.data.patientContext,
          image: parsed.data.image,
          messages: sanitizedMessages,
        });

        recordServerAudit({
          actorUid,
          action: parsed.data.image ? 'AI_MULTIMODAL_HEALTH_QUERY' : 'AI_HEALTH_ASSISTANT_QUERY',
          endpoint: '/api/ai/health-assistant',
          statusCode: 200,
          summary: `AI response via ${result.provider} (${result.model}) in mode "${parsed.data.mode || 'default'}"${parsed.data.image ? ' [with image]' : ''}${piiMaskedCategories.length > 0 ? ` [Sentinel Bot masked: ${piiMaskedCategories.join(', ')}]` : ''}.`,
        });

        res.json({
          reply: result.reply,
          provider: result.provider,
          model: result.model,
          authenticatedUid: req.authUser?.uid || null,
          piiMaskedCategories,
          moderatorBotAction,
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
    }
  );

  // Public verified drug labeling lookup powered by openFDA (https://api.fda.gov/drug/label.json)
  router.get('/api/medical/drug-lookup', async (req, res) => {
    const parsed = drugLookupQuerySchema.safeParse({ q: req.query.q });
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Provide a valid medication name.',
      });
      return;
    }

    const queryText = parsed.data.q;
    const encoded = encodeURIComponent(
      `openfda.generic_name:"${queryText}"+openfda.brand_name:"${queryText}"`
    );
    const fdaUrl = `https://api.fda.gov/drug/label.json?search=${encoded}&limit=3`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(fdaUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (response.status === 404) {
        res.json({
          query: queryText,
          source: 'openFDA Drug Labeling API',
          results: [],
          message: `No FDA drug label matched "${queryText}". Check the generic name (e.g., paracetamol/acetaminophen, ibuprofen, metformin, amlodipine, amoxicillin).`,
        });
        return;
      }

      if (!response.ok) {
        res.status(502).json({
          error: `openFDA returned status ${response.status}. Try again shortly.`,
        });
        return;
      }

      const data = (await response.json()) as {
        results?: Array<{
          openfda?: {
            brand_name?: string[];
            generic_name?: string[];
            route?: string[];
            manufacturer_name?: string[];
          };
          purpose?: string[];
          indications_and_usage?: string[];
          warnings?: string[];
          boxed_warning?: string[];
          dosage_and_administration?: string[];
          do_not_use?: string[];
        }>;
      };

      const formatted = (data.results || []).slice(0, 3).map((item) => ({
        brandName: item.openfda?.brand_name?.[0] || queryText,
        genericName: item.openfda?.generic_name?.[0] || 'See product packaging',
        route: item.openfda?.route?.[0] || 'Oral / Topical',
        purpose:
          pickFirstText(item.purpose, 240) ||
          pickFirstText(item.indications_and_usage, 340) ||
          'Consult licensed pharmacist or doctor for clinical indications.',
        warnings:
          pickFirstText(item.boxed_warning, 360) ||
          pickFirstText(item.warnings, 380) ||
          pickFirstText(item.do_not_use, 320) ||
          'Follow licensed clinician and pharmacist safety instructions.',
        dosageSummary:
          pickFirstText(item.dosage_and_administration, 260) ||
          'Always follow the exact dose prescribed by your doctor or pharmacist.',
      }));

      res.json({
        query: queryText,
        source: 'openFDA Drug Labeling API (U.S. FDA)',
        results: formatted,
        disclaimer:
          'Verified reference labeling for educational review only. Always confirm personal dosing and drug interactions with a licensed doctor or pharmacist.',
      });
    } catch {
      res.status(503).json({
        error:
          'Unable to reach openFDA right now. You can continue using HealthConnect’s offline verified medical guides.',
      });
    }
  });

  return router;
}
