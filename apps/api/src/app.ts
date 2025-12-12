import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import csrf from "@fastify/csrf-protection";
import rateLimit from "@fastify/rate-limit";
import { getDbClient } from "@leadops/db";
import { ApiError } from "./errors/index.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true
  });

  // Register cookie plugin first
  await app.register(cookie, {
    secret: process.env.AUTH_SECRET, // Used for signing cookies
    parseOptions: {},
  });

  // Register CSRF protection (cookie-based double-submit)
  // Will be enforced on state-changing routes (POST/PUT/PATCH/DELETE) except public ones
  // GET/HEAD/OPTIONS are automatically ignored by the plugin
  await app.register(csrf, {
    cookieOpts: {
      httpOnly: false, // Must be false so frontend can read it for x-csrf-token header
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      signed: false, // Unsigned for double-submit pattern
    },
    sessionPlugin: "@fastify/cookie",
  });

  // Register rate limiting (global default for authenticated routes)
  await app.register(rateLimit, {
    global: true,
    max: 500, // authenticated default
    timeWindow: "15 minutes",
    cache: 10000,
    allowList: (req) => {
      // Higher limits for internal health checks
      return req.url === "/health";
    },
    keyGenerator: (req) => {
      // Multi-tenant aware: use org_id when available, fallback to IP
      const org = req.tenantContext?.org?.id;
      if (org) {
        return `org:${org}:${req.ip}`;
      }
      return req.ip;
    },
    errorResponseBuilder: () => {
      return {
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
        statusCode: 429,
      };
    },
  });

  // Register CORS with environment-based origins
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3001").split(",");
  await app.register(cors, {
    origin: process.env.NODE_ENV === "production" ? allowedOrigins : true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
    credentials: true,
  });

  // Register database client
  const db = getDbClient();
  app.decorate("db", db);

  // Layer 1: initialize tenancy context
  app.addHook("onRequest", async (req, reply) => {
    const { tenantMiddleware } = await import("./tenancy/tenant-middleware.js");
    await tenantMiddleware(req, reply);
  });

  // Layer 2: authenticate + extract token claims
  app.addHook("onRequest", async (req, reply) => {
    const { isPublicRoute } = await import("./config/public-routes.js");
    // skip auth for public endpoints
    if (isPublicRoute(req.url)) return;
    const { authMiddleware } = await import("./auth/auth-middleware.js");
    await authMiddleware(req, reply);
  });

  // Layer 3: resolve + enforce full tenant context
  app.addHook("onRequest", async (req, reply) => {
    const { isPublicRoute } = await import("./config/public-routes.js");
    // skip tenancy for public endpoints
    if (isPublicRoute(req.url)) return;

    const { enforceTenancy } = await import("./tenancy/enforce-tenancy.js");
    await enforceTenancy(req, reply);
  });

  // Layer 4: CSRF protection for state-changing operations
  // CSRF validation happens automatically via the plugin
  // Tokens can be retrieved via GET requests using req.generateCsrf()
  // Validation is automatic on POST/PUT/PATCH/DELETE for non-public routes

  // Healthcheck endpoint
  app.get("/health", async () => {
    return {
      status: "ok",
      service: "api-gateway",
      uptime: process.uptime()
    };
  });

  // Auth Routes
  app.register(async (instance) => {
    const { registerLoginRoute } = await import("./routes/auth-login.js");
    await registerLoginRoute(instance);
  });

  app.register(async (instance) => {
    const { registerLogoutRoute } = await import("./routes/auth-logout.js");
    await registerLogoutRoute(instance);
  });

  app.register(async (instance) => {
    const { registerRefreshRoute } = await import("./routes/auth-refresh.js");
    await registerRefreshRoute(instance);
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

  // Milestone 15: Inbox & Messaging Routes (versioned under /api/v1)
  app.register(async (instance) => {
    const { registerIngestLeadRoute } = await import("./routes/ingest-lead.js");
    await registerIngestLeadRoute(instance);

    const { registerInboxRoute } = await import("./routes/inbox.js");
    await registerInboxRoute(instance);

    const { registerConversationMessagesRoute } = await import("./routes/conversation-messages.js");
    await registerConversationMessagesRoute(instance);

    const { registerSendMessageRoute } = await import("./routes/send-message.js");
    await registerSendMessageRoute(instance);

    const { registerCreateNoteRoute } = await import("./routes/create-note.js");
    await registerCreateNoteRoute(instance);

    const { registerTwilioInboundWebhookRoute } = await import("./routes/twilio-inbound-webhook.js");
    await registerTwilioInboundWebhookRoute(instance);

    // Milestone 19: Workflow Editor Routes
    const { registerWorkflowRoutes } = await import("./routes/workflows.js");
    await registerWorkflowRoutes(instance);
  }, { prefix: "/api/v1" });

  // Global Error Handler
  // Must be registered last to catch all errors
  app.setErrorHandler((err: Error, req, reply) => {
    // Handle ApiError subclasses (ValidationError, AuthError, etc.)
    if (err instanceof ApiError) {
      const apiError = err as ApiError;
      req.log.warn({ err, details: apiError.details }, "API Error");
      const response: { error: string; details?: any } = {
        error: apiError.message,
      };
      if (apiError.details) {
        response.details = apiError.details;
      }
      return reply.status(apiError.status).send(response);
    }

    // Handle rate limit errors from @fastify/rate-limit
    if ((err as any).statusCode === 429) {
      return reply.status(429).send({
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
      });
    }

    // Handle Zod validation errors
    if (err.name === "ZodError") {
      req.log.warn({ issues: (err as any).issues }, "Validation Error");
      return reply.status(400).send({
        error: "Invalid input",
        issues: (err as any).issues,
      });
    }

    // Handle Fastify validation errors
    if ((err as any).validation) {
      req.log.warn({ validation: (err as any).validation }, "Request Validation Error");
      return reply.status(400).send({
        error: "Invalid request",
        validation: (err as any).validation,
      });
    }

    // Unexpected errors - log but don't leak details to client
    req.log.error({ err }, "Unhandled Error");
    return reply.status(500).send({
      error: "Internal server error",
    });
  });

  return app;
}
