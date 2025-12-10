import type { FastifyInstance, FastifyRequest } from "fastify";
import { enforceTenancy } from "../tenancy/enforce-tenancy.js";
import { orgConfig } from "@leadops/db";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Org, User } from "@leadops/types";

interface TenantContext {
  org: Org;
  user: User;
}

interface ConfigUpdateBody {
  leadFields?: unknown[];
  workflows?: unknown[];
  settings?: Record<string, unknown>;
}

export async function registerConfigUpdateRoute(app: FastifyInstance) {
  app.post<{ Body: ConfigUpdateBody }>("/config/update", { preHandler: [enforceTenancy] }, async (req: FastifyRequest<{ Body: ConfigUpdateBody }>, reply) => {
    const { user, org } = (req as unknown as { tenantContext: TenantContext }).tenantContext;

    // RBAC enforcement
    if (!["owner", "admin"].includes(user.role)) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Only owners and admins may update configuration"
      });
    }

    const body = req.body;
    const now = new Date();

    const db = (app as unknown as { db: NodePgDatabase }).db;

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
