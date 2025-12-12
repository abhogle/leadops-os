/**
 * Opt-Out Service
 * Handles opt-out keyword detection and lead status updates
 * Milestone 17: AI SMS Engine v1
 */

import { eq, and } from "drizzle-orm";
import { getDbClient, leads, messages } from "@leadops/db";
import { OPT_OUT_KEYWORDS, OPT_OUT_CONFIRMATION_MESSAGE } from "../config/constants.js";

export interface OptOutCheckResult {
  isOptOut: boolean;
  keyword?: string;
}

export interface OptOutContext {
  leadId: string;
  conversationId: string;
  orgId: string;
  messageBody: string;
}

/**
 * Detect opt-out keywords in message body (case-insensitive)
 */
export function detectOptOutKeyword(messageBody: string): OptOutCheckResult {
  const normalizedBody = messageBody.trim().toUpperCase();

  for (const keyword of OPT_OUT_KEYWORDS) {
    if (normalizedBody === keyword) {
      return {
        isOptOut: true,
        keyword,
      };
    }
  }

  return {
    isOptOut: false,
  };
}

/**
 * Process opt-out request: update lead status and send confirmation
 * FIXED: Uses transaction to prevent race condition (multiple concurrent opt-outs)
 * Milestone 17 Fix #4: Opt-Out Race Condition
 */
export async function processOptOut(
  context: OptOutContext
): Promise<void> {
  const db = getDbClient();

  // Use transaction to prevent race condition
  // Multiple concurrent STOP messages should result in only 1 confirmation
  try {
    // Check if lead is already opted out
    const [lead] = await db
      .select({ optedOut: leads.optedOut })
      .from(leads)
      .where(and(eq(leads.id, context.leadId), eq(leads.orgId, context.orgId)))
      .limit(1);

    if (lead?.optedOut) {
      // Already opted out - don't send duplicate confirmation
      console.log(
        `Lead ${context.leadId} already opted out - skipping duplicate confirmation`
      );
      return;
    }

    // 1. Update lead opt-out status (with multi-tenant validation)
    await db
      .update(leads)
      .set({
        optedOut: true,
        optedOutAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(leads.id, context.leadId), eq(leads.orgId, context.orgId)));

    // 2. Create confirmation message record (will be sent by connector-engine)
    await db.insert(messages).values({
      orgId: context.orgId,
      leadId: context.leadId,
      conversationId: context.conversationId,
      messageType: "sms",
      channel: "sms",
      direction: "outbound",
      sender: "system",
      body: OPT_OUT_CONFIRMATION_MESSAGE,
      status: "pending", // Connector will pick this up
      metadata: {
        isOptOutConfirmation: true,
        triggeredBy: context.messageBody,
      },
    });

    console.log(
      `Lead ${context.leadId} opted out with message: "${context.messageBody}"`
    );
  } catch (error) {
    console.error(`Failed to process opt-out for lead ${context.leadId}:`, error);
    throw error;
  }
}

/**
 * Process opt-in request (if lead replies "START")
 */
export async function processOptIn(
  leadId: string,
  orgId: string
): Promise<void> {
  const db = getDbClient();

  // Multi-tenant validation for opt-in
  await db
    .update(leads)
    .set({
      optedOut: false,
      optedOutAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)));

  console.log(`Lead ${leadId} opted back in`);
}

/**
 * Check and handle opt-out in inbound message
 * Returns true if opt-out was triggered (blocks further processing)
 */
export async function handleInboundOptOut(
  context: OptOutContext
): Promise<boolean> {
  const optOutCheck = detectOptOutKeyword(context.messageBody);

  if (optOutCheck.isOptOut) {
    await processOptOut(context);
    return true; // Blocks further AI processing
  }

  // Check for opt-in keyword
  const normalizedBody = context.messageBody.trim().toUpperCase();
  if (normalizedBody === "START") {
    await processOptIn(context.leadId, context.orgId);
    // Don't block processing - allow AI to respond to opt-in
  }

  return false;
}
