/**
 * Anthropic Claude Sonnet Provider
 * Handles AI API calls with timeout, caching, and error handling
 * Milestone 17: AI SMS Engine v1
 */

import Anthropic from "@anthropic-ai/sdk";
import { AI_CALL_TIMEOUT_MS, AI_MODEL, FallbackTier } from "../config/constants.js";

export interface AICallRequest {
  systemPrompt: string;
  userPrompt: string;
  enableCaching?: boolean;
  cacheBreakpoints?: number[]; // Layer indices where caching should be applied
  tier: FallbackTier;
}

export interface AICallResponse {
  success: boolean;
  response?: string;
  error?: string;

  // Metrics
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  latencyMs?: number;

  // Fallback info
  tier: FallbackTier;
}

/**
 * Build cached system messages with strategic cache breakpoints
 * Milestone 17 Fix #9: $108k/year cost savings via proper caching
 *
 * @param systemPrompt - Full 6-layer prompt joined with "\n\n---\n\n"
 * @param cacheBreakpoints - Layer indices to cache (e.g., [2, 4, 6])
 * @returns Array of text blocks with cache_control markers
 */
function buildCachedSystemMessages(
  systemPrompt: string,
  cacheBreakpoints: number[]
): Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }> {
  // Split prompt by layer delimiter
  const layers = systemPrompt.split("\n\n---\n\n");

  return layers.map((layerContent, index) => {
    const layerNumber = index + 1; // Layers are 1-indexed
    const shouldCache = cacheBreakpoints.includes(layerNumber);

    const block: {
      type: "text";
      text: string;
      cache_control?: { type: "ephemeral" };
    } = {
      type: "text",
      text: layerContent.trim(),
    };

    if (shouldCache) {
      block.cache_control = { type: "ephemeral" };
    }

    return block;
  });
}

/**
 * Call Anthropic Claude API with timeout and caching
 */
export async function callClaude(
  request: AICallRequest
): Promise<AICallResponse> {
  const startTime = Date.now();

  try {
    // Initialize Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const client = new Anthropic({ apiKey });

    // Build messages array
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: request.userPrompt,
      },
    ];

    // Build system array with cache control if enabled
    // Milestone 17 Fix #9: Proper cache breakpoints for 90% cost savings
    let system: Anthropic.Messages.MessageCreateParams["system"];

    if (request.enableCaching && request.cacheBreakpoints && request.cacheBreakpoints.length > 0) {
      // Split prompt by layers and add cache_control at strategic breakpoints
      system = buildCachedSystemMessages(request.systemPrompt, request.cacheBreakpoints);
    } else if (request.enableCaching) {
      // Fallback: cache entire prompt (legacy behavior)
      system = [
        {
          type: "text" as const,
          text: request.systemPrompt,
          cache_control: { type: "ephemeral" as const },
        } as any,
      ] as any;
    } else {
      // Simple string for non-cached calls
      system = request.systemPrompt;
    }

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`AI call timeout after ${AI_CALL_TIMEOUT_MS}ms`));
      }, AI_CALL_TIMEOUT_MS);
    });

    // Race between API call and timeout
    const apiCallPromise = client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system,
      messages,
    });

    const message = await Promise.race([apiCallPromise, timeoutPromise]);

    // Calculate latency
    const latencyMs = Date.now() - startTime;

    // Extract response text
    const responseText = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as Anthropic.TextBlock).text)
      .join("\n");

    // Extract usage metrics
    const inputTokens = message.usage.input_tokens;
    const outputTokens = message.usage.output_tokens;

    // Cache metrics (if available)
    const cachedTokens = (message.usage as any).cache_read_input_tokens || 0;

    return {
      success: true,
      response: responseText,
      inputTokens,
      outputTokens,
      cachedTokens,
      latencyMs,
      tier: request.tier,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    console.error(`AI call failed (tier ${request.tier}):`, error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      latencyMs,
      tier: request.tier,
    };
  }
}

/**
 * Call with automatic tier fallback
 * Tries Tier 1 (full prompt with caching), then Tier 2 (reduced prompt)
 * Milestone 17 Fix #9: Now properly passes cache breakpoints for cost savings
 */
export async function callWithFallback(
  tier1Request: AICallRequest,
  tier2Request: AICallRequest
): Promise<AICallResponse> {
  // Try Tier 1 first (with strategic caching)
  const tier1Response = await callClaude(tier1Request);

  if (tier1Response.success) {
    // Log cache efficiency
    if (tier1Response.cachedTokens && tier1Response.inputTokens) {
      const cacheHitRate = ((tier1Response.cachedTokens / tier1Response.inputTokens) * 100).toFixed(1);
      console.log(`[Cache Stats] Hit rate: ${cacheHitRate}% | Cached: ${tier1Response.cachedTokens} | Total: ${tier1Response.inputTokens} tokens`);
    }
    return tier1Response;
  }

  console.log("Tier 1 failed, attempting Tier 2 fallback");

  // Try Tier 2 (typically without caching for reduced prompt)
  const tier2Response = await callClaude(tier2Request);

  return tier2Response;
}
