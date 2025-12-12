import { z } from "zod";

/**
 * Minimal seed schemas for the Unified Lead Model.
 * These align with the specs but include only the essentials needed
 * for early ingestion workflows. They will expand as vertical packs
 * add domain-specific fields.
 */

export const LeadSourceSchema = z.object({
  channel: z.string(),
  provider: z.string(),
  campaignId: z.string().optional(),
  vendor: z.string().optional(),
});

export const LeadBaseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string(),
  source: LeadSourceSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Core Domain Schemas
 */

export const OnboardingStatusSchema = z.enum([
  "org_created",
  "industry_selected",
  "config_confirmed",
  "completed"
]);

export const UserRoleSchema = z.enum([
  "owner",
  "admin",
  "member",
  "leadops_admin"
]);

export const OrgSchema = z.object({
  id: z.string(),
  name: z.string(),
  industry: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const UserSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const TokenClaimsSchema = z.object({
  sub: z.string(),
  org: z.string(),
  role: z.string(),
});

export const LeadFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["string", "number", "boolean", "date"]),
  required: z.boolean().optional(),
});

export const VerticalPackInfoSchema = z.object({
  id: z.string(),
  industry: z.string(),
});

export const OrgConfigSchema = z.object({
  leadFields: z.array(LeadFieldSchema),
  workflows: z.array(z.any()), // Will be properly typed when workflow schema is defined
  settings: z.record(z.any()),
  vertical: VerticalPackInfoSchema.optional(),
});

/**
 * API Response Schemas
 */

export const MeResponseSchema = z.object({
  user: UserSchema,
  org: OrgSchema,
  tokenClaims: TokenClaimsSchema,
  onboardingStatus: OnboardingStatusSchema.nullable(),
});

export const OnboardingStateResponseSchema = z.object({
  user: UserSchema,
  org: OrgSchema,
  onboardingStatus: OnboardingStatusSchema,
  config: OrgConfigSchema,
});

export const AvailableIndustriesResponseSchema = z.object({
  industries: z.array(z.string()),
});

/**
 * API Request Schemas
 */

export const SetIndustryRequestSchema = z.object({
  industry: z.string().min(1, "Industry is required"),
});

export const ConfirmConfigRequestSchema = z.object({
  leadFields: z.array(LeadFieldSchema),
  workflows: z.array(z.any()),
  settings: z.record(z.any()),
});

export const CreateOrgRequestSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  industry: z.string().min(1, "Industry is required"),
  email: z.string().email("Valid email is required"),
});

export const ConfigUpdateRequestSchema = z.object({
  leadFields: z.array(LeadFieldSchema).optional(),
  workflows: z.array(z.any()).optional(),
  settings: z.record(z.any()).optional(),
});

export const CompleteStepRequestSchema = z.object({
  next: OnboardingStatusSchema,
});

/**
 * Authentication Schemas
 */

export const LoginRequestSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const LoginResponseSchema = z.object({
  user: UserSchema,
  org: OrgSchema,
  message: z.string().optional(),
});

export const LogoutResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export const RefreshResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

/**
 * Exported schema types
 */
export type LeadSource = z.infer<typeof LeadSourceSchema>;
export type LeadBase = z.infer<typeof LeadBaseSchema>;
export type OnboardingStatus = z.infer<typeof OnboardingStatusSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type Org = z.infer<typeof OrgSchema>;
export type User = z.infer<typeof UserSchema>;
export type TokenClaims = z.infer<typeof TokenClaimsSchema>;
export type LeadField = z.infer<typeof LeadFieldSchema>;
export type VerticalPackInfo = z.infer<typeof VerticalPackInfoSchema>;
export type OrgConfig = z.infer<typeof OrgConfigSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
export type OnboardingStateResponse = z.infer<typeof OnboardingStateResponseSchema>;
export type AvailableIndustriesResponse = z.infer<typeof AvailableIndustriesResponseSchema>;
export type SetIndustryRequest = z.infer<typeof SetIndustryRequestSchema>;
export type ConfirmConfigRequest = z.infer<typeof ConfirmConfigRequestSchema>;
export type CreateOrgRequest = z.infer<typeof CreateOrgRequestSchema>;
export type ConfigUpdateRequest = z.infer<typeof ConfigUpdateRequestSchema>;
export type CompleteStepRequest = z.infer<typeof CompleteStepRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

/**
 * Milestone 15: Inbox & Messaging Schemas
 */
export * from "./ingestion.js";
export * from "./messages.js";
export * from "./notes.js";
export * from "./inbox.js";
export * from "./timeline.js";

/**
 * Milestone 17: Workflow Schemas (AI SMS Engine)
 */
export * from "./workflow.js";
