"use client";

import { useState } from "react";

/**
 * useCreateNote Hook
 *
 * Handles creating internal notes on conversations.
 * Provides loading state and error handling.
 *
 * Features:
 * - Loading state during save
 * - Error handling
 * - Automatic timeline refresh on success (caller's responsibility)
 */
export function useCreateNote(conversationId: string) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createNote = async (body: string): Promise<void> => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          conversation_id: conversationId,
          body,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to create note: ${response.statusText}`
        );
      }

      // Success - caller should refresh timeline
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    createNote,
    isSaving,
    error,
    clearError: () => setError(null),
  };
}
