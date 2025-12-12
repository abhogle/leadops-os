/**
 * LeadOps Admin Configuration System — Base Types
 *
 * These definitions map directly to the Admin Config Spec and will later
 * be hydrated from the database and UI-driven configuration editor.
 */

export interface IndustryConfig {
  industry: string; // e.g. "insurance", "dental", "medspa"
  verticalPack: string; // key to packages/vertical-packs
}

export interface LeadFieldConfig {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "date";
  required?: boolean;
}

export interface WorkflowConfig {
  id: string;
  name: string;
  enabled: boolean;
  entryEvents: string[];
}

export interface OrgConfig {
  orgId: string;
  industry: IndustryConfig;
  leadFields: LeadFieldConfig[];
  workflows: WorkflowConfig[];
}

/**
 * AI Model Configuration
 * Per Doc #25 (LLM Strategy & Model Architecture)
 * Milestone 17: AI SMS Engine v1
 */
export const AI_MODELS = {
  conversation: {
    model: "claude-sonnet-4",
    provider: "anthropic",
    timeout: 5000, // 5 seconds
    maxTokens: 1024,
  },
  // Future: Add other model types
  // classification: { ... },
  // summarization: { ... },
} as const;

export type AIModelConfig = typeof AI_MODELS;
