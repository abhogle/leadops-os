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
