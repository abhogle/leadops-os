"use client";

import { useState, useRef, useEffect } from "react";

interface MessageComposerProps {
  conversationId: string;
  onSendMessage: (body: string) => Promise<void>;
  isSending?: boolean;
  error?: string | null;
}

/**
 * MessageComposer Component
 *
 * SMS message composer with auto-expanding textarea.
 * Displays at the bottom of the conversation timeline.
 *
 * Features:
 * - Auto-expanding textarea (up to 5 rows)
 * - Character counter (160 chars per SMS segment)
 * - Send button (Enter to send, Shift+Enter for new line)
 * - Optimistic UI: Disables while sending
 * - Error toast on failure
 */
export function MessageComposer({
  conversationId,
  onSendMessage,
  isSending = false,
  error = null,
}: MessageComposerProps) {
  const [body, setBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120); // Max 5 rows ~120px
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [body]);

  // Calculate SMS segments (160 chars per segment)
  const charCount = body.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  // Handle send
  const handleSend = async () => {
    if (!body.trim() || isSending) return;

    const messageBody = body.trim();
    setBody(""); // Clear immediately (optimistic)

    try {
      await onSendMessage(messageBody);
    } catch (err) {
      // On error, restore the message
      setBody(messageBody);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        padding: 16,
        borderTop: "1px solid #e5e7eb",
        backgroundColor: "#fff",
      }}
    >
      {/* Error toast */}
      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 6,
            fontSize: 13,
            color: "#991b1b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Failed to send message: {error}</span>
          <button
            onClick={() => {
              /* Clear error in parent component */
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              color: "#991b1b",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Composer */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
        }}
      >
        {/* Textarea */}
        <div style={{ flex: 1, position: "relative" }}>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isSending}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 14,
              border: "1px solid #d1d5db",
              borderRadius: 8,
              resize: "none",
              fontFamily: "inherit",
              lineHeight: "1.5",
              minHeight: 44,
              backgroundColor: isSending ? "#f9fafb" : "#fff",
              color: isSending ? "#9ca3af" : "#111827",
              outline: "none",
              transition: "border-color 0.15s ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#3b82f6";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#d1d5db";
            }}
          />

          {/* Character counter */}
          <div
            style={{
              position: "absolute",
              bottom: 8,
              right: 12,
              fontSize: 11,
              color: charCount > 160 ? "#ef4444" : "#9ca3af",
              pointerEvents: "none",
            }}
          >
            {charCount > 0 && `${charCount} / ${smsSegments} SMS`}
          </div>
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!body.trim() || isSending}
          style={{
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 500,
            color: "#fff",
            backgroundColor:
              !body.trim() || isSending ? "#9ca3af" : "#3b82f6",
            border: "none",
            borderRadius: 8,
            cursor: !body.trim() || isSending ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
            minWidth: 80,
          }}
          onMouseEnter={(e) => {
            if (body.trim() && !isSending) {
              e.currentTarget.style.backgroundColor = "#2563eb";
            }
          }}
          onMouseLeave={(e) => {
            if (body.trim() && !isSending) {
              e.currentTarget.style.backgroundColor = "#3b82f6";
            }
          }}
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>

      {/* Helper text */}
      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          color: "#6b7280",
        }}
      >
        Press Enter to send • Shift+Enter for new line
      </div>
    </div>
  );
}
