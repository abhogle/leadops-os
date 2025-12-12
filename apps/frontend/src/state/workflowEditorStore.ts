/**
 * Workflow Editor Store
 * Milestone 19: Workflow Editor V1
 *
 * Zustand store for managing workflow editor state
 */

import { create } from "zustand";
import type { Node as RFNode, Edge as RFEdge } from "@xyflow/react";
import type { WorkflowNode, WorkflowEdge } from "@leadops/types";

export interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface WorkflowEditorState {
  // Workflow metadata
  workflowId: string | null;
  name: string;
  description: string;
  industry: string;
  isActive: boolean;
  version: number;

  // Graph state
  nodes: RFNode[];
  edges: RFEdge[];

  // Selection
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Validation
  validationErrors: ValidationError[];
  isValid: boolean;

  // State flags
  isDirty: boolean;
  isSaving: boolean;
  isValidating: boolean;

  // Actions
  setWorkflowId: (id: string | null) => void;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setIndustry: (industry: string) => void;
  setIsActive: (isActive: boolean) => void;
  setVersion: (version: number) => void;

  setNodes: (nodes: RFNode[]) => void;
  setEdges: (edges: RFEdge[]) => void;

  addNode: (node: RFNode) => void;
  updateNode: (id: string, data: Partial<RFNode["data"]>) => void;
  deleteNode: (id: string) => void;

  addEdge: (edge: RFEdge) => void;
  deleteEdge: (id: string) => void;

  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;

  setValidationErrors: (errors: ValidationError[]) => void;
  clearValidationErrors: () => void;

  setIsDirty: (isDirty: boolean) => void;
  setIsSaving: (isSaving: boolean) => void;
  setIsValidating: (isValidating: boolean) => void;

  // Load workflow from API
  loadWorkflow: (workflow: any) => void;

  // Reset to initial state
  reset: () => void;

  // Get WorkflowDefinition-compatible format
  getWorkflowDefinition: () => {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
}

const initialState = {
  workflowId: null,
  name: "",
  description: "",
  industry: "",
  isActive: false,
  version: 1,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  validationErrors: [],
  isValid: true,
  isDirty: false,
  isSaving: false,
  isValidating: false,
};

export const useWorkflowEditorStore = create<WorkflowEditorState>((set, get) => ({
  ...initialState,

  setWorkflowId: (id) => set({ workflowId: id }),
  setName: (name) => set({ name, isDirty: true }),
  setDescription: (description) => set({ description, isDirty: true }),
  setIndustry: (industry) => set({ industry, isDirty: true }),
  setIsActive: (isActive) => set({ isActive }),
  setVersion: (version) => set({ version }),

  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),

  addNode: (node) => {
    set((state) => ({
      nodes: [...state.nodes, node],
      isDirty: true,
    }));
  },

  updateNode: (id, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      ),
      isDirty: true,
    }));
  },

  deleteNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      isDirty: true,
    }));
  },

  addEdge: (edge) => {
    set((state) => ({
      edges: [...state.edges, edge],
      isDirty: true,
    }));
  },

  deleteEdge: (id) => {
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
      selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
      isDirty: true,
    }));
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  setValidationErrors: (errors) =>
    set({ validationErrors: errors, isValid: errors.length === 0 }),
  clearValidationErrors: () => set({ validationErrors: [], isValid: true }),

  setIsDirty: (isDirty) => set({ isDirty }),
  setIsSaving: (isSaving) => set({ isSaving }),
  setIsValidating: (isValidating) => set({ isValidating }),

  loadWorkflow: (workflow) => {
    // Convert DB format to ReactFlow format
    const rfNodes: RFNode[] = (workflow.nodes || []).map((node: WorkflowNode) => ({
      id: node.id,
      type: node.type.toLowerCase(),
      position: node.position,
      data: {
        ...node.config,
        type: node.type,
      },
    }));

    const rfEdges: RFEdge[] = (workflow.edges || []).map((edge: WorkflowEdge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: "smoothstep",
    }));

    set({
      workflowId: workflow.id,
      name: workflow.name,
      description: workflow.description || "",
      industry: workflow.industry,
      isActive: workflow.isActive,
      version: workflow.version,
      nodes: rfNodes,
      edges: rfEdges,
      isDirty: false,
      validationErrors: [],
      isValid: true,
    });
  },

  reset: () => set(initialState),

  getWorkflowDefinition: () => {
    const state = get();

    const nodes: WorkflowNode[] = state.nodes.map((rfNode) => ({
      id: rfNode.id,
      type: rfNode.data.type as any,
      config: rfNode.data as any,
      position: rfNode.position,
    }));

    const edges: WorkflowEdge[] = state.edges.map((rfEdge) => ({
      id: rfEdge.id,
      source: rfEdge.source,
      target: rfEdge.target,
      label: rfEdge.label as string | undefined,
    }));

    return { nodes, edges };
  },
}));
