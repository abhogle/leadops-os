import { buildApp } from "./app.js";
import { checkDatabaseReady } from "@leadops/db";

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";

async function start() {
  // Validate AUTH_SECRET in non-development environments
  const authSecret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV !== "development" && authSecret === "change-this-secret-before-production") {
    console.error("❌ SECURITY ERROR: Default AUTH_SECRET detected in non-development environment.");
    console.error("   Please set a secure AUTH_SECRET in your .env file before starting the API.");
    process.exit(1);
  }

  const ready = await checkDatabaseReady(process.env.DATABASE_URL || "");
  if (!ready) {
    console.error("❌ Database is not ready. Run migrations before starting the API.");
    process.exit(1);
  }

  const app = await buildApp();

  try {
    await app.listen({ port, host });
    app.log.info(`LeadOps API Gateway listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
