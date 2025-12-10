import { orgConfig } from "@leadops/db";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export type OnboardingState =
  | "org_created"
  | "industry_selected"
  | "config_confirmed"
  | "completed";

const allowedTransitions: Record<OnboardingState, OnboardingState[]> = {
  org_created: ["industry_selected"],
  industry_selected: ["config_confirmed"],
  config_confirmed: ["completed"],
  completed: [],
};

export function canTransition(
  current: OnboardingState,
  next: OnboardingState
): boolean {
  return allowedTransitions[current]?.includes(next) ?? false;
}

export async function transitionOnboardingState(db: NodePgDatabase, orgId: string, next: OnboardingState) {
  const rows = await db.select().from(orgConfig).where(eq(orgConfig.orgId, orgId));
  if (rows.length === 0) throw new Error(`Org config not found for orgId=${orgId}`);

  const current = rows[0].onboardingState as OnboardingState;

  if (!canTransition(current, next)) {
    throw new Error(`Invalid onboarding transition: ${current} → ${next}`);
  }

  await db
    .update(orgConfig)
    .set({
      onboardingState: next,
      updatedAt: new Date(),
    })
    .where(eq(orgConfig.orgId, orgId));

  return next;
}
