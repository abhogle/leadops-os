/**
 * Precondition Service Unit Tests
 * Milestone 17: AI SMS Engine v1
 * Per Doc #20 (QA & Automated Testing Strategy)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { evaluatePreconditions } from "../preconditionService.js";

// Mock database
vi.mock("@leadops/db", () => ({
  createDbClient: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  })),
  leads: {},
  conversations: {},
  orgs: {},
}));

vi.mock("../rateLimitService.js", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    currentCount: 5,
    limit: 10,
  }),
}));

describe("preconditionService", () => {
  describe("evaluatePreconditions", () => {
    const mockContext = {
      leadId: "lead-123",
      conversationId: "conv-456",
      orgId: "org-789",
    };

    it("should block when lead has opted out", async () => {
      const { createDbClient } = await import("@leadops/db");
      const mockDb = createDbClient as any;

      // Mock opted out lead
      mockDb().limit.mockResolvedValueOnce([
        { id: "lead-123", optedOut: true, dncFlag: false },
      ]);

      const result = await evaluatePreconditions(mockContext);

      expect(result.allowed).toBe(false);
      expect(result.blockType).toBe("opt_out");
      expect(result.reason).toContain("opted out");
    });

    it("should block when lead is on DNC list", async () => {
      const { createDbClient } = await import("@leadops/db");
      const mockDb = createDbClient as any;

      // Mock DNC lead
      mockDb().limit
        .mockResolvedValueOnce([
          { id: "lead-123", optedOut: false, dncFlag: true, dncReason: "Requested removal" },
        ]);

      const result = await evaluatePreconditions(mockContext);

      expect(result.allowed).toBe(false);
      expect(result.blockType).toBe("dnc");
      expect(result.reason).toContain("Do Not Call");
    });

    it("should block when conversation has human takeover", async () => {
      const { createDbClient } = await import("@leadops/db");
      const mockDb = createDbClient as any;

      // Mock valid lead but human takeover conversation
      mockDb().limit
        .mockResolvedValueOnce([
          { id: "lead-123", optedOut: false, dncFlag: false },
        ])
        .mockResolvedValueOnce([
          { id: "conv-456", humanTakeover: true },
        ]);

      const result = await evaluatePreconditions(mockContext);

      expect(result.allowed).toBe(false);
      expect(result.blockType).toBe("human_takeover");
    });

    it("should block when rate limit exceeded", async () => {
      const { createDbClient } = await import("@leadops/db");
      const { checkRateLimit } = await import("../rateLimitService.js");
      const mockDb = createDbClient as any;

      // Mock valid lead and conversation
      mockDb().limit
        .mockResolvedValueOnce([
          { id: "lead-123", optedOut: false, dncFlag: false },
        ])
        .mockResolvedValueOnce([
          { id: "conv-456", humanTakeover: false },
        ])
        .mockResolvedValueOnce([
          { id: "org-789", aiRateLimitPerHour: 10 },
        ]);

      // Mock rate limit exceeded
      (checkRateLimit as any).mockResolvedValueOnce({
        allowed: false,
        currentCount: 10,
        limit: 10,
      });

      const result = await evaluatePreconditions(mockContext);

      expect(result.allowed).toBe(false);
      expect(result.blockType).toBe("rate_limit");
      expect(result.reason).toContain("Rate limit exceeded");
    });

    it("should allow when all preconditions pass", async () => {
      const { createDbClient } = await import("@leadops/db");
      const { checkRateLimit } = await import("../rateLimitService.js");
      const mockDb = createDbClient as any;

      // Mock all valid
      mockDb().limit
        .mockResolvedValueOnce([
          { id: "lead-123", optedOut: false, dncFlag: false },
        ])
        .mockResolvedValueOnce([
          { id: "conv-456", humanTakeover: false },
        ])
        .mockResolvedValueOnce([
          { id: "org-789", aiRateLimitPerHour: 10 },
        ]);

      (checkRateLimit as any).mockResolvedValueOnce({
        allowed: true,
        currentCount: 5,
        limit: 10,
      });

      const result = await evaluatePreconditions(mockContext);

      expect(result.allowed).toBe(true);
      expect(result.blockType).toBeUndefined();
    });
  });
});
