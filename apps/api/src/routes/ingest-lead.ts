import type { FastifyInstance } from "fastify";
import { LeadIngestSchema, LeadIngestResponseSchema } from "@leadops/schemas";
import { ingestLead } from "../services/lead-ingestion.js";
import { ValidationError, InternalError } from "../errors/index.js";

/**
 * POST /ingest/lead
 *
 * Creates lead + conversation
 *
 * @public endpoint (no auth required - for webhook ingestion)
 * @ratelimit 100 requests per 15 minutes (webhook endpoint)
 */
export async function registerIngestLeadRoute(app: FastifyInstance) {
  app.post("/ingest/lead", {
    config: {
      rateLimit: {
        max: 100,
        timeWindow: "15 minutes",
      },
    },
  }, async (req, reply) => {
    try {
      // For now, require org_id in the request body or query param
      // In production, this would come from webhook auth or API key
      const orgId = (req.body as any)?.org_id || (req.query as any)?.org_id as string;

      if (!orgId) {
        throw new ValidationError("org_id is required for lead ingestion");
      }

      // Validate request body
      const validation = LeadIngestSchema.safeParse(req.body);

      if (!validation.success) {
        throw new ValidationError("Validation failed", validation.error.errors);
      }

      const leadData = validation.data;

      // Ingest lead
      const result = await ingestLead(
        app.db,
        orgId,
        null, // companyId - future support for sub-companies
        leadData
      );

      // Return response
      const response = LeadIngestResponseSchema.parse({
        lead_id: result.leadId,
        conversation_id: result.conversationId,
        status: "created" as const,
      });

      return reply.status(201).send(response);
    } catch (err) {
      if (err instanceof ValidationError || err instanceof InternalError) {
        throw err;
      }
      req.log.error(err, "Lead ingestion failed");
      throw new InternalError("Lead ingestion failed");
    }
  });
}
