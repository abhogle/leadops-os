/**
 * Prompt Assembly Orchestrator
 * Combines 6 layers with Anthropic cache control markers
 * Milestone 17: AI SMS Engine v1
 */

import { buildSystemLayer } from "./layers/layer1_system.js";
import { buildVerticalLayer } from "./layers/layer2_vertical.js";
import { buildOrgPersonaLayer } from "./layers/layer3_org_persona.js";
import {
  buildWorkflowContextLayer,
  type WorkflowContext,
} from "./layers/layer4_workflow_context.js";
import { buildLeadContextLayer } from "./layers/layer5_lead_context.js";
import { buildConversationHistoryLayer } from "./layers/layer6_conversation_history.js";
import { CACHE_BREAKPOINT_LAYERS } from "../config/constants.js";

export interface PromptContext {
  orgId: string;
  leadId: string;
  conversationId: string;
  industry: string;
  workflowContext?: WorkflowContext;
  userMessage?: string; // For inbound messages
  enableCaching?: boolean; // Default true for Tier 1, false for Tier 2
}

export interface AssembledPrompt {
  systemPrompt: string;
  userPrompt: string;
  cacheBreakpoints: number[]; // Layer indices where caching should be applied
}

/**
 * Assemble complete 6-layer prompt with cache control
 */
export async function assemblePrompt(
  context: PromptContext
): Promise<AssembledPrompt> {
  const enableCaching = context.enableCaching !== false; // Default true

  // Build all 6 layers
  const layers: string[] = [];

  // Layer 1: System safety rules
  layers.push(buildSystemLayer());

  // Layer 2: Vertical context (cacheable after this layer)
  layers.push(await buildVerticalLayer(context.industry));

  // Layer 3: Organization persona
  layers.push(await buildOrgPersonaLayer(context.orgId));

  // Layer 4: Workflow context (cacheable after this layer)
  layers.push(buildWorkflowContextLayer(context.workflowContext));

  // Layer 5: Lead context
  layers.push(await buildLeadContextLayer(context.leadId, context.orgId));

  // Layer 6: Conversation history (cacheable after this layer)
  layers.push(
    await buildConversationHistoryLayer(context.conversationId, context.orgId)
  );

  // Combine layers into system prompt
  const systemPrompt = layers.join("\n\n---\n\n");

  // Build user prompt (the actual message to respond to)
  let userPrompt = "";
  if (context.userMessage) {
    userPrompt = `The lead just sent this message:\n\n"${context.userMessage}"\n\nRespond appropriately based on the context above.`;
  } else {
    // Outbound message (triggered by workflow)
    userPrompt =
      "Generate an appropriate message based on the workflow instructions and conversation context above.";
  }

  // Determine cache breakpoints (if caching is enabled)
  const cacheBreakpoints = enableCaching ? CACHE_BREAKPOINT_LAYERS : [];

  return {
    systemPrompt,
    userPrompt,
    cacheBreakpoints,
  };
}

/**
 * Assemble reduced prompt (Tier 2 fallback - no caching, simplified)
 */
export async function assembleReducedPrompt(
  context: PromptContext
): Promise<AssembledPrompt> {
  // Simplified prompt with only essential layers
  const layers: string[] = [];

  // Layer 1: Basic system rules
  layers.push(buildSystemLayer());

  // Layer 4: Workflow context (most important for the task)
  layers.push(buildWorkflowContextLayer(context.workflowContext));

  // Layer 6: Recent conversation history (last few messages only)
  layers.push(
    await buildConversationHistoryLayer(context.conversationId, context.orgId)
  );

  const systemPrompt = layers.join("\n\n---\n\n");

  let userPrompt = "";
  if (context.userMessage) {
    userPrompt = `Lead's message: "${context.userMessage}"\n\nRespond briefly.`;
  } else {
    userPrompt = "Generate a brief message based on the instructions above.";
  }

  return {
    systemPrompt,
    userPrompt,
    cacheBreakpoints: [], // No caching for reduced prompt
  };
}

/**
 * Get cache control markers for Anthropic API
 * These mark which parts of the prompt should be cached
 */
export function getCacheControlMarkers(
  cacheBreakpoints: number[]
): Array<{ type: "ephemeral" }> {
  return cacheBreakpoints.map(() => ({ type: "ephemeral" as const }));
}
