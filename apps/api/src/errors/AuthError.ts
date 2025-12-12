import { ApiError } from "./ApiError.js";

/**
 * AuthError (401)
 *
 * Thrown when authentication is required but missing or invalid.
 * Commonly used for:
 * - Missing session token
 * - Expired token
 * - Invalid credentials
 */
export class AuthError extends ApiError {
  constructor(message = "Unauthorized") {
    super(message, 401);
    this.name = "AuthError";
  }
}
