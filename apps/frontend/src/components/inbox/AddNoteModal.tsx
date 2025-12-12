"use client";

import { useState } from "react";

interface AddNoteModalProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (body: string) => Promise<void>;
}

/**
 * AddNoteModal Component
 *
 * Modal dialog for creating internal notes on a conversation.
 *
 * Features:
 * - Modal overlay with backdrop
 * - Textarea for note content
 * - Save/Cancel buttons
 * - Loading state during save
 * - Auto-focus on open
 */
export function AddNoteModal({
  conversationId,
  isOpen,
  onClose,
  onSave,
}: AddNoteModalProps) {
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle save
  const handleSave = async () => {
    if (!body.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      await onSave(body.trim());
      setBody(""); // Clear on success
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setBody("");
    setError(null);
    onClose();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    }
    // Cmd/Ctrl + Enter to save
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={handleCancel}
    >
      {/* Modal */}
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          width: "90%",
          maxWidth: 540,
          padding: 24,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: "#111827",
              marginBottom: 4,
            }}
          >
            Add Internal Note
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
            Notes are only visible to your team, not to the lead.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: 10,
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 6,
              fontSize: 13,
              color: "#991b1b",
            }}
          >
            {error}
          </div>
        )}

        {/* Textarea */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Enter your note here..."
          autoFocus
          disabled={isSaving}
          style={{
            width: "100%",
            minHeight: 120,
            padding: 12,
            fontSize: 14,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            resize: "vertical",
            fontFamily: "inherit",
            lineHeight: "1.5",
            backgroundColor: isSaving ? "#f9fafb" : "#fff",
            color: "#111827",
            outline: "none",
            marginBottom: 20,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#3b82f6";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#d1d5db";
          }}
        />

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
          }}
        >
          <button
            onClick={handleCancel}
            disabled={isSaving}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              color: "#374151",
              backgroundColor: "#fff",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              cursor: isSaving ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!isSaving) {
                e.currentTarget.style.backgroundColor = "#f9fafb";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#fff";
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!body.trim() || isSaving}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              color: "#fff",
              backgroundColor:
                !body.trim() || isSaving ? "#9ca3af" : "#3b82f6",
              border: "none",
              borderRadius: 6,
              cursor: !body.trim() || isSaving ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (body.trim() && !isSaving) {
                e.currentTarget.style.backgroundColor = "#2563eb";
              }
            }}
            onMouseLeave={(e) => {
              if (body.trim() && !isSaving) {
                e.currentTarget.style.backgroundColor = "#3b82f6";
              }
            }}
          >
            {isSaving ? "Saving..." : "Save Note"}
          </button>
        </div>

        {/* Helper text */}
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: "#9ca3af",
            textAlign: "right",
          }}
        >
          Esc to cancel • ⌘/Ctrl+Enter to save
        </div>
      </div>
    </div>
  );
}
