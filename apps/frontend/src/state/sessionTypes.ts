import type {
  User,
  Org,
  UserRole,
  OnboardingStatus,
  TokenClaims,
  OrgConfig,
} from "@leadops/types";

export type { User, Org, UserRole, OnboardingStatus, TokenClaims, OrgConfig };

export interface FeatureFlags {
  [key: string]: boolean;
}

export interface SessionData {
  user: User;
  org: Org;
  role: UserRole;
  onboardingStatus: OnboardingStatus | null;
  industry?: string;
  verticalPackId?: string;
  featureFlags: FeatureFlags;
  config?: OrgConfig;
}

export interface SessionState {
  session: SessionData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  initialize: () => Promise<void>;
  clear: () => void;
}
