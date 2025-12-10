import type { FastifyInstance } from "fastify";
import { enforceTenancy } from "../tenancy/enforce-tenancy.js";
import { orgConfig } from "@leadops/db";
import { loadVerticalPack } from "@leadops/vertical-packs";
import { eq } from "drizzle-orm";
import { transitionOnboardingState } from "../services/onboarding-service.js";

export async function registerOnboardingSetIndustryRoute(app: FastifyInstance) {
  app.post("/onboarding/set-industry", { preHandler: [enforceTenancy] }, async (req, reply) => {
    const body = req.body as { industry: string } | undefined;

    if (!body?.industry) {
      return reply.status(400).send({
        error: "Invalid request",
        message: "Missing industry",
      });
    }

    // @ts-expect-error tenant context
    const { org } = req.tenantContext;
    // @ts-expect-error db decorator
    const db = req.server.db;

    const vertical = loadVerticalPack(body.industry);

    const now = new Date().toISOString();

    await db
      .update(orgConfig)
      .set({
        industry: body.industry,
        verticalPack: body.industry,
        leadFields: vertical.defaultLeadFields,
        workflows: vertical.defaultWorkflows,
        settings: vertical.defaultSettings,
        updatedAt: now,
      })
      .where(eq(orgConfig.orgId, org.id));

    // advance onboarding state org_created -> industry_selected (if valid)
    const onboardingState = await transitionOnboardingState(
      db,
      org.id,
      "industry_selected" as any
    );

    return {
      success: true,
      industry: body.industry,
      onboardingState,
    };
  });
}
