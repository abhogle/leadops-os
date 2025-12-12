import { leads, conversations, workflowDefinitions, orgs } from "@leadops/db";
import { eq, and } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { LeadIngest } from "@leadops/schemas";
import { startWorkflow } from "@leadops/workflow-engine";

/**
 * Normalize phone number to E.164 format
 * Simple implementation - strips non-digits and adds +1 if needed
 */
function normalizePhone(phone: string): string {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, "");

  // If starts with 1 and has 11 digits, add +
  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    return `+${digitsOnly}`;
  }

  // If has 10 digits, assume US and add +1
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  // Otherwise return with + if not already present
  if (!phone.startsWith("+")) {
    return `+${digitsOnly}`;
  }

  return digitsOnly.startsWith("1") ? `+${digitsOnly}` : `+1${digitsOnly}`;
}

/**
 * Normalize lead fields for consistent storage
 */
function normalizeLeadData(data: LeadIngest): LeadIngest {
  return {
    ...data,
    phone: normalizePhone(data.phone),
    email: data.email?.toLowerCase().trim() || null,
    first_name: data.first_name?.trim() || null,
    last_name: data.last_name?.trim() || null,
    address: data.address?.trim() || null,
    city: data.city?.trim() || null,
    state: data.state?.toUpperCase().trim() || null,
    zip: data.zip?.trim() || null,
    service_type: data.service_type?.trim() || null,
  };
}

/**
 * Lead Ingestion Pipeline
 *
 * Flow:
 * 1. Validate payload (done by Zod in route)
 * 2. Normalize lead fields (E.164, trim, lower-case email)
 * 3. Insert lead
 * 4. Create conversation: status=not_started
 * 5. Return IDs
 *
 * No dedupe by default.
 * Future throttling/dedupe rules plug in here.
 */
export async function ingestLead(
  db: NodePgDatabase,
  orgId: string,
  companyId: string | null,
  data: LeadIngest
): Promise<{ leadId: string; conversationId: string }> {
  // Normalize the lead data
  const normalized = normalizeLeadData(data);

  // Insert lead
  const [lead] = await db.insert(leads).values({
    orgId,
    companyId,
    phone: normalized.phone,
    email: normalized.email,
    firstName: normalized.first_name,
    lastName: normalized.last_name,
    address: normalized.address,
    city: normalized.city,
    state: normalized.state,
    zip: normalized.zip,
    serviceType: normalized.service_type,
    vendor: normalized.vendor || null,
    vendorLeadId: normalized.vendor_lead_id || null,
    source: normalized.source,
    status: "new",
    metadata: normalized.metadata || null,
    payloadRaw: normalized.payload_raw,
  }).returning({ id: leads.id });

  if (!lead) {
    throw new Error("Failed to create lead");
  }

  // Create conversation with status=not_started
  const [conversation] = await db.insert(conversations).values({
    orgId,
    companyId,
    leadId: lead.id,
    status: "not_started",
    unreadCount: 0,
    needsAttention: false,
    isArchived: false,
  }).returning({ id: conversations.id });

  if (!conversation) {
    throw new Error("Failed to create conversation");
  }

  // Milestone 18: Trigger default workflow for this lead
  try {
    // Get org to determine industry
    const [org] = await db.select().from(orgs).where(eq(orgs.id, orgId)).limit(1);

    if (org && org.industry) {
      // Find default active workflow for this industry
      const [defaultWorkflow] = await db
        .select()
        .from(workflowDefinitions)
        .where(
          and(
            eq(workflowDefinitions.orgId, orgId),
            eq(workflowDefinitions.industry, org.industry),
            eq(workflowDefinitions.isActive, true)
          )
        )
        .orderBy(workflowDefinitions.createdAt)
        .limit(1);

      if (defaultWorkflow) {
        await startWorkflow({
          orgId,
          workflowDefinitionId: defaultWorkflow.id,
          leadId: lead.id,
          conversationId: conversation.id,
        });

        console.log(
          `[LeadIngestion] Started workflow ${defaultWorkflow.id} for lead ${lead.id}`
        );
      } else {
        console.log(
          `[LeadIngestion] No default workflow found for industry ${org.industry}`
        );
      }
    }
  } catch (error) {
    // Don't fail lead ingestion if workflow start fails
    console.error("[LeadIngestion] Error starting workflow:", error);
  }

  return {
    leadId: lead.id,
    conversationId: conversation.id,
  };
}
