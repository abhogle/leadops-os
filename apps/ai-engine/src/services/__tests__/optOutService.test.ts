/**
 * Opt-Out Service Unit Tests
 * Milestone 17: AI SMS Engine v1
 * Per Doc #20 (QA & Automated Testing Strategy)
 */

import { describe, it, expect } from "vitest";
import { detectOptOutKeyword } from "../optOutService.js";

describe("optOutService", () => {
  describe("detectOptOutKeyword", () => {
    it("should detect STOP keyword (case-insensitive)", () => {
      expect(detectOptOutKeyword("STOP").isOptOut).toBe(true);
      expect(detectOptOutKeyword("stop").isOptOut).toBe(true);
      expect(detectOptOutKeyword("Stop").isOptOut).toBe(true);
    });

    it("should detect CANCEL keyword", () => {
      expect(detectOptOutKeyword("CANCEL").isOptOut).toBe(true);
      expect(detectOptOutKeyword("cancel").isOptOut).toBe(true);
    });

    it("should detect END keyword", () => {
      expect(detectOptOutKeyword("END").isOptOut).toBe(true);
      expect(detectOptOutKeyword("end").isOptOut).toBe(true);
    });

    it("should detect QUIT keyword", () => {
      expect(detectOptOutKeyword("QUIT").isOptOut).toBe(true);
    });

    it("should detect UNSUBSCRIBE keyword", () => {
      expect(detectOptOutKeyword("UNSUBSCRIBE").isOptOut).toBe(true);
    });

    it("should NOT detect opt-out in normal messages", () => {
      expect(detectOptOutKeyword("Hello there").isOptOut).toBe(false);
      expect(detectOptOutKeyword("I want to stop by later").isOptOut).toBe(false);
      expect(detectOptOutKeyword("Please cancel my appointment").isOptOut).toBe(false);
    });

    it("should require exact match (no partial matches)", () => {
      expect(detectOptOutKeyword("STOPPED").isOptOut).toBe(false);
      expect(detectOptOutKeyword("STOPPING").isOptOut).toBe(false);
      expect(detectOptOutKeyword("Please stop").isOptOut).toBe(false);
    });

    it("should handle whitespace", () => {
      expect(detectOptOutKeyword("  STOP  ").isOptOut).toBe(true);
      expect(detectOptOutKeyword("\\nSTOP\\n").isOptOut).toBe(true);
    });
  });
});
