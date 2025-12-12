/**
 * Workflow Definition Routes
 * Milestone 19: Workflow Editor V1
 *
 * CRUD operations for workflow definitions.
 * Admin-only, multi-tenant enforced.
 */

import type { FastifyInstance } from "fastify";
import { workflowDefinitions } from "@leadops/db";
import { eq, and, desc } from "drizzle-orm";
import type { WorkflowDefinition } from "@leadops/types";
import { InternalError } from "../errors/index.js";
import { validateWorkflowDefinition } from "../services/workflowValidationService.js";

/**
 * GET /api/v1/workflows
 * List all workflow definitions for the org
 */
export async function registerWorkflowRoutes(app: FastifyInstance) {
  // List all workflows
  app.get("/workflows", async (req) => {
    const context = req.tenantContext;
    if (!context?.org) {
      throw new InternalError("Organization context missing");
    }

    const db = app.db;
    const workflows = await db
      .select()
      .from(workflowDefinitions)
      .where(eq(workflowDefinitions.orgId, context.org.id))
      .orderBy(desc(workflowDefinitions.updatedAt));

    return { workflows };
  });

  // Get single workflow
  app.get<{ Params: { id: string } }>("/workflows/:id", async (req, reply) => {
    const context = req.tenantContext;
    if (!context?.org) {
      throw new InternalError("Organization context missing");
    }

    const db = app.db;
    const [workflow] = await db
      .select()
      .from(workflowDefinitions)
      .where(
        and(
          eq(workflowDefinitions.id, req.params.id),
          eq(workflowDefinitions.orgId, context.org.id)
        )
      )
      .limit(1);

    if (!workflow) {
      return reply.status(404).send({ error: "Workflow not found" });
    }

    return { workflow };
  });

  // Create new workflow
  app.post<{
    Body: {
      name: string;
      description?: string;
      industry: string;
      nodes: any[];
      edges: any[];
    };
  }>("/workflows", async (req, reply) => {
    const context = req.tenantContext;
    if (!context?.org) {
      throw new InternalError("Organization context missing");
    }

    const { name, description, industry, nodes, edges } = req.body;

    // Validate required fields
    if (!name || !industry) {
      return reply.status(400).send({ error: "Name and industry are required" });
    }

    const db = app.db;
    const [created] = await db
      .insert(workflowDefinitions)
      .values({
        orgId: context.org.id,
        name,
        description: description || null,
        industry,
        isActive: false, // New workflows start inactive
        version: 1,
        nodes: nodes || [],
        edges: edges || [],
      })
      .returning();

    // Emit event
    // TODO: Add event bus emission when integrated

    return reply.status(201).send({ workflow: created });
  });

  // Update existing workflow
  app.put<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string;
      industry?: string;
      nodes?: any[];
      edges?: any[];
    };
  }>("/workflows/:id", async (req, reply) => {
    const context = req.tenantContext;
    if (!context?.org) {
      throw new InternalError("Organization context missing");
    }

    const db = app.db;

    // Verify ownership
    const [existing] = await db
      .select()
      .from(workflowDefinitions)
      .where(
        and(
          eq(workflowDefinitions.id, req.params.id),
          eq(workflowDefinitions.orgId, context.org.id)
        )
      )
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: "Workflow not found" });
    }

    const { name, description, industry, nodes, edges } = req.body;

    // Build update object
    const updates: any = {
      updatedAt: new Date(),
      version: existing.version + 1,
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (industry !== undefined) updates.industry = industry;
    if (nodes !== undefined) updates.nodes = nodes;
    if (edges !== undefined) updates.edges = edges;

    const [updated] = await db
      .update(workflowDefinitions)
      .set(updates)
      .where(
        and(
          eq(workflowDefinitions.id, req.params.id),
          eq(workflowDefinitions.orgId, context.org.id)
        )
      )
      .returning();

    // Emit event
    // TODO: Add workflow.definition.updated event

    return { workflow: updated };
  });

  // Delete workflow
  app.delete<{ Params: { id: string } }>("/workflows/:id", async (req, reply) => {
    const context = req.tenantContext;
    if (!context?.org) {
      throw new InternalError("Organization context missing");
    }

    const db = app.db;

    // Verify ownership
    const [existing] = await db
      .select()
      .from(workflowDefinitions)
      .where(
        and(
          eq(workflowDefinitions.id, req.params.id),
          eq(workflowDefinitions.orgId, context.org.id)
        )
      )
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: "Workflow not found" });
    }

    // Don't allow deletion of active workflows
    if (existing.isActive) {
      return reply.status(400).send({
        error: "Cannot delete active workflow. Deactivate it first.",
      });
    }

    await db
      .delete(workflowDefinitions)
      .where(
        and(
          eq(workflowDefinitions.id, req.params.id),
          eq(workflowDefinitions.orgId, context.org.id)
        )
      );

    return reply.status(204).send();
  });

  // Validate workflow
  app.post<{ Params: { id: string } }>("/workflows/:id/validate", async (req, reply) => {
    const context = req.tenantContext;
    if (!context?.org) {
      throw new InternalError("Organization context missing");
    }

    const db = app.db;

    // Get workflow
    const [workflow] = await db
      .select()
      .from(workflowDefinitions)
      .where(
        and(
          eq(workflowDefinitions.id, req.params.id),
          eq(workflowDefinitions.orgId, context.org.id)
        )
      )
      .limit(1);

    if (!workflow) {
      return reply.status(404).send({ error: "Workflow not found" });
    }

    // Convert to WorkflowDefinition format
    const definition: WorkflowDefinition = {
      id: workflow.id,
      orgId: workflow.orgId,
      name: workflow.name,
      description: workflow.description || undefined,
      industry: workflow.industry,
      isActive: workflow.isActive,
      version: workflow.version,
      nodes: workflow.nodes as any,
      edges: workflow.edges as any,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };

    const validationResult = validateWorkflowDefinition(definition);

    return {
      isValid: validationResult.isValid,
      errors: validationResult.errors,
    };
  });

  // Activate workflow
  app.post<{ Params: { id: string } }>("/workflows/:id/activate", async (req, reply) => {
    const context = req.tenantContext;
    if (!context?.org) {
      throw new InternalError("Organization context missing");
    }

    const db = app.db;

    // Get workflow
    const [workflow] = await db
      .select()
      .from(workflowDefinitions)
      .where(
        and(
          eq(workflowDefinitions.id, req.params.id),
          eq(workflowDefinitions.orgId, context.org.id)
        )
      )
      .limit(1);

    if (!workflow) {
      return reply.status(404).send({ error: "Workflow not found" });
    }

    // Convert to WorkflowDefinition format for validation
    const definition: WorkflowDefinition = {
      id: workflow.id,
      orgId: workflow.orgId,
      name: workflow.name,
      description: workflow.description || undefined,
      industry: workflow.industry,
      isActive: workflow.isActive,
      version: workflow.version,
      nodes: workflow.nodes as any,
      edges: workflow.edges as any,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };

    // Validate before activation
    const validationResult = validateWorkflowDefinition(definition);

    if (!validationResult.isValid) {
      return reply.status(400).send({
        error: "Cannot activate invalid workflow",
        validationErrors: validationResult.errors,
      });
    }

    // Activate workflow
    const [activated] = await db
      .update(workflowDefinitions)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workflowDefinitions.id, req.params.id),
          eq(workflowDefinitions.orgId, context.org.id)
        )
      )
      .returning();

    // Emit event
    // TODO: Add workflow.definition.activated event

    return { workflow: activated };
  });

  // Deactivate workflow
  app.post<{ Params: { id: string } }>("/workflows/:id/deactivate", async (req, reply) => {
    const context = req.tenantContext;
    if (!context?.org) {
      throw new InternalError("Organization context missing");
    }

    const db = app.db;

    const [deactivated] = await db
      .update(workflowDefinitions)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workflowDefinitions.id, req.params.id),
          eq(workflowDefinitions.orgId, context.org.id)
        )
      )
      .returning();

    if (!deactivated) {
      return reply.status(404).send({ error: "Workflow not found" });
    }

    return { workflow: deactivated };
  });
}
