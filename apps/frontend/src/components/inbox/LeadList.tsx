"use client";

import { LeadListItem } from "./LeadListItem";

export interface ConversationPreview {
  conversation_id: string;
  lead_id: string;
  lead_name: string;
  lead_phone: string;
  last_message: string | null;
  last_message_at: string;
  has_unread: boolean;
  assigned_to_name: string | null;
  status: "new" | "contacted" | "qualified" | "unqualified" | "closed";
}

interface LeadListProps {
  conversations: ConversationPreview[];
  selectedConversationId?: string;
  isLoading?: boolean;
  error?: string | null;
  onSelectConversation: (conversationId: string) => void;
}

/**
 * LeadList Component
 *
 * Displays the list of conversations in the left pane of the inbox.
 * Shows conversation previews with lead info, last message, and unread status.
 *
 * Features:
 * - Scrollable list of conversations
 * - Active state for selected conversation
 * - Loading state
 * - Error state with inline banner
 * - Empty state when no conversations
 */
export function LeadList({
  conversations,
  selectedConversationId,
  isLoading = false,
  error = null,
  onSelectConversation,
}: LeadListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "#666", fontSize: 14, textAlign: "center" }}>
          Loading conversations...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <div
          style={{
            padding: 12,
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 6,
            fontSize: 14,
            color: "#991b1b",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            Failed to load conversations
          </div>
          <div style={{ fontSize: 13 }}>{error}</div>
        </div>
      </div>
    );
  }

  // Empty state
  if (conversations.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <div
          style={{
            textAlign: "center",
            color: "#999",
            padding: "32px 16px",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
            No conversations yet
          </div>
          <div style={{ fontSize: 13 }}>
            New leads will appear here
          </div>
        </div>
      </div>
    );
  }

  // Conversation list
  return (
    <div>
      {conversations.map((conversation) => (
        <LeadListItem
          key={conversation.conversation_id}
          conversation={conversation}
          isSelected={conversation.conversation_id === selectedConversationId}
          onClick={() => onSelectConversation(conversation.conversation_id)}
        />
      ))}
    </div>
  );
}
