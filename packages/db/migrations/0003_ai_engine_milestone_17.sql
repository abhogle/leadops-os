-- Milestone 17: AI SMS Engine v1 Database Schema
-- Adds AI call logging, org AI settings, and opt-out/compliance fields

-- AI Call Logs Table (Observability)
CREATE TABLE "ai_call_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"lead_id" uuid,
	"conversation_id" uuid,
	"direction" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cached_tokens" integer,
	"latency_ms" integer,
	"fallback_tier" integer,
	"compliance_blocked" boolean DEFAULT false NOT NULL,
	"compliance_rule_triggered" text,
	"prompt_summary" text,
	"response_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add AI Configuration to Organizations
ALTER TABLE "orgs" ADD COLUMN "conversation_post_completion_behavior" text DEFAULT 'ai_replies' NOT NULL;--> statement-breakpoint
ALTER TABLE "orgs" ADD COLUMN "ai_rate_limit_per_hour" integer DEFAULT 10 NOT NULL;--> statement-breakpoint

-- Add Opt-Out and Compliance Fields to Leads
ALTER TABLE "leads" ADD COLUMN "opted_out" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "opted_out_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "dnc_flag" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "dnc_reason" text;--> statement-breakpoint

-- Add Human Takeover to Conversations
ALTER TABLE "conversations" ADD COLUMN "human_takeover" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "human_takeover_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "human_takeover_by" text;--> statement-breakpoint

-- Foreign Keys for AI Call Logs
ALTER TABLE "ai_call_logs" ADD CONSTRAINT "ai_call_logs_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_call_logs" ADD CONSTRAINT "ai_call_logs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_call_logs" ADD CONSTRAINT "ai_call_logs_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_human_takeover_by_users_id_fk" FOREIGN KEY ("human_takeover_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Indexes for AI Call Logs (Observability Queries)
CREATE INDEX "idx_ai_call_logs_org" ON "ai_call_logs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_ai_call_logs_created" ON "ai_call_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_call_logs_conversation" ON "ai_call_logs" USING btree ("conversation_id","created_at");--> statement-breakpoint

-- Indexes for Opt-Out Queries
CREATE INDEX "idx_leads_opted_out" ON "leads" USING btree ("org_id","opted_out");--> statement-breakpoint
CREATE INDEX "idx_leads_dnc" ON "leads" USING btree ("org_id","dnc_flag");--> statement-breakpoint

-- Indexes for Human Takeover Queries
CREATE INDEX "idx_conversations_human_takeover" ON "conversations" USING btree ("org_id","human_takeover");
