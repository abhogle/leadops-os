import type { FastifyInstance } from "fastify";
import { createOrgWithOwner } from "../services/org-service.js";
import { signAuthToken } from "@leadops/auth";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

interface CreateOrgBody {
  name: string;
  industry: string;
  email: string;
}

export async function registerCreateOrgRoute(app: FastifyInstance) {
  app.post<{ Body: CreateOrgBody }>("/onboarding/create-org", async (req, reply) => {
    const body = req.body;

    if (!body?.name || !body?.industry || !body?.email) {
      return reply.status(400).send({
        error: "Invalid request",
        message: "Missing name, industry, or email"
      });
    }

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
