"use client";

import { useState, useEffect, useCallback } from "react";
import { useTabVisible } from "./useTabVisible";
import type { TimelineItem, Message, Note } from "../components/inbox/Timeline";

interface TimelineResponse {
  conversation_id: string;
  lead: {
    id: string;
    name: string;
    phone: string;
    status: "new" | "contacted" | "qualified" | "unqualified" | "closed";
  };
  assigned_to_name: string | null;
  messages: Array<{
    id: string;
    sender: "lead" | "human" | "ai" | "system";
    body: string;
    created_at: string;
    sent_by_name?: string;
    status?: "sending" | "sent" | "delivered" | "failed";
  }>;
  notes: Array<{
    id: string;
    body: string;
    created_at: string;
    created_by_name: string;
  }>;
}

/**
 * useTimeline Hook
 *
 * Fetches and manages conversation timeline (messages + notes).
 * Polls every 3 seconds when tab is visible.
 *
 * Features:
 * - Auto-polling (3s interval)
 * - Tab visibility detection (pause when hidden)
 * - Loading and error states
 * - Manual refresh capability
 * - Optimistic message addition
 */
export function useTimeline(conversationId: string | null) {
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isTabVisible = useTabVisible();

  // Fetch timeline data
  const fetchTimeline = useCallback(async () => {
    if (!conversationId) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/conversations/${conversationId}/messages`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "Conversation not found"
            : `Failed to fetch timeline: ${response.statusText}`
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
  }, [conversationId]);

  // Initial fetch
  useEffect(() => {
    if (conversationId) {
      setIsLoading(true);
      fetchTimeline();
    }
  }, [conversationId, fetchTimeline]);

  // Polling (3s interval, only when tab is visible)
  useEffect(() => {
    if (!isTabVisible || !conversationId) return;

    const interval = setInterval(() => {
      fetchTimeline();
    }, 3000);

    return () => clearInterval(interval);
  }, [isTabVisible, conversationId, fetchTimeline]);

  // Convert API response to timeline items
  const timelineItems: TimelineItem[] = [
    ...(data?.messages.map((msg) => ({
      type: "message" as const,
      data: msg,
    })) ?? []),
    ...(data?.notes.map((note) => ({
      type: "note" as const,
      data: note,
    })) ?? []),
  ];

  return {
    conversation: data
      ? {
          conversation_id: data.conversation_id,
          lead: data.lead,
          assigned_to_name: data.assigned_to_name,
        }
      : null,
    timelineItems,
    isLoading,
    error,
    refresh: fetchTimeline,
  };
}
