import type { FastifyInstance } from "fastify";
import { orgConfig } from "@leadops/db";
import { eq } from "drizzle-orm";

export async function registerMeRoute(app: FastifyInstance) {
  app.get("/me", async (req) => {
    // @ts-expect-error decorated dynamically
    const context = req.tenantContext;

    // Fetch onboardingState from org_config
    // @ts-expect-error db decorator
    const db = req.server.db;
    const { org } = context;

    const rows = await db
      .select()
      .from(orgConfig)
      .where(eq(orgConfig.orgId, org.id));

    const onboardingState = rows.length > 0 ? rows[0].onboardingState : null;

    return {
      user: context.user,
      org: context.org,
      tokenClaims: context.tokenClaims,
      onboardingState
    };
  });
}
