import { ApiError } from "./ApiError.js";

/**
 * NotFoundError (404)
 *
 * Thrown when a requested resource does not exist.
 * Commonly used for:
 * - Resource not found by ID
 * - Invalid route
 * - Missing entity
 */
export class NotFoundError extends ApiError {
  constructor(message = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}
