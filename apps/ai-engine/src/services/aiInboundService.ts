/**
 * AI Inbound Service
 * Handles reactive AI responses to inbound lead messages
 * Milestone 17: AI SMS Engine v1
 * Milestone 18: Engagement tracking integration
 */

import { eq, and } from "drizzle-orm";
import { getDbClient, messages, orgs, conversations } from "@leadops/db";
import { handleInboundOptOut } from "./optOutService.js";
import { evaluatePreconditions } from "./preconditionService.js";
import { assemblePrompt, assembleReducedPrompt } from "../prompt/assemblePrompt.js";
import { callWithFallback } from "../providers/claudeSonnet.js";
import { validateCompliance } from "./complianceGuard.js";
import { executeFallback, getNextTier } from "./fallbackEngine.js";
import { logAICall, logComplianceBlock, logPreconditionBlock } from "./loggingService.js";
import { FallbackTier, AI_MODEL, PostCompletionBehavior } from "../config/constants.js";
import { markEngaged } from "./engagementService.js";

export interface InboundAIRequest {
  orgId: string;
  leadId: string;
  conversationId: string;
  inboundMessageBody: string;
}

export interface InboundAIResult {
  success: boolean;
  responded: boolean;
  messageBody?: string;
  tier?: FallbackTier;
  error?: string;
  optOutTriggered?: boolean;
}

/**
 * Process inbound message and generate AI response
 */
