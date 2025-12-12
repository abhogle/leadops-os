/**
 * Layer 3: Organization Persona
 * Company-specific personality and brand voice
 * Milestone 17: AI SMS Engine v1
 */

import { eq } from "drizzle-orm";
import { getDbClient, orgs } from "@leadops/db";

export interface OrgPersona {
  name: string;
  tone?: string;
  personality?: string;
  constraints?: string[];
}

export async function buildOrgPersonaLayer(orgId: string): Promise<string> {
  const db = getDbClient();

  const [org] = await db
    .select()
    .from(orgs)
    .where(eq(orgs.id, orgId))
    .limit(1);

  if (!org) {
    return "## Organization: Unknown";
  }

  // Extract persona settings from org metadata if available
  // For now, we'll use basic org info
  // Future: Add persona fields to orgs table or org_config

  let layer = `## Organization: ${org.name}\n`;

  // Check if org has persona settings in a config table
  // This is a placeholder - you might want to add these fields to the orgs table
  // or create an org_persona table

  layer += `\n### Brand Voice:
- Represent ${org.name} professionally
- Maintain consistency with company values
- Reflect the company's commitment to customer service`;

  if (org.industry) {
    layer += `\n- Industry focus: ${org.industry}`;
  }

  return layer;
}
