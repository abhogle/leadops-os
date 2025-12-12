/**
 * Workflow Validation Service
 * Milestone 19: Workflow Editor V1
 *
 * Validates workflow definitions before activation.
 * Enforces DAG structure, node configuration, and edge rules.
 */

import type { WorkflowDefinition, WorkflowNode, WorkflowEdge } from "@leadops/types";

export interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate a complete workflow definition
 */
export function validateWorkflowDefinition(workflow: WorkflowDefinition): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. Structure validation
  validateStructure(workflow, errors);

  // 2. Node validation
  validateNodes(workflow, errors);

  // 3. Edge validation
  validateEdges(workflow, errors);

  // 4. Graph connectivity
  validateConnectivity(workflow, errors);

  // 5. Check for cycles (DAG only)
  validateAcyclic(workflow, errors);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate basic structure requirements
 */
function validateStructure(workflow: WorkflowDefinition, errors: ValidationError[]): void {
  const startNodes = workflow.nodes.filter((n) => n.type === "START");
  const endNodes = workflow.nodes.filter((n) => n.type === "END");

  if (startNodes.length === 0) {
    errors.push({
      code: "MISSING_START",
      message: "Workflow must have exactly one START node",
    });
  } else if (startNodes.length > 1) {
    errors.push({
      code: "MULTIPLE_START",
      message: "Workflow must have exactly one START node",
      nodeId: startNodes[1].id,
    });
  }

  if (endNodes.length === 0) {
    errors.push({
      code: "MISSING_END",
      message: "Workflow must have exactly one END node",
    });
  } else if (endNodes.length > 1) {
    errors.push({
      code: "MULTIPLE_END",
      message: "Workflow must have exactly one END node",
      nodeId: endNodes[1].id,
    });
  }

  // Check for duplicate node IDs
  const nodeIds = new Set<string>();
  for (const node of workflow.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push({
        code: "DUPLICATE_NODE_ID",
        message: `Duplicate node ID: ${node.id}`,
        nodeId: node.id,
      });
    }
    nodeIds.add(node.id);
  }

  // Check for duplicate edge IDs
  const edgeIds = new Set<string>();
  for (const edge of workflow.edges) {
    if (edgeIds.has(edge.id)) {
      errors.push({
        code: "DUPLICATE_EDGE_ID",
        message: `Duplicate edge ID: ${edge.id}`,
        edgeId: edge.id,
      });
    }
    edgeIds.add(edge.id);
  }
}

/**
 * Validate individual node configurations
 */
function validateNodes(workflow: WorkflowDefinition, errors: ValidationError[]): void {
  for (const node of workflow.nodes) {
    switch (node.type) {
      case "START":
        // START nodes don't need config validation
        break;

      case "END":
        // END nodes don't need config validation
        break;

      case "SMS_TEMPLATE":
        validateSmsTemplateNode(node, errors);
        break;

      case "SMS_AI":
        validateSmsAiNode(node, errors);
        break;

      case "DELAY":
        validateDelayNode(node, errors);
        break;

      case "CONDITION":
        validateConditionNode(node, errors);
        break;

      default:
        errors.push({
          code: "UNKNOWN_NODE_TYPE",
          message: `Unknown node type: ${(node as any).type}`,
          nodeId: node.id,
        });
    }
  }
}

/**
 * Validate SMS_TEMPLATE node
 */
function validateSmsTemplateNode(node: WorkflowNode, errors: ValidationError[]): void {
  const config = node.config as any;

  if (!config.template || config.template.trim() === "") {
    errors.push({
      code: "MISSING_TEMPLATE",
      message: "SMS_TEMPLATE node must have a template",
      nodeId: node.id,
    });
  }
}

/**
 * Validate SMS_AI node
 */
function validateSmsAiNode(node: WorkflowNode, errors: ValidationError[]): void {
  const config = node.config as any;

  // SMS_AI nodes are optional - they use default AI behavior
  // Just verify the config exists
  if (!config || config.type !== "SMS_AI") {
    errors.push({
      code: "INVALID_CONFIG",
      message: "SMS_AI node has invalid configuration",
      nodeId: node.id,
    });
  }
}

/**
 * Validate DELAY node
 */
function validateDelayNode(node: WorkflowNode, errors: ValidationError[]): void {
  const config = node.config as any;

  if (!config.duration || config.duration <= 0) {
    errors.push({
      code: "INVALID_DELAY_DURATION",
      message: "DELAY node must have duration > 0",
      nodeId: node.id,
    });
  }

  if (!config.unit || !["seconds", "minutes", "hours", "days"].includes(config.unit)) {
    errors.push({
      code: "INVALID_DELAY_UNIT",
      message: "DELAY node must have valid unit (seconds, minutes, hours, days)",
      nodeId: node.id,
    });
  }
}

/**
 * Validate CONDITION node
 */
