/**
 * AI Engine Configuration Constants
 * Milestone 17: AI SMS Engine v1
 */

import { AI_MODELS } from "@leadops/config";

// Conversation history
export const CONVERSATION_HISTORY_LIMIT = 10; // Last 10 timeline items

// Rate limiting
export const AI_RATE_LIMIT_DEFAULT = 10; // Messages per hour
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 60 minutes

// AI call configuration (from centralized config per Doc #25)
export const AI_CALL_TIMEOUT_MS = AI_MODELS.conversation.timeout;
export const AI_MODEL = AI_MODELS.conversation.model;

// Opt-out keywords (case-insensitive)
export const OPT_OUT_KEYWORDS = [
  "STOP",
  "CANCEL",
  "END",
  "QUIT",
  "UNSUBSCRIBE",
] as const;

// Opt-out confirmation message
export const OPT_OUT_CONFIRMATION_MESSAGE =
  "You have been unsubscribed from automated messages. A human agent will reach out if needed. Reply START to re-subscribe.";

// Fallback tiers
export enum FallbackTier {
  FULL_PROMPT = 1,           // Full 6-layer prompt
  REDUCED_PROMPT = 2,        // Simplified prompt (no caching)
  TEMPLATE = 3,              // Hardcoded template from workflow
  HUMAN_ESCALATION = 4,      // Set needs_attention flag
}

// Logging configuration
export const PROMPT_SUMMARY_MAX_LENGTH = 200;  // Characters
export const RESPONSE_SUMMARY_MAX_LENGTH = 200; // Characters
export const AI_LOG_RETENTION_DAYS = 30;

// Conversation post-completion behaviors
export enum PostCompletionBehavior {
  AI_REPLIES = "ai_replies",           // Continue AI responses
  AI_STOPS = "ai_stops",              // Stop AI, manual takeover required
  MARK_NEEDS_ATTENTION = "mark_needs_attention", // Flag for agent review
}

// Cache control markers for Anthropic prompt caching
export const CACHE_BREAKPOINT_LAYERS = [2, 4, 6]; // After vertical, workflow context, and history

// Human takeover
export const HUMAN_TAKEOVER_MESSAGE =
  "This conversation has been transferred to a human agent who will respond shortly.";
