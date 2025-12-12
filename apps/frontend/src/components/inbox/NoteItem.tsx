"use client";

import type { Note } from "./Timeline";

interface NoteItemProps {
  note: Note;
}

/**
 * NoteItem Component
 *
 * Displays internal notes in the timeline.
 * Notes are styled differently from messages to indicate they're internal-only.
 *
 * Features:
 * - Yellow/beige background to differentiate from messages
 * - Shows author name and timestamp
 * - Full-width layout (not bubble style like messages)
 * - Note icon indicator
 */
export function NoteItem({ note }: NoteItemProps) {
  const { body, created_at, created_by_name } = note;

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div
      style={{
        backgroundColor: "#fefce8",
        border: "1px solid #fde047",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
      }}
    >
      {/* Header: Icon + Author + Timestamp */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          fontSize: 12,
          color: "#854d0e",
          fontWeight: 500,
        }}
      >
        <span style={{ fontSize: 16 }}>📝</span>
        <span>{created_by_name}</span>
        <span style={{ color: "#a16207" }}>•</span>
        <span style={{ color: "#a16207" }}>{formatTimestamp(created_at)}</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            padding: "2px 8px",
            backgroundColor: "#fef3c7",
            borderRadius: 4,
            fontWeight: 500,
          }}
        >
          Internal Note
        </span>
      </div>

      {/* Note body */}
      <div
        style={{
          fontSize: 14,
          color: "#713f12",
          lineHeight: "1.5",
          whiteSpace: "pre-wrap",
        }}
      >
        {body}
      </div>
    </div>
  );
}
