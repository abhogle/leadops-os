/**
 * Workflow Runtime Service (Milestone 18)
 * Asynchronous, durable, event-driven workflow execution
 *
 * Responsibilities:
 * - Start workflow executions
 * - Enqueue node executions
 * - Resume workflows after delays
 * - Handle workflow state with optimistic concurrency
 */

import { eq, and } from "drizzle-orm";
import { getDbClient, workflowDefinitions, workflowExecutions, workflowStepExecutions } from "@leadops/db";
import type { WorkflowDefinition, WorkflowNode, getNextNodeId as GetNextNodeIdFn } from "@leadops/types";
import { getNextNodeId } from "@leadops/types";
import { enqueueWorkflowNode, enqueueDelayedWorkflowNode } from "../queues/workflowQueue.js";

/**
 * Start a new workflow execution
 * Creates a workflow_executions record and enqueues the START node
 */
export async function startWorkflow(params: {
  orgId: string;
  workflowDefinitionId: string;
  leadId: string;
  conversationId?: string;
}): Promise<string> {
  const db = getDbClient();

  // 1. Load workflow definition (with multi-tenant validation)
  const [workflowDef] = await db
    .select()
    .from(workflowDefinitions)
    .where(
      and(
        eq(workflowDefinitions.id, params.workflowDefinitionId),
        eq(workflowDefinitions.orgId, params.orgId),
        eq(workflowDefinitions.isActive, true)
      )
    )
    .limit(1);

  if (!workflowDef) {
    throw new Error(
      `Workflow definition ${params.workflowDefinitionId} not found or inactive for org ${params.orgId}`
    );
  }

  const workflow = workflowDef as unknown as WorkflowDefinition;

  // 2. Find START node
  const startNode = workflow.nodes.find((n) => n.type === "START");
  if (!startNode) {
    throw new Error(`No START node found in workflow ${params.workflowDefinitionId}`);
  }

  // 3. Create workflow execution record
  const [execution] = await db
    .insert(workflowExecutions)
    .values({
      orgId: params.orgId,
      workflowDefinitionId: params.workflowDefinitionId,
      leadId: params.leadId,
      conversationId: params.conversationId || null,
      status: "running",
      currentNodeId: startNode.id,
      version: 1,
    })
    .returning();

  console.log(
    `[WorkflowRuntime] Started workflow ${execution.id} for lead ${params.leadId}`
  );

  // 4. Enqueue START node execution
  await enqueueWorkflowNode({
    workflowExecutionId: execution.id,
    orgId: params.orgId,
    leadId: params.leadId,
    conversationId: params.conversationId,
    nodeId: startNode.id,
    attempt: 0,
  });

  return execution.id;
}

/**
 * Resume a workflow execution after a delay
 * Used by the delayed queue worker
 */
export async function resumeWorkflow(params: {
  workflowExecutionId: string;
  orgId: string;
  nodeId: string;
}): Promise<void> {
  const db = getDbClient();

  // Load workflow execution (with multi-tenant validation)
  const [execution] = await db
    .select()
    .from(workflowExecutions)
    .where(
      and(
        eq(workflowExecutions.id, params.workflowExecutionId),
        eq(workflowExecutions.orgId, params.orgId)
      )
    )
    .limit(1);

  if (!execution) {
    throw new Error(
      `Workflow execution ${params.workflowExecutionId} not found for org ${params.orgId}`
    );
  }

  // Check if workflow is still running (not terminated)
  if (execution.status !== "running") {
    console.log(
      `[WorkflowRuntime] Workflow ${params.workflowExecutionId} is ${execution.status}, skipping resume`
    );
    return;
  }

  // Enqueue the node
  await enqueueWorkflowNode({
    workflowExecutionId: params.workflowExecutionId,
    orgId: params.orgId,
    leadId: execution.leadId,
    conversationId: execution.conversationId || undefined,
    nodeId: params.nodeId,
    attempt: 0,
  });

  console.log(
    `[WorkflowRuntime] Resumed workflow ${params.workflowExecutionId} at node ${params.nodeId}`
  );
}

/**
 * Advance workflow to next node
 * Called by executors after successful node execution
 */
