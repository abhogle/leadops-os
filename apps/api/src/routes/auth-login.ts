import type { FastifyInstance } from "fastify";
import { users, orgs } from "@leadops/db";
import { eq } from "drizzle-orm";
import { LoginRequestSchema, LoginResponseSchema } from "@leadops/schemas";
import { verifyPassword } from "../auth/password.js";
import { signAuthToken } from "@leadops/auth";
import { ValidationError, AuthError, InternalError } from "../errors/index.js";

/**
 * POST /auth/login
 *
 * Authenticates user with email and password
 * Returns HttpOnly cookie with session token
 *
 * @public endpoint (no auth required)
 * @ratelimit 10 requests per minute (sensitive operation)
 */
export async function registerLoginRoute(app: FastifyInstance) {
  app.post("/auth/login", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute",
      },
    },
  }, async (req, reply) => {
    try {
      // Validate request body
      const validation = LoginRequestSchema.safeParse(req.body);

      if (!validation.success) {
        throw new ValidationError("Validation failed", validation.error.errors);
      }

      const { email, password } = validation.data;

      // Look up user by email
      const [user] = await app.db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (!user) {
        // Don't reveal whether email exists
        throw new AuthError("Invalid email or password");
      }

      // Verify password
      if (!user.passwordHash) {
        throw new AuthError("Password not set for this account");
      }

      const isValidPassword = await verifyPassword(password, user.passwordHash);

      if (!isValidPassword) {
        throw new AuthError("Invalid email or password");
      }

      // Get org data
      const [org] = await app.db
        .select()
        .from(orgs)
        .where(eq(orgs.id, user.orgId));

      if (!org) {
        throw new InternalError("Organization not found");
      }

      // Create session token
      const token = signAuthToken({
        v: 1,
        sub: user.id,
        org: user.orgId,
        role: user.role as "owner" | "admin" | "member" | "viewer",
      });

      // Set HttpOnly cookie
      reply.setCookie("session_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      // Return user and org data (validated with Zod)
      const response = LoginResponseSchema.parse({
        user: {
          id: user.id,
          orgId: user.orgId,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        org: {
          id: org.id,
          name: org.name,
          industry: org.industry || undefined,
          createdAt: org.createdAt.toISOString(),
          updatedAt: org.updatedAt.toISOString(),
        },
        message: "Login successful",
      });

      return response;
    } catch (err) {
      // Re-throw ApiError instances (ValidationError, AuthError, etc.)
      if (err instanceof ValidationError || err instanceof AuthError || err instanceof InternalError) {
        throw err;
      }
      // Log and wrap unexpected errors
      req.log.error(err, "Login failed");
      throw new InternalError("Login failed");
    }
  });
}
