/**
 * Shared utility functions for LeadOps OS.
 * These are intentionally minimal at this stage.
 */

export function nowIso(): string {
  return new Date().toISOString();
}

export function generateId(prefix = ""): string {
  return prefix + crypto.randomUUID();
}
