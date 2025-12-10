import type { FastifyInstance } from "fastify";
import { enforceTenancy } from "../tenancy/enforce-tenancy.js";
import { orgConfig } from "@leadops/db";
import { eq } from "drizzle-orm";
import { transitionOnboardingState } from "../services/onboarding-service.js";

export async function registerOnboardingConfirmConfigRoute(app: FastifyInstance) {
  app.post("/onboarding/confirm-config", { preHandler: [enforceTenancy] }, async (req, reply) => {
    const body = req.body as {
      leadFields?: any[];
      workflows?: any[];
      settings?: Record<string, unknown>;
    } | null;

    if (!body) {
      return reply.status(400).send({
        error: "Invalid request",
        message: "Missing configuration payload",
      });
    }

    // @ts-expect-error tenant context
    const { org } = req.tenantContext;
    // @ts-expect-error db decorator
    const db = req.server.db;

    const now = new Date().toISOString();

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
      "config_confirmed" as any
    );

    return {
      success: true,
      onboardingState,
    };
  });
}
