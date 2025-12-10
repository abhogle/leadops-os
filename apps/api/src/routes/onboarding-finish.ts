import type { FastifyInstance, FastifyRequest } from "fastify";
import { enforceTenancy } from "../tenancy/enforce-tenancy.js";
import { transitionOnboardingState } from "../services/onboarding-service.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Org } from "@leadops/types";

interface TenantContext {
  org: Org;
}

export async function registerOnboardingFinishRoute(app: FastifyInstance) {
  app.post("/onboarding/finish", { preHandler: [enforceTenancy] }, async (req: FastifyRequest) => {
    const { org } = (req as unknown as { tenantContext: TenantContext }).tenantContext;
    const db = (app as unknown as { db: NodePgDatabase }).db;

    const finalState = await transitionOnboardingState(db, org.id, "completed");

    return { onboardingState: finalState };
  });
}
