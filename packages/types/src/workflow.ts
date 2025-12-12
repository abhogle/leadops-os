/**
 * Workflow Engine Types
 * Milestone 18: Workflow Engine Runtime
 *
 * Comprehensive type definitions for the asynchronous, durable workflow engine.
 * These types support the graph-based workflow execution model with nodes and edges.
 */

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

export interface WorkflowDefinition {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  industry: string;
  isActive: boolean;
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowNode {
  id: string;
  type: "START" | "SMS_TEMPLATE" | "SMS_AI" | "DELAY" | "CONDITION" | "END";
  config: NodeConfig;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string; // For CONDITION nodes: "true" | "false"
}

// ============================================================================
// NODE CONFIGURATIONS (DISCRIMINATED UNION)
// ============================================================================

export type NodeConfig =
  | StartNodeConfig
  | SmsTemplateNodeConfig
  | SmsAiNodeConfig
  | DelayNodeConfig
  | ConditionNodeConfig
  | EndNodeConfig;

export interface StartNodeConfig {
  type: "START";
  label: string;
}

export interface SmsTemplateNodeConfig {
  type: "SMS_TEMPLATE";
  label: string;
  template: string; // Template with {{lead.fieldName}} placeholders
}

export interface SmsAiNodeConfig {
  type: "SMS_AI";
  label: string;
  systemPrompt: string;
  temperature?: number; // Default: 0.7
}

export interface DelayNodeConfig {
  type: "DELAY";
  label: string;
  duration: number; // Duration in seconds
  unit: "seconds" | "minutes" | "hours" | "days";
  respectBusinessHours: boolean; // If true, delay only during business hours
  businessHours?: {
    start: string; // e.g., "09:00"
    end: string;   // e.g., "17:00"
    timezone: string; // e.g., "America/New_York"
    daysOfWeek: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  };
}

export interface ConditionNodeConfig {
  type: "CONDITION";
  label: string;
  field: string; // Lead field to evaluate (e.g., "lead.source.channel")
  operator: "equals" | "not_equals" | "contains" | "not_contains" | "exists" | "not_exists";
  value?: string; // Value to compare against (not needed for exists/not_exists)
}

export interface EndNodeConfig {
  type: "END";
  label: string;
  reason?: "completed" | "no_response" | "engaged"; // Why the workflow ended
}

// ============================================================================
// WORKFLOW EXECUTION STATE
// ============================================================================

export type WorkflowExecutionStatus =
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "terminated_engaged"  // Lead engaged, workflow stopped
  | "terminated_manual";   // Manually stopped by user

export interface WorkflowExecution {
  id: string;
  orgId: string;
  workflowDefinitionId: string;
  leadId: string;
  conversationId?: string;

  // Execution state
  status: WorkflowExecutionStatus;
  currentNodeId: string;
  resumeAt?: Date;
  lastError?: string;
  attempts: number;

  // Optimistic concurrency control
  version: number;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// WORKFLOW STEP EXECUTION (OBSERVABILITY)
// ============================================================================

export type WorkflowStepStatus = "success" | "error";

export interface WorkflowStepExecution {
  id: string;
  workflowExecutionId: string;
  orgId: string;

  nodeId: string;
  nodeType: string;
  status: WorkflowStepStatus;

  // For CONDITION nodes
  branch?: "true" | "false";

  error?: string;
  executedAt: Date;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the next node ID(s) from a given node.
 * For CONDITION nodes, returns both branches.
 * For other nodes, returns single next node or empty array for END nodes.
 */
export function getNextNodeId(
  workflow: WorkflowDefinition,
  currentNodeId: string,
  branchLabel?: string
): string | null {
  const edges = workflow.edges.filter((e) => e.source === currentNodeId);

  if (edges.length === 0) {
    return null; // END node
  }

  // CONDITION node with branch label
  if (branchLabel) {
    const branchEdge = edges.find((e) => e.label === branchLabel);
    return branchEdge?.target || null;
  }

  // Single path (START, SMS_TEMPLATE, SMS_AI, DELAY)
  return edges[0]?.target || null;
}

/**
 * Calculate the resume time for a DELAY node.
 * If respectBusinessHours is true, advances to the next business hour window.
 */
export function calculateResumeTime(
  config: DelayNodeConfig,
  now: Date = new Date()
): Date {
  const delayMs = convertToMilliseconds(config.duration, config.unit);
  const resumeTime = new Date(now.getTime() + delayMs);

  if (!config.respectBusinessHours || !config.businessHours) {
    return resumeTime;
  }

  // Business hours logic
  const bh = config.businessHours;
  const [startHour, startMin] = bh.start.split(":").map(Number);
  const [endHour, endMin] = bh.end.split(":").map(Number);

  let currentTime = new Date(resumeTime);

  while (true) {
    const day = currentTime.getDay();
    const hour = currentTime.getHours();
    const min = currentTime.getMinutes();

    // Check if current day is a business day
    if (!bh.daysOfWeek.includes(day)) {
      // Move to next day at start of business hours
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(startHour, startMin, 0, 0);
      continue;
    }

    // Check if current time is within business hours
    const currentMinutes = hour * 60 + min;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (currentMinutes < startMinutes) {
      // Before business hours - set to start
      currentTime.setHours(startHour, startMin, 0, 0);
      return currentTime;
    } else if (currentMinutes >= endMinutes) {
      // After business hours - move to next day
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(startHour, startMin, 0, 0);
      continue;
    } else {
      // Within business hours
      return currentTime;
    }
  }
}

function convertToMilliseconds(duration: number, unit: DelayNodeConfig["unit"]): number {
  switch (unit) {
    case "seconds":
      return duration * 1000;
    case "minutes":
      return duration * 60 * 1000;
    case "hours":
      return duration * 60 * 60 * 1000;
    case "days":
      return duration * 24 * 60 * 60 * 1000;
    default:
      return duration * 1000;
  }
}

// ============================================================================
// ENGAGEMENT TRACKING
// ============================================================================

export type EngagementStatus =
  | "unengaged"
  | "engaged"
  | "converted"
  | "dismissed"
  | "stale";

export type EngagementSource =
  | "inbound_sms"
  | "inbound_call"
  | "form_submission"
  | "email_reply"
  | "website_chat";

export interface EngagementEvent {
  conversationId: string;
  leadId: string;
  orgId: string;
  status: EngagementStatus;
  source: EngagementSource;
  engagedAt: Date;
}
