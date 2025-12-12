import type { FastifyInstance } from "fastify";
import { createOrgWithOwner } from "../services/org-service.js";
import { signAuthToken } from "@leadops/auth";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { CreateOrgRequestSchema } from "@leadops/schemas";
import { ValidationError } from "../errors/index.js";

export async function registerCreateOrgRoute(app: FastifyInstance) {
  app.post("/onboarding/create-org", async (req, reply) => {
    const validation = CreateOrgRequestSchema.safeParse(req.body);

    if (!validation.success) {
      throw new ValidationError("Validation failed", validation.error.errors);
    }

    const body = validation.data;

    const db = (app as unknown as { db: NodePgDatabase }).db;
    const { orgId, userId } = await createOrgWithOwner(db, body);

    const token = signAuthToken({
      v: 1,
      sub: userId,
      org: orgId,
      role: "owner"
    });

    return {
      authToken: token,
      orgId,
      userId
    };
  });
}
