/**
 * Logging Service
 * Creates comprehensive AI call logs for observability
 * Milestone 17: AI SMS Engine v1
 */

import { getDbClient, aiCallLogs } from "@leadops/db";
import {
  PROMPT_SUMMARY_MAX_LENGTH,
  RESPONSE_SUMMARY_MAX_LENGTH,
  FallbackTier,
} from "../config/constants.js";

export interface AICallLogData {
  orgId: string;
  leadId: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  model: string;

  // Performance metrics
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  latencyMs?: number;

  // Fallback tracking
  fallbackTier?: FallbackTier;

  // Compliance tracking
  complianceBlocked?: boolean;
  complianceRuleTriggered?: string;

  // Sanitized summaries (for debugging, not full content)
  promptSummary?: string;
  responseSummary?: string;
}

/**
 * Create an AI call log entry
 */
export async function logAICall(data: AICallLogData): Promise<void> {
  const db = getDbClient();

  try {
    // Sanitize and truncate summaries
    const sanitizedPromptSummary = data.promptSummary
      ? sanitizeAndTruncate(data.promptSummary, PROMPT_SUMMARY_MAX_LENGTH)
      : null;

    const sanitizedResponseSummary = data.responseSummary
      ? sanitizeAndTruncate(data.responseSummary, RESPONSE_SUMMARY_MAX_LENGTH)
      : null;

    await db.insert(aiCallLogs).values({
      orgId: data.orgId,
      leadId: data.leadId,
      conversationId: data.conversationId,
      direction: data.direction,
      model: data.model,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      cachedTokens: data.cachedTokens,
      latencyMs: data.latencyMs,
      fallbackTier: data.fallbackTier,
      complianceBlocked: data.complianceBlocked ?? false,
      complianceRuleTriggered: data.complianceRuleTriggered,
      promptSummary: sanitizedPromptSummary,
      responseSummary: sanitizedResponseSummary,
    });

    console.log(
      `AI call logged: ${data.direction} | model: ${data.model} | ` +
        `tokens: ${data.inputTokens || 0}/${data.outputTokens || 0} | ` +
        `latency: ${data.latencyMs || 0}ms | ` +
        `tier: ${data.fallbackTier || 1} | ` +
        `blocked: ${data.complianceBlocked || false}`
    );
  } catch (error) {
    // Log error but don't throw - we don't want logging failures to break the AI flow
    console.error("Failed to log AI call:", error);
  }
}

/**
 * Sanitize text by removing PII and sensitive data
 * Milestone 17 Fix #7: Enhanced PII Sanitization (HIPAA/GDPR compliant)
 */
function sanitizeText(text: string): string {
  let sanitized = text;

  // 1. Remove phone numbers (multiple formats)
  sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE]");
  sanitized = sanitized.replace(/\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/g, "[PHONE]");
  sanitized = sanitized.replace(/\b1?[-.]?\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE]");

  // 2. Remove email addresses
  sanitized = sanitized.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    "[EMAIL]"
  );

  // 3. Remove SSN patterns
  sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]");
  sanitized = sanitized.replace(/\b\d{9}\b/g, "[SSN]");

  // 4. Remove credit card patterns
  sanitized = sanitized.replace(
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    "[CC]"
  );

  // 5. Remove common address patterns
  sanitized = sanitized.replace(
    /\b\d{1,5}\s+[\w\s]{1,30}(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct|circle|cir|way|place|pl)\b/gi,
    "[ADDRESS]"
  );

  // 6. Remove ZIP codes (US format)
  sanitized = sanitized.replace(/\b\d{5}(-\d{4})?\b/g, "[ZIP]");

  // 7. Remove dates of birth patterns
  sanitized = sanitized.replace(
    /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g,
    "[DOB]"
  );
  sanitized = sanitized.replace(
    /\b(19|20)\d{2}[\/\-](0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])\b/g,
    "[DOB]"
  );

  // 8. Remove common name patterns (basic - can be enhanced)
  // This is a simple pattern - more sophisticated Named Entity Recognition would be better
  sanitized = sanitized.replace(
    /\b(mr|mrs|ms|dr|prof)\.?\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/gi,
    "[NAME]"
  );

  return sanitized;
}

/**
 * Truncate text to max length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Sanitize and truncate text for logging
 */
function sanitizeAndTruncate(text: string, maxLength: number): string {
  const sanitized = sanitizeText(text);
  return truncateText(sanitized, maxLength);
}

/**
 * Log a compliance block event
 */
export async function logComplianceBlock(
  data: Omit<AICallLogData, "complianceBlocked"> & {
    complianceRuleTriggered: string;
  }
): Promise<void> {
  await logAICall({
    ...data,
    complianceBlocked: true,
    outputTokens: 0, // No output generated
    latencyMs: 0, // Blocked before AI call
  });
}

/**
 * Log a precondition block (opt-out, DNC, rate limit, human takeover)
 * These don't create AI call logs, but we log them to console for monitoring
 */
export function logPreconditionBlock(
  leadId: string,
  conversationId: string,
  blockType: string,
  reason: string
): void {
  console.warn(
    `AI call blocked by precondition: ${blockType} | ` +
      `lead: ${leadId} | conversation: ${conversationId} | ` +
      `reason: ${reason}`
  );

  // In production, you might want to send this to a monitoring service
  // or create a separate precondition_blocks table for analytics
}
