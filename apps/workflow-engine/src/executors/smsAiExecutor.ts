/**
 * SMS_AI Node Executor
 * Milestone 17: AI SMS Engine v1 - Workflow Integration
 *
 * Per Doc #6 §6.1-6.3, §14 (Integration with AI Engine)
 * Per Doc #16 MT1-MT7 (Multi-tenant org_id propagation)
 */

import { generateOutboundMessage, type WorkflowContext } from "@leadops/ai-engine";
import { getDbClient, conversations, messages, leads, orgs } from "@leadops/db";
import { eq, and } from "drizzle-orm";
import type { SmsAiNode, WorkflowExecution } from "@leadops/schemas";

export interface ExecutorContext {
  workflowExecution: WorkflowExecution;
  node: SmsAiNode;
  orgId: string;
  leadId: string;
  conversationId: string;
}

export interface ExecutorResult {
  success: boolean;
  nextNodeId: string | null;
  error?: string;
}

/**
 * Execute SMS_AI workflow node
 *
 * Non-negotiable requirements:
 * - MUST NOT execute AI safety logic (that's in AI engine)
 * - MUST propagate org_id everywhere (Doc #16)
 * - MUST checkpoint after execution
 * - MUST NOT block on AI (asynchronous & stateless per Doc #14)
 */
export async function executeSmsAiNode(
  context: ExecutorContext
): Promise<ExecutorResult> {
  const db = getDbClient();
  const { node, orgId, leadId, conversationId } = context;

  try {
    // 1. Business hours check (if enabled in node config)
    if (node.config.business_hours_only) {
      const [org] = await db
        .select()
        .from(orgs)
        .where(eq(orgs.id, orgId))
        .limit(1);

      if (org && !isWithinBusinessHours(org)) {
        // Schedule for next business window (implementation in future milestone)
        console.log(
          `Node ${node.id} scheduled for next business hours window`
        );
        return {
          success: true,
          nextNodeId: null, // Will be rescheduled
        };
      }
    }

    // 2. Get lead and conversation for AI context (with multi-tenant validation)
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)))
      .limit(1);

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.orgId, orgId)))
      .limit(1);

    if (!lead || !conversation) {
      return {
        success: false,
        nextNodeId: null,
        error: "Lead or conversation not found or access denied",
      };
    }

    // 3. Prepare workflow context for AI prompt (Layer 4)
    const workflowContext: WorkflowContext = {
      workflowName: context.workflowExecution.workflowId,
      nodeName: node.id,
      nodeInstructions: node.config.prompt_overrides?.instructions,
      goalDescription: node.config.prompt_overrides?.goal,
      customPrompt: node.config.prompt_overrides?.custom,
    };

    // 4. Call AI engine to generate outbound message
    // Direct TypeScript import - NOT HTTP (per Doc #22)
    const aiResult = await generateOutboundMessage({
      orgId,
      leadId,
      conversationId,
      workflowContext,
      fallbackTemplate: node.config.fallback_template || undefined,
    });

    // 5. Log workflow step execution
    await emitWorkflowEvent({
      workflowExecutionId: context.workflowExecution.id,
      eventType: "step.completed",
      nodeId: node.id,
      payload: {
        aiSuccess: aiResult.success,
        messageCreated: aiResult.messageCreated,
        tier: aiResult.tier,
        orgId, // Multi-tenant tracking
      },
    });

    // 6. Checkpoint: Update workflow execution state
    // (Actual checkpointing logic will be in workflow runtime service)

    // 7. Return next node
    return {
      success: true,
      nextNodeId: node.next || null,
    };
  } catch (error) {
    console.error(`SMS_AI node execution failed: ${error}`);

    await emitWorkflowEvent({
      workflowExecutionId: context.workflowExecution.id,
      eventType: "step.failed",
      nodeId: node.id,
      payload: {
        error: error instanceof Error ? error.message : "Unknown error",
        orgId,
      },
    });

    return {
      success: false,
      nextNodeId: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if current time is within organization's business hours
 * Stub implementation - will be enhanced in future milestone
 */
function isWithinBusinessHours(org: any): boolean {
  // Stub: For now, assume business hours are 9am-5pm Monday-Friday
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = now.getHours();

  // Weekend check
  if (day === 0 || day === 6) {
    return false;
  }

  // Business hours check
  if (hour < 9 || hour >= 17) {
    return false;
  }

  return true;
}

/**
 * Emit workflow event for observability
 * Stub implementation - actual event system in future milestone
 */
async function emitWorkflowEvent(event: {
  workflowExecutionId: string;
  eventType: "step.started" | "step.completed" | "step.failed";
  nodeId: string;
  payload: Record<string, any>;
}): Promise<void> {
  // Stub: Log event for now
  console.log(
    `[Workflow Event] ${event.eventType} - Node: ${event.nodeId}`,
    event.payload
  );

  // Future: Store in workflow_events table or publish to event bus
}
