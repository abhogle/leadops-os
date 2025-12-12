import { pgTable, text, timestamp, integer, boolean, index, uuid } from "drizzle-orm/pg-core";
import { orgs } from "./orgs.js";
import { leads } from "./leads.js";
import { users } from "./users.js";

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id")
    .notNull()
    .references(() => orgs.id, { onDelete: "cascade" }),
  companyId: text("company_id"), // NULL for now, future companies table support
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),

  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  unreadCount: integer("unread_count").notNull().default(0),
  needsAttention: boolean("needs_attention").notNull().default(false),

  status: text("status").notNull().default("not_started"),

  isArchived: boolean("is_archived").notNull().default(false),

  // AI Engine Human Takeover (Milestone 17)
  humanTakeover: boolean("human_takeover").notNull().default(false),
  humanTakeoverAt: timestamp("human_takeover_at", { withTimezone: true }),
  humanTakeoverBy: text("human_takeover_by").references(() => users.id, { onDelete: "set null" }),

  // Engagement Tracking (Milestone 18)
  engagementStatus: text("engagement_status").notNull().default("unengaged"),
  engagedAt: timestamp("engaged_at", { withTimezone: true }),
  engagementSource: text("engagement_source"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgLastMessageIdx: index("idx_conversations_org_last_message").on(table.orgId, table.lastMessageAt.desc()),
  leadIdx: index("idx_conversations_lead").on(table.leadId),
  humanTakeoverIdx: index("idx_conversations_human_takeover").on(table.orgId, table.humanTakeover),
  engagementIdx: index("idx_conversations_engagement").on(table.orgId, table.engagementStatus),
}));
