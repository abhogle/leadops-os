/**
 * DELAY Node Executor
 * Milestone 18: Workflow Engine Runtime
 *
 * Delays workflow execution for a specified duration.
 * Supports business hours awareness.
 */

import type { DelayNodeConfig, WorkflowDefinition } from "@leadops/types";
import { getNextNodeId, calculateResumeTime } from "@leadops/types";
import { getDbClient, workflowDefinitions, workflowExecutions } from "@leadops/db";
import { eq, and } from "drizzle-orm";
import { logStepExecution } from "../services/workflowRuntimeV2.js";
import { enqueueDelayedWorkflowNode } from "../queues/workflowQueue.js";

export interface ExecutorContext {
  workflowExecutionId: string;
  orgId: string;
  leadId: string;
  conversationId?: string;
  nodeId: string;
}

export async function executeDelayNode(context: ExecutorContext): Promise<void> {
  const db = getDbClient();

  console.log(`[DelayExecutor] Executing DELAY node ${context.nodeId}`);

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

    // Early abort if workflow terminated
    if (execution.status !== "running") {
      console.log(
        `[DelayExecutor] Workflow ${context.workflowExecutionId} is ${execution.status}, aborting`
      );
      await logStepExecution({
        workflowExecutionId: context.workflowExecutionId,
        orgId: context.orgId,
        nodeId: context.nodeId,
        nodeType: "DELAY",
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

    // 3. Find node config
    const node = workflow.nodes.find((n) => n.id === context.nodeId);
    if (!node || node.type !== "DELAY") {
      throw new Error(`DELAY node ${context.nodeId} not found in workflow`);
    }

    const config = node.config as DelayNodeConfig;

    // 4. Calculate resume time (business hours aware)
    const now = new Date();
    const resumeAt = calculateResumeTime(config, now);
    const delayMs = resumeAt.getTime() - now.getTime();

    console.log(
      `[DelayExecutor] Scheduling resume at ${resumeAt.toISOString()} (${delayMs}ms from now)`
    );

    // 5. Update workflow execution with resume time (optimistic concurrency)
    const [updated] = await db
      .update(workflowExecutions)
      .set({
        resumeAt,
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
      throw new Error(
        `Concurrent modification detected for workflow ${context.workflowExecutionId}`
      );
    }

    // 6. Get next node
    const nextNodeId = getNextNodeId(workflow, context.nodeId);

    if (!nextNodeId) {
      throw new Error(`DELAY node ${context.nodeId} has no next node`);
    }

    // 7. Enqueue delayed execution
    await enqueueDelayedWorkflowNode(
      {
        workflowExecutionId: context.workflowExecutionId,
        orgId: context.orgId,
        nodeId: nextNodeId,
        resumeAt,
      },
      delayMs
    );

    // 8. Log step execution
    await logStepExecution({
      workflowExecutionId: context.workflowExecutionId,
      orgId: context.orgId,
      nodeId: context.nodeId,
      nodeType: "DELAY",
      status: "success",
    });

    console.log(
      `[DelayExecutor] Delay scheduled, will resume at ${nextNodeId} after ${delayMs}ms`
    );
  } catch (error) {
    console.error(`[DelayExecutor] Error executing DELAY node:`, error);

    await logStepExecution({
      workflowExecutionId: context.workflowExecutionId,
      orgId: context.orgId,
      nodeId: context.nodeId,
      nodeType: "DELAY",
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}