export async function processInboundMessage(
  request: InboundAIRequest
): Promise<InboundAIResult> {
  const db = getDbClient();

  // Step 0: Check for opt-out keywords
  const optOutTriggered = await handleInboundOptOut({
    orgId: request.orgId,
    leadId: request.leadId,
    conversationId: request.conversationId,
    messageBody: request.inboundMessageBody,
  });

  if (optOutTriggered) {
    // Opt-out confirmation already sent, no AI response needed
    return {
      success: true,
      responded: true, // Opt-out confirmation counts as a response
      optOutTriggered: true,
    };
  }

  // Step 1: Check conversation status and post-completion behavior (with multi-tenant validation)
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, request.conversationId),
        eq(conversations.orgId, request.orgId)
      )
    )
    .limit(1);

  if (!conversation) {
    return {
      success: false,
      responded: false,
      error: "Conversation not found or access denied",
    };
  }

  // Check if conversation is completed and what the org's post-completion behavior is
  const [org] = await db
    .select()
    .from(orgs)
    .where(eq(orgs.id, request.orgId))
    .limit(1);

  if (!org) {
    return {
      success: false,
      responded: false,
      error: "Organization not found",
    };
  }

  // If conversation is completed and org has "ai_stops" behavior, don't respond
  if (
    conversation.status === "completed" &&
    org.conversationPostCompletionBehavior === PostCompletionBehavior.AI_STOPS
  ) {
    console.log(
      `Conversation ${request.conversationId} is completed and AI is stopped. Not responding.`
    );
    return {
      success: true,
      responded: false,
    };
  }

  // If post-completion behavior is "mark_needs_attention", set flag (with multi-tenant validation)
  if (
    conversation.status === "completed" &&
    org.conversationPostCompletionBehavior === PostCompletionBehavior.MARK_NEEDS_ATTENTION
  ) {
    await db
      .update(conversations)
      .set({ needsAttention: true, updatedAt: new Date() })
      .where(
        and(
          eq(conversations.id, request.conversationId),
          eq(conversations.orgId, request.orgId)
        )
      );

    console.log(`Marked conversation ${request.conversationId} as needs attention`);
    return {
      success: true,
      responded: false,
    };
  }

  // Step 2: Check preconditions
  const preconditions = await evaluatePreconditions({
    leadId: request.leadId,
    conversationId: request.conversationId,
    orgId: request.orgId,
  });

  if (!preconditions.allowed) {
    logPreconditionBlock(
      request.leadId,
      request.conversationId,
      preconditions.blockType || "unknown",
      preconditions.reason || "Unknown reason"
    );

    return {
      success: false,
      responded: false,
      error: `Precondition blocked: ${preconditions.reason}`,
    };
  }

  // Step 3: Get org industry
  const industry = org.industry || "general";

  // Step 4: Assemble prompts
  const tier1Prompt = await assemblePrompt({
    orgId: request.orgId,
    leadId: request.leadId,
    conversationId: request.conversationId,
    industry,
    userMessage: request.inboundMessageBody,
    enableCaching: true,
  });

  const tier2Prompt = await assembleReducedPrompt({
    orgId: request.orgId,
    leadId: request.leadId,
    conversationId: request.conversationId,
    industry,
    userMessage: request.inboundMessageBody,
    enableCaching: false,
  });

  // Step 5: Call AI with fallback
  const aiResponse = await callWithFallback(
    {
      systemPrompt: tier1Prompt.systemPrompt,
      cacheBreakpoints: tier1Prompt.cacheBreakpoints,
      userPrompt: tier1Prompt.userPrompt,
      enableCaching: true,
      tier: FallbackTier.FULL_PROMPT,
    },
    {
      systemPrompt: tier2Prompt.systemPrompt,
      cacheBreakpoints: tier2Prompt.cacheBreakpoints,
      userPrompt: tier2Prompt.userPrompt,
      enableCaching: false,
      tier: FallbackTier.REDUCED_PROMPT,
    }
  );

  if (!aiResponse.success) {
    return await handleInboundAIFailure(request, aiResponse.tier);
  }

  // Step 6: Validate compliance
  const complianceCheck = validateCompliance(aiResponse.response!, industry);

  if (!complianceCheck.compliant) {
    await logComplianceBlock({
      orgId: request.orgId,
      leadId: request.leadId,
      conversationId: request.conversationId,
      direction: "inbound",
      model: AI_MODEL,
      complianceRuleTriggered: complianceCheck.ruleTriggered!,
      inputTokens: aiResponse.inputTokens,
      latencyMs: aiResponse.latencyMs,
      promptSummary: tier1Prompt.systemPrompt.substring(0, 200),
      responseSummary: aiResponse.response!.substring(0, 200),
    });

    return await handleInboundAIFailure(request, aiResponse.tier);
  }

  // Step 7: Log successful AI call
  await logAICall({
    orgId: request.orgId,
    leadId: request.leadId,
    conversationId: request.conversationId,
    direction: "inbound",
    model: AI_MODEL,
    inputTokens: aiResponse.inputTokens,
    outputTokens: aiResponse.outputTokens,
    cachedTokens: aiResponse.cachedTokens,
    latencyMs: aiResponse.latencyMs,
    fallbackTier: aiResponse.tier,
    promptSummary: tier1Prompt.systemPrompt.substring(0, 200),
    responseSummary: aiResponse.response!.substring(0, 200),
  });

  // Step 7.5: Mark conversation as engaged (Milestone 18)
  // This must happen BEFORE the AI reply to ensure workflows terminate immediately
  await markEngaged(request.conversationId, request.orgId, "inbound_sms");

  // Step 8: Create outbound response message
  await db.insert(messages).values({
    orgId: request.orgId,
    leadId: request.leadId,
    conversationId: request.conversationId,
    messageType: "sms",
    channel: "sms",
    direction: "outbound",
    sender: "ai",
    body: aiResponse.response,
    status: "pending",
    metadata: {
      aiGenerated: true,
      tier: aiResponse.tier,
      inputTokens: aiResponse.inputTokens,
      outputTokens: aiResponse.outputTokens,
      inResponseTo: request.inboundMessageBody,
    },
  });

  return {
    success: true,
    responded: true,
    messageBody: aiResponse.response,
    tier: aiResponse.tier,
  };
}

/**
 * Handle inbound AI failure by attempting fallback tiers
 */
async function handleInboundAIFailure(
  request: InboundAIRequest,
  currentTier: FallbackTier
): Promise<InboundAIResult> {
  const nextTier = getNextTier(currentTier);

  if (!nextTier) {
    return {
      success: false,
      responded: false,
      tier: currentTier,
      error: "All fallback tiers exhausted",
    };
  }

  // For inbound, we typically don't use template fallback (no workflow context)
  // Go straight to Tier 4 (escalation)
  const fallbackResult = await executeFallback(
    {
      orgId: request.orgId,
      leadId: request.leadId,
      conversationId: request.conversationId,
    },
    FallbackTier.HUMAN_ESCALATION
  );

  if (fallbackResult.success) {
    return {
      success: true,
      responded: false, // No message sent, just flagged
      tier: FallbackTier.HUMAN_ESCALATION,
    };
  }

  return {
    success: false,
    responded: false,
    tier: FallbackTier.HUMAN_ESCALATION,
    error: fallbackResult.error,
  };
}
