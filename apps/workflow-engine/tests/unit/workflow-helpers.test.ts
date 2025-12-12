/**
 * Unit Tests: Workflow Helper Functions
 * Tests for getNextNodeId() and calculateResumeTime()
 */

import { describe, it, expect } from "vitest";
import { getNextNodeId, calculateResumeTime } from "@leadops/types";
import type { WorkflowDefinition, DelayNodeConfig } from "@leadops/types";

describe("getNextNodeId()", () => {
  const mockWorkflow: WorkflowDefinition = {
    id: "wf-1",
    orgId: "org-1",
    name: "Test Workflow",
    industry: "test",
    isActive: true,
    version: 1,
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
        config: { type: "SMS_TEMPLATE", label: "SMS 1", template: "Hi" },
        position: { x: 100, y: 0 },
      },
      {
        id: "condition",
        type: "CONDITION",
        config: {
          type: "CONDITION",
          label: "Check",
          field: "status",
          operator: "equals",
          value: "active",
        },
        position: { x: 200, y: 0 },
      },
      {
        id: "end",
        type: "END",
        config: { type: "END", label: "End" },
        position: { x: 300, y: 0 },
      },
    ],
    edges: [
      { id: "e1", source: "start", target: "sms1" },
      { id: "e2", source: "sms1", target: "condition" },
      { id: "e3", source: "condition", target: "sms1", label: "true" },
      { id: "e4", source: "condition", target: "end", label: "false" },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should return next node for single path", () => {
    const nextId = getNextNodeId(mockWorkflow, "start");
    expect(nextId).toBe("sms1");
  });

  it("should return null for END node", () => {
    const nextId = getNextNodeId(mockWorkflow, "end");
    expect(nextId).toBeNull();
  });

  it("should return correct node for true branch", () => {
    const nextId = getNextNodeId(mockWorkflow, "condition", "true");
    expect(nextId).toBe("sms1");
  });

  it("should return correct node for false branch", () => {
    const nextId = getNextNodeId(mockWorkflow, "condition", "false");
    expect(nextId).toBe("end");
  });

  it("should return null for missing branch", () => {
    const nextId = getNextNodeId(mockWorkflow, "condition", "invalid" as any);
    expect(nextId).toBeNull();
  });
});

describe("calculateResumeTime()", () => {
  it("should calculate simple delay without business hours", () => {
    const config: DelayNodeConfig = {
      type: "DELAY",
      label: "Wait",
      duration: 5,
      unit: "minutes",
      respectBusinessHours: false,
    };

    const now = new Date("2024-01-15T10:00:00Z");
    const resumeTime = calculateResumeTime(config, now);

    expect(resumeTime.getTime()).toBe(now.getTime() + 5 * 60 * 1000);
  });

  it("should respect business hours when enabled", () => {
    const config: DelayNodeConfig = {
      type: "DELAY",
      label: "Wait",
      duration: 1,
      unit: "hours",
      respectBusinessHours: true,
      businessHours: {
        start: "09:00",
        end: "17:00",
        timezone: "America/New_York",
        daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
      },
    };

    // Test: 8:00 AM should move to 9:00 AM (start of business hours)
    const beforeHours = new Date("2024-01-15T08:00:00Z");
    const resumeTime1 = calculateResumeTime(config, beforeHours);
    expect(resumeTime1.getHours()).toBeGreaterThanOrEqual(9);
    expect(resumeTime1.getHours()).toBeLessThan(17);
  });

  it("should move to next business day for weekend", () => {
    const config: DelayNodeConfig = {
      type: "DELAY",
      label: "Wait",
      duration: 1,
      unit: "hours",
      respectBusinessHours: true,
      businessHours: {
        start: "09:00",
        end: "17:00",
        timezone: "America/New_York",
        daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
      },
    };

    // Sunday (day 0) should move to Monday (day 1)
    const sunday = new Date("2024-01-14T10:00:00Z"); // Sunday
    const resumeTime = calculateResumeTime(config, sunday);
    const dayOfWeek = resumeTime.getDay();

    // Should be a weekday
    expect([1, 2, 3, 4, 5]).toContain(dayOfWeek);
  });

  it("should convert different time units correctly", () => {
    const now = new Date("2024-01-15T10:00:00Z");

    const secondsConfig: DelayNodeConfig = {
      type: "DELAY",
      label: "Wait",
      duration: 30,
      unit: "seconds",
      respectBusinessHours: false,
    };
    expect(calculateResumeTime(secondsConfig, now).getTime()).toBe(
      now.getTime() + 30 * 1000
    );

    const hoursConfig: DelayNodeConfig = {
      type: "DELAY",
      label: "Wait",
      duration: 2,
      unit: "hours",
      respectBusinessHours: false,
    };
    expect(calculateResumeTime(hoursConfig, now).getTime()).toBe(
      now.getTime() + 2 * 60 * 60 * 1000
    );

    const daysConfig: DelayNodeConfig = {
      type: "DELAY",
      label: "Wait",
      duration: 1,
      unit: "days",
      respectBusinessHours: false,
    };
    expect(calculateResumeTime(daysConfig, now).getTime()).toBe(
      now.getTime() + 24 * 60 * 60 * 1000
    );
  });
});
