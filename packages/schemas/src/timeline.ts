import { z } from "zod";
import { MessageTypeSchema, MessageChannelSchema, MessageDirectionSchema, MessageSenderSchema, MessageStatusSchema } from "./messages.js";

/**
 * Timeline Item Type
 */
export const TimelineItemTypeSchema = z.enum(["message", "note"]);

export type TimelineItemType = z.infer<typeof TimelineItemTypeSchema>;

/**
 * Message Timeline Item
 */
export const MessageTimelineItemSchema = z.object({
  type: z.literal("message"),
  id: z.string().uuid(),
  message_type: MessageTypeSchema,
  channel: MessageChannelSchema,
  direction: MessageDirectionSchema.nullable(),
  sender: MessageSenderSchema.nullable(),
  body: z.string().nullable(),
  status: MessageStatusSchema,
  provider_message_id: z.string().nullable(),
  metadata: z.record(z.any()).nullable(),
  created_at: z.string(),
});

export type MessageTimelineItem = z.infer<typeof MessageTimelineItemSchema>;

/**
 * Note Timeline Item
 */
export const NoteTimelineItemSchema = z.object({
  type: z.literal("note"),
  id: z.string().uuid(),
  body: z.string(),
  agent_id: z.string(),
  agent_email: z.string().optional(),
  created_at: z.string(),
});

export type NoteTimelineItem = z.infer<typeof NoteTimelineItemSchema>;

/**
 * Timeline Item (Union of Message and Note)
 */
export const TimelineItemSchema = z.discriminatedUnion("type", [
  MessageTimelineItemSchema,
  NoteTimelineItemSchema,
]);

export type TimelineItem = z.infer<typeof TimelineItemSchema>;

/**
 * Timeline Response Schema
 * Returned by GET /api/v1/conversations/:id/messages
 */
export const TimelineResponseSchema = z.object({
  conversation_id: z.string().uuid(),
  lead_id: z.string().uuid(),
  items: z.array(TimelineItemSchema),
});

export type TimelineResponse = z.infer<typeof TimelineResponseSchema>;
