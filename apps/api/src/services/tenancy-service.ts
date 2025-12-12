import type { FastifyInstance } from "fastify";
import { orgs, users } from "@leadops/db";
import { eq } from "drizzle-orm";
import type { LeadOpsAuthToken } from "@leadops/auth";
import type { Org, User } from "@leadops/types";

export async function resolveTenancy(
  app: FastifyInstance,
  claims: LeadOpsAuthToken
): Promise<{ org: Org | null; user: User | null }> {
  const db = app.db;

  // fetch user
  const [userRow] = await db.select().from(users).where(eq(users.id, claims.sub));
  if (!userRow) {
    return { org: null, user: null };
  }

  // fetch org
  const [orgRow] = await db.select().from(orgs).where(eq(orgs.id, claims.org));
  if (!orgRow) {
    return { org: null, user: null };
  }

  // convert to domain models
  const user: User = {
    id: userRow.id,
    orgId: userRow.orgId,
    email: userRow.email,
    role: userRow.role as User["role"],
    createdAt: userRow.createdAt instanceof Date ? userRow.createdAt.toISOString() : userRow.createdAt,
    updatedAt: userRow.updatedAt instanceof Date ? userRow.updatedAt.toISOString() : userRow.updatedAt,
  };

  const org: Org = {
    id: orgRow.id,
    name: orgRow.name,
    industry: orgRow.industry || undefined,
    createdAt: orgRow.createdAt instanceof Date ? orgRow.createdAt.toISOString() : orgRow.createdAt,
    updatedAt: orgRow.updatedAt instanceof Date ? orgRow.updatedAt.toISOString() : orgRow.updatedAt,
  };

  return { org, user };
}
