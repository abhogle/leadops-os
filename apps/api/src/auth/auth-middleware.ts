import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyAuthToken } from "@leadops/auth";
import { AuthError } from "../errors/index.js";

/**
 * Auth Middleware - Cookie-Based Authentication
 *
 * Reads session token from HttpOnly cookie and validates it
 * Extracts token claims and adds to tenantContext
 */
export async function authMiddleware(
  req: FastifyRequest,
  reply: FastifyReply
) {
  // Read token from cookie (HttpOnly, more secure than localStorage)
  const token = req.cookies.session_token;

  if (!token) {
    throw new AuthError("Missing authentication token");
  }

  // Verify token and extract claims
  let claims;
  try {
    claims = verifyAuthToken(token);
  } catch (err) {
    throw new AuthError("Invalid or expired authentication token");
  }

  if (!claims) {
    throw new AuthError("Invalid or expired authentication token");
  }

  // Extend tenancy context with token claims
  req.tenantContext = {
    ...req.tenantContext,
    tokenClaims: claims,
  };
}
