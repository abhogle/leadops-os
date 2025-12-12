/**
 * START Node Executor
 * Milestone 18: Workflow Engine Runtime
 *
 * The START node is the entry point of every workflow.
 * It simply advances to the next node.
 */

import type { StartNodeConfig, WorkflowDefinition } from "@leadops/types";
import { getNextNodeId } from "@leadops/types";
import { getDbClient, workflowDefinitions, workflowExecutions } from "@leadops/db";
import { eq, and } from "drizzle-orm";
import { advanceWorkflow, logStepExecution } from "../services/workflowRuntimeV2.js";

export interface ExecutorContext {
  workflowExecutionId: string;
  orgId: string;
  leadId: string;
  conversationId?: string;
  nodeId: string;
}

export async function executeStartNode(context: ExecutorContext): Promise<void> {
  const db = getDbClient();

  console.log(`[StartExecutor] Executing START node ${context.nodeId}`);

  try {
    // 1. Load workflow execution to check status
    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(
        and(
          eq(workflowExecutions.id, context.workflowExecutionId),
          eq(workflowExecutions.orgId, context.orgId)
        )
      )
      .limit(1);

    if (!execution) {
      throw new Error(`Workflow execution ${context.workflowExecutionId} not found`);
    }

    // Early abort if workflow terminated
    if (execution.status !== "running") {
      console.log(
        `[StartExecutor] Workflow ${context.workflowExecutionId} is ${execution.status}, aborting`
      );
      await logStepExecution({
        workflowExecutionId: context.workflowExecutionId,
        orgId: context.orgId,
        nodeId: context.nodeId,
        nodeType: "START",
        status: "success",
      });
      return;
    }

    // 2. Load workflow definition
    const [workflowDef] = await db
      .select()
      .from(workflowDefinitions)
      .where(
        and(
          eq(workflowDefinitions.id, execution.workflowDefinitionId),
          eq(workflowDefinitions.orgId, context.orgId)
        )
      )
      .limit(1);

    if (!workflowDef) {
      throw new Error(`Workflow definition not found`);
    }

    const workflow = workflowDef as unknown as WorkflowDefinition;

    // 3. Get next node
    const nextNodeId = getNextNodeId(workflow, context.nodeId);

    // 4. Log step execution
    await logStepExecution({
      workflowExecutionId: context.workflowExecutionId,
      orgId: context.orgId,
      nodeId: context.nodeId,
      nodeType: "START",
      status: "success",
    });

    // 5. Advance to next node
    await advanceWorkflow({
      workflowExecutionId: context.workflowExecutionId,
      orgId: context.orgId,
      currentNodeId: context.nodeId,
      nextNodeId,
    });

    console.log(`[StartExecutor] START node completed, advancing to ${nextNodeId}`);
  } catch (error) {
    console.error(`[StartExecutor] Error executing START node:`, error);

    await logStepExecution({
      workflowExecutionId: context.workflowExecutionId,
      orgId: context.orgId,
      nodeId: context.nodeId,
      nodeType: "START",
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}
