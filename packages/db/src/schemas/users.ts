import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { orgs } from "./orgs.js";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => orgs.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  passwordHash: text("password_hash"), // Nullable for now (existing users don't have passwords)
  role: text("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
