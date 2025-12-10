import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export function createDbClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,           // class-leading performance baseline
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  return drizzle(pool);
}
