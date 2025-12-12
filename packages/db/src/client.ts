import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Singleton database client instance
 * Milestone 17 Fix #2: Prevent connection pool leak
 */
let dbInstance: NodePgDatabase | null = null;
let poolInstance: Pool | null = null;

/**
 * Get singleton database client
 * Creates pool and client on first call, reuses on subsequent calls
 *
 * @returns {NodePgDatabase} Drizzle database client
 */
export function getDbClient(): NodePgDatabase {
  if (!dbInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10, // class-leading performance baseline
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Handle pool errors to prevent crashes
    poolInstance.on("error", (err) => {
      console.error("[DB Pool] Unexpected error on idle client", err);
    });

    dbInstance = drizzle(poolInstance);
    console.log("[DB] Singleton client initialized");
  }

  return dbInstance;
}

/**
 * @deprecated Use getDbClient() instead to prevent connection pool leaks
 * This function is kept for backward compatibility only
 */
export function createDbClient(): NodePgDatabase {
  console.warn(
    "[DB] Warning: createDbClient() is deprecated. Use getDbClient() to prevent connection pool leaks."
  );
  return getDbClient();
}

/**
 * Close database connection pool gracefully
 * Used for graceful shutdown and in tests
 */
export async function closeDbConnection(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
    dbInstance = null;
    console.log("[DB] Connection pool closed");
  }
}

/**
 * Register graceful shutdown handlers
 * Ensures connection pool is closed when process exits
 */
function registerShutdownHandlers(): void {
  const shutdown = async (signal: string) => {
    console.log(`[DB] Received ${signal}, closing connections...`);
    await closeDbConnection();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// Auto-register shutdown handlers in Node.js environment
if (typeof process !== "undefined") {
  registerShutdownHandlers();
}
