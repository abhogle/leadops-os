/**
 * Workflow Workers
 * Milestone 18: Workflow Engine Runtime
 *
 * BullMQ workers that process workflow node executions.
 * - Immediate worker: Processes nodes from workflowQueue
 * - Delayed worker: Processes delayed nodes from workflowDelayedQueue
 */

import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import type { WorkflowNodeJobData, DelayedWorkflowJobData } from "../queues/workflowQueue.js";
import { resumeWorkflow } from "../services/workflowRuntimeV2.js";
import { executeStartNode } from "../executors/startExecutor.js";
import { executeEndNode } from "../executors/endExecutor.js";
import { executeSmsTemplateNode } from "../executors/smsTemplateExecutor.js";
import { executeDelayNode } from "../executors/delayExecutor.js";
import { executeConditionNode } from "../executors/conditionExecutor.js";
import { getDbClient, workflowDefinitions, workflowExecutions } from "@leadops/db";
import { eq, and } from "drizzle-orm";
import type { WorkflowDefinition, WorkflowNode } from "@leadops/types";

// Redis connection
const connection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  maxRetriesPerRequest: null,
});

// ============================================================================
// EXECUTOR REGISTRY
// ============================================================================

type ExecutorFunction = (context: {
  workflowExecutionId: string;
  orgId: string;
  leadId: string;
  conversationId?: string;
  nodeId: string;
}) => Promise<void>;

const executorRegistry: Record<string, ExecutorFunction> = {
  START: executeStartNode,
  END: executeEndNode,
  SMS_TEMPLATE: executeSmsTemplateNode,
  DELAY: executeDelayNode,
  CONDITION: executeConditionNode,
  // SMS_AI will be added when integrated
};

/**
 * Execute a workflow node based on its type
 */
async function executeWorkflowNode(data: WorkflowNodeJobData): Promise<void> {
  const db = getDbClient();

  console.log(
    `[WorkflowWorker] Processing node ${data.nodeId} for workflow ${data.workflowExecutionId}`
  );

  // 1. Load workflow execution
  const [execution] = await db
    .select()
    .from(workflowExecutions)
    .where(
      and(
        eq(workflowExecutions.id, data.workflowExecutionId),
        eq(workflowExecutions.orgId, data.orgId)
      )
    )
    .limit(1);

  if (!execution) {
    throw new Error(`Workflow execution ${data.workflowExecutionId} not found`);
  }

  // 2. Early abort if workflow terminated (engagement, manual termination, etc.)
  if (execution.status !== "running") {
    console.log(
      `[WorkflowWorker] Workflow ${data.workflowExecutionId} is ${execution.status}, skipping node ${data.nodeId}`
    );
    return;
  }

  // 3. Load workflow definition to get node type
  const [workflowDef] = await db
    .select()
    .from(workflowDefinitions)
    .where(
      and(
        eq(workflowDefinitions.id, execution.workflowDefinitionId),
        eq(workflowDefinitions.orgId, data.orgId)
      )
    )
    .limit(1);

  if (!workflowDef) {
    throw new Error(`Workflow definition not found`);
  }

  const workflow = workflowDef as unknown as WorkflowDefinition;
  const node = workflow.nodes.find((n) => n.id === data.nodeId);

  if (!node) {
    throw new Error(`Node ${data.nodeId} not found in workflow definition`);
  }

  // 4. Execute node based on type
  const executor = executorRegistry[node.type];

  if (!executor) {
    throw new Error(`No executor found for node type: ${node.type}`);
  }

  await executor({
    workflowExecutionId: data.workflowExecutionId,
    orgId: data.orgId,
    leadId: data.leadId,
    conversationId: data.conversationId,
    nodeId: data.nodeId,
  });

  console.log(
    `[WorkflowWorker] Successfully executed node ${data.nodeId} (type: ${node.type})`
  );
}

// ============================================================================
// IMMEDIATE WORKFLOW WORKER
// ============================================================================

export const workflowWorker = new Worker<WorkflowNodeJobData>(
  "workflow",
  async (job: Job<WorkflowNodeJobData>) => {
    console.log(`[WorkflowWorker] Processing job ${job.id}`);

    try {
      await executeWorkflowNode(job.data);
    } catch (error) {
      console.error(`[WorkflowWorker] Error processing job ${job.id}:`, error);
      throw error; // Let BullMQ handle retries
    }
  },
  {
    connection,
    concurrency: 10, // Process up to 10 nodes concurrently
    limiter: {
      max: 100, // Max 100 jobs per duration
      duration: 60000, // 1 minute
    },
  }
);

workflowWorker.on("completed", (job) => {
  console.log(`[WorkflowWorker] Job ${job.id} completed`);
});

workflowWorker.on("failed", (job, err) => {
  console.error(`[WorkflowWorker] Job ${job?.id} failed:`, err);
});

workflowWorker.on("error", (err) => {
  console.error("[WorkflowWorker] Worker error:", err);
});

// ============================================================================
// DELAYED WORKFLOW WORKER
// ============================================================================

export const workflowDelayedWorker = new Worker<DelayedWorkflowJobData>(
  "workflow-delayed",
  async (job: Job<DelayedWorkflowJobData>) => {
    console.log(`[WorkflowDelayedWorker] Processing delayed job ${job.id}`);

    try {
      await resumeWorkflow({
        workflowExecutionId: job.data.workflowExecutionId,
        orgId: job.data.orgId,
        nodeId: job.data.nodeId,
      });
    } catch (error) {
      console.error(
        `[WorkflowDelayedWorker] Error processing delayed job ${job.id}:`,
        error
      );
      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // Lower concurrency for delayed jobs
  }
);

workflowDelayedWorker.on("completed", (job) => {
  console.log(`[WorkflowDelayedWorker] Delayed job ${job.id} completed`);
});

workflowDelayedWorker.on("failed", (job, err) => {
  console.error(`[WorkflowDelayedWorker] Delayed job ${job?.id} failed:`, err);
});

workflowDelayedWorker.on("error", (err) => {
  console.error("[WorkflowDelayedWorker] Worker error:", err);
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function shutdown() {
  console.log("[WorkflowWorker] Shutting down workers...");

  await Promise.all([workflowWorker.close(), workflowDelayedWorker.close()]);

  await connection.quit();

  console.log("[WorkflowWorker] Workers shut down successfully");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("[WorkflowWorker] Workflow workers started");
