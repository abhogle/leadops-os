/**
 * Workflow Engine - Main Entry Point
 * Milestone 17: AI SMS Engine v1 - Workflow Integration
 * Milestone 18: Workflow Engine Runtime
 */

// Workflow Runtime (Milestone 17)
export { executeNode, registerExecutor, getRegisteredNodeTypes } from "./services/workflowRuntime.js";

// Node Executors (Milestone 17)
export { executeSmsAiNode } from "./executors/smsAiExecutor.js";
export type { ExecutorContext, ExecutorResult } from "./executors/smsAiExecutor.js";

// Workflow Runtime V2 (Milestone 18)
export {
  startWorkflow,
  resumeWorkflow,
  advanceWorkflow,
  logStepExecution,
  handleWorkflowFailure,
} from "./services/workflowRuntimeV2.js";

// Queue Infrastructure (Milestone 18)
export {
  workflowQueue,
  workflowDelayedQueue,
  enqueueWorkflowNode,
  enqueueDelayedWorkflowNode,
  getQueueMetrics,
  closeQueues,
} from "./queues/workflowQueue.js";
export type { WorkflowNodeJobData, DelayedWorkflowJobData } from "./queues/workflowQueue.js";

// Workers (Milestone 18)
export { workflowWorker, workflowDelayedWorker } from "./workers/workflowWorker.js";

// Event Bus (Milestone 18)
export { eventBus } from "./services/eventBus.js";
export type { ConversationEngagedEvent, WorkflowTriggeredEvent } from "./services/eventBus.js";

// Engagement Listener (Milestone 18)
export { registerEngagementListener, terminateWorkflowsOnEngagement } from "./listeners/engagementListener.js";

// Auto-register engagement listener on module load
import { registerEngagementListener } from "./listeners/engagementListener.js";
registerEngagementListener();
