/**
 * Workflow Queue Infrastructure
 * Milestone 18: Workflow Engine Runtime
 *
 * BullMQ queues for asynchronous, durable workflow execution.
 * Supports immediate and delayed execution.
 */

import { Queue, Worker, QueueEvents } from "bullmq";
import { Redis } from "ioredis";

// Redis connection configuration
const connection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  maxRetriesPerRequest: null, // Required for BullMQ
});

// ============================================================================
// QUEUE JOB DATA TYPES
// ============================================================================

export interface WorkflowNodeJobData {
  workflowExecutionId: string;
  orgId: string;
  leadId: string;
  conversationId?: string;
  nodeId: string;
  attempt: number;
}

export interface DelayedWorkflowJobData {
  workflowExecutionId: string;
  orgId: string;
  nodeId: string;
  resumeAt: Date;
}

// ============================================================================
// QUEUES
// ============================================================================

/**
 * Immediate workflow execution queue
 * Processes workflow nodes as they are enqueued
 */
export const workflowQueue = new Queue<WorkflowNodeJobData>("workflow", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

/**
 * Delayed workflow execution queue
 * Processes workflow nodes that need to wait (DELAY nodes)
 */
export const workflowDelayedQueue = new Queue<DelayedWorkflowJobData>(
  "workflow-delayed",
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        age: 24 * 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600,
      },
    },
  }
);

/**
 * Queue events for monitoring
 */
export const workflowQueueEvents = new QueueEvents("workflow", {
  connection,
});

export const workflowDelayedQueueEvents = new QueueEvents("workflow-delayed", {
  connection,
});

// ============================================================================
// QUEUE HELPERS
// ============================================================================

/**
 * Enqueue an immediate workflow node execution
 */
export async function enqueueWorkflowNode(
  data: WorkflowNodeJobData
): Promise<void> {
  await workflowQueue.add(`node-${data.nodeId}`, data, {
    jobId: `${data.workflowExecutionId}-${data.nodeId}-${Date.now()}`,
  });

  console.log(
    `[WorkflowQueue] Enqueued node ${data.nodeId} for workflow ${data.workflowExecutionId}`
  );
}

/**
 * Enqueue a delayed workflow node execution
 */
export async function enqueueDelayedWorkflowNode(
  data: DelayedWorkflowJobData,
  delayMs: number
): Promise<void> {
  await workflowDelayedQueue.add(`delayed-${data.nodeId}`, data, {
    delay: delayMs,
    jobId: `delayed-${data.workflowExecutionId}-${data.nodeId}-${Date.now()}`,
  });

  console.log(
    `[WorkflowQueue] Enqueued delayed node ${data.nodeId} for workflow ${data.workflowExecutionId} (delay: ${delayMs}ms)`
  );
}

/**
 * Get queue metrics
 */
export async function getQueueMetrics() {
  const [waiting, active, delayed, failed] = await Promise.all([
    workflowQueue.getWaitingCount(),
    workflowQueue.getActiveCount(),
    workflowQueue.getDelayedCount(),
    workflowQueue.getFailedCount(),
  ]);

  const [delayedWaiting, delayedActive] = await Promise.all([
    workflowDelayedQueue.getWaitingCount(),
    workflowDelayedQueue.getActiveCount(),
  ]);

  return {
    immediate: {
      waiting,
      active,
      delayed,
      failed,
    },
    delayed: {
      waiting: delayedWaiting,
      active: delayedActive,
    },
  };
}

/**
 * Graceful shutdown
 */
export async function closeQueues(): Promise<void> {
  await Promise.all([
    workflowQueue.close(),
    workflowDelayedQueue.close(),
    workflowQueueEvents.close(),
    workflowDelayedQueueEvents.close(),
    connection.quit(),
  ]);

  console.log("[WorkflowQueue] All queues closed");
}

// Handle process termination
process.on("SIGTERM", async () => {
  console.log("[WorkflowQueue] SIGTERM received, closing queues...");
  await closeQueues();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[WorkflowQueue] SIGINT received, closing queues...");
  await closeQueues();
  process.exit(0);
});
