import "fastify";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Org, User } from "@leadops/types";
import type { LeadOpsAuthToken } from "@leadops/auth";

declare module "fastify" {
  interface FastifyInstance {
    db: NodePgDatabase;
  }

  interface FastifyRequest {
    tenantContext?: {
      tokenClaims?: LeadOpsAuthToken;
      org?: Org;
      user?: User;
    };
  }
}
