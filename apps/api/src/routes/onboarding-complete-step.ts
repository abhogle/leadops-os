import type { FastifyInstance, FastifyRequest } from "fastify";
import { enforceTenancy } from "../tenancy/enforce-tenancy.js";
import { transitionOnboardingState, type OnboardingState } from "../services/onboarding-service.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Org } from "@leadops/types";

interface TenantContext {
  org: Org;
}

interface CompleteStepBody {
  next: string;
}

export async function registerOnboardingCompleteStepRoute(app: FastifyInstance) {
  app.post<{ Body: CompleteStepBody }>("/onboarding/complete-step", { preHandler: [enforceTenancy] }, async (req: FastifyRequest<{ Body: CompleteStepBody }>, reply) => {
    const body = req.body;
    if (!body?.next) {
      return reply.status(400).send({ error: "Missing 'next' onboarding state" });
    }

    const { org } = (req as unknown as { tenantContext: TenantContext }).tenantContext;
    const db = (app as unknown as { db: NodePgDatabase }).db;

    const newState = await transitionOnboardingState(db, org.id, body.next as OnboardingState);

    return { onboardingState: newState };
  });
}
