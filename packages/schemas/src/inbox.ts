import { z } from "zod";

/**
 * Conversation Status Enums
 */
export const ConversationStatusSchema = z.enum([
  "not_started",
  "active",
  "paused",
  "completed",
]);

export type ConversationStatus = z.infer<typeof ConversationStatusSchema>;

/**
 * Lead Status Enums
 */
export const LeadStatusSchema = z.enum([
  "new",
  "contacted",
  "qualified",
  "converted",
  "disqualified",
  "archived",
]);

export type LeadStatus = z.infer<typeof LeadStatusSchema>;

/**
 * Inbox Item Schema
 * Returned by GET /api/v1/inbox
 */
export const InboxItemSchema = z.object({
  conversation_id: z.string().uuid(),
  lead_id: z.string().uuid(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  phone: z.string(),
  vendor: z.string().nullable(),
  source: z.string(),
  unread_count: z.number(),
  needs_attention: z.boolean(),
  last_message_preview: z.string().nullable(),
  last_message_at: z.string().nullable(),
  status: ConversationStatusSchema,
});

export type InboxItem = z.infer<typeof InboxItemSchema>;

/**
 * Inbox List Response Schema
 */
export const InboxListResponseSchema = z.object({
  conversations: z.array(InboxItemSchema),
  total: z.number(),
});

export type InboxListResponse = z.infer<typeof InboxListResponseSchema>;
