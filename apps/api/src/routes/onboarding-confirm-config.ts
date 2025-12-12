import type { FastifyInstance } from "fastify";
import { enforceTenancy } from "../tenancy/enforce-tenancy.js";
import { requireRole } from "../middleware/require-role.js";
import { orgConfig } from "@leadops/db";
import { eq } from "drizzle-orm";
import { transitionOnboardingState, OnboardingInvalidTransitionError } from "../services/onboarding-service.js";
import { ConfirmConfigRequestSchema } from "@leadops/schemas";
import { ValidationError, InternalError } from "../errors/index.js";

export async function registerOnboardingConfirmConfigRoute(app: FastifyInstance) {
  app.post("/onboarding/confirm-config", {
    preHandler: [enforceTenancy, requireRole("owner")]
  }, async (req, reply) => {
    try {
      const validation = ConfirmConfigRequestSchema.safeParse(req.body);

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

      const now = new Date();

      await db
        .update(orgConfig)
        .set({
          ...(body.leadFields && { leadFields: body.leadFields }),
          ...(body.workflows && { workflows: body.workflows }),
          ...(body.settings && { settings: body.settings }),
          updatedAt: now,
        })
        .where(eq(orgConfig.orgId, org.id));

      const onboardingState = await transitionOnboardingState(
        db,
        org.id,
        "config_confirmed"
      );

      // Map internal onboardingState to API contract onboardingStatus
      return {
        success: true,
        onboardingStatus: onboardingState,
      };
    } catch (err) {
      if (err instanceof OnboardingInvalidTransitionError) {
        throw new ValidationError(err.message);
      }
      throw err;
    }
  });
}
