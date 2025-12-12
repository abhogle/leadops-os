import { pgTable, text, timestamp, index, uuid } from "drizzle-orm/pg-core";
import { orgs } from "./orgs.js";
import { leads } from "./leads.js";
import { conversations } from "./conversations.js";
import { users } from "./users.js";

export const notes = pgTable("notes", {
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
  agentId: text("agent_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  body: text("body").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  convIdx: index("idx_notes_conv").on(table.conversationId, table.createdAt),
}));