export async function advanceWorkflow(params: {
  workflowExecutionId: string;
  orgId: string;
  currentNodeId: string;
  nextNodeId: string | null;
  branchLabel?: string;
}): Promise<void> {
  const db = getDbClient();

  // Load workflow execution
  const [execution] = await db
    .select()
    .from(workflowExecutions)
    .where(
      and(
        eq(workflowExecutions.id, params.workflowExecutionId),
        eq(workflowExecutions.orgId, params.orgId)
      )
    )
    .limit(1);

  if (!execution) {
    throw new Error(
      `Workflow execution ${params.workflowExecutionId} not found for org ${params.orgId}`
    );
  }

  // Check if workflow is still running (early abort on engagement)
  if (execution.status !== "running") {
    console.log(
      `[WorkflowRuntime] Workflow ${params.workflowExecutionId} is ${execution.status}, aborting advance`
    );
    return;
  }

  // If no next node, mark workflow as completed
  if (!params.nextNodeId) {
    await db
      .update(workflowExecutions)
      .set({
        status: "completed",
        updatedAt: new Date(),
        version: execution.version + 1,
      })
      .where(
        and(
          eq(workflowExecutions.id, params.workflowExecutionId),
          eq(workflowExecutions.orgId, params.orgId),
          eq(workflowExecutions.version, execution.version) // OCC
        )
      );

    console.log(`[WorkflowRuntime] Workflow ${params.workflowExecutionId} completed`);
    return;
  }

  // Update current node (optimistic concurrency)
  const [updated] = await db
    .update(workflowExecutions)
    .set({
      currentNodeId: params.nextNodeId,
      updatedAt: new Date(),
      version: execution.version + 1,
    })
    .where(
      and(
        eq(workflowExecutions.id, params.workflowExecutionId),
        eq(workflowExecutions.orgId, params.orgId),
        eq(workflowExecutions.version, execution.version) // OCC
      )
    )
    .returning();

  if (!updated) {
    throw new Error(
      `Concurrent modification detected for workflow ${params.workflowExecutionId}`
    );
  }

  // Enqueue next node
  await enqueueWorkflowNode({
    workflowExecutionId: params.workflowExecutionId,
    orgId: params.orgId,
    leadId: execution.leadId,
    conversationId: execution.conversationId || undefined,
    nodeId: params.nextNodeId,
    attempt: 0,
  });

  console.log(
    `[WorkflowRuntime] Advanced workflow ${params.workflowExecutionId} to node ${params.nextNodeId}`
  );
}

/**
 * Log a workflow step execution (observability)
 */
export async function logStepExecution(params: {
  workflowExecutionId: string;
  orgId: string;
  nodeId: string;
  nodeType: string;
  status: "success" | "error";
  branch?: string;
  error?: string;
}): Promise<void> {
  const db = getDbClient();

  await db.insert(workflowStepExecutions).values({
    workflowExecutionId: params.workflowExecutionId,
    orgId: params.orgId,
    nodeId: params.nodeId,
    nodeType: params.nodeType,
    status: params.status,
    branch: params.branch || null,
    error: params.error || null,
  });

  console.log(
    `[WorkflowRuntime] Logged step execution: ${params.nodeId} (${params.status})`
  );
}

/**
 * Handle workflow execution failure
 */
export async function handleWorkflowFailure(params: {
  workflowExecutionId: string;
  orgId: string;
  error: string;
}): Promise<void> {
  const db = getDbClient();

  const [execution] = await db
    .select()
    .from(workflowExecutions)
    .where(
      and(
        eq(workflowExecutions.id, params.workflowExecutionId),
        eq(workflowExecutions.orgId, params.orgId)
      )
    )
    .limit(1);

  if (!execution) {
    throw new Error(
      `Workflow execution ${params.workflowExecutionId} not found for org ${params.orgId}`
    );
  }

  await db
    .update(workflowExecutions)
    .set({
      status: "failed",
      lastError: params.error,
      updatedAt: new Date(),
      version: execution.version + 1,
    })
    .where(
      and(
        eq(workflowExecutions.id, params.workflowExecutionId),
        eq(workflowExecutions.orgId, params.orgId),
        eq(workflowExecutions.version, execution.version) // OCC
      )
    );

  console.error(
    `[WorkflowRuntime] Workflow ${params.workflowExecutionId} failed: ${params.error}`
  );
}
