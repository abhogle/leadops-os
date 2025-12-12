import type { FastifyInstance } from "fastify";
import { enforceTenancy } from "../tenancy/enforce-tenancy.js";
import { transitionOnboardingState } from "../services/onboarding-service.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Org } from "@leadops/types";
import { CompleteStepRequestSchema } from "@leadops/schemas";
import { ValidationError } from "../errors/index.js";

interface TenantContext {
  org: Org;
}

export async function registerOnboardingCompleteStepRoute(app: FastifyInstance) {
  app.post("/onboarding/complete-step", { preHandler: [enforceTenancy] }, async (req, reply) => {
    const validation = CompleteStepRequestSchema.safeParse(req.body);

    if (!validation.success) {
      throw new ValidationError("Validation failed", validation.error.errors);
    }

    const body = validation.data;
    const { org } = (req as unknown as { tenantContext: TenantContext }).tenantContext;
    const db = (app as unknown as { db: NodePgDatabase }).db;

    const newState = await transitionOnboardingState(db, org.id, body.next);

    return { onboardingState: newState };
  });
}
