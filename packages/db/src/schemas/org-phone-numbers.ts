import { pgTable, text, timestamp, jsonb, boolean, index, uuid, unique } from "drizzle-orm/pg-core";
import { orgs } from "./orgs.js";

export const orgPhoneNumbers = pgTable("org_phone_numbers", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id")
    .notNull()
    .references(() => orgs.id, { onDelete: "cascade" }),
  companyId: text("company_id"), // NULL for now, future companies table support

  phoneNumber: text("phone_number").notNull(),
  areaCode: text("area_code").notNull(),
  region: text("region"),
  displayName: text("display_name"),
  capabilities: jsonb("capabilities").notNull().default({ sms: true, voice: true }),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueOrgPhone: unique("org_phone_numbers_org_id_phone_number_unique").on(table.orgId, table.phoneNumber),
  orgAreaIdx: index("idx_phone_numbers_org_area").on(table.orgId, table.areaCode, table.isActive),
  orgDefaultIdx: index("idx_phone_numbers_org_default").on(table.orgId, table.isDefault),
}));
