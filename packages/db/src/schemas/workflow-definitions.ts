/**
 * Workflow Definitions Schema
 * Milestone 18: Workflow Engine Runtime
 */

import { pgTable, text, timestamp, boolean, integer, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { orgs } from "./orgs.js";

export const workflowDefinitions = pgTable("workflow_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id")
    .notNull()
    .references(() => orgs.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  description: text("description"),
  industry: text("industry").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  version: integer("version").notNull().default(1),

  // Workflow structure (stored as JSONB for flexibility)
  nodes: jsonb("nodes").notNull().default([]),
  edges: jsonb("edges").notNull().default([]),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("idx_workflow_definitions_org").on(table.orgId, table.isActive),
  industryIdx: index("idx_workflow_definitions_industry").on(table.industry),
}));
