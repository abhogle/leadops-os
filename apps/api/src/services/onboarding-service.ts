import { orgConfig } from "@leadops/db";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { OnboardingStatus } from "@leadops/types";

export class OnboardingInvalidTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OnboardingInvalidTransitionError";
  }
}

const allowedTransitions: Record<OnboardingStatus, OnboardingStatus[]> = {
  org_created: ["industry_selected"],
  industry_selected: ["industry_selected", "config_confirmed"],
  config_confirmed: ["config_confirmed", "completed"],
  completed: [],
};

export function canTransition(
  current: OnboardingStatus,
  next: OnboardingStatus
): boolean {
  return allowedTransitions[current]?.includes(next) ?? false;
}

export async function transitionOnboardingState(db: NodePgDatabase, orgId: string, next: OnboardingStatus) {
  const rows = await db.select().from(orgConfig).where(eq(orgConfig.orgId, orgId));
  if (rows.length === 0) throw new Error(`Org config not found for orgId=${orgId}`);

  const current = rows[0].onboardingState as OnboardingStatus;

  if (current === "completed") {
    throw new OnboardingInvalidTransitionError(
      "Onboarding already completed; industry cannot be changed via onboarding."
    );
  }

  if (!canTransition(current, next)) {
    throw new OnboardingInvalidTransitionError(`Invalid onboarding transition: ${current} → ${next}`);
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
