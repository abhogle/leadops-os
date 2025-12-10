import type { Org, User } from "@leadops/types";
import type { LeadOpsAuthToken } from "@leadops/auth";

/**
 * Context injected into Fastify request objects once tenancy is resolved.
 */
export interface TenantContext {
  tokenClaims?: LeadOpsAuthToken;
  org?: Org;
  user?: User;
}
