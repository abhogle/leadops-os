import type { FastifyInstance } from "fastify";
import { listVerticalIndustries } from "@leadops/vertical-packs";

export async function registerOnboardingAvailableIndustriesRoute(app: FastifyInstance) {
  app.get("/onboarding/available-industries", async () => {
    const industries = listVerticalIndustries();
    return { industries };
  });
}
