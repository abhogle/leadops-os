/**
 * Engagement Listener
 * Milestone 18: Workflow Engine Runtime
 *
 * Listens for conversation.engaged events and terminates active workflows
 * for the engaged lead/conversation.
 */

import { eq, and } from "drizzle-orm";
import { getDbClient, workflowExecutions } from "@leadops/db";
import { eventBus } from "../services/eventBus.js";
import type { ConversationEngagedEvent } from "../services/eventBus.js";

/**
 * Terminate workflows for an engaged conversation
 * Uses optimistic concurrency to safely update workflow status
 */
export async function terminateWorkflowsOnEngagement(
  event: ConversationEngagedEvent
): Promise<void> {
  const db = getDbClient();

  console.log(
    `[EngagementListener] Processing engagement event for conversation ${event.conversationId}`
  );

  try {
    // Find all running workflows for this conversation (with multi-tenant validation)
    const runningWorkflows = await db
      .select()
      .from(workflowExecutions)
      .where(
        and(
          eq(workflowExecutions.conversationId, event.conversationId),
          eq(workflowExecutions.orgId, event.orgId),
          eq(workflowExecutions.status, "running")
        )
      );

    if (runningWorkflows.length === 0) {
      console.log(
        `[EngagementListener] No running workflows found for conversation ${event.conversationId}`
      );
      return;
    }

    console.log(
      `[EngagementListener] Found ${runningWorkflows.length} running workflows to terminate`
    );

    // Terminate each workflow using optimistic concurrency
    for (const workflow of runningWorkflows) {
      try {
        // Update with version check (optimistic concurrency)
        const [updated] = await db
          .update(workflowExecutions)
          .set({
            status: "terminated_engaged",
            updatedAt: new Date(),
            version: workflow.version + 1,
          })
          .where(
            and(
              eq(workflowExecutions.id, workflow.id),
              eq(workflowExecutions.orgId, event.orgId),
              eq(workflowExecutions.version, workflow.version) // OCC check
            )
          )
          .returning();

        if (updated) {
          console.log(
            `[EngagementListener] Terminated workflow ${workflow.id} (conversation: ${event.conversationId})`
          );
        } else {
          console.warn(
            `[EngagementListener] Failed to terminate workflow ${workflow.id} - version mismatch (concurrent update)`
          );
        }
      } catch (error) {
        console.error(
          `[EngagementListener] Error terminating workflow ${workflow.id}:`,
          error
        );
        // Continue with other workflows even if one fails
      }
    }

    console.log(
      `[EngagementListener] Completed processing engagement event for conversation ${event.conversationId}`
    );
  } catch (error) {
    console.error(
      `[EngagementListener] Error processing engagement event:`,
      error
    );
  }
}

/**
 * Register the engagement listener
 * Call this during application startup
 */
export function registerEngagementListener(): void {
  eventBus.on<ConversationEngagedEvent>(
    "conversation.engaged",
    terminateWorkflowsOnEngagement
  );

  console.log(
    "[EngagementListener] Registered listener for conversation.engaged events"
  );
}
