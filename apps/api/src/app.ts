import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { createDbClient } from "@leadops/db";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true
  });

  // Register CORS before other plugins
  await app.register(cors, {
    origin: ["http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  // Register database client
  const db = createDbClient();
  app.decorate("db", db);

  // Layer 1: initialize tenancy context
  app.addHook("onRequest", async (req, reply) => {
    const { tenantMiddleware } = await import("./tenancy/tenant-middleware.js");
    await tenantMiddleware(req, reply);
  });

  // Layer 2: authenticate + extract token claims
  app.addHook("onRequest", async (req, reply) => {
    // skip auth for public endpoints
    if (req.url === "/health" || req.url === "/onboarding/create-org" || req.url === "/onboarding/available-industries") return;
    const { authMiddleware } = await import("./auth/auth-middleware.js");
    await authMiddleware(req, reply);
  });

  // Layer 3: resolve + enforce full tenant context
  app.addHook("onRequest", async (req, reply) => {
    // skip tenancy for public endpoints
    if (req.url === "/health" || req.url === "/onboarding/create-org" || req.url === "/onboarding/available-industries") return;

    const { enforceTenancy } = await import("./tenancy/enforce-tenancy.js");
    await enforceTenancy(req, reply);
  });

  // Healthcheck endpoint
  app.get("/health", async () => {
    return {
      status: "ok",
      service: "api-gateway",
      uptime: process.uptime()
    };
  });

  // Org Routes
  app.register(async (instance) => {
    const { registerOrgRoutes } = await import("./routes/orgs.js");
    await registerOrgRoutes(instance);
  });

  // /me route
  app.register(async (instance) => {
    const { registerMeRoute } = await import("./routes/me.js");
    await registerMeRoute(instance);
  });

  // /config route
  app.register(async (instance) => {
    const { registerConfigRoute } = await import("./routes/config.js");
    await registerConfigRoute(instance);
  });

  // Config Update Route
  app.register(async (instance) => {
    const { registerConfigUpdateRoute } = await import("./routes/config-update.js");
    await registerConfigUpdateRoute(instance);
  });

  // Onboarding Routes
  app.register(async (instance) => {
    const { registerCreateOrgRoute } = await import("./routes/onboarding-create-org.js");
    await registerCreateOrgRoute(instance);
  });

  app.register(async (instance) => {
    const { registerOnboardingStateRoute } = await import("./routes/onboarding-state.js");
    await registerOnboardingStateRoute(instance);
  });

  app.register(async (instance) => {
    const { registerOnboardingCompleteStepRoute } = await import("./routes/onboarding-complete-step.js");
    await registerOnboardingCompleteStepRoute(instance);
  });

  app.register(async (instance) => {
    const { registerOnboardingFinishRoute } = await import("./routes/onboarding-finish.js");
    await registerOnboardingFinishRoute(instance);
  });

  app.register(async (instance) => {
    const { registerOnboardingAvailableIndustriesRoute } = await import(
      "./routes/onboarding-available-industries.js"
    );
    await registerOnboardingAvailableIndustriesRoute(instance);
  });

  app.register(async (instance) => {
    const { registerOnboardingSetIndustryRoute } = await import(
      "./routes/onboarding-set-industry.js"
    );
    await registerOnboardingSetIndustryRoute(instance);
  });

  app.register(async (instance) => {
    const { registerOnboardingConfirmConfigRoute } = await import(
      "./routes/onboarding-confirm-config.js"
    );
    await registerOnboardingConfirmConfigRoute(instance);
  });

  return app;
}
