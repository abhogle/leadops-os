"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useInbox } from "../../../../src/hooks/useInbox";
import { useTimeline } from "../../../../src/hooks/useTimeline";
import { useSendMessage } from "../../../../src/hooks/useSendMessage";
import { useCreateNote } from "../../../../src/hooks/useCreateNote";
import { LeadList } from "../../../../src/components/inbox/LeadList";
import { ConversationHeader } from "../../../../src/components/inbox/ConversationHeader";
import { Timeline } from "../../../../src/components/inbox/Timeline";
import { MessageComposer } from "../../../../src/components/inbox/MessageComposer";
import { AddNoteModal } from "../../../../src/components/inbox/AddNoteModal";
import { LeadIntelligencePanel } from "../../../../src/components/inbox/LeadIntelligencePanel";

/**
 * Individual Conversation View
 *
 * Displays the full 3-pane inbox layout with the selected conversation.
 * URL structure: /app/inbox/[conversationId]
 *
 * Components rendered:
 * - LeadList (left pane) - shows all conversations with current one selected
 * - ConversationView (center pane) - timeline of messages + notes for selected conversation
 * - LeadIntelligencePanel (right pane) - lead insights and metadata
 */
export default function InboxConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params?.conversationId as string;

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  // Hooks
  const { conversations, isLoading: isLoadingInbox, error: inboxError } = useInbox();
  const {
    conversation,
    timelineItems,
    isLoading: isLoadingTimeline,
    error: timelineError,
    refresh: refreshTimeline,
  } = useTimeline(conversationId);
  const { sendMessage, isSending, error: sendError } = useSendMessage(conversationId);
  const { createNote } = useCreateNote(conversationId);

  // Handle conversation selection
  const handleSelectConversation = (newConversationId: string) => {
    router.push(`/app/inbox/${newConversationId}`);
  };

  // Handle send message
  const handleSendMessage = async (body: string) => {
    await sendMessage(body);
    refreshTimeline(); // Refresh to show new message
  };

  // Handle create note
  const handleCreateNote = async (body: string) => {
    await createNote(body);
    refreshTimeline(); // Refresh to show new note
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
          selectedConversationId={conversationId}
          isLoading={isLoadingInbox}
          error={inboxError}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Center Pane: Conversation Timeline */}
      <div
        style={{
          borderRight: "1px solid #e0e0e0",
          backgroundColor: "#fff",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* ConversationHeader */}
        {conversation && (
          <ConversationHeader
            leadName={conversation.lead.name}
            leadPhone={conversation.lead.phone}
            status={conversation.lead.status}
            assignedToName={conversation.assigned_to_name}
            onAddNote={() => setIsNoteModalOpen(true)}
          />
        )}

        {/* Timeline */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            backgroundColor: "#f9f9f9",
          }}
        >
          <Timeline
            items={timelineItems}
            isLoading={isLoadingTimeline}
            error={timelineError}
          />
        </div>

        {/* MessageComposer */}
        <MessageComposer
          conversationId={conversationId}
          onSendMessage={handleSendMessage}
          isSending={isSending}
          error={sendError}
        />
      </div>

      {/* Right Pane: Lead Intelligence Panel */}
      <div
        style={{
          backgroundColor: "#fff",
          overflowY: "auto",
          height: "100%",
        }}
      >
        <LeadIntelligencePanel />
      </div>

      {/* Add Note Modal */}
      <AddNoteModal
        conversationId={conversationId}
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSave={handleCreateNote}
      />
    </>
  );
}
