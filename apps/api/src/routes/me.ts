import type { FastifyInstance } from "fastify";
import { orgConfig } from "@leadops/db";
import { eq } from "drizzle-orm";
import { InternalError } from "../errors/index.js";

export async function registerMeRoute(app: FastifyInstance) {
  app.get("/me", async (req, reply) => {
    const context = req.tenantContext;

    if (!context) {
      throw new InternalError("Tenant context missing");
    }

    if (!context.org) {
      throw new InternalError("Organization context missing");
    }

    const db = app.db;
    const { org } = context;

    const rows = await db
      .select()
      .from(orgConfig)
      .where(eq(orgConfig.orgId, org.id));

    // Map internal onboardingState to API contract onboardingStatus
    const onboardingStatus = rows.length > 0 ? rows[0].onboardingState : null;

    return {
      user: context.user,
      org: context.org,
      tokenClaims: context.tokenClaims,
      onboardingStatus
    };
  });
}
