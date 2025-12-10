import { Pool } from "pg";

export async function checkDatabaseReady(connectionString: string): Promise<boolean> {
  const pool = new Pool({ connectionString });
  try {
    const result = await pool.query("SELECT 1");
    await pool.end();
    return result.rowCount === 1;
  } catch {
    return false;
  }
}
