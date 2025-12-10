import { z } from "zod";

/**
 * Minimal seed schemas for the Unified Lead Model.
 * These align with the specs but include only the essentials needed
 * for early ingestion workflows. They will expand as vertical packs
 * add domain-specific fields.
 */

export const LeadSourceSchema = z.object({
  channel: z.string(),
  provider: z.string(),
  campaignId: z.string().optional(),
  vendor: z.string().optional(),
});

export const LeadBaseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string(),
  source: LeadSourceSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Exported schema types
 */
export type LeadSource = z.infer<typeof LeadSourceSchema>;
export type LeadBase = z.infer<typeof LeadBaseSchema>;
