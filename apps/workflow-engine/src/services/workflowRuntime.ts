/**
 * Workflow Runtime Service
 * Milestone 17: AI SMS Engine v1 - Executor Registry
 *
 * Per Doc #6 §6.1-6.3 (Workflow Execution Pipeline)
 */

import type { WorkflowNode, WorkflowExecution } from "@leadops/schemas";
import { executeSmsAiNode, type ExecutorContext, type ExecutorResult } from "../executors/smsAiExecutor.js";

/**
 * Executor function signature
 */
type NodeExecutor = (context: ExecutorContext) => Promise<ExecutorResult>;

/**
 * Executor registry
 * Maps node types to their executor functions
 */
const executorRegistry: Record<string, NodeExecutor> = {
  SMS_AI: executeSmsAiNode,
  // Future node types will be registered here:
  // WAIT: executeWaitNode,
  // CONDITION: executeConditionNode,
  // WEBHOOK: executeWebhookNode,
};

/**
 * Execute a workflow node based on its type
 */
export async function executeNode(
  node: WorkflowNode,
  workflowExecution: WorkflowExecution,
  orgId: string,
  leadId: string,
  conversationId: string
): Promise<ExecutorResult> {
  const executor = executorRegistry[node.type];

  if (!executor) {
    return {
      success: false,
      nextNodeId: null,
      error: `No executor found for node type: ${node.type}`,
    };
  }

  const context: ExecutorContext = {
    workflowExecution,
    node: node as any, // Type assertion - will be properly typed in registry
    orgId,
    leadId,
    conversationId,
  };

  return await executor(context);
}

/**
 * Register a custom node executor
 * For extensibility (Doc #24)
 */
export function registerExecutor(
  nodeType: string,
  executor: NodeExecutor
): void {
  executorRegistry[nodeType] = executor;
  console.log(`Registered executor for node type: ${nodeType}`);
}

/**
 * Get list of registered node types
 */
export function getRegisteredNodeTypes(): string[] {
  return Object.keys(executorRegistry);
}
