import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { enforceTenancy } from "../tenancy/enforce-tenancy.js";
import { requireRole } from "../middleware/require-role.js";
import { transitionOnboardingState, OnboardingInvalidTransitionError } from "../services/onboarding-service.js";
import { ValidationError, InternalError } from "../errors/index.js";

export async function registerOnboardingFinishRoute(app: FastifyInstance) {
  app.post("/onboarding/finish", {
    preHandler: [enforceTenancy, requireRole("owner")]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const context = req.tenantContext;
      if (!context || !context.org) {
        throw new InternalError("Organization context missing");
      }

      const { org } = context;
      const db = app.db;

      const finalState = await transitionOnboardingState(db, org.id, "completed");

      // Map internal onboardingState to API contract onboardingStatus
      return { onboardingStatus: finalState };
    } catch (err) {
      if (err instanceof OnboardingInvalidTransitionError) {
        throw new ValidationError(err.message);
      }
      throw err;
    }
  });
}
