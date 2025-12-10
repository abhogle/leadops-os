import type { FastifyInstance } from "fastify";
import { loadOrgConfig } from "../services/config-service.js";

export async function registerConfigRoute(app: FastifyInstance) {
  app.get("/config", async (req) => {
    // @ts-expect-error tenant context
    const { org } = req.tenantContext;

    if (!org) {
      return { error: "Org not found in tenant context" };
    }

    // @ts-expect-error db
    const cfg = await loadOrgConfig(req.server.db, org.id);

    return {
      org,
      config: cfg
    };
  });
}
