import type { FastifyRequest, FastifyReply } from "fastify";
import { resolveTenancy } from "../services/tenancy-service.js";
import { ForbiddenError, InternalError } from "../errors/index.js";

export async function enforceTenancy(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const claims = req.tenantContext?.tokenClaims;
  if (!claims) {
    throw new ForbiddenError("No tenant context available");
  }

  const { org, user } = await resolveTenancy(req.server, claims);

  if (!org || !user) {
    throw new ForbiddenError("Tenant or user not found");
  }

  req.tenantContext = {
    ...req.tenantContext,
    org,
    user,
  };
}
