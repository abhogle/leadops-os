import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

export const orgs = pgTable("orgs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry"),

  // AI Engine Configuration (Milestone 17)
  conversationPostCompletionBehavior: text("conversation_post_completion_behavior")
    .notNull()
    .default("ai_replies"),
  aiRateLimitPerHour: integer("ai_rate_limit_per_hour")
    .notNull()
    .default(10),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
