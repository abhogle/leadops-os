import { pgTable, text, timestamp, jsonb, index, uuid, boolean } from "drizzle-orm/pg-core";
import { orgs } from "./orgs.js";
import { users } from "./users.js";

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id")
    .notNull()
    .references(() => orgs.id, { onDelete: "cascade" }),
  companyId: text("company_id"), // NULL for now, future companies table support

  assignedAgentId: text("assigned_agent_id")
    .references(() => users.id, { onDelete: "set null" }),

  phone: text("phone").notNull(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),

  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  serviceType: text("service_type"),

  vendor: text("vendor"),
  vendorLeadId: text("vendor_lead_id"),
  source: text("source").notNull(),

  status: text("status").notNull().default("new"),

  metadata: jsonb("metadata"),
  payloadRaw: jsonb("payload_raw").notNull(),

  // AI Engine Opt-Out & Compliance (Milestone 17)
  optedOut: boolean("opted_out").notNull().default(false),
  optedOutAt: timestamp("opted_out_at", { withTimezone: true }),
  dncFlag: boolean("dnc_flag").notNull().default(false),
  dncReason: text("dnc_reason"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgCreatedAtIdx: index("idx_leads_org_created_at").on(table.orgId, table.createdAt.desc()),
  orgPhoneIdx: index("idx_leads_org_phone").on(table.orgId, table.phone),
  assignedAgentIdx: index("idx_leads_assigned_agent").on(table.orgId, table.assignedAgentId),
  geoIdx: index("idx_leads_geo").on(table.orgId, table.state, table.zip),
  vendorIdx: index("idx_leads_vendor").on(table.orgId, table.vendorLeadId),
  optedOutIdx: index("idx_leads_opted_out").on(table.orgId, table.optedOut),
  dncIdx: index("idx_leads_dnc").on(table.orgId, table.dncFlag),
}));
