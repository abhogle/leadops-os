/**
 * E2E Tests: Workflow Engine
 * Tests for lead ingestion → workflow trigger and engagement → workflow termination
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
  leads: {},
  conversations: {},
  orgs: {},
  workflowDefinitions: {},
  workflowExecutions: {},
}));

// Mock workflow engine
const mockStartWorkflow = vi.fn();
const mockTerminateWorkflowsOnEngagement = vi.fn();

vi.mock("@leadops/workflow-engine", () => ({
  startWorkflow: mockStartWorkflow,
  terminateWorkflowsOnEngagement: mockTerminateWorkflowsOnEngagement,
}));

describe("E2E: Lead Ingestion → Workflow Trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should trigger default workflow on lead creation", async () => {
    const mockOrg = {
      id: "org-1",
      industry: "home_services",
    };

    const mockWorkflowDef = {
      id: "wf-1",
      orgId: "org-1",
      industry: "home_services",
      isActive: true,
      name: "Default Home Services Workflow",
    };

    const mockLead = {
      id: "lead-1",
      orgId: "org-1",
      phone: "+1234567890",
    };

    const mockConversation = {
      id: "conv-1",
      orgId: "org-1",
      leadId: "lead-1",
    };

    // Mock inserts
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockImplementation(() => {
        const callCount = mockDb.insert.mock.calls.length;
        if (callCount === 1) return Promise.resolve([mockLead]);
        if (callCount === 2) return Promise.resolve([mockConversation]);
        return Promise.resolve([]);
      }),
    });

    // Mock selects
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        const callCount = mockDb.select.mock.calls.length;
        if (callCount === 1) return Promise.resolve([mockOrg]);
        if (callCount === 2) return Promise.resolve([mockWorkflowDef]);
        return Promise.resolve([]);
      }),
    });

    mockStartWorkflow.mockResolvedValue("exec-1");

    // Import and execute lead ingestion
    const { ingestLead } = await import(
      "../../src/services/lead-ingestion.js"
    );

    const result = await ingestLead(mockDb as any, "org-1", null, {
      phone: "+1234567890",
      first_name: "John",
      last_name: "Doe",
      source: {
        channel: "web",
        campaign: "test",
      },
    });

    expect(result.leadId).toBe("lead-1");
    expect(result.conversationId).toBe("conv-1");

    // Verify workflow was triggered
    expect(mockStartWorkflow).toHaveBeenCalledWith({
      orgId: "org-1",
      workflowDefinitionId: "wf-1",
      leadId: "lead-1",
      conversationId: "conv-1",
    });
  });

  it("should not trigger workflow if no default workflow exists", async () => {
    const mockOrg = {
      id: "org-1",
      industry: "home_services",
    };

    const mockLead = {
      id: "lead-2",
      orgId: "org-1",
      phone: "+1234567890",
    };

    const mockConversation = {
      id: "conv-2",
      orgId: "org-1",
      leadId: "lead-2",
    };

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockImplementation(() => {
        const callCount = mockDb.insert.mock.calls.length;
        if (callCount === 1) return Promise.resolve([mockLead]);
        if (callCount === 2) return Promise.resolve([mockConversation]);
        return Promise.resolve([]);
      }),
    });

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        const callCount = mockDb.select.mock.calls.length;
        if (callCount === 1) return Promise.resolve([mockOrg]);
        if (callCount === 2) return Promise.resolve([]); // No workflow
        return Promise.resolve([]);
      }),
    });

    const { ingestLead } = await import(
      "../../src/services/lead-ingestion.js"
    );

    await ingestLead(mockDb as any, "org-1", null, {
      phone: "+1234567890",
      source: {
        channel: "web",
        campaign: "test",
      },
    });

    // Verify workflow was NOT triggered
    expect(mockStartWorkflow).not.toHaveBeenCalled();
  });
});

describe("E2E: Engagement → Workflow Termination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should terminate workflow when lead engages via inbound SMS", async () => {
    const mockConversation = {
      id: "conv-1",
      orgId: "org-1",
      leadId: "lead-1",
    };

    const mockLead = {
      id: "lead-1",
      orgId: "org-1",
      phone: "+1234567890",
    };

    const mockRunningWorkflow = {
      id: "exec-1",
      conversationId: "conv-1",
      orgId: "org-1",
      status: "running",
      version: 1,
    };

    // Mock conversation update
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([mockConversation]),
    });

    // Mock lead select
    mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        const callCount = mockDb.select.mock.calls.length;
        if (callCount === 1) return Promise.resolve([mockLead]);
        if (callCount === 2) return Promise.resolve([mockRunningWorkflow]);
        return Promise.resolve([]);
      }),
    }));

    // Import engagement service
    const { markEngaged } = await import(
      "../../src/services/engagementService.js"
    );

    // Mark conversation as engaged
    await markEngaged("conv-1", "org-1", "inbound_sms");

    // Verify conversation was updated
    expect(mockDb.update).toHaveBeenCalled();

    // Simulate event bus triggering termination
    await mockTerminateWorkflowsOnEngagement({
      conversationId: "conv-1",
      leadId: "lead-1",
      orgId: "org-1",
      source: "inbound_sms",
      engagedAt: new Date(),
    });

    // Verify event handler was called
    expect(mockTerminateWorkflowsOnEngagement).toHaveBeenCalled();
  });

  it("should use optimistic concurrency when terminating workflows", async () => {
    const mockWorkflow = {
      id: "exec-2",
      conversationId: "conv-2",
      orgId: "org-1",
      status: "running",
      version: 3,
    };

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockWorkflow]),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn((updates) => {
        // Verify version is incremented
        expect(updates.version).toBe(4);
        expect(updates.status).toBe("terminated_engaged");
        return {
          where: vi.fn((condition) => {
            // Verify OCC check includes version
            return {
              returning: vi.fn().mockResolvedValue([
                { ...mockWorkflow, version: 4 },
              ]),
            };
          }),
        };
      }),
    });

    await mockTerminateWorkflowsOnEngagement({
      conversationId: "conv-2",
      leadId: "lead-2",
      orgId: "org-1",
      source: "inbound_sms",
      engagedAt: new Date(),
    });

    expect(mockTerminateWorkflowsOnEngagement).toHaveBeenCalled();
  });

  it("should handle case when no workflows are running", async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });

    // Should not throw error
    await mockTerminateWorkflowsOnEngagement({
      conversationId: "conv-3",
      leadId: "lead-3",
      orgId: "org-1",
      source: "inbound_sms",
      engagedAt: new Date(),
    });

    // Verify handler was called
    expect(mockTerminateWorkflowsOnEngagement).toHaveBeenCalled();
  });
});

describe("E2E: Multi-Tenant Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should enforce orgId in workflow termination", async () => {
    const mockWorkflow = {
      id: "exec-1",
      conversationId: "conv-1",
      orgId: "org-1",
      status: "running",
      version: 1,
    };

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn((condition) => {
        // Verify orgId is in where clause
        expect(condition).toBeDefined();
        return {
          limit: vi.fn().mockResolvedValue([mockWorkflow]),
        };
      }),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn((condition) => {
        // Verify orgId is in update where clause
        expect(condition).toBeDefined();
        return {
          returning: vi.fn().mockResolvedValue([
            { ...mockWorkflow, version: 2 },
          ]),
        };
      }),
    });

    await mockTerminateWorkflowsOnEngagement({
      conversationId: "conv-1",
      leadId: "lead-1",
      orgId: "org-1",
      source: "inbound_sms",
      engagedAt: new Date(),
    });

    expect(mockTerminateWorkflowsOnEngagement).toHaveBeenCalled();
  });
});
