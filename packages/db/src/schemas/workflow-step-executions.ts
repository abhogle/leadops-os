/**
 * Workflow Step Executions Schema (Observability)
 * Milestone 18: Workflow Engine Runtime
 */

import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { workflowExecutions } from "./workflow-executions.js";

export const workflowStepExecutions = pgTable("workflow_step_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowExecutionId: uuid("workflow_execution_id")
    .notNull()
    .references(() => workflowExecutions.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull(),

  nodeId: text("node_id").notNull(),
  nodeType: text("node_type").notNull(),
  status: text("status").notNull(),

  // For CONDITION nodes
  branch: text("branch"),

  error: text("error"),
  executedAt: timestamp("executed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  workflowIdx: index("idx_workflow_step_executions_workflow").on(table.workflowExecutionId),
  orgIdx: index("idx_workflow_step_executions_org").on(table.orgId, table.executedAt),
}));
