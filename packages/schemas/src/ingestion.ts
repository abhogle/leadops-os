import { z } from "zod";

/**
 * Lead Ingestion Schema
 * Used for creating leads via webhook or manual ingestion
 */
export const LeadIngestSchema = z.object({
  phone: z.string().min(8),
  email: z.string().email().optional().nullable(),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  service_type: z.string().optional().nullable(),

  vendor: z.string().optional(),
  vendor_lead_id: z.string().optional(),
  source: z.string().default("webhook"),

  metadata: z.record(z.any()).optional(),
  payload_raw: z.record(z.any()),
});

export type LeadIngest = z.infer<typeof LeadIngestSchema>;

/**
 * Lead Ingestion Response Schema
 */
export const LeadIngestResponseSchema = z.object({
  lead_id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  status: z.literal("created"),
});

export type LeadIngestResponse = z.infer<typeof LeadIngestResponseSchema>;
