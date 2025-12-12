"use client";

import { useState } from "react";

/**
 * useSendMessage Hook
 *
 * Handles sending SMS messages to leads.
 * Provides loading state and error handling.
 *
 * Features:
 * - Loading state during send
 * - Error handling with retry
 * - Automatic timeline refresh on success (caller's responsibility)
 */
export function useSendMessage(conversationId: string) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (body: string): Promise<void> => {
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ body }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to send message: ${response.statusText}`
        );
      }

      // Success - caller should refresh timeline
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err; // Re-throw so caller can handle (e.g., restore message in composer)
    } finally {
      setIsSending(false);
    }
  };

  return {
    sendMessage,
    isSending,
    error,
    clearError: () => setError(null),
  };
}
