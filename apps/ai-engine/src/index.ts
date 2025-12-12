/**
 * AI Engine - Main Entry Point
 * Milestone 17: AI SMS Engine v1
 *
 * This package provides AI-powered conversational messaging capabilities
 * for the LeadOps platform, including:
 * - Outbound AI messages triggered by workflows
 * - Reactive inbound message processing
 * - 6-layer prompt assembly with Anthropic caching
 * - Compliance guardrails and opt-out handling
 * - 4-tier fallback system
 * - Comprehensive observability logging
 */

// Core AI Services
export { generateOutboundMessage } from "./services/aiOutboundService.js";
export type { OutboundAIRequest, OutboundAIResult } from "./services/aiOutboundService.js";

export { processInboundMessage } from "./services/aiInboundService.js";
export type { InboundAIRequest, InboundAIResult } from "./services/aiInboundService.js";

// Supporting Services
export { evaluatePreconditions } from "./services/preconditionService.js";
export type { PreconditionResult, PreconditionContext } from "./services/preconditionService.js";

export { checkRateLimit } from "./services/rateLimitService.js";
export type { RateLimitCheckResult } from "./services/rateLimitService.js";

export {
  handleInboundOptOut,
  processOptOut,
  processOptIn,
  detectOptOutKeyword,
} from "./services/optOutService.js";
export type { OptOutCheckResult, OptOutContext } from "./services/optOutService.js";

export { validateCompliance, getComplianceRules } from "./services/complianceGuard.js";
export type { ComplianceCheckResult, ComplianceRule } from "./services/complianceGuard.js";

export {
  executeFallback,
  shouldAttemptNextTier,
  getNextTier,
} from "./services/fallbackEngine.js";
export type { FallbackResult, FallbackContext } from "./services/fallbackEngine.js";

export { logAICall, logComplianceBlock, logPreconditionBlock } from "./services/loggingService.js";
export type { AICallLogData } from "./services/loggingService.js";

// Prompt Assembly
export { assemblePrompt, assembleReducedPrompt } from "./prompt/assemblePrompt.js";
export type { PromptContext, AssembledPrompt } from "./prompt/assemblePrompt.js";

export type { WorkflowContext } from "./prompt/layers/layer4_workflow_context.js";

// AI Provider
export { callClaude, callWithFallback } from "./providers/claudeSonnet.js";
export type { AICallRequest, AICallResponse } from "./providers/claudeSonnet.js";

// Constants and Configuration
export {
  CONVERSATION_HISTORY_LIMIT,
  AI_RATE_LIMIT_DEFAULT,
  RATE_LIMIT_WINDOW_MS,
  AI_CALL_TIMEOUT_MS,
  AI_MODEL,
  OPT_OUT_KEYWORDS,
  OPT_OUT_CONFIRMATION_MESSAGE,
  FallbackTier,
  PROMPT_SUMMARY_MAX_LENGTH,
  RESPONSE_SUMMARY_MAX_LENGTH,
  AI_LOG_RETENTION_DAYS,
  PostCompletionBehavior,
  CACHE_BREAKPOINT_LAYERS,
  HUMAN_TAKEOVER_MESSAGE,
} from "./config/constants.js";
