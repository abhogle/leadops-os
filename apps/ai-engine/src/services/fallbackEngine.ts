/**
 * Fallback Engine
 * Implements 4-tier fallback system for AI call failures
 * Milestone 17: AI SMS Engine v1
 */

import { eq, and } from "drizzle-orm";
import { getDbClient, conversations } from "@leadops/db";
import { FallbackTier } from "../config/constants.js";

export interface FallbackResult {
  success: boolean;
  response?: string;
  tier: FallbackTier;
  error?: string;
}

export interface FallbackContext {
  conversationId: string;
  orgId: string;
  leadId: string;
  fallbackTemplate?: string; // From workflow SMS_AI node config
}

/**
 * Execute fallback strategy when AI call fails or times out
 *
 * Tier 1: Full prompt with caching (handled by caller)
 * Tier 2: Reduced prompt without caching (handled by caller)
 * Tier 3: Use hardcoded template from workflow
 * Tier 4: Set needs_attention flag for human escalation
 */
export async function executeFallback(
  context: FallbackContext,
  currentTier: FallbackTier
): Promise<FallbackResult> {
  console.log(
    `Executing fallback tier ${currentTier} for conversation ${context.conversationId}`
  );

  switch (currentTier) {
    case FallbackTier.TEMPLATE:
      return await useFallbackTemplate(context);

    case FallbackTier.HUMAN_ESCALATION:
      return await escalateToHuman(context);

    default:
      // Tier 1 and 2 should be handled by the AI provider
      // If we reach here, something is wrong
      return {
        success: false,
        tier: currentTier,
        error: "Invalid fallback tier - should be handled by AI provider",
      };
  }
}

/**
 * Tier 3: Use hardcoded fallback template from workflow config
 */
async function useFallbackTemplate(
  context: FallbackContext
): Promise<FallbackResult> {
  if (!context.fallbackTemplate) {
    // No template provided - escalate to human
    console.warn(
      `No fallback template provided for conversation ${context.conversationId}, escalating to human`
    );
    return await escalateToHuman(context);
  }

  // Template variables that can be used in fallback message
  // e.g., "Thanks for your message. A team member will respond shortly."
  const response = interpolateTemplate(context.fallbackTemplate, {
    conversationId: context.conversationId,
    leadId: context.leadId,
  });

  return {
    success: true,
    response,
    tier: FallbackTier.TEMPLATE,
  };
}

/**
 * Tier 4: Escalate to human by setting needs_attention flag
 * No message is sent - agent will be notified via inbox UI badge
 */
async function escalateToHuman(
  context: FallbackContext
): Promise<FallbackResult> {
  const db = getDbClient();

  try {
    // Set needs_attention flag on conversation (with multi-tenant validation)
    await db
      .update(conversations)
      .set({
        needsAttention: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(conversations.id, context.conversationId),
          eq(conversations.orgId, context.orgId)
        )
      );

    console.log(
      `Escalated conversation ${context.conversationId} to human - needs_attention flag set`
    );

    return {
      success: true,
      tier: FallbackTier.HUMAN_ESCALATION,
      response: undefined, // No automatic message sent
    };
  } catch (error) {
    return {
      success: false,
      tier: FallbackTier.HUMAN_ESCALATION,
      error: `Failed to escalate to human: ${error}`,
    };
  }
}

/**
 * Simple template interpolation for fallback messages
 * Supports {{variableName}} syntax
 */
function interpolateTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, "g"), value);
  }

  return result;
}

/**
 * Determine if we should attempt next fallback tier
 */
export function shouldAttemptNextTier(currentTier: FallbackTier): boolean {
  return currentTier < FallbackTier.HUMAN_ESCALATION;
}

/**
 * Get next fallback tier
 */
export function getNextTier(currentTier: FallbackTier): FallbackTier | null {
  if (!shouldAttemptNextTier(currentTier)) {
    return null;
  }
  return (currentTier + 1) as FallbackTier;
}
