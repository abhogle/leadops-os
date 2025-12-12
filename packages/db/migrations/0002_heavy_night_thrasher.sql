CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"company_id" text,
	"lead_id" uuid NOT NULL,
	"last_message_at" timestamp with time zone,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"needs_attention" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"company_id" text,
	"assigned_agent_id" text,
	"phone" text NOT NULL,
	"email" text,
	"first_name" text,
	"last_name" text,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"service_type" text,
	"vendor" text,
	"vendor_lead_id" text,
	"source" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"metadata" jsonb,
	"payload_raw" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"company_id" text,
	"lead_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"message_type" text NOT NULL,
	"channel" text DEFAULT 'sms' NOT NULL,
	"direction" text,
	"sender" text,
	"body" text,
	"metadata" jsonb,
	"status" text DEFAULT 'none' NOT NULL,
	"provider_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"company_id" text,
	"lead_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"agent_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_phone_numbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"company_id" text,
	"phone_number" text NOT NULL,
	"area_code" text NOT NULL,
	"region" text,
	"display_name" text,
	"capabilities" jsonb DEFAULT '{"sms":true,"voice":true}'::jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_phone_numbers_org_id_phone_number_unique" UNIQUE("org_id","phone_number")
);
--> statement-breakpoint
CREATE TABLE "org_twilio_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"account_sid" text NOT NULL,
	"auth_token" text NOT NULL,
	"messaging_service_sid" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_twilio_config_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_agent_id_users_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_phone_numbers" ADD CONSTRAINT "org_phone_numbers_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_twilio_config" ADD CONSTRAINT "org_twilio_config_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_conversations_org_last_message" ON "conversations" USING btree ("org_id","last_message_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_conversations_lead" ON "conversations" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_leads_org_created_at" ON "leads" USING btree ("org_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_leads_org_phone" ON "leads" USING btree ("org_id","phone");--> statement-breakpoint
CREATE INDEX "idx_leads_assigned_agent" ON "leads" USING btree ("org_id","assigned_agent_id");--> statement-breakpoint
CREATE INDEX "idx_leads_geo" ON "leads" USING btree ("org_id","state","zip");--> statement-breakpoint
CREATE INDEX "idx_leads_vendor" ON "leads" USING btree ("org_id","vendor_lead_id");--> statement-breakpoint
CREATE INDEX "idx_messages_conv" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_lead" ON "messages" USING btree ("lead_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_org_created" ON "messages" USING btree ("org_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_notes_conv" ON "notes" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_phone_numbers_org_area" ON "org_phone_numbers" USING btree ("org_id","area_code","is_active");--> statement-breakpoint
CREATE INDEX "idx_phone_numbers_org_default" ON "org_phone_numbers" USING btree ("org_id","is_default");