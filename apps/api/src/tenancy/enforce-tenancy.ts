import type { FastifyRequest, FastifyReply } from "fastify";
import { resolveTenancy } from "../services/tenancy-service.js";

export async function enforceTenancy(
  req: FastifyRequest,
  reply: FastifyReply
) {
  // @ts-expect-error decorated dynamically
  const claims = req.tenantContext?.tokenClaims;
  if (!claims) {
    return reply.status(403).send({
      error: "Forbidden",
      message: "No tenant context available"
    });
  }

  const { org, user } = await resolveTenancy(req.server, claims);

  if (!org || !user) {
    return reply.status(403).send({
      error: "Forbidden",
      message: "Tenant or user not found"
    });
  }

  // @ts-expect-error decorated dynamically
  req.tenantContext = {
    // @ts-expect-error decorated dynamically
    ...req.tenantContext,
    org,
    user,
  };
}
