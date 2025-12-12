import type { FastifyInstance } from "fastify";
import { conversations, notes } from "@leadops/db";
import { eq, and } from "drizzle-orm";
import { NoteCreateSchema, NoteResponseSchema } from "@leadops/schemas";
import { ValidationError, NotFoundError, InternalError } from "../errors/index.js";

/**
 * POST /notes
 *
 * Create a note on a conversation
 * Agent-only operation
 *
 * Notes do NOT activate conversations (per spec)
 *
 * @protected endpoint (requires authentication)
 */
export async function registerCreateNoteRoute(app: FastifyInstance) {
  app.post("/notes", async (req, reply) => {
    try {
      const orgId = req.tenantContext?.org?.id;
      const userId = req.tenantContext?.tokenClaims?.sub;

      if (!orgId || !userId) {
        throw new InternalError("Organization or user context not found");
      }

      // Validate request body
      const validation = NoteCreateSchema.safeParse(req.body);

      if (!validation.success) {
        throw new ValidationError("Validation failed", validation.error.errors);
      }

      const { conversation_id, body: noteBody } = validation.data;

      // Verify conversation belongs to org
      const [conversation] = await app.db
        .select({
          id: conversations.id,
          leadId: conversations.leadId,
        })
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversation_id),
            eq(conversations.orgId, orgId)
          )
        )
        .limit(1);

      if (!conversation) {
        throw new NotFoundError("Conversation not found");
      }

      // Create note
      const [note] = await app.db
        .insert(notes)
        .values({
          orgId,
          companyId: null,
          leadId: conversation.leadId,
          conversationId: conversation_id,
          agentId: userId,
          body: noteBody,
        })
        .returning({ id: notes.id, createdAt: notes.createdAt });

      if (!note) {
        throw new InternalError("Failed to create note");
      }

      const response = NoteResponseSchema.parse({
        note_id: note.id,
        created_at: note.createdAt.toISOString(),
      });

      return reply.status(201).send(response);
    } catch (err) {
      if (
        err instanceof ValidationError ||
        err instanceof NotFoundError ||
        err instanceof InternalError
      ) {
        throw err;
      }
      req.log.error(err, "Failed to create note");
      throw new InternalError("Failed to create note");
    }
  });
}
