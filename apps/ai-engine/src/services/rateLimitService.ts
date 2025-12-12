/**
 * Rate Limit Service
 * Tracks and enforces AI message rate limits per lead
 * Milestone 17: AI SMS Engine v1
 */

import { eq, and, gte } from "drizzle-orm";
import { getDbClient, aiCallLogs } from "@leadops/db";
import { RATE_LIMIT_WINDOW_MS } from "../config/constants.js";

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  windowStart: Date;
}

/**
 * Check if a lead has exceeded their rate limit
 * @param leadId - Lead UUID
 * @param orgId - Organization UUID (for multi-tenant validation)
 * @param orgRateLimit - Organization-level rate limit (messages per hour)
 * @returns RateLimitCheckResult with allowed status and count info
 */
export async function checkRateLimit(
  leadId: string,
  orgRateLimit: number,
  orgId: string
): Promise<RateLimitCheckResult> {
  const db = getDbClient();

  // Calculate window start time (60 minutes ago)
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  // Count AI calls for this lead in the current window (with multi-tenant validation)
  const recentCalls = await db
    .select()
    .from(aiCallLogs)
    .where(
      and(
        eq(aiCallLogs.leadId, leadId),
        eq(aiCallLogs.orgId, orgId),
        gte(aiCallLogs.createdAt, windowStart),
        eq(aiCallLogs.complianceBlocked, false) // Only count successful calls
      )
    );

  const currentCount = recentCalls.length;
  const allowed = currentCount < orgRateLimit;

  return {
    allowed,
    currentCount,
    limit: orgRateLimit,
    windowStart,
  };
}

/**
 * Record a rate limit violation for logging
 * This doesn't create an aiCallLog entry, but could be used for metrics
 */
export function logRateLimitViolation(
  leadId: string,
  currentCount: number,
  limit: number
): void {
  // In a production system, you might send this to a monitoring service
  console.warn(
    `Rate limit exceeded for lead ${leadId}: ${currentCount}/${limit} messages in the last hour`
  );
}
