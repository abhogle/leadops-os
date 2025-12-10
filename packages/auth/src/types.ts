/**
 * LeadOps Auth Token (JWT) - Versioned
 * v1 token structure defines the minimum we need for
 * multi-tenancy, RBAC, and authenticated request context.
 */
export interface LeadOpsAuthToken {
  v: 1;
  sub: string;   // user ID
  org: string;   // org ID
  role: "owner" | "admin" | "member" | "viewer";
  iat: number;   // issued at
  exp: number;   // expiration
}
