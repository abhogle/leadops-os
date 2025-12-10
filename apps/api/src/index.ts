import { buildApp } from "./app.js";
import { checkDatabaseReady } from "@leadops/db";

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";

async function start() {
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
