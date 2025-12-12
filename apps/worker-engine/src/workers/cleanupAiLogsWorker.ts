/**
 * AI Call Logs Cleanup Worker
 * Milestone 17: AI SMS Engine v1
 *
 * Per Doc #18 (Data Retention & Lifecycle Policy)
 * AI logs retention: 30 days
 * Per Doc #15 (Observability): ai_call_logs table cleanup
 */

import { getDbClient, aiCallLogs } from "@leadops/db";
import { lt } from "drizzle-orm";
import { AI_LOG_RETENTION_DAYS } from "@leadops/ai-engine";

/**
 * Cleanup AI call logs older than retention period
 * Cron schedule: Daily at 2:00 AM UTC
 *
 * Implementation will be enhanced in future milestone with:
 * - Actual cron scheduling (BullMQ or similar)
 * - Batch processing for large deletions
 * - Metrics reporting (deleted count, execution time)
 * - Error handling and retries
 */
export async function cleanupAiCallLogs(): Promise<void> {
  const db = getDbClient();

  // Calculate retention cutoff date
  const retentionCutoff = new Date();
  retentionCutoff.setDate(retentionCutoff.getDate() - AI_LOG_RETENTION_DAYS);

  console.log(
    `[AI Logs Cleanup] Starting cleanup for logs older than ${retentionCutoff.toISOString()}`
  );

  try {
    // Delete logs older than retention period
    const result = await db
      .delete(aiCallLogs)
      .where(lt(aiCallLogs.createdAt, retentionCutoff));

    console.log(
      `[AI Logs Cleanup] Completed - deleted logs older than ${AI_LOG_RETENTION_DAYS} days`
    );

    // Future: Report metrics to observability service
    // await reportMetrics({
    //   worker: 'cleanup_ai_logs',
    //   deletedCount: result.rowCount,
    //   executionTime: Date.now() - startTime,
    // });
  } catch (error) {
    console.error(`[AI Logs Cleanup] Failed:`, error);

    // Future: Implement retry logic and alerting
    // await alertOnError('cleanup_ai_logs_failed', error);

    throw error;
  }
}

/**
 * Worker registration stub
 * Will be called by worker-engine scheduler in future milestone
 */
export const aiLogsCleanupWorker = {
  name: "cleanup_ai_logs",
  schedule: "0 2 * * *", // Daily at 2:00 AM UTC
  handler: cleanupAiCallLogs,
  enabled: true,
};
