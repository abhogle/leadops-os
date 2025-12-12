import { ApiError } from "./ApiError.js";

/**
 * InternalError (500)
 *
 * Thrown when an unexpected internal error occurs.
 * Commonly used for:
 * - Database failures
 * - Service unavailability
 * - Unexpected exceptions
 * - Critical system errors
 */
export class InternalError extends ApiError {
  constructor(message = "Internal server error", details?: unknown) {
    super(message, 500, details);
    this.name = "InternalError";
  }
}
