/**
 * Workflow Schema Definitions
 * Milestone 17: AI SMS Engine v1 - SMS_AI Node Type
 *
 * Design-time and runtime schemas for workflow definitions
 * Per Doc #6 (Workflow Engine Specification) §4.1-4.2
 */

import { z } from "zod";

/**
 * Base node position for UI canvas
 */
export const WorkflowNodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

/**
 * SMS_AI Node Configuration
 * Per Milestone 17 requirements
 *
 * JSONB-flexible config for Admin UI evolution
 */
export const SmsAiNodeConfigSchema = z.object({
  use_ai: z.boolean(),
  fallback_template: z.string().nullable().optional(),
  ai_rate_limit_override: z.number().int().positive().nullable().optional(),
  business_hours_only: z.boolean().optional().default(false),
  prompt_overrides: z.record(z.any()).optional(),
});

export type SmsAiNodeConfig = z.infer<typeof SmsAiNodeConfigSchema>;

/**
 * SMS_AI Workflow Node
 * Type MUST be literal "SMS_AI" - not "ai_sms" or "sms_ai"
 */
export const SmsAiNodeSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("SMS_AI"),
  config: SmsAiNodeConfigSchema,
  position: WorkflowNodePositionSchema,
  next: z.string().uuid().nullable().optional(), // Next node ID
});

export type SmsAiNode = z.infer<typeof SmsAiNodeSchema>;

/**
 * Base node types (placeholder for future expansion)
 * Currently only SMS_AI is implemented for Milestone 17
 */
export const WorkflowNodeSchema = z.discriminatedUnion("type", [
  SmsAiNodeSchema,
  // Future node types will be added here:
  // WaitNodeSchema,
  // ConditionNodeSchema,
  // WebhookNodeSchema,
  // etc.
]);

export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;

/**
 * Workflow Definition (Design-Time)
 * Stored in database as JSONB
 */
export const WorkflowDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  version: z.number().int().positive().default(1),

  // Trigger configuration
  trigger: z.object({
    type: z.enum(["lead.created", "lead.status_changed", "message.received", "manual"]),
    conditions: z.record(z.any()).optional(),
  }),

  // Workflow nodes
  nodes: z.array(WorkflowNodeSchema),

  // Entry point (first node to execute)
  entryNodeId: z.string().uuid(),

  // Metadata
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

/**
 * Workflow Execution (Runtime State)
 * Tracks a single execution instance
 */
export const WorkflowExecutionSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  orgId: z.string(),
  leadId: z.string().uuid(),
  conversationId: z.string().uuid(),

  // Current state
  status: z.enum(["pending", "running", "completed", "failed", "paused"]),
  currentNodeId: z.string().uuid().nullable(),

  // Runtime context
  runtimeState: z.record(z.any()).optional(),

  // Execution metadata
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  error: z.string().nullable().optional(),
});

export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>;

/**
 * Workflow Event
 * Emitted during workflow execution for observability
 */
export const WorkflowEventSchema = z.object({
  id: z.string().uuid(),
  workflowExecutionId: z.string().uuid(),
  eventType: z.enum([
    "workflow.started",
    "workflow.completed",
    "workflow.failed",
    "step.started",
    "step.completed",
    "step.failed",
  ]),
  nodeId: z.string().uuid().nullable(),
  payload: z.record(z.any()).optional(),
  timestamp: z.date(),
});

export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>;