function validateConditionNode(node: WorkflowNode, errors: ValidationError[]): void {
  const config = node.config as any;

  if (!config.field || config.field.trim() === "") {
    errors.push({
      code: "MISSING_CONDITION_FIELD",
      message: "CONDITION node must have a field",
      nodeId: node.id,
    });
  }

  const validOperators = ["equals", "not_equals", "contains", "not_contains", "exists", "not_exists"];
  if (!config.operator || !validOperators.includes(config.operator)) {
    errors.push({
      code: "INVALID_CONDITION_OPERATOR",
      message: `CONDITION node must have valid operator: ${validOperators.join(", ")}`,
      nodeId: node.id,
    });
  }

  // Value is required for most operators except exists/not_exists
  if (!["exists", "not_exists"].includes(config.operator)) {
    if (config.value === undefined || config.value === null || config.value === "") {
      errors.push({
        code: "MISSING_CONDITION_VALUE",
        message: "CONDITION node must have a value for this operator",
        nodeId: node.id,
      });
    }
  }
}

/**
 * Validate edges and their connections
 */
function validateEdges(workflow: WorkflowDefinition, errors: ValidationError[]): void {
  const nodeIds = new Set(workflow.nodes.map((n) => n.id));

  // Validate edge targets exist
  for (const edge of workflow.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push({
        code: "INVALID_EDGE_SOURCE",
        message: `Edge source node not found: ${edge.source}`,
        edgeId: edge.id,
      });
    }

    if (!nodeIds.has(edge.target)) {
      errors.push({
        code: "INVALID_EDGE_TARGET",
        message: `Edge target node not found: ${edge.target}`,
        edgeId: edge.id,
      });
    }
  }

  // Validate outgoing edge counts per node
  const outgoingEdges = new Map<string, WorkflowEdge[]>();
  for (const edge of workflow.edges) {
    if (!outgoingEdges.has(edge.source)) {
      outgoingEdges.set(edge.source, []);
    }
    outgoingEdges.get(edge.source)!.push(edge);
  }

  for (const node of workflow.nodes) {
    const edges = outgoingEdges.get(node.id) || [];

    switch (node.type) {
      case "START":
      case "SMS_TEMPLATE":
      case "SMS_AI":
      case "DELAY":
        // These nodes must have exactly 1 outgoing edge with no condition
        if (edges.length === 0) {
          errors.push({
            code: "MISSING_OUTGOING_EDGE",
            message: `${node.type} node must have exactly one outgoing edge`,
            nodeId: node.id,
          });
        } else if (edges.length > 1) {
          errors.push({
            code: "TOO_MANY_OUTGOING_EDGES",
            message: `${node.type} node must have exactly one outgoing edge`,
            nodeId: node.id,
          });
        } else if (edges[0].label) {
          errors.push({
            code: "UNEXPECTED_EDGE_CONDITION",
            message: `${node.type} node edge should not have a condition`,
            nodeId: node.id,
            edgeId: edges[0].id,
          });
        }
        break;

      case "CONDITION":
        // CONDITION nodes must have exactly 2 outgoing edges: one "true", one "false"
        if (edges.length !== 2) {
          errors.push({
            code: "INVALID_CONDITION_EDGES",
            message: "CONDITION node must have exactly 2 outgoing edges (true and false)",
            nodeId: node.id,
          });
        } else {
          const hasTrue = edges.some((e) => e.label === "true");
          const hasFalse = edges.some((e) => e.label === "false");

          if (!hasTrue) {
            errors.push({
              code: "MISSING_TRUE_BRANCH",
              message: "CONDITION node must have a 'true' branch",
              nodeId: node.id,
            });
          }

          if (!hasFalse) {
            errors.push({
              code: "MISSING_FALSE_BRANCH",
              message: "CONDITION node must have a 'false' branch",
              nodeId: node.id,
            });
          }
        }
        break;

      case "END":
        // END nodes must have 0 outgoing edges
        if (edges.length > 0) {
          errors.push({
            code: "END_NODE_HAS_OUTGOING",
            message: "END node cannot have outgoing edges",
            nodeId: node.id,
          });
        }
        break;
    }
  }
}

/**
 * Validate graph connectivity (START -> END path exists)
 */
function validateConnectivity(workflow: WorkflowDefinition, errors: ValidationError[]): void {
  const startNode = workflow.nodes.find((n) => n.type === "START");
  const endNode = workflow.nodes.find((n) => n.type === "END");

  if (!startNode || !endNode) {
    // Already reported in structure validation
    return;
  }

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  for (const edge of workflow.edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  }

  // BFS from START to END
  const visited = new Set<string>();
  const queue = [startNode.id];
  visited.add(startNode.id);

  let reachedEnd = false;

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === endNode.id) {
      reachedEnd = true;
      break;
    }

    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  if (!reachedEnd) {
    errors.push({
      code: "NO_PATH_TO_END",
      message: "No path exists from START to END",
    });
  }

  // Check for orphan nodes (not reachable from START)
  for (const node of workflow.nodes) {
    if (!visited.has(node.id)) {
      errors.push({
        code: "ORPHAN_NODE",
        message: `Node is not connected to the workflow: ${node.id}`,
        nodeId: node.id,
      });
    }
  }
}

/**
 * Validate workflow is acyclic (DAG)
 */
function validateAcyclic(workflow: WorkflowDefinition, errors: ValidationError[]): void {
  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  for (const edge of workflow.edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  }

  // DFS with recursion stack to detect cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Back edge found - cycle detected
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of workflow.nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) {
        errors.push({
          code: "CYCLE_DETECTED",
          message: "Workflow contains a cycle (circular dependency)",
        });
        break;
      }
    }
  }
}
