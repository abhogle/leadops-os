"use client";

import { useRouter } from "next/navigation";
import { useInbox } from "../../../src/hooks/useInbox";
import { LeadList } from "../../../src/components/inbox/LeadList";
import { LeadIntelligencePanel } from "../../../src/components/inbox/LeadIntelligencePanel";

/**
 * Default Inbox Landing Page
 *
 * This page handles the default /app/inbox route.
 * Shows the lead list with empty state for conversation and intelligence panel.
 */
export default function InboxPage() {
  const router = useRouter();
  const { conversations, isLoading, error } = useInbox();

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    router.push(`/app/inbox/${conversationId}`);
  };

  return (
    <>
      {/* Left Pane: Lead List */}
      <div
        style={{
          borderRight: "1px solid #e0e0e0",
          backgroundColor: "#fafafa",
          overflowY: "auto",
          height: "100%",
        }}
      >
        <div style={{ padding: 16, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            Inbox
          </h2>
        </div>
        <LeadList
          conversations={conversations}
          isLoading={isLoading}
          error={error}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Center Pane: Empty State */}
      <div
        style={{
          borderRight: "1px solid #e0e0e0",
          backgroundColor: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <div style={{ textAlign: "center", color: "#999" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
            No conversation selected
          </div>
          <div style={{ fontSize: 14 }}>
            Select a conversation from the list to view messages
          </div>
        </div>
      </div>

      {/* Right Pane: Empty Intelligence Panel */}
      <div
        style={{
          backgroundColor: "#fff",
          overflowY: "auto",
          height: "100%",
        }}
      >
        <LeadIntelligencePanel />
      </div>
    </>
  );
}
