/**
 * LeadOps OS — Core System Types
 *
 * These are the foundational TypeScript interfaces shared across all services.
 * They align with the unified lead schema, eventing model, and multi-tenant
 * architecture from the Data Model & ERD specification.
 */

// Multi-tenant root identifier
export interface OrgScoped {
  orgId: string;
}

// Lead source metadata
export interface LeadSource {
  channel: string;
  provider: string;
  campaignId?: string;
  vendor?: string;
}

// Internal event envelope (for event bus)
export interface LeadOpsEvent<T = any> extends OrgScoped {
  id: string;
  type: string; // e.g., "lead.created"
  timestamp: string;
  payload: T;
  version: string;
}

// System identifiers
export type LeadId = string;
export type WorkflowId = string;
export type UserId = string;

// Base audit fields
export interface AuditFields {
  createdAt: string;
  updatedAt: string;
  createdBy?: UserId;
  updatedBy?: UserId;
}

/**
 * Org and User skeleton models
 * These reflect the Data Model & ERD Specification at a high level,
 * without persistence or auth implemented yet.
 */

export interface Org {
  id: string;
  name: string;
  industry?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = "owner" | "admin" | "member" | "leadops_admin";

export interface User {
  id: string;
  orgId: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

/**
 * Onboarding Status
 * Tracks progress through the onboarding flow.
 * - org_created: Organization created, awaiting industry selection
 * - industry_selected: Industry selected, awaiting config confirmation
 * - config_confirmed: Configuration confirmed, awaiting final completion
 * - completed: Onboarding fully completed
 */
export type OnboardingStatus =
  | "org_created"
  | "industry_selected"
  | "config_confirmed"
  | "completed";

/**
 * JWT Token Claims
 * Structure of the decoded JWT token payload used for authentication
 */
export interface TokenClaims {
  sub: string;  // User ID
  org: string;  // Organization ID
  role: string; // User role
}

/**
 * Lead Field Definition
 * Describes a custom field in the lead schema
 */
export interface LeadField {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "date";
  required?: boolean;
}

/**
 * Vertical Pack
 * Industry-specific configuration template
 */
export interface VerticalPackInfo {
  id: string;
  industry: string;
}

// Import and export workflow types (Milestone 18)
import type { WorkflowDefinition } from "./workflow.js";
export * from "./workflow.js";

/**
 * Organization Configuration
 * Contains all configurable aspects of an organization
 */
export interface OrgConfig {
  leadFields: LeadField[];
  workflows: WorkflowDefinition[];
  settings: Record<string, any>;
  vertical?: VerticalPackInfo;
}
