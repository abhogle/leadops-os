import type { FastifyInstance } from "fastify";
import { LogoutResponseSchema } from "@leadops/schemas";
import { InternalError } from "../errors/index.js";

/**
 * POST /auth/logout
 *
 * Clears session cookie and logs out user
 *
 * @public endpoint (no auth required, works on cookie)
 */
export async function registerLogoutRoute(app: FastifyInstance) {
  app.post("/auth/logout", async (req, reply) => {
    try {
      // Clear session cookie
      reply.clearCookie("session_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      // Return success response (validated with Zod)
      const response = LogoutResponseSchema.parse({
        success: true,
        message: "Logout successful",
      });

      return response;
    } catch (err) {
      req.log.error(err, "Logout failed");
      throw new InternalError("Logout failed");
    }
  });
}
