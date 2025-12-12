/**
 * CONDITION Node Executor
 * Milestone 18: Workflow Engine Runtime
 *
 * Evaluates a condition on lead data and branches accordingly.
 * Supports: equals, not_equals, contains, not_contains, exists, not_exists
 */

import type { ConditionNodeConfig, WorkflowDefinition } from "@leadops/types";
import { getNextNodeId } from "@leadops/types";
import { getDbClient, workflowDefinitions, workflowExecutions, leads } from "@leadops/db";
import { eq, and } from "drizzle-orm";
import { advanceWorkflow, logStepExecution } from "../services/workflowRuntimeV2.js";

export interface ExecutorContext {
  workflowExecutionId: string;
  orgId: string;
  leadId: string;
  conversationId?: string;
  nodeId: string;
}

/**
 * Get value from lead data using dot notation path
 * Example: "source.channel" -> lead.source.channel
 */
function getLeadFieldValue(leadData: any, fieldPath: string): any {
  const keys = fieldPath.split(".");
  let value: any = leadData;

  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Evaluate condition based on operator
 */
function evaluateCondition(
  fieldValue: any,
  operator: ConditionNodeConfig["operator"],
  compareValue?: string
): boolean {
  switch (operator) {
    case "equals":
      return String(fieldValue) === compareValue;

    case "not_equals":
      return String(fieldValue) !== compareValue;

    case "contains":
      return (
        fieldValue !== null &&
        fieldValue !== undefined &&
        String(fieldValue).includes(compareValue || "")
      );

    case "not_contains":
      return (
        fieldValue === null ||
        fieldValue === undefined ||
        !String(fieldValue).includes(compareValue || "")
      );

    case "exists":
      return fieldValue !== null && fieldValue !== undefined;

    case "not_exists":
      return fieldValue === null || fieldValue === undefined;

    default:
      return false;
  }
}

export async function executeConditionNode(context: ExecutorContext): Promise<void> {
  const db = getDbClient();

  console.log(`[ConditionExecutor] Executing CONDITION node ${context.nodeId}`);

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
        `[ConditionExecutor] Workflow ${context.workflowExecutionId} is ${execution.status}, aborting`
      );
      await logStepExecution({
        workflowExecutionId: context.workflowExecutionId,
        orgId: context.orgId,
        nodeId: context.nodeId,
        nodeType: "CONDITION",
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
    if (!node || node.type !== "CONDITION") {
      throw new Error(`CONDITION node ${context.nodeId} not found in workflow`);
    }

    const config = node.config as ConditionNodeConfig;

    // 4. Load lead data
    const [lead] = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.id, context.leadId),
          eq(leads.orgId, context.orgId)
        )
      )
      .limit(1);

    if (!lead) {
      throw new Error(`Lead ${context.leadId} not found`);
    }

    // 5. Evaluate condition
    const fieldValue = getLeadFieldValue(lead, config.field);
    const result = evaluateCondition(fieldValue, config.operator, config.value);
    const branchLabel = result ? "true" : "false";

    console.log(
      `[ConditionExecutor] Condition evaluated: ${config.field} ${config.operator} ${config.value} = ${result} (branch: ${branchLabel})`
    );

    // 6. Get next node based on branch
    const nextNodeId = getNextNodeId(workflow, context.nodeId, branchLabel);

    // 7. Log step execution with branch info
    await logStepExecution({
      workflowExecutionId: context.workflowExecutionId,
      orgId: context.orgId,
      nodeId: context.nodeId,
      nodeType: "CONDITION",
      status: "success",
      branch: branchLabel,
    });

    // 8. Advance to next node
    await advanceWorkflow({
      workflowExecutionId: context.workflowExecutionId,
      orgId: context.orgId,
      currentNodeId: context.nodeId,
      nextNodeId,
      branchLabel,
    });

    console.log(
      `[ConditionExecutor] Condition evaluated to ${branchLabel}, advancing to ${nextNodeId}`
    );
  } catch (error) {
    console.error(`[ConditionExecutor] Error executing CONDITION node:`, error);

    await logStepExecution({
      workflowExecutionId: context.workflowExecutionId,
      orgId: context.orgId,
      nodeId: context.nodeId,
      nodeType: "CONDITION",
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}
