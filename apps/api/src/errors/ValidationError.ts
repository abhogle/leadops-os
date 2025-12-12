import { ApiError } from "./ApiError.js";

/**
 * ValidationError (400)
 *
 * Thrown when request input validation fails.
 * Commonly used for:
 * - Invalid request body
 * - Missing required fields
 * - Zod schema validation failures
 */
export class ValidationError extends ApiError {
  constructor(message = "Invalid request", details?: unknown) {
    super(message, 400, details);
    this.name = "ValidationError";
  }
}
