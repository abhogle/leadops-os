"use client";

import { MessageBubble } from "./MessageBubble";
import { NoteItem } from "./NoteItem";

export interface Message {
  id: string;
  sender: "lead" | "human" | "ai" | "system";
  body: string;
  created_at: string;
  sent_by_name?: string;
  status?: "sending" | "sent" | "delivered" | "failed";
}

export interface Note {
  id: string;
  body: string;
  created_at: string;
  created_by_name: string;
}

export type TimelineItem =
  | { type: "message"; data: Message }
  | { type: "note"; data: Note };

interface TimelineProps {
  items: TimelineItem[];
  isLoading?: boolean;
  error?: string | null;
}

/**
 * Timeline Component
 *
 * Displays a chronological view of messages and notes merged together.
 * Shows date dividers between different days.
 *
 * Features:
 * - Merged messages + notes sorted by created_at
 * - Date dividers (e.g., "Today", "Yesterday", "Dec 10")
 * - Auto-scroll to bottom on new messages
 * - Loading and error states
 */
export function Timeline({ items, isLoading = false, error = null }: TimelineProps) {
  // Sort items by created_at
  const sortedItems = [...items].sort((a, b) => {
    const timeA = new Date(
      a.type === "message" ? a.data.created_at : a.data.created_at
    ).getTime();
    const timeB = new Date(
      b.type === "message" ? b.data.created_at : b.data.created_at
    ).getTime();
    return timeA - timeB;
  });

  // Group items by date for dividers
  const itemsWithDividers: Array<
    TimelineItem | { type: "divider"; date: string }
  > = [];
  let lastDate: string | null = null;

  sortedItems.forEach((item) => {
    const itemDate =
      item.type === "message" ? item.data.created_at : item.data.created_at;
    const dateStr = new Date(itemDate).toDateString();

    if (dateStr !== lastDate) {
      itemsWithDividers.push({ type: "divider", date: dateStr });
      lastDate = dateStr;
    }

    itemsWithDividers.push(item);
  });

  // Format date divider text
  const formatDateDivider = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  // Loading state
  if (isLoading && items.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <div style={{ color: "#6b7280", fontSize: 14 }}>
          Loading conversation...
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
            Failed to load conversation
          </div>
          <div style={{ fontSize: 13 }}>{error}</div>
        </div>
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          textAlign: "center",
          color: "#9ca3af",
        }}
      >
        <div>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
          <div style={{ fontSize: 14 }}>No messages yet</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      {itemsWithDividers.map((item, index) => {
        if (item.type === "divider") {
          return (
            <div
              key={`divider-${index}`}
              style={{
                display: "flex",
                alignItems: "center",
                margin: "24px 0",
              }}
            >
              <div style={{ flex: 1, height: 1, backgroundColor: "#e5e7eb" }} />
              <div
                style={{
                  padding: "0 16px",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#6b7280",
                }}
              >
                {formatDateDivider(item.date)}
              </div>
              <div style={{ flex: 1, height: 1, backgroundColor: "#e5e7eb" }} />
            </div>
          );
        }

        if (item.type === "message") {
          return <MessageBubble key={item.data.id} message={item.data} />;
        }

        if (item.type === "note") {
          return <NoteItem key={item.data.id} note={item.data} />;
        }

        return null;
      })}
    </div>
  );
}
