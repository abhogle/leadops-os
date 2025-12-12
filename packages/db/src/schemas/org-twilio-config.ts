import { pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { orgs } from "./orgs.js";

export const orgTwilioConfig = pgTable("org_twilio_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id")
    .notNull()
    .references(() => orgs.id, { onDelete: "cascade" }),

  accountSid: text("account_sid").notNull(),
  authToken: text("auth_token").notNull(), // ⚠ TODO: Must be encrypted in production
  messagingServiceSid: text("messaging_service_sid"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueOrgId: unique("org_twilio_config_org_id_unique").on(table.orgId),
}));
