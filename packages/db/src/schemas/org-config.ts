import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const orgConfig = pgTable("org_config", {
  orgId: text("org_id").primaryKey(),

  // industry + vertical pack selection
  industry: text("industry").notNull(),
  verticalPack: text("vertical_pack").notNull(),

  // JSONB config blocks
  leadFields: jsonb("lead_fields").notNull(),
  workflows: jsonb("workflows").notNull(),
  settings: jsonb("settings").notNull(), // misc toggles, flags, preferences

  // Onboarding progression
  onboardingState: text("onboarding_state").notNull().default("org_created"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
