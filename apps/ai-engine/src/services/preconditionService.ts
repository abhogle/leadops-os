/**
 * Precondition Service
 * Evaluates whether an AI call should proceed based on compliance rules
 * Milestone 17: AI SMS Engine v1
 */

import { eq, and } from "drizzle-orm";
import { getDbClient, leads, conversations, orgs } from "@leadops/db";
import { checkRateLimit } from "./rateLimitService.js";

export interface PreconditionResult {
  allowed: boolean;
  reason?: string;
  blockType?: "opt_out" | "dnc" | "rate_limit" | "human_takeover";
}

export interface PreconditionContext {
  leadId: string;
  conversationId: string;
  orgId: string;
}

/**
 * Evaluate all preconditions for an AI call
 * Returns immediately on first blocking condition
 */
export async function evaluatePreconditions(
  context: PreconditionContext
): Promise<PreconditionResult> {
  const db = getDbClient();

  // 1. Check if lead has opted out (with multi-tenant org_id validation)
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, context.leadId), eq(leads.orgId, context.orgId)))
    .limit(1);

  if (!lead) {
    return {
      allowed: false,
      reason: "Lead not found or access denied",
      blockType: "opt_out",
    };
  }

  if (lead.optedOut) {
    return {
      allowed: false,
      reason: "Lead has opted out of automated messages",
      blockType: "opt_out",
    };
  }

  // 2. Check DNC flag
  if (lead.dncFlag) {
    return {
      allowed: false,
      reason: `Lead is on Do Not Call list: ${lead.dncReason || "Unspecified"}`,
      blockType: "dnc",
    };
  }

  // 3. Check conversation human takeover (with multi-tenant org_id validation)
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, context.conversationId),
        eq(conversations.orgId, context.orgId)
      )
    )
    .limit(1);

  if (!conversation) {
    return {
      allowed: false,
      reason: "Conversation not found or access denied",
      blockType: "human_takeover",
    };
  }

  if (conversation.humanTakeover) {
    return {
      allowed: false,
      reason: "Conversation is in human takeover mode",
      blockType: "human_takeover",
    };
  }

  // 4. Check rate limits
  const [org] = await db
    .select()
    .from(orgs)
    .where(eq(orgs.id, context.orgId))
    .limit(1);

  if (!org) {
    return {
      allowed: false,
      reason: "Organization not found",
      blockType: "rate_limit",
    };
  }

  const rateLimitCheck = await checkRateLimit(
    context.leadId,
    org.aiRateLimitPerHour,
    context.orgId
  );

  if (!rateLimitCheck.allowed) {
    return {
      allowed: false,
      reason: `Rate limit exceeded: ${rateLimitCheck.currentCount}/${rateLimitCheck.limit} messages in the last hour`,
      blockType: "rate_limit",
    };
  }

  // All preconditions passed
  return {
    allowed: true,
  };
}

/**
 * Check if a specific precondition would block (for testing)
 * Includes multi-tenant org_id validation
 */
export async function checkOptOutStatus(
  leadId: string,
  orgId: string
): Promise<boolean> {
  const db = getDbClient();
  const [lead] = await db
    .select({ optedOut: leads.optedOut })
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)))
    .limit(1);

  return lead?.optedOut ?? false;
}

/**
 * Check if a specific precondition would block (for testing)
 * Includes multi-tenant org_id validation
 */
export async function checkDncStatus(
  leadId: string,
  orgId: string
): Promise<boolean> {
  const db = getDbClient();
  const [lead] = await db
    .select({ dncFlag: leads.dncFlag })
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)))
    .limit(1);

  return lead?.dncFlag ?? false;
}

/**
 * Check if conversation is in human takeover mode
 * Includes multi-tenant org_id validation
 */
export async function checkHumanTakeover(
  conversationId: string,
  orgId: string
): Promise<boolean> {
  const db = getDbClient();
  const [conversation] = await db
    .select({ humanTakeover: conversations.humanTakeover })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.orgId, orgId)
      )
    )
    .limit(1);

  return conversation?.humanTakeover ?? false;
}
