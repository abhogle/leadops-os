/**
 * Layer 6: Conversation History
 * Multi-channel conversation context (last N timeline items)
 * Milestone 17: AI SMS Engine v1
 *
 * SECURITY FIXES:
 * - Multi-tenant org_id validation
 * - Optimized query (only needed columns)
 */

import { eq, desc, and } from "drizzle-orm";
import { getDbClient, messages } from "@leadops/db";
import { CONVERSATION_HISTORY_LIMIT } from "../../config/constants.js";

export interface ConversationMessage {
  timestamp: Date;
  channel: string;
  messageType: string;
  sender: string;
  direction: string | null;
  body: string | null;
}

export async function buildConversationHistoryLayer(
  conversationId: string,
  orgId: string
): Promise<string> {
  const db = getDbClient();

  // Fetch last N messages from the conversation (with multi-tenant validation)
  const recentMessages = await db
    .select({
      createdAt: messages.createdAt,
      channel: messages.channel,
      messageType: messages.messageType,
      sender: messages.sender,
      direction: messages.direction,
      body: messages.body,
    })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.orgId, orgId)
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(CONVERSATION_HISTORY_LIMIT);

  if (recentMessages.length === 0) {
    return "## Conversation History: This is the first interaction";
  }

  // Reverse to show oldest first
  const sortedMessages = recentMessages.reverse();

  let layer = `## Conversation History (Last ${sortedMessages.length} interactions)\n\n`;

  for (const msg of sortedMessages) {
    const timestamp = msg.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD
    const time = msg.createdAt.toTimeString().split(" ")[0].slice(0, 5); // HH:MM

    // Format sender label
    const senderLabel = formatSenderLabel(msg.sender, msg.direction);

    // Format message type indicator
    const typeIndicator = formatMessageType(msg.messageType, msg.channel);

    // Message body
    const body = msg.body || "[No content]";

    layer += `[${timestamp} ${time}] ${senderLabel} (${typeIndicator}): ${body}\n`;
  }

  layer += "\n**Note:** Reply to the most recent message or the overall conversation context as appropriate.";

  return layer;
}

/**
 * Format sender label for display
 */
function formatSenderLabel(
  sender: string | null,
  direction: string | null
): string {
  if (!sender) {
    return direction === "inbound" ? "Lead" : "System";
  }

  const labels: Record<string, string> = {
    lead: "Lead",
    ai: "AI Agent",
    human: "Human Agent",
    system: "System",
  };

  return labels[sender] || sender;
}

/**
 * Format message type indicator
 */
function formatMessageType(messageType: string, channel: string): string {
  // Normalize channel/type
  if (messageType === "sms" || channel === "sms") {
    return "SMS";
  }

  if (messageType === "email" || channel === "email") {
    return "Email";
  }

  if (messageType === "call_inbound") {
    return "Phone Call";
  }

  if (messageType === "note") {
    return "Note";
  }

  if (messageType === "ai_action") {
    return "AI Action";
  }

  return messageType || channel || "Message";
}
