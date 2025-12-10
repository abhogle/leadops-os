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

export interface User {
  id: string;
  orgId: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  createdAt: string;
  updatedAt: string;
}
