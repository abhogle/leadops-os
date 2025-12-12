/**
 * Workflow Executions Schema
 * Milestone 18: Workflow Engine Runtime
 */

import { pgTable, text, timestamp, integer, uuid, index } from "drizzle-orm/pg-core";
import { orgs } from "./orgs.js";
import { leads } from "./leads.js";
import { conversations } from "./conversations.js";
import { workflowDefinitions } from "./workflow-definitions.js";

export const workflowExecutions = pgTable("workflow_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id")
    .notNull()
    .references(() => orgs.id, { onDelete: "cascade" }),

  workflowDefinitionId: uuid("workflow_definition_id")
    .notNull()
    .references(() => workflowDefinitions.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "set null" }),

  // Execution state
  status: text("status").notNull().default("running"),
  currentNodeId: text("current_node_id").notNull(),
  resumeAt: timestamp("resume_at", { withTimezone: true }),
  lastError: text("last_error"),
  attempts: integer("attempts").notNull().default(0),

  // Optimistic concurrency control
  version: integer("version").notNull().default(1),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("idx_workflow_executions_org").on(table.orgId),
  conversationIdx: index("idx_workflow_executions_conversation").on(table.conversationId),
  statusIdx: index("idx_workflow_executions_status").on(table.status, table.resumeAt),
  leadIdx: index("idx_workflow_executions_lead").on(table.leadId),
}));
