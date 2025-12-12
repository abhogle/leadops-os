import type { FastifyInstance } from "fastify";
import { enforceTenancy } from "../tenancy/enforce-tenancy.js";
import { requireRole } from "../middleware/require-role.js";
import { orgConfig } from "@leadops/db";
import { loadVerticalPack } from "@leadops/vertical-packs";
import { eq } from "drizzle-orm";
import { transitionOnboardingState, OnboardingInvalidTransitionError } from "../services/onboarding-service.js";
import { SetIndustryRequestSchema } from "@leadops/schemas";
import { ValidationError, InternalError } from "../errors/index.js";

export async function registerOnboardingSetIndustryRoute(app: FastifyInstance) {
  app.post("/onboarding/set-industry", {
    preHandler: [enforceTenancy, requireRole("owner")]
  }, async (req, reply) => {
    try {
      const validation = SetIndustryRequestSchema.safeParse(req.body);

      if (!validation.success) {
        throw new ValidationError("Validation failed", validation.error.errors);
      }

      const body = validation.data;

      const context = req.tenantContext;
      if (!context || !context.org) {
        throw new InternalError("Organization context missing");
      }

      const { org } = context;
      const db = req.server.db;

      const vertical = loadVerticalPack(body.industry);

      const now = new Date();

      await db
        .update(orgConfig)
        .set({
          industry: body.industry,
          verticalPack: body.industry,
          leadFields: vertical.defaultLeadFields,
          workflows: vertical.defaultWorkflows,
          settings: vertical.defaultSettings,
          updatedAt: now,
        })
        .where(eq(orgConfig.orgId, org.id));

      // advance onboarding state org_created -> industry_selected (if valid)
      const onboardingState = await transitionOnboardingState(
        db,
        org.id,
        "industry_selected"
      );

      // Map internal onboardingState to API contract onboardingStatus
      return {
        success: true,
        industry: body.industry,
        onboardingStatus: onboardingState,
      };
    } catch (err) {
      req.log.error(err, "Failed to set industry");
      if (err instanceof OnboardingInvalidTransitionError) {
        throw new ValidationError(err.message);
      }
      throw err;
    }
  });
}
