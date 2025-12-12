import { ApiError } from "./ApiError.js";

/**
 * ForbiddenError (403)
 *
 * Thrown when user is authenticated but lacks required permissions.
 * Commonly used for:
 * - RBAC violations (insufficient role)
 * - Tenant isolation violations
 * - Resource ownership checks
 */
export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}
