/**
 * Workflow Editor Utilities
 * Milestone 19: Workflow Editor V1
 */

import type { Node as RFNode, Edge as RFEdge } from "@xyflow/react";
import type { WorkflowNode, WorkflowEdge } from "@leadops/types";

export function toReactFlowNodes(nodes: WorkflowNode[]): RFNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type.toLowerCase(),
    position: n.position,
    data: { ...n.config, type: n.type },
  }));
}

export function toWorkflowNodes(rfNodes: RFNode[]): WorkflowNode[] {
  return rfNodes.map((n) => ({
    id: n.id,
    type: n.data.type as any,
    config: n.data as any,
    position: n.position,
  }));
}

export function toReactFlowEdges(edges: WorkflowEdge[]): RFEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    type: "smoothstep",
  }));
}

export function toWorkflowEdges(rfEdges: RFEdge[]): WorkflowEdge[] {
  return rfEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label as string | undefined,
  }));
}

export function generateNodeId(): string {
  return crypto.randomUUID();
}

export function createNode(type: string, position: { x: number; y: number }): RFNode {
  const id = generateNodeId();
  const label = type.replace(/_/g, " ");

  return {
    id,
    type: type.toLowerCase(),
    position,
    data: {
      type,
      label,
    },
  };
}
