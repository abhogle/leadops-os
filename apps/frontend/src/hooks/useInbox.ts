"use client";

import { useState, useEffect, useCallback } from "react";
import { useTabVisible } from "./useTabVisible";
import type { ConversationPreview } from "../components/inbox/LeadList";

interface InboxResponse {
  conversations: ConversationPreview[];
  total: number;
}

/**
 * useInbox Hook
 *
 * Fetches and manages inbox conversation list.
 * Polls every 5 seconds when tab is visible.
 *
 * Features:
 * - Auto-polling (5s interval)
 * - Tab visibility detection (pause when hidden)
 * - Loading and error states
 * - Manual refresh capability
 */
export function useInbox() {
  const [data, setData] = useState<InboxResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isTabVisible = useTabVisible();

  // Fetch inbox data
  const fetchInbox = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/inbox", {
        credentials: "include", // Include session cookie
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Unauthorized"
            : `Failed to fetch inbox: ${response.statusText}`
        );
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  // Polling (5s interval, only when tab is visible)
  useEffect(() => {
    if (!isTabVisible) return;

    const interval = setInterval(() => {
      fetchInbox();
    }, 5000);

    return () => clearInterval(interval);
  }, [isTabVisible, fetchInbox]);

  return {
    conversations: data?.conversations ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refresh: fetchInbox,
  };
}
