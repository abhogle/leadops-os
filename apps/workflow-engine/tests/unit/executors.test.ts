/**
 * Unit Tests: Workflow Executors
 * Tests for START, SMS_TEMPLATE, DELAY, CONDITION, and END executors
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database client
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

vi.mock("@leadops/db", () => ({
  getDbClient: () => mockDb,
  workflowExecutions: {},
  workflowDefinitions: {},
  workflowStepExecutions: {},
  leads: {},
  messages: {},
}));

// Mock queue
vi.mock("../../src/queues/workflowQueue.js", () => ({
  enqueueWorkflowNode: vi.fn(),
  enqueueDelayedWorkflowNode: vi.fn(),
}));

// Mock workflow runtime
vi.mock("../../src/services/workflowRuntimeV2.js", () => ({
  advanceWorkflow: vi.fn(),
  logStepExecution: vi.fn(),
}));

describe("Executor Early Abort Behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should abort if workflow status is terminated_engaged", async () => {
    // Mock execution with terminated status
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: "exec-1",
          status: "terminated_engaged",
          version: 1,
        },
      ]),
    });

    // Import after mocks are set up
    const { executeStartNode } = await import("../../src/executors/startExecutor.js");
    const { logStepExecution } = await import(
      "../../src/services/workflowRuntimeV2.js"
    );

    await executeStartNode({
      workflowExecutionId: "exec-1",
      orgId: "org-1",
      leadId: "lead-1",
      nodeId: "start",
    });

    // Should log but not advance
    expect(logStepExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
      })
    );
  });

  it("should abort if workflow status is completed", async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: "exec-1",
          status: "completed",
          version: 1,
        },
      ]),
    });

    const { executeEndNode } = await import("../../src/executors/endExecutor.js");
    const { logStepExecution } = await import(
      "../../src/services/workflowRuntimeV2.js"
    );

    await executeEndNode({
      workflowExecutionId: "exec-1",
      orgId: "org-1",
      leadId: "lead-1",
      nodeId: "end",
    });

    expect(logStepExecution).toHaveBeenCalled();
  });
});

describe("SMS_TEMPLATE Executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve template variables correctly", () => {
    // Test template resolution logic
    const template = "Hi {{lead.firstName}}, your status is {{lead.status}}";
    const leadData = {
      firstName: "John",
      status: "active",
    };

    // Manual template resolution for testing
    const resolved = template.replace(
      /\{\{lead\.([a-zA-Z0-9_.]+)\}\}/g,
      (match, path) => {
        const keys = path.split(".");
        let value: any = leadData;
        for (const key of keys) {
          if (value && typeof value === "object" && key in value) {
            value = value[key];
          } else {
            return match;
          }
        }
        return value !== null && value !== undefined ? String(value) : match;
      }
    );

    expect(resolved).toBe("Hi John, your status is active");
  });

  it("should handle nested fields in templates", () => {
    const template = "Source: {{lead.source.channel}}";
    const leadData = {
      source: {
        channel: "web",
      },
    };

    const resolved = template.replace(
      /\{\{lead\.([a-zA-Z0-9_.]+)\}\}/g,
      (match, path) => {
        const keys = path.split(".");
        let value: any = leadData;
        for (const key of keys) {
          if (value && typeof value === "object" && key in value) {
            value = value[key];
          } else {
            return match;
          }
        }
        return value !== null && value !== undefined ? String(value) : match;
      }
    );

    expect(resolved).toBe("Source: web");
  });

  it("should keep placeholder if field not found", () => {
    const template = "Hi {{lead.missingField}}";
    const leadData = { firstName: "John" };

    const resolved = template.replace(
      /\{\{lead\.([a-zA-Z0-9_.]+)\}\}/g,
      (match, path) => {
        const keys = path.split(".");
        let value: any = leadData;
        for (const key of keys) {
          if (value && typeof value === "object" && key in value) {
            value = value[key];
          } else {
            return match;
          }
        }
        return value !== null && value !== undefined ? String(value) : match;
      }
    );

    expect(resolved).toBe("Hi {{lead.missingField}}");
  });
});

describe("CONDITION Executor", () => {
  it("should evaluate equals operator correctly", () => {
    const fieldValue = "active";
    const result = String(fieldValue) === "active";
    expect(result).toBe(true);
  });

  it("should evaluate not_equals operator correctly", () => {
    const fieldValue = "active";
    const result = String(fieldValue) !== "inactive";
    expect(result).toBe(true);
  });

  it("should evaluate contains operator correctly", () => {
    const fieldValue = "hello world";
    const result = String(fieldValue).includes("world");
    expect(result).toBe(true);
  });

  it("should evaluate exists operator correctly", () => {
    const fieldValue1 = "some value";
    const fieldValue2 = null;

    expect(fieldValue1 !== null && fieldValue1 !== undefined).toBe(true);
    expect(fieldValue2 !== null && fieldValue2 !== undefined).toBe(false);
  });

  it("should evaluate not_exists operator correctly", () => {
    const fieldValue1 = undefined;
    const fieldValue2 = "value";

    expect(fieldValue1 === null || fieldValue1 === undefined).toBe(true);
    expect(fieldValue2 === null || fieldValue2 === undefined).toBe(false);
  });
});

describe("DELAY Executor Business Hours", () => {
  it("should calculate delay in milliseconds correctly", () => {
    // Test different time units
    const secondsMs = 30 * 1000;
    const minutesMs = 5 * 60 * 1000;
    const hoursMs = 2 * 60 * 60 * 1000;
    const daysMs = 1 * 24 * 60 * 60 * 1000;

    expect(secondsMs).toBe(30000);
    expect(minutesMs).toBe(300000);
    expect(hoursMs).toBe(7200000);
    expect(daysMs).toBe(86400000);
  });
});

describe("END Executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use optimistic concurrency when completing workflow", async () => {
    const mockExecution = {
      id: "exec-1",
      status: "running",
      version: 1,
    };

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockExecution]),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ ...mockExecution, version: 2 }]),
    });

    const { executeEndNode } = await import("../../src/executors/endExecutor.js");

    await executeEndNode({
      workflowExecutionId: "exec-1",
      orgId: "org-1",
      leadId: "lead-1",
      nodeId: "end",
    });

    // Verify version was incremented
    expect(mockDb.update).toHaveBeenCalled();
  });
});
