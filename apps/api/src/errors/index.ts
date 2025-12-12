/**
 * Error Classes for LeadOps API
 *
 * Provides consistent error handling across all API routes.
 * All errors extend the base ApiError class.
 */

export { ApiError } from "./ApiError.js";
export { ValidationError } from "./ValidationError.js";
export { AuthError } from "./AuthError.js";
export { ForbiddenError } from "./ForbiddenError.js";
export { NotFoundError } from "./NotFoundError.js";
export { InternalError } from "./InternalError.js";
