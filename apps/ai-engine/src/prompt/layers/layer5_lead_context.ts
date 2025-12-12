/**
 * Layer 5: Lead Context
 * Lead-specific information (fields, metadata, status)
 * Milestone 17: AI SMS Engine v1
 *
 * SECURITY FIXES:
 * - Multi-tenant org_id validation
 * - Prompt injection prevention via sanitizeForPrompt()
 * - Input length limits
 */

import { eq, and } from "drizzle-orm";
import { getDbClient, leads } from "@leadops/db";

const MAX_METADATA_FIELD_LENGTH = 1000;
const MAX_CUSTOM_FIELDS = 10;

/**
 * Sanitize text for use in AI prompt to prevent prompt injection
 * Milestone 17 Fix #6: Prompt Injection Prevention
 */
function sanitizeForPrompt(text: string | null | undefined): string {
  if (!text) return "";

  let sanitized = String(text);

  // 1. Remove control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // 2. Remove code block markers to prevent escaping prompt context
  sanitized = sanitized.replace(/```/g, "");
  sanitized = sanitized.replace(/~~~+/g, "");

  // 3. Neutralize instruction markers
  sanitized = sanitized.replace(/\[INST\]/gi, "[redacted]");
  sanitized = sanitized.replace(/\[\/INST\]/gi, "[redacted]");
  sanitized = sanitized.replace(/<\|im_start\|>/gi, "");
  sanitized = sanitized.replace(/<\|im_end\|>/gi, "");

  // 4. Limit excessive newlines (max 2 consecutive)
  sanitized = sanitized.replace(/\n{3,}/g, "\n\n");

  // 5. Enforce length limit
  if (sanitized.length > MAX_METADATA_FIELD_LENGTH) {
    sanitized = sanitized.substring(0, MAX_METADATA_FIELD_LENGTH) + "...";
  }

  return sanitized.trim();
}

export async function buildLeadContextLayer(
  leadId: string,
  orgId: string
): Promise<string> {
  const db = getDbClient();

  // Multi-tenant query with org_id validation
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)))
    .limit(1);

  if (!lead) {
    return "## Lead Context: Not found or access denied";
  }

  let layer = "## Lead Information\n\n";

  // Basic contact info
  if (lead.firstName || lead.lastName) {
    const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
    layer += `Name: ${fullName}\n`;
  }

  if (lead.phone) {
    layer += `Phone: ${lead.phone}\n`;
  }

  if (lead.email) {
    layer += `Email: ${lead.email}\n`;
  }

  // Location info
  const locationParts = [lead.city, lead.state, lead.zip].filter(Boolean);
  if (locationParts.length > 0) {
    layer += `Location: ${locationParts.join(", ")}\n`;
  }

  // Service type
  if (lead.serviceType) {
    layer += `Service Interest: ${lead.serviceType}\n`;
  }

  // Lead source
  if (lead.source) {
    layer += `Lead Source: ${lead.source}\n`;
  }

  if (lead.vendor) {
    layer += `Vendor: ${lead.vendor}\n`;
  }

  // Status
  if (lead.status) {
    layer += `Current Status: ${lead.status}\n`;
  }

  // Custom metadata (sanitized to prevent prompt injection)
  if (lead.metadata && typeof lead.metadata === "object") {
    const metadata = lead.metadata as Record<string, any>;
    const relevantFields = Object.entries(metadata)
      .filter(([key]) => !key.startsWith("_")) // Filter internal fields
      .slice(0, MAX_CUSTOM_FIELDS); // Limit to prevent prompt bloat

    if (relevantFields.length > 0) {
      layer += "\n### Additional Information:\n";
      for (const [key, value] of relevantFields) {
        if (value !== null && value !== undefined && value !== "") {
          // Sanitize both field name and value
          const sanitizedKey = sanitizeForPrompt(key);
          const sanitizedValue = sanitizeForPrompt(String(value));
          layer += `- ${sanitizedKey}: ${sanitizedValue}\n`;
        }
      }
    }
  }

  return layer;
}
