import type { FastifyInstance} from "fastify";
import { conversations, messages, notes, users } from "@leadops/db";
import { eq, and } from "drizzle-orm";
import { TimelineResponseSchema } from "@leadops/schemas";
import { NotFoundError, InternalError } from "../errors/index.js";

/**
 * GET /conversations/:id/messages
 *
 * Returns merged timeline of messages and notes for a conversation
 * Sorted by created_at
 *
 * @protected endpoint (requires authentication)
 */
export async function registerConversationMessagesRoute(app: FastifyInstance) {
  app.get("/conversations/:id/messages", async (req, reply) => {
    try {
      const conversationId = (req.params as any).id;
      const orgId = req.tenantContext?.org?.id;

      if (!orgId) {
        throw new InternalError("Organization context not found");
      }

      // Verify conversation belongs to org
      const [conversation] = await app.db
        .select({ leadId: conversations.leadId })
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.orgId, orgId)
          )
        )
        .limit(1);

      if (!conversation) {
        throw new NotFoundError("Conversation not found");
      }

      // Get all messages for this conversation
      const messageList = await app.db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);

      // Get all notes for this conversation
      const noteList = await app.db
        .select({
          id: notes.id,
          body: notes.body,
          agentId: notes.agentId,
          createdAt: notes.createdAt,
        })
        .from(notes)
        .where(eq(notes.conversationId, conversationId))
        .orderBy(notes.createdAt);

      // Get agent info for notes
      const agentIds = [...new Set(noteList.map(n => n.agentId))];
      const agents = agentIds.length > 0
        ? await app.db
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(eq(users.id, agentIds[0])) // TODO: Use IN clause when we have multiple agents
        : [];

      const agentMap = new Map(agents.map(a => [a.id, a]));

      // Map messages to timeline items
      const messageItems = messageList.map(msg => ({
        type: "message" as const,
        id: msg.id,
        message_type: msg.messageType,
        channel: msg.channel,
        direction: msg.direction,
        sender: msg.sender,
        body: msg.body,
        status: msg.status,
        provider_message_id: msg.providerMessageId,
        metadata: msg.metadata,
        created_at: msg.createdAt.toISOString(),
      }));

      // Map notes to timeline items
      const noteItems = noteList.map(note => ({
        type: "note" as const,
        id: note.id,
        body: note.body,
        agent_id: note.agentId,
        agent_email: agentMap.get(note.agentId)?.email,
        created_at: note.createdAt.toISOString(),
      }));

      // Merge and sort by created_at
      const allItems = [...messageItems, ...noteItems].sort((a, b) =>
        a.created_at.localeCompare(b.created_at)
      );

      const response = TimelineResponseSchema.parse({
        conversation_id: conversationId,
        lead_id: conversation.leadId,
        items: allItems,
      });

      return response;
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof InternalError) {
        throw err;
      }
      req.log.error(err, "Failed to fetch conversation messages");
      throw new InternalError("Failed to fetch conversation messages");
    }
  });
}
