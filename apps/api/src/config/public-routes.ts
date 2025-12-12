/**
 * Public Routes Registry
 *
 * Centralized list of routes that don't require authentication.
 * Used by:
 * - Authentication middleware (skip auth check)
 * - CSRF middleware (skip CSRF for login/public endpoints)
 * - Logging/monitoring (differentiate public vs protected traffic)
 */

export const PUBLIC_ROUTES = new Set([
  "/health",
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/onboarding/create-org",
  "/onboarding/available-industries",
  "/api/v1/ingest/lead", // Public webhook endpoint for lead ingestion
  "/api/v1/webhooks/twilio/inbound", // Public webhook endpoint for Twilio
]);

/**
 * Check if a URL is a public route
 * @param url - Full URL path (may include query params)
 * @returns true if route is public
 */
export function isPublicRoute(url: string): boolean {
  // Strip query params and hash
  const path = url.split("?")[0].split("#")[0];
  return PUBLIC_ROUTES.has(path);
}

/**
 * Rate limiting should be stricter on public routes to prevent abuse
 */
export const RATE_LIMIT_CONFIG = {
  public: {
    max: 100,
    timeWindow: "15 minutes" as const,
  },
  authenticated: {
    max: 500,
    timeWindow: "15 minutes" as const,
  },
  sensitive: {
    max: 10,
    timeWindow: "1 minute" as const,
  },
  internal: {
    max: 1000,
    timeWindow: "15 minutes" as const,
  },
};

/**
 * Routes that require stricter rate limiting
 * These are high-value or resource-intensive operations
 */
export const SENSITIVE_ROUTES = new Set([
  "/auth/login",
  "/onboarding/finish",
  "/config/update",
  "/onboarding/confirm-config",
]);

/**
 * Check if a URL requires sensitive rate limiting
 */
export function isSensitiveRoute(url: string): boolean {
  const path = url.split("?")[0].split("#")[0];
  return SENSITIVE_ROUTES.has(path);
}
