import type { FastifyInstance } from "fastify";
import { RefreshResponseSchema } from "@leadops/schemas";
import { verifyAuthToken, signAuthToken } from "@leadops/auth";
import { AuthError, InternalError } from "../errors/index.js";

/**
 * POST /auth/refresh
 *
 * Rotates session token and issues new cookie
 * Validates existing token and creates new one
 *
 * @public endpoint (validates cookie, no auth middleware)
 */
export async function registerRefreshRoute(app: FastifyInstance) {
  app.post("/auth/refresh", async (req, reply) => {
    try {
      // Get token from cookie
      const token = req.cookies.session_token;

      if (!token) {
        throw new AuthError("No session token found");
      }

      // Verify existing token
      let claims;
      try {
        claims = verifyAuthToken(token);
      } catch (err) {
        throw new AuthError("Invalid or expired token");
      }

      if (!claims) {
        throw new AuthError("Invalid or expired token");
      }

      // Create new token with same claims
      const newToken = signAuthToken({
        v: claims.v,
        sub: claims.sub,
        org: claims.org,
        role: claims.role,
      });

      // Set new HttpOnly cookie
      reply.setCookie("session_token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      // Return success response (validated with Zod)
      const response = RefreshResponseSchema.parse({
        success: true,
        message: "Token refreshed",
      });

      return response;
    } catch (err) {
      // Re-throw ApiError instances (AuthError, InternalError, etc.)
      if (err instanceof AuthError || err instanceof InternalError) {
        throw err;
      }
      // Log and wrap unexpected errors
      req.log.error(err, "Token refresh failed");
      throw new InternalError("Token refresh failed");
    }
  });
}
