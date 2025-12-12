import type { FastifyRequest, FastifyReply } from "fastify";
import type { TenantContext } from "./context.js";

/**
 * Temporary tenancy middleware.
 * In future milestones, this will:
 *  - parse authentication
 *  - resolve user
 *  - resolve org
 *  - enforce RLS and scopes
 *
 * For now, injects an empty tenant context.
 */

export async function tenantMiddleware(
  req: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const context: TenantContext = {};

  // Attach context to request
  // Future: req.tenantContext = actual resolved tenancy
  // Fastify allows symbol-based decoration
  req.tenantContext = context;
}
