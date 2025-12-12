import { pgTable, text, timestamp, integer, boolean, index, uuid } from "drizzle-orm/pg-core";
import { orgs } from "./orgs.js";
import { leads } from "./leads.js";
import { conversations } from "./conversations.js";

export const aiCallLogs = pgTable("ai_call_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id")
    .notNull()
    .references(() => orgs.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id")
    .references(() => leads.id, { onDelete: "set null" }),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "set null" }),

  direction: text("direction").notNull(), // "inbound" | "outbound"
  model: text("model").notNull(),

  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  cachedTokens: integer("cached_tokens"),
  latencyMs: integer("latency_ms"),

  fallbackTier: integer("fallback_tier"),
  complianceBlocked: boolean("compliance_blocked").notNull().default(false),
  complianceRuleTriggered: text("compliance_rule_triggered"),

  promptSummary: text("prompt_summary"),
  responseSummary: text("response_summary"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("idx_ai_call_logs_org").on(table.orgId),
  createdIdx: index("idx_ai_call_logs_created").on(table.createdAt),
  conversationIdx: index("idx_ai_call_logs_conversation").on(table.conversationId, table.createdAt),
}));
