import { z } from "zod";

/**
 * Message Type Enums
 */
export const MessageTypeSchema = z.enum([
  "sms",
  "email",
  "call_inbound",
  "call_outbound",
  "ai_action",
  "system_event",
]);

export const MessageChannelSchema = z.enum(["sms", "email", "voice", "system"]);

export const MessageDirectionSchema = z.enum(["inbound", "outbound"]);

export const MessageSenderSchema = z.enum(["lead", "ai", "human", "system"]);

export const MessageStatusSchema = z.enum([
  "none",
  "queued",
  "sent",
  "delivered",
  "failed",
  "read",
]);

/**
 * Outbound Message Schema
 * Used for sending messages to leads
 */
export const OutboundMessageSchema = z.object({
  body: z.string().min(1),
});

export type OutboundMessage = z.infer<typeof OutboundMessageSchema>;

/**
 * Message Response Schema
 */
export const MessageResponseSchema = z.object({
  message_id: z.string().uuid(),
  status: MessageStatusSchema,
  created_at: z.string(),
});

export type MessageResponse = z.infer<typeof MessageResponseSchema>;

/**
 * Inbound SMS Webhook Schema (Twilio format)
 */
export const InboundSmsWebhookSchema = z.object({
  From: z.string(),
  To: z.string(),
  Body: z.string(),
  MessageSid: z.string().optional(),
  AccountSid: z.string().optional(),
  NumMedia: z.string().optional(),
});

export type InboundSmsWebhook = z.infer<typeof InboundSmsWebhookSchema>;

/**
 * Type exports
 */
export type MessageType = z.infer<typeof MessageTypeSchema>;
export type MessageChannel = z.infer<typeof MessageChannelSchema>;
export type MessageDirection = z.infer<typeof MessageDirectionSchema>;
export type MessageSender = z.infer<typeof MessageSenderSchema>;
export type MessageStatus = z.infer<typeof MessageStatusSchema>;
