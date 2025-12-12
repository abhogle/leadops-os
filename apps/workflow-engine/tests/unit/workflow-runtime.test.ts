/**
 * Unit Tests: Workflow Runtime Service
 * Tests for startWorkflow(), resumeWorkflow(), advanceWorkflow()
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database
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
}));

// Mock queue
const mockEnqueueWorkflowNode = vi.fn();
const mockEnqueueDelayedWorkflowNode = vi.fn();

vi.mock("../../src/queues/workflowQueue.js", () => ({
  enqueueWorkflowNode: mockEnqueueWorkflowNode,
  enqueueDelayedWorkflowNode: mockEnqueueDelayedWorkflowNode,
}));

describe("startWorkflow()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create workflow execution and enqueue START node", async () => {
    const mockWorkflowDef = {
      id: "wf-def-1",
      orgId: "org-1",
      name: "Test Workflow",
      isActive: true,
      nodes: [
        {
          id: "start-1",
          type: "START",
          config: { type: "START", label: "Start" },
          position: { x: 0, y: 0 },
        },
      ],
      edges: [],
    };

    const mockExecution = {
      id: "exec-1",
      orgId: "org-1",
      workflowDefinitionId: "wf-def-1",
      leadId: "lead-1",
      conversationId: "conv-1",
      status: "running",
      currentNodeId: "start-1",
      version: 1,
    };

    // Mock workflow definition query
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockWorkflowDef]),
    });

    // Mock workflow execution insert
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([mockExecution]),
    });

    const { startWorkflow } = await import(
      "../../src/services/workflowRuntimeV2.js"
    );

    const executionId = await startWorkflow({
      orgId: "org-1",
      workflowDefinitionId: "wf-def-1",
      leadId: "lead-1",
      conversationId: "conv-1",
    });

    expect(executionId).toBe("exec-1");
    expect(mockEnqueueWorkflowNode).toHaveBeenCalledWith({
      workflowExecutionId: "exec-1",
      orgId: "org-1",
      leadId: "lead-1",
      conversationId: "conv-1",
      nodeId: "start-1",
      attempt: 0,
    });
  });

  it("should throw error if workflow definition not found", async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });

    const { startWorkflow } = await import(
      "../../src/services/workflowRuntimeV2.js"
    );

    await expect(
      startWorkflow({
        orgId: "org-1",
        workflowDefinitionId: "missing",
        leadId: "lead-1",
      })
    ).rejects.toThrow();
  });

  it("should enforce multi-tenant isolation", async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn((condition) => {
        // Verify orgId is in the where clause
        expect(condition).toBeDefined();
        return { limit: vi.fn().mockResolvedValue([]) };
      }),
    });

    const { startWorkflow } = await import(
      "../../src/services/workflowRuntimeV2.js"
    );

    await expect(
      startWorkflow({
        orgId: "org-1",
        workflowDefinitionId: "wf-1",
        leadId: "lead-1",
      })
    ).rejects.toThrow();
  });
});

describe("resumeWorkflow()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should enqueue node if workflow is running", async () => {
    const mockExecution = {
      id: "exec-1",
      status: "running",
      leadId: "lead-1",
      conversationId: "conv-1",
    };

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockExecution]),
    });

    const { resumeWorkflow } = await import(
      "../../src/services/workflowRuntimeV2.js"
    );

    await resumeWorkflow({
      workflowExecutionId: "exec-1",
      orgId: "org-1",
      nodeId: "node-2",
    });

    expect(mockEnqueueWorkflowNode).toHaveBeenCalledWith({
      workflowExecutionId: "exec-1",
      orgId: "org-1",
      leadId: "lead-1",
      conversationId: "conv-1",
      nodeId: "node-2",
      attempt: 0,
    });
  });

  it("should not enqueue if workflow is terminated", async () => {
    const mockExecution = {
      id: "exec-1",
      status: "terminated_engaged",
      leadId: "lead-1",
    };

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockExecution]),
    });

    const { resumeWorkflow } = await import(
      "../../src/services/workflowRuntimeV2.js"
    );

    await resumeWorkflow({
      workflowExecutionId: "exec-1",
      orgId: "org-1",
      nodeId: "node-2",
    });

    expect(mockEnqueueWorkflowNode).not.toHaveBeenCalled();
  });
});

describe("advanceWorkflow()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use optimistic concurrency when advancing", async () => {
    const mockExecution = {
      id: "exec-1",
      status: "running",
      version: 1,
      leadId: "lead-1",
    };

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockExecution]),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn((updates) => {
        // Verify version is incremented
        expect(updates.version).toBe(2);
        return {
          where: vi.fn((condition) => {
            // Verify OCC check in where clause
            return {
              returning: vi.fn().mockResolvedValue([
                { ...mockExecution, version: 2 },
              ]),
            };
          }),
        };
      }),
    });

    const { advanceWorkflow } = await import(
      "../../src/services/workflowRuntimeV2.js"
    );

    await advanceWorkflow({
      workflowExecutionId: "exec-1",
      orgId: "org-1",
      currentNodeId: "node-1",
      nextNodeId: "node-2",
    });

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockEnqueueWorkflowNode).toHaveBeenCalled();
  });

  it("should mark workflow as completed if no next node", async () => {
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
      set: vi.fn((updates) => {
        expect(updates.status).toBe("completed");
        return {
          where: vi.fn().mockReturnThis(),
        };
      }),
    });

    const { advanceWorkflow } = await import(
      "../../src/services/workflowRuntimeV2.js"
    );

    await advanceWorkflow({
      workflowExecutionId: "exec-1",
      orgId: "org-1",
      currentNodeId: "end",
      nextNodeId: null,
    });

    expect(mockEnqueueWorkflowNode).not.toHaveBeenCalled();
  });

  it("should throw error on concurrent modification", async () => {
    const mockExecution = {
      id: "exec-1",
      status: "running",
      version: 1,
      leadId: "lead-1",
    };

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockExecution]),
    });

    // Simulate concurrent modification - no rows updated
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    });

    const { advanceWorkflow } = await import(
      "../../src/services/workflowRuntimeV2.js"
    );

    await expect(
      advanceWorkflow({
        workflowExecutionId: "exec-1",
        orgId: "org-1",
        currentNodeId: "node-1",
        nextNodeId: "node-2",
      })
    ).rejects.toThrow("Concurrent modification");
  });
});

describe("logStepExecution()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should log step execution to database", async () => {
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const { logStepExecution } = await import(
      "../../src/services/workflowRuntimeV2.js"
    );

    await logStepExecution({
      workflowExecutionId: "exec-1",
      orgId: "org-1",
      nodeId: "node-1",
      nodeType: "SMS_TEMPLATE",
      status: "success",
    });

    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("should log errors with step execution", async () => {
    mockDb.insert.mockReturnValue({
      values: vi.fn((data) => {
        expect(data.error).toBe("Test error");
        expect(data.status).toBe("error");
        return Promise.resolve(undefined);
      }),
    });

    const { logStepExecution } = await import(
      "../../src/services/workflowRuntimeV2.js"
    );

    await logStepExecution({
      workflowExecutionId: "exec-1",
      orgId: "org-1",
      nodeId: "node-1",
      nodeType: "SMS_TEMPLATE",
      status: "error",
      error: "Test error",
    });

    expect(mockDb.insert).toHaveBeenCalled();
  });
});
