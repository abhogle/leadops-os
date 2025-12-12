import type { FastifyRequest, FastifyReply } from "fastify";
import type { UserRole } from "@leadops/types";
import { AuthError, ForbiddenError } from "../errors/index.js";

/**
 * RBAC Middleware - Role-Based Access Control
 *
 * Enforces role requirements for protected routes.
 * Use this middleware to restrict access to admin-only or owner-only operations.
 *
 * @param allowedRoles - One or more roles that are permitted to access the route
 * @returns Fastify preHandler middleware
 *
 * @example
 * app.post("/admin/settings", {
 *   preHandler: [requireRole("owner", "admin")]
 * }, handler);
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    const context = req.tenantContext;

    // No user context = not authenticated
    if (!context || !context.user) {
      throw new AuthError("Authentication required");
    }

    const { user } = context;

    // User exists but doesn't have required role
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError(`Access denied. Required role: ${allowedRoles.join(" or ")}`);
    }

    // User has required role - allow access
  };
}
