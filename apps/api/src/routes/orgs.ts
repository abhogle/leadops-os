import type { FastifyInstance } from "fastify";
import { orgs } from "@leadops/db";

export async function registerOrgRoutes(app: FastifyInstance) {
  app.get("/orgs", async (req) => {
    const db = app.db;

    if (!process.env.DATABASE_URL) {
      return { error: "Database not configured. Set DATABASE_URL." };
    }

    try {
      const rows = await db.select().from(orgs);
      return rows;
    } catch (err) {
      return { error: "Database is not ready. Run migrations.", details: String(err) };
    }
  });
}
