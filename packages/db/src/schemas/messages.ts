import { pgTable, text, timestamp, jsonb, index, uuid } from "drizzle-orm/pg-core";
import { orgs } from "./orgs.js";
import { leads } from "./leads.js";
import { conversations } from "./conversations.js";

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id")
    .notNull()
    .references(() => orgs.id, { onDelete: "cascade" }),
  companyId: text("company_id"), // NULL for now, future companies table support
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),

  messageType: text("message_type").notNull(), // sms, email, call_inbound, ai_action, etc.
  channel: text("channel").notNull().default("sms"),
  direction: text("direction"), // inbound/outbound/null (system events)
  sender: text("sender"), // lead, ai, human, system
  body: text("body"),
  metadata: jsonb("metadata"),

  status: text("status").notNull().default("none"),
  providerMessageId: text("provider_message_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  convIdx: index("idx_messages_conv").on(table.conversationId, table.createdAt),
  leadIdx: index("idx_messages_lead").on(table.leadId, table.createdAt),
  orgCreatedIdx: index("idx_messages_org_created").on(table.orgId, table.createdAt.desc()),
}));
