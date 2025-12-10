import { orgConfig } from "@leadops/db";
import { loadVerticalPack } from "@leadops/vertical-packs";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export async function loadOrgConfig(db: NodePgDatabase, orgId: string) {
  const rows = await db.select().from(orgConfig).where(eq(orgConfig.orgId, orgId));

  if (rows.length === 0) {
    throw new Error("Org config not found");
  }

  const cfg = rows[0];
  const vertical = loadVerticalPack(cfg.industry);

  return {
    ...cfg,
    vertical
  };
}
