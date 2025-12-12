"use client";

import type { Message } from "./Timeline";

interface MessageBubbleProps {
  message: Message;
}

/**
 * MessageBubble Component
 *
 * Displays individual messages with different styling based on sender.
 *
 * Variants:
 * - Lead: Gray background, left-aligned
 * - Human: Dark navy background, right-aligned, white text
 * - AI: Blue background, right-aligned, white text
 * - System: Light background, centered, italic
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  const { sender, body, created_at, sent_by_name, status } = message;

  // Format timestamp
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Get styling based on sender
  const getMessageStyle = () => {
    switch (sender) {
      case "lead":
        return {
          alignment: "flex-start",
          backgroundColor: "#f3f4f6",
          color: "#111827",
          maxWidth: "70%",
          borderRadius: "12px 12px 12px 4px",
        };
      case "human":
        return {
          alignment: "flex-end",
          backgroundColor: "#1e293b",
          color: "#ffffff",
          maxWidth: "70%",
          borderRadius: "12px 12px 4px 12px",
        };
      case "ai":
        return {
          alignment: "flex-end",
          backgroundColor: "#3b82f6",
          color: "#ffffff",
          maxWidth: "70%",
          borderRadius: "12px 12px 4px 12px",
        };
      case "system":
        return {
          alignment: "center",
          backgroundColor: "#fef3c7",
          color: "#78350f",
          maxWidth: "80%",
          borderRadius: "8px",
        };
      default:
        return {
          alignment: "flex-start",
          backgroundColor: "#f3f4f6",
          color: "#111827",
          maxWidth: "70%",
          borderRadius: "12px",
        };
    }
  };

  const style = getMessageStyle();

  // System messages have different layout
  if (sender === "system") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            backgroundColor: style.backgroundColor,
            color: style.color,
            padding: "8px 16px",
            borderRadius: style.borderRadius,
            fontSize: 13,
            fontStyle: "italic",
            maxWidth: style.maxWidth,
            textAlign: "center",
          }}
        >
          {body}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: style.alignment,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          maxWidth: style.maxWidth,
        }}
      >
        {/* Sender name (for human/AI messages) */}
        {(sender === "human" || sender === "ai") && sent_by_name && (
          <div
            style={{
              fontSize: 11,
              color: "#6b7280",
              marginBottom: 4,
              textAlign: "right",
            }}
          >
            {sent_by_name}
          </div>
        )}

        {/* Message bubble */}
        <div
          style={{
            backgroundColor: style.backgroundColor,
            color: style.color,
            padding: "10px 14px",
            borderRadius: style.borderRadius,
            fontSize: 14,
            lineHeight: "1.5",
            wordWrap: "break-word",
            position: "relative",
          }}
        >
          {body}

          {/* Timestamp + Status */}
          <div
            style={{
              fontSize: 11,
              marginTop: 6,
              opacity: 0.7,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>{formatTime(created_at)}</span>
            {status && sender !== "lead" && (
              <span>
                {status === "sending" && "⏳"}
                {status === "sent" && "✓"}
                {status === "delivered" && "✓✓"}
                {status === "failed" && "❌"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
