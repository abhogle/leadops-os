import type { FastifyInstance } from "fastify";
import { enforceTenancy } from "../tenancy/enforce-tenancy.js";
import { requireRole } from "../middleware/require-role.js";
import { orgConfig } from "@leadops/db";
import { eq } from "drizzle-orm";
import { ConfigUpdateRequestSchema } from "@leadops/schemas";
import { ValidationError, InternalError } from "../errors/index.js";

export async function registerConfigUpdateRoute(app: FastifyInstance) {
  app.post("/config/update", {
    preHandler: [enforceTenancy, requireRole("owner", "admin")]
  }, async (req, reply) => {
    const validation = ConfigUpdateRequestSchema.safeParse(req.body);

    if (!validation.success) {
      throw new ValidationError("Validation failed", validation.error.errors);
    }

    const body = validation.data;

    const context = req.tenantContext;
    if (!context || !context.org) {
      throw new InternalError("Organization context missing");
    }

    const { org } = context;
    const db = req.server.db;
    const now = new Date();

    await db.update(orgConfig)
      .set({
        ...(body.leadFields && { leadFields: body.leadFields }),
        ...(body.workflows && { workflows: body.workflows }),
        ...(body.settings && { settings: body.settings }),
        updatedAt: now
      })
      .where(eq(orgConfig.orgId, org.id));

    return { success: true };
  });
}
