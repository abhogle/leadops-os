import type { FastifyInstance } from "fastify";
import { conversations, leads, messages } from "@leadops/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { InboxListResponseSchema } from "@leadops/schemas";
import { InternalError } from "../errors/index.js";

/**
 * GET /inbox
 *
 * Returns inbox list for the authenticated user's organization
 * Sorted by last_message_at DESC
 *
 * @protected endpoint (requires authentication)
 */
export async function registerInboxRoute(app: FastifyInstance) {
  app.get("/inbox", async (req, reply) => {
    try {
      const orgId = req.tenantContext?.org?.id;

      if (!orgId) {
        throw new InternalError("Organization context not found");
      }

      // Get conversations with lead data
      const conversationList = await app.db
        .select({
          conversation_id: conversations.id,
          lead_id: leads.id,
          first_name: leads.firstName,
          last_name: leads.lastName,
          phone: leads.phone,
          vendor: leads.vendor,
          source: leads.source,
          unread_count: conversations.unreadCount,
          needs_attention: conversations.needsAttention,
          last_message_at: conversations.lastMessageAt,
          status: conversations.status,
        })
        .from(conversations)
        .innerJoin(leads, eq(conversations.leadId, leads.id))
        .where(
          and(
            eq(conversations.orgId, orgId),
            eq(conversations.isArchived, false)
          )
        )
        .orderBy(desc(conversations.lastMessageAt));

      // For each conversation, get the last message preview
      const conversationsWithPreviews = await Promise.all(
        conversationList.map(async (conv) => {
          const [lastMessage] = await app.db
            .select({ body: messages.body })
            .from(messages)
            .where(eq(messages.conversationId, conv.conversation_id))
            .orderBy(desc(messages.createdAt))
            .limit(1);

          return {
            conversation_id: conv.conversation_id,
            lead_id: conv.lead_id,
            first_name: conv.first_name,
            last_name: conv.last_name,
            phone: conv.phone,
            vendor: conv.vendor,
            source: conv.source,
            unread_count: conv.unread_count,
            needs_attention: conv.needs_attention,
            last_message_preview: lastMessage?.body || null,
            last_message_at: conv.last_message_at?.toISOString() || null,
            status: conv.status as "not_started" | "active" | "paused" | "completed",
          };
        })
      );

      const response = InboxListResponseSchema.parse({
        conversations: conversationsWithPreviews,
        total: conversationsWithPreviews.length,
      });

      return response;
    } catch (err) {
      if (err instanceof InternalError) {
        throw err;
      }
      req.log.error(err, "Failed to fetch inbox");
      throw new InternalError("Failed to fetch inbox");
    }
  });
}
