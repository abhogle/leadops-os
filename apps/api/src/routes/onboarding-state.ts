import type { FastifyInstance, FastifyRequest } from "fastify";
import { enforceTenancy } from "../tenancy/enforce-tenancy.js";
import { loadOrgConfig } from "../services/config-service.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Org, User } from "@leadops/types";

interface TenantContext {
  org: Org;
  user: User;
}

export async function registerOnboardingStateRoute(app: FastifyInstance) {
  app.get("/onboarding/state", { preHandler: [enforceTenancy] }, async (req: FastifyRequest) => {
    const { org, user } = (req as unknown as { tenantContext: TenantContext }).tenantContext;
    const db = (app as unknown as { db: NodePgDatabase }).db;

    const cfg = await loadOrgConfig(db, org.id);

    return {
      user,
      org,
      onboardingState: cfg.onboardingState,
      config: cfg
    };
  });
}
