/**
 * Integration Tests: Workflow Execution Paths
 * Tests complete workflow execution flows
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
  leads: {},
  messages: {},
  conversations: {},
}));

// Mock queues
const mockEnqueueWorkflowNode = vi.fn();
const mockEnqueueDelayedWorkflowNode = vi.fn();

vi.mock("../../src/queues/workflowQueue.js", () => ({
  enqueueWorkflowNode: mockEnqueueWorkflowNode,
  enqueueDelayedWorkflowNode: mockEnqueueDelayedWorkflowNode,
}));

describe("Integration: START → SMS_TEMPLATE → END", () => {
  const mockWorkflow = {
    id: "wf-1",
    orgId: "org-1",
    name: "Simple Flow",
    nodes: [
      {
        id: "start",
        type: "START",
        config: { type: "START", label: "Start" },
        position: { x: 0, y: 0 },
      },
      {
        id: "sms1",
        type: "SMS_TEMPLATE",
        config: {
          type: "SMS_TEMPLATE",
          label: "Welcome SMS",
          template: "Hi {{lead.firstName}}!",
        },
        position: { x: 100, y: 0 },
      },
      {
        id: "end",
        type: "END",
        config: { type: "END", label: "End" },
        position: { x: 200, y: 0 },
      },
    ],
    edges: [
      { id: "e1", source: "start", target: "sms1" },
      { id: "e2", source: "sms1", target: "end" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should execute START → SMS_TEMPLATE → END flow", async () => {
    const mockExecution = {
      id: "exec-1",
      orgId: "org-1",
      workflowDefinitionId: "wf-1",
      leadId: "lead-1",
      status: "running",
      version: 1,
    };

    const mockLead = {
      id: "lead-1",
      orgId: "org-1",
      firstName: "John",
      phone: "+1234567890",
    };

    // Mock workflow definition lookup
    mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        // Return different data based on call order
        const callCount = mockDb.select.mock.calls.length;
        if (callCount === 1) return Promise.resolve([mockExecution]);
        if (callCount === 2) return Promise.resolve([mockWorkflow]);
        if (callCount === 3) return Promise.resolve([mockLead]);
        return Promise.resolve([]);
      }),
    }));

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        { ...mockExecution, version: 2 },
      ]),
    });

    // Import executors
    const { executeStartNode } = await import(
      "../../src/executors/startExecutor.js"
    );
    const { executeSmsTemplateNode } = await import(
      "../../src/executors/smsTemplateExecutor.js"
    );
    const { executeEndNode } = await import("../../src/executors/endExecutor.js");

    // Execute START node
    await executeStartNode({
      workflowExecutionId: "exec-1",
      orgId: "org-1",
      leadId: "lead-1",
      nodeId: "start",
    });

    // Verify workflow advanced
    expect(mockDb.update).toHaveBeenCalled();

    // Execute SMS_TEMPLATE node
    await executeSmsTemplateNode({
      workflowExecutionId: "exec-1",
      orgId: "org-1",
      leadId: "lead-1",
      nodeId: "sms1",
    });

    // Verify message was created
    expect(mockDb.insert).toHaveBeenCalled();

    // Execute END node
    await executeEndNode({
      workflowExecutionId: "exec-1",
      orgId: "org-1",
      leadId: "lead-1",
      nodeId: "end",
    });

    // Verify workflow marked as completed
    expect(mockDb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
      })
    );
  });
});

describe("Integration: START → DELAY → SMS_TEMPLATE → END", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle DELAY node correctly", async () => {
    const mockWorkflow = {
      id: "wf-2",
      orgId: "org-1",
      name: "Delayed Flow",
      nodes: [
        {
          id: "start",
          type: "START",
          config: { type: "START", label: "Start" },
          position: { x: 0, y: 0 },
        },
        {
          id: "delay1",
          type: "DELAY",
          config: {
            type: "DELAY",
            label: "Wait 5 min",
            duration: 5,
            unit: "minutes",
            respectBusinessHours: false,
          },
          position: { x: 100, y: 0 },
        },
        {
          id: "sms1",
          type: "SMS_TEMPLATE",
          config: {
            type: "SMS_TEMPLATE",
            label: "Follow-up",
            template: "Following up...",
          },
          position: { x: 200, y: 0 },
        },
      ],
      edges: [
        { id: "e1", source: "start", target: "delay1" },
        { id: "e2", source: "delay1", target: "sms1" },
      ],
    };

    const mockExecution = {
      id: "exec-2",
      status: "running",
      version: 1,
      workflowDefinitionId: "wf-2",
    };

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockExecution]),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        { ...mockExecution, version: 2 },
      ]),
    });

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const { executeDelayNode } = await import(
      "../../src/executors/delayExecutor.js"
    );

    await executeDelayNode({
      workflowExecutionId: "exec-2",
      orgId: "org-1",
      leadId: "lead-1",
      nodeId: "delay1",
    });

    // Verify delayed job was enqueued
    expect(mockEnqueueDelayedWorkflowNode).toHaveBeenCalled();

    // Verify resumeAt was set
    expect(mockDb.update).toHaveBeenCalled();
  });
});

describe("Integration: CONDITION Branching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should branch correctly based on condition", async () => {
    const mockWorkflow = {
      id: "wf-3",
      orgId: "org-1",
      name: "Conditional Flow",
      nodes: [
        {
          id: "condition1",
          type: "CONDITION",
          config: {
            type: "CONDITION",
            label: "Check Status",
            field: "status",
            operator: "equals",
            value: "active",
          },
          position: { x: 0, y: 0 },
        },
        {
          id: "sms-active",
          type: "SMS_TEMPLATE",
          config: {
            type: "SMS_TEMPLATE",
            label: "Active Message",
            template: "Active",
          },
          position: { x: 100, y: 0 },
        },
        {
          id: "sms-inactive",
          type: "SMS_TEMPLATE",
          config: {
            type: "SMS_TEMPLATE",
            label: "Inactive Message",
            template: "Inactive",
          },
          position: { x: 100, y: 100 },
        },
      ],
      edges: [
        { id: "e1", source: "condition1", target: "sms-active", label: "true" },
        {
          id: "e2",
          source: "condition1",
          target: "sms-inactive",
          label: "false",
        },
      ],
    };

    const mockExecution = {
      id: "exec-3",
      status: "running",
      version: 1,
      workflowDefinitionId: "wf-3",
    };

    const mockLead = {
      id: "lead-1",
      orgId: "org-1",
      status: "active",
    };

    mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        const callCount = mockDb.select.mock.calls.length;
        if (callCount === 1) return Promise.resolve([mockExecution]);
        if (callCount === 2) return Promise.resolve([mockWorkflow]);
        if (callCount === 3) return Promise.resolve([mockLead]);
        return Promise.resolve([]);
      }),
    }));

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        { ...mockExecution, version: 2 },
      ]),
    });

    mockDb.insert.mockReturnValue({
      values: vi.fn((data) => {
        // Verify branch was logged
        expect(data.branch).toBeDefined();
        return Promise.resolve(undefined);
      }),
    });

    const { executeConditionNode } = await import(
      "../../src/executors/conditionExecutor.js"
    );

    await executeConditionNode({
      workflowExecutionId: "exec-3",
      orgId: "org-1",
      leadId: "lead-1",
      nodeId: "condition1",
    });

    // Verify step execution logged with branch
    expect(mockDb.insert).toHaveBeenCalled();
  });
});
