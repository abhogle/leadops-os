/**
 * Milestone 18: Workflow Engine Runtime Migration
 *
 * Changes:
 * 1. Add engagement tracking to conversations
 * 2. Create workflow_definitions table
 * 3. Create workflow_executions table
 * 4. Create workflow_step_executions table
 * 5. Add indexes for performance
 */

-- 1. Add engagement tracking to conversations
ALTER TABLE "conversations"
  ADD COLUMN "engagement_status" text DEFAULT 'unengaged' NOT NULL,
  ADD COLUMN "engaged_at" timestamp with time zone,
  ADD COLUMN "engagement_source" text;

-- Create index for engagement queries
CREATE INDEX "idx_conversations_engagement" ON "conversations"("org_id", "engagement_status");

-- 2. Create workflow_definitions table
CREATE TABLE "workflow_definitions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" text NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,

  "name" text NOT NULL,
  "description" text,
  "industry" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,

  -- Workflow structure (JSONB)
  "nodes" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "edges" jsonb NOT NULL DEFAULT '[]'::jsonb,

  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "idx_workflow_definitions_org" ON "workflow_definitions"("org_id", "is_active");
CREATE INDEX "idx_workflow_definitions_industry" ON "workflow_definitions"("industry");

-- 3. Create workflow_executions table
CREATE TABLE "workflow_executions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" text NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,

  "workflow_definition_id" uuid NOT NULL REFERENCES "workflow_definitions"("id") ON DELETE CASCADE,
  "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
  "conversation_id" uuid REFERENCES "conversations"("id") ON DELETE SET NULL,

  -- Execution state
  "status" text NOT NULL DEFAULT 'running',
  "current_node_id" text NOT NULL,
  "resume_at" timestamp with time zone,
  "last_error" text,
  "attempts" integer DEFAULT 0 NOT NULL,

  -- Optimistic concurrency control
  "version" integer DEFAULT 1 NOT NULL,

  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for workflow execution queries
CREATE INDEX "idx_workflow_executions_org" ON "workflow_executions"("org_id");
CREATE INDEX "idx_workflow_executions_conversation" ON "workflow_executions"("conversation_id");
CREATE INDEX "idx_workflow_executions_status" ON "workflow_executions"("status", "resume_at");
CREATE INDEX "idx_workflow_executions_lead" ON "workflow_executions"("lead_id");

-- 4. Create workflow_step_executions table (observability)
CREATE TABLE "workflow_step_executions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workflow_execution_id" uuid NOT NULL REFERENCES "workflow_executions"("id") ON DELETE CASCADE,
  "org_id" text NOT NULL,

  "node_id" text NOT NULL,
  "node_type" text NOT NULL,
  "status" text NOT NULL,

  -- For CONDITION nodes
  "branch" text,

  "error" text,
  "executed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "idx_workflow_step_executions_workflow" ON "workflow_step_executions"("workflow_execution_id");
CREATE INDEX "idx_workflow_step_executions_org" ON "workflow_step_executions"("org_id", "executed_at");

-- Add comment documentation
COMMENT ON COLUMN "conversations"."engagement_status" IS 'Allowed values: unengaged, engaged, converted, dismissed, stale';
COMMENT ON COLUMN "workflow_executions"."status" IS 'Allowed values: running, paused, completed, failed, terminated_engaged, terminated_manual';
COMMENT ON COLUMN "workflow_step_executions"."status" IS 'Allowed values: success, error';
