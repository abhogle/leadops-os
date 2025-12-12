import type { FastifyInstance, FastifyRequest } from "fastify";
import { enforceTenancy } from "../tenancy/enforce-tenancy.js";
import { loadOrgConfig } from "../services/config-service.js";
import { InternalError } from "../errors/index.js";

export async function registerOnboardingStateRoute(app: FastifyInstance) {
  app.get("/onboarding/state", { preHandler: [enforceTenancy] }, async (req: FastifyRequest, reply) => {
    const context = req.tenantContext;
    if (!context || !context.org || !context.user) {
      throw new InternalError("Tenant context missing");
    }

    const { org, user } = context;
    const db = app.db;

    const cfg = await loadOrgConfig(db, org.id);

    // Map internal onboardingState to API contract onboardingStatus
    return {
      user,
      org,
      onboardingStatus: cfg.onboardingState,
      config: cfg
    };
  });
}
