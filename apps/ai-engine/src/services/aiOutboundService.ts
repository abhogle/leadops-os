/**
 * AI Outbound Service
 * Handles outbound AI messages triggered by workflow SMS_AI nodes
 * Milestone 17: AI SMS Engine v1
 */

import { eq } from "drizzle-orm";
import { getDbClient, messages, orgs } from "@leadops/db";
import { evaluatePreconditions } from "./preconditionService.js";
import { assemblePrompt, assembleReducedPrompt } from "../prompt/assemblePrompt.js";
import { callWithFallback } from "../providers/claudeSonnet.js";
import { validateCompliance } from "./complianceGuard.js";
import { executeFallback, shouldAttemptNextTier, getNextTier } from "./fallbackEngine.js";
import { logAICall, logComplianceBlock, logPreconditionBlock } from "./loggingService.js";
import { FallbackTier, AI_MODEL } from "../config/constants.js";
import type { WorkflowContext } from "../prompt/layers/layer4_workflow_context.js";

export interface OutboundAIRequest {
  orgId: string;
  leadId: string;
  conversationId: string;
  workflowContext?: WorkflowContext;
  fallbackTemplate?: string;
}

export interface OutboundAIResult {
  success: boolean;
  messageCreated: boolean;
  messageBody?: string;
  tier: FallbackTier;
  error?: string;
}

/**
 * Generate and send an outbound AI message
 */
export async function generateOutboundMessage(
  request: OutboundAIRequest
): Promise<OutboundAIResult> {
  const db = getDbClient();

  // Step 1: Check preconditions
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
      messageCreated: false,
      tier: FallbackTier.FULL_PROMPT,
      error: `Precondition blocked: ${preconditions.reason}`,
    };
  }

  // Step 2: Get org industry for prompt assembly
  const [org] = await db
    .select({ industry: orgs.industry })
    .from(orgs)
    .where(eq(orgs.id, request.orgId))
    .limit(1);

  const industry = org?.industry || "general";

  // Step 3: Assemble Tier 1 prompt (full with caching)
  const tier1Prompt = await assemblePrompt({
    orgId: request.orgId,
    leadId: request.leadId,
    conversationId: request.conversationId,
    industry,
    workflowContext: request.workflowContext,
    enableCaching: true,
  });

  // Step 4: Assemble Tier 2 prompt (reduced, no caching)
  const tier2Prompt = await assembleReducedPrompt({
    orgId: request.orgId,
    leadId: request.leadId,
    conversationId: request.conversationId,
    industry,
    workflowContext: request.workflowContext,
    enableCaching: false,
  });

  // Step 5: Call AI with fallback (Tier 1 → Tier 2)
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

  // If AI call failed on both tiers, try Tier 3 (template) or Tier 4 (escalation)
  if (!aiResponse.success) {
    return await handleAIFailure(request, aiResponse.tier);
  }

  // Step 6: Validate compliance
  const complianceCheck = validateCompliance(aiResponse.response!, industry);

  if (!complianceCheck.compliant) {
    // Log compliance block
    await logComplianceBlock({
      orgId: request.orgId,
      leadId: request.leadId,
      conversationId: request.conversationId,
      direction: "outbound",
      model: AI_MODEL,
      complianceRuleTriggered: complianceCheck.ruleTriggered!,
      inputTokens: aiResponse.inputTokens,
      latencyMs: aiResponse.latencyMs,
      promptSummary: tier1Prompt.systemPrompt.substring(0, 200),
      responseSummary: aiResponse.response!.substring(0, 200),
    });

    // Try next fallback tier
    return await handleAIFailure(request, aiResponse.tier);
  }

  // Step 7: Log successful AI call
  await logAICall({
    orgId: request.orgId,
    leadId: request.leadId,
    conversationId: request.conversationId,
    direction: "outbound",
    model: AI_MODEL,
    inputTokens: aiResponse.inputTokens,
    outputTokens: aiResponse.outputTokens,
    cachedTokens: aiResponse.cachedTokens,
    latencyMs: aiResponse.latencyMs,
    fallbackTier: aiResponse.tier,
    promptSummary: tier1Prompt.systemPrompt.substring(0, 200),
    responseSummary: aiResponse.response!.substring(0, 200),
  });

  // Step 8: Create outbound message
  await db.insert(messages).values({
    orgId: request.orgId,
    leadId: request.leadId,
    conversationId: request.conversationId,
    messageType: "sms",
    channel: "sms",
    direction: "outbound",
    sender: "ai",
    body: aiResponse.response,
    status: "pending", // Connector will pick this up and send
    metadata: {
      aiGenerated: true,
      tier: aiResponse.tier,
      inputTokens: aiResponse.inputTokens,
      outputTokens: aiResponse.outputTokens,
    },
  });

  return {
    success: true,
    messageCreated: true,
    messageBody: aiResponse.response,
    tier: aiResponse.tier,
  };
}

/**
 * Handle AI failure by attempting next fallback tier
 */
async function handleAIFailure(
  request: OutboundAIRequest,
  currentTier: FallbackTier
): Promise<OutboundAIResult> {
  const nextTier = getNextTier(currentTier);

  if (!nextTier) {
    return {
      success: false,
      messageCreated: false,
      tier: currentTier,
      error: "All fallback tiers exhausted",
    };
  }

  // Execute fallback (Tier 3 template or Tier 4 escalation)
  const fallbackResult = await executeFallback(
    {
      orgId: request.orgId,
      leadId: request.leadId,
      conversationId: request.conversationId,
      fallbackTemplate: request.fallbackTemplate,
    },
    nextTier
  );

  if (!fallbackResult.success) {
    return {
      success: false,
      messageCreated: false,
      tier: nextTier,
      error: fallbackResult.error,
    };
  }

  // If Tier 3 (template), create message
  if (fallbackResult.response) {
    const db = getDbClient();
    await db.insert(messages).values({
      orgId: request.orgId,
      leadId: request.leadId,
      conversationId: request.conversationId,
      messageType: "sms",
      channel: "sms",
      direction: "outbound",
      sender: "system",
      body: fallbackResult.response,
      status: "pending",
      metadata: {
        fallbackTemplate: true,
        tier: nextTier,
      },
    });

    return {
      success: true,
      messageCreated: true,
      messageBody: fallbackResult.response,
      tier: nextTier,
    };
  }

  // Tier 4 (escalation) - no message created
  return {
    success: true,
    messageCreated: false,
    tier: nextTier,
  };
}
