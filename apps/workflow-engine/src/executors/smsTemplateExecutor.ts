/**
 * SMS_TEMPLATE Node Executor
 * Milestone 18: Workflow Engine Runtime
 *
 * Sends an SMS message using a template with lead field substitution.
 * Template syntax: {{lead.fieldName}} or {{lead.source.channel}}
 */

import type { SmsTemplateNodeConfig, WorkflowDefinition } from "@leadops/types";
import { getNextNodeId } from "@leadops/types";
import { getDbClient, workflowDefinitions, workflowExecutions, messages, leads } from "@leadops/db";
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
 * Resolve template variables with lead data
 * Example: "Hi {{lead.firstName}}" -> "Hi John"
 */
function resolveTemplate(template: string, leadData: any): string {
  return template.replace(/\{\{lead\.([a-zA-Z0-9_.]+)\}\}/g, (match, path) => {
    const keys = path.split(".");
    let value: any = leadData;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        return match; // Keep original if path not found
      }
    }

    return value !== null && value !== undefined ? String(value) : match;
  });
}

export async function executeSmsTemplateNode(context: ExecutorContext): Promise<void> {
  const db = getDbClient();

  console.log(`[SmsTemplateExecutor] Executing SMS_TEMPLATE node ${context.nodeId}`);

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
        `[SmsTemplateExecutor] Workflow ${context.workflowExecutionId} is ${execution.status}, aborting`
      );
      await logStepExecution({
        workflowExecutionId: context.workflowExecutionId,
        orgId: context.orgId,
        nodeId: context.nodeId,
        nodeType: "SMS_TEMPLATE",
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
    if (!node || node.type !== "SMS_TEMPLATE") {
      throw new Error(`SMS_TEMPLATE node ${context.nodeId} not found in workflow`);
    }

    const config = node.config as SmsTemplateNodeConfig;

    // 4. Load lead data for template resolution
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

    // 5. Resolve template
    const messageBody = resolveTemplate(config.template, lead);

    console.log(`[SmsTemplateExecutor] Resolved template: "${messageBody}"`);

    // 6. Create outbound SMS message
    const messageValues: any = {
      orgId: context.orgId,
      leadId: context.leadId,
      messageType: "sms",
      channel: "sms",
      direction: "outbound",
      sender: "workflow",
      body: messageBody,
      status: "pending",
      metadata: {
        workflowExecutionId: context.workflowExecutionId,
        nodeId: context.nodeId,
        nodeType: "SMS_TEMPLATE",
      },
    };

    if (context.conversationId) {
      messageValues.conversationId = context.conversationId;
    }

    await db.insert(messages).values(messageValues);

    // 7. Log step execution
    await logStepExecution({
      workflowExecutionId: context.workflowExecutionId,
      orgId: context.orgId,
      nodeId: context.nodeId,
      nodeType: "SMS_TEMPLATE",
      status: "success",
    });

    // 8. Get next node and advance
    const nextNodeId = getNextNodeId(workflow, context.nodeId);

    await advanceWorkflow({
      workflowExecutionId: context.workflowExecutionId,
      orgId: context.orgId,
      currentNodeId: context.nodeId,
      nextNodeId,
    });

    console.log(`[SmsTemplateExecutor] SMS message created, advancing to ${nextNodeId}`);
  } catch (error) {
    console.error(`[SmsTemplateExecutor] Error executing SMS_TEMPLATE node:`, error);

    await logStepExecution({
      workflowExecutionId: context.workflowExecutionId,
      orgId: context.orgId,
      nodeId: context.nodeId,
      nodeType: "SMS_TEMPLATE",
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}
