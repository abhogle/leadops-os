/**
 * Engagement Service
 * Milestone 18: Workflow Engine Runtime
 *
 * Tracks when leads engage with conversations and emits events
 * to terminate active workflows.
 */

import { eq, and } from "drizzle-orm";
import { getDbClient, conversations, leads } from "@leadops/db";
import type { EngagementSource } from "@leadops/types";
import { eventBus } from "./eventBus.js";
import type { ConversationEngagedEvent } from "./eventBus.js";

/**
 * Mark a conversation as engaged
 * This triggers workflow termination and updates engagement tracking
 */
export async function markEngaged(
  conversationId: string,
  orgId: string,
  source: EngagementSource
): Promise<void> {
  const db = getDbClient();

  // 1. Update conversation (with multi-tenant validation)
  const [updatedConversation] = await db
    .update(conversations)
    .set({
      engagementStatus: "engaged",
      engagedAt: new Date(),
      engagementSource: source,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.orgId, orgId)
      )
    )
    .returning();

  if (!updatedConversation) {
    console.error(
      `[EngagementService] Conversation ${conversationId} not found or access denied for org ${orgId}`
    );
    return;
  }

  console.log(
    `[EngagementService] Marked conversation ${conversationId} as engaged (source: ${source})`
  );

  // 2. Get lead information for event payload
  const [lead] = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.id, updatedConversation.leadId),
        eq(leads.orgId, orgId)
      )
    )
    .limit(1);

  if (!lead) {
    console.error(
      `[EngagementService] Lead ${updatedConversation.leadId} not found for conversation ${conversationId}`
    );
    return;
  }

  // 3. Emit event to event bus
  const event: ConversationEngagedEvent = {
    conversationId,
    leadId: lead.id,
    orgId,
    source,
    engagedAt: updatedConversation.engagedAt!,
  };

  await eventBus.emit("conversation.engaged", event);

  console.log(
    `[EngagementService] Emitted conversation.engaged event for ${conversationId}`
  );
}

/**
 * Mark a conversation as converted
 * Used when a lead takes a conversion action (e.g., scheduled appointment)
 */
export async function markConverted(
  conversationId: string,
  orgId: string,
  source: EngagementSource
): Promise<void> {
  const db = getDbClient();

  await db
    .update(conversations)
    .set({
      engagementStatus: "converted",
      engagedAt: new Date(),
      engagementSource: source,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.orgId, orgId)
      )
    );

  console.log(
    `[EngagementService] Marked conversation ${conversationId} as converted (source: ${source})`
  );
}

/**
 * Mark a conversation as dismissed
 * Used when a lead explicitly opts out or is disqualified
 */
export async function markDismissed(
  conversationId: string,
  orgId: string
): Promise<void> {
  const db = getDbClient();

  await db
    .update(conversations)
    .set({
      engagementStatus: "dismissed",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.orgId, orgId)
      )
    );

  console.log(
    `[EngagementService] Marked conversation ${conversationId} as dismissed`
  );
}

/**
 * Mark a conversation as stale
 * Used by background jobs to identify inactive conversations
 */
export async function markStale(
  conversationId: string,
  orgId: string
): Promise<void> {
  const db = getDbClient();

  await db
    .update(conversations)
    .set({
      engagementStatus: "stale",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.orgId, orgId)
      )
    );

  console.log(
    `[EngagementService] Marked conversation ${conversationId} as stale`
  );
}
