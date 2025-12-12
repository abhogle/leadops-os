import type { FastifyInstance } from "fastify";
import { loadOrgConfig } from "../services/config-service.js";
import { InternalError } from "../errors/index.js";

export async function registerConfigRoute(app: FastifyInstance) {
  app.get("/config", async (req, reply) => {
    const context = req.tenantContext;

    if (!context || !context.org) {
      throw new InternalError("Organization context missing");
    }

    const { org } = context;
    const cfg = await loadOrgConfig(req.server.db, org.id);

    return {
      org,
      config: cfg
    };
  });
}
