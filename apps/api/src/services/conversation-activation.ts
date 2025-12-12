import { conversations } from "@leadops/db";
import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

/**
 * Conversation Activation Logic
 *
 * Triggered when:
 * - First inbound SMS arrives
 * - First outbound SMS is sent
 * - First note does NOT activate
 *
 * Sets:
 * - conversation.status = 'active'
 * - conversation.last_message_at = now()
 */
export async function activateConversation(
  db: NodePgDatabase,
  conversationId: string
): Promise<void> {
  const now = new Date();

  await db
    .update(conversations)
    .set({
      status: "active",
      lastMessageAt: now,
      updatedAt: now,
    })
    .where(eq(conversations.id, conversationId));
}

/**
 * Activate conversation if it's in 'not_started' status
 * Returns true if activated, false if already active
 */
export async function activateConversationIfNeeded(
  db: NodePgDatabase,
  conversationId: string
): Promise<boolean> {
  const [conversation] = await db
    .select({ status: conversations.status })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (conversation.status === "not_started") {
    await activateConversation(db, conversationId);
    return true;
  }

  return false;
}

/**
 * Update last_message_at for conversation
 */
export async function updateLastMessageAt(
  db: NodePgDatabase,
  conversationId: string
): Promise<void> {
  const now = new Date();

  await db
    .update(conversations)
    .set({
      lastMessageAt: now,
      updatedAt: now,
    })
    .where(eq(conversations.id, conversationId));
}

/**
 * Increment unread count for conversation
 */
export async function incrementUnreadCount(
  db: NodePgDatabase,
  conversationId: string
): Promise<void> {
  const now = new Date();

  await db
    .update(conversations)
    .set({
      unreadCount: sql`${conversations.unreadCount} + 1`,
      updatedAt: now,
    })
    .where(eq(conversations.id, conversationId));
}
