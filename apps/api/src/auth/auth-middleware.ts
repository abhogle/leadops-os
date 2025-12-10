import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyAuthToken } from "@leadops/auth";

export async function authMiddleware(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Missing authentication token"
    });
  }

  const token = header.substring(7);
  const claims = verifyAuthToken(token);

  if (!claims) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Invalid or expired authentication token"
    });
  }

  // extend tenancy context
  // @ts-expect-error decorated dynamically
  req.tenantContext = {
    // @ts-expect-error decorated dynamically
    ...req.tenantContext,
    tokenClaims: claims,
  };
}
