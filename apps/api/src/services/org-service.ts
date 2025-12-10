import { orgs, users, orgConfig } from "@leadops/db";
import { generateId } from "@leadops/common";
import { loadVerticalPack } from "@leadops/vertical-packs";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export async function createOrgWithOwner(
  db: NodePgDatabase,
  params: {
    name: string;
    industry: string;
    email: string;
  }
) {
  const orgId = generateId("org_");
  const userId = generateId("usr_");
  const now = new Date();

  // Create org
  await db.insert(orgs).values({
    id: orgId,
    name: params.name,
    industry: params.industry,
    createdAt: now,
    updatedAt: now,
  });

  // Create owner user
  await db.insert(users).values({
    id: userId,
    orgId,
    email: params.email,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  });

  // Load vertical pack
  const vertical = loadVerticalPack(params.industry);

  // Seed org config
  await db.insert(orgConfig).values({
    orgId,
    industry: params.industry,
    verticalPack: params.industry,
    leadFields: vertical.defaultLeadFields,
    workflows: vertical.defaultWorkflows,
    settings: vertical.defaultSettings,
    createdAt: now,
    updatedAt: now,
  });

  return { orgId, userId };
}
