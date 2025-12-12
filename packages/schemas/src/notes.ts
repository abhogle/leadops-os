import { z } from "zod";

/**
 * Note Create Schema
 * Used for creating agent notes on conversations
 */
export const NoteCreateSchema = z.object({
  conversation_id: z.string().uuid(),
  body: z.string().min(1),
});

export type NoteCreate = z.infer<typeof NoteCreateSchema>;

/**
 * Note Response Schema
 */
export const NoteResponseSchema = z.object({
  note_id: z.string().uuid(),
  created_at: z.string(),
});

export type NoteResponse = z.infer<typeof NoteResponseSchema>;
