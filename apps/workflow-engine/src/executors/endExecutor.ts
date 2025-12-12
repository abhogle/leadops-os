/**
 * END Node Executor
 * Milestone 18: Workflow Engine Runtime
 *
 * The END node marks the completion of a workflow.
 * It sets the workflow status to completed.
 */

import type { EndNodeConfig } from "@leadops/types";
import { getDbClient, workflowExecutions } from "@leadops/db";
import { eq, and } from "drizzle-orm";
import { logStepExecution } from "../services/workflowRuntimeV2.js";

export interface ExecutorContext {
  workflowExecutionId: string;
  orgId: string;
  leadId: string;
  conversationId?: string;
  nodeId: string;
}

export async function executeEndNode(context: ExecutorContext): Promise<void> {
  const db = getDbClient();

  console.log(`[EndExecutor] Executing END node ${context.nodeId}`);

  try {
    // 1. Load workflow execution
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

    // Early abort if workflow already terminated
    if (execution.status !== "running") {
      console.log(
        `[EndExecutor] Workflow ${context.workflowExecutionId} is ${execution.status}, aborting`
      );
      await logStepExecution({
        workflowExecutionId: context.workflowExecutionId,
        orgId: context.orgId,
        nodeId: context.nodeId,
        nodeType: "END",
        status: "success",
      });
      return;
    }

    // 2. Mark workflow as completed (optimistic concurrency)
    const [updated] = await db
      .update(workflowExecutions)
      .set({
        status: "completed",
        updatedAt: new Date(),
        version: execution.version + 1,
      })
      .where(
        and(
          eq(workflowExecutions.id, context.workflowExecutionId),
          eq(workflowExecutions.orgId, context.orgId),
          eq(workflowExecutions.version, execution.version) // OCC
        )
      )
      .returning();

    if (!updated) {
      console.warn(
        `[EndExecutor] Concurrent modification detected for workflow ${context.workflowExecutionId}`
      );
    }

    // 3. Log step execution
    await logStepExecution({
      workflowExecutionId: context.workflowExecutionId,
      orgId: context.orgId,
      nodeId: context.nodeId,
      nodeType: "END",
      status: "success",
    });

    console.log(`[EndExecutor] Workflow ${context.workflowExecutionId} completed`);
  } catch (error) {
    console.error(`[EndExecutor] Error executing END node:`, error);

    await logStepExecution({
      workflowExecutionId: context.workflowExecutionId,
      orgId: context.orgId,
      nodeId: context.nodeId,
      nodeType: "END",
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}
