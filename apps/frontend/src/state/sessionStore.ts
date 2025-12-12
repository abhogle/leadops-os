import { create } from "zustand";
import type {
  SessionState,
  SessionData,
} from "./sessionTypes";
import { apiGet } from "../../lib/api";
import { TOKEN_KEY } from "../config";
import {
  MeResponseSchema,
  OnboardingStateResponseSchema,
  type MeResponse,
  type OnboardingStateResponse,
} from "@leadops/schemas";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(TOKEN_KEY);
  return token || null;
}

async function fetchSessionData(): Promise<SessionData> {
  const token = getToken();
  if (!token || token.trim() === "") {
    throw new Error("No authentication token found");
  }

  const [meRes, stateRes] = await Promise.all([
    apiGet<MeResponse>("/me", MeResponseSchema, token),
    apiGet<OnboardingStateResponse>("/onboarding/state", OnboardingStateResponseSchema, token),
  ]);

  return {
    user: meRes.user,
    org: meRes.org,
    role: meRes.user.role,
    onboardingStatus: meRes.onboardingStatus,
    industry: meRes.org.industry,
    verticalPackId: stateRes.config?.vertical?.id,
    featureFlags: {},
    config: stateRes.config,
  };
}

/**
 * Map technical error messages to user-friendly messages
 */
function getUserFriendlyErrorMessage(error: any): string {
  const errorMessage = error?.message || "";

  // 401 Unauthorized
  if (errorMessage.includes("401") || errorMessage.toLowerCase().includes("unauthorized")) {
    return "Your session has expired. Please log in again.";
  }

  // Network errors
  if (errorMessage.toLowerCase().includes("fetch") ||
      errorMessage.toLowerCase().includes("network") ||
      errorMessage.toLowerCase().includes("connection")) {
    return "We're having trouble connecting. Please retry.";
  }

  // Token-related errors
  if (errorMessage.toLowerCase().includes("token")) {
    return "Your session has expired. Please log in again.";
  }

  // Generic fallback
  return "Something went wrong. Please try again.";
}

/**
 * Check if error indicates session expiration
 */
function isSessionExpiredError(error: any): boolean {
  const rawError = error?.message || "";
  return rawError.includes("401") || rawError.includes("token") || rawError.includes("No authentication");
}

// Shared promise for deduplication
let initializePromise: Promise<void> | null = null;

// Event callback for session expiration - will be called when 401 occurs
// This is set by SessionProvider to handle routing
let onSessionExpiredCallback: (() => void) | null = null;

export function setSessionExpiredCallback(callback: () => void) {
  onSessionExpiredCallback = callback;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  isLoading: false,
  error: null,

  initialize: async () => {
    // If already initializing, return the existing promise
    if (initializePromise) {
      return initializePromise;
    }

    const { session } = get();
    // If already initialized successfully, don't re-initialize
    if (session) return;

    initializePromise = (async () => {
      set({ isLoading: true, error: null });

      try {
        const sessionData = await fetchSessionData();
        set({ session: sessionData, isLoading: false, error: null });
      } catch (err: any) {
        const userFriendlyMessage = getUserFriendlyErrorMessage(err);
        set({ session: null, isLoading: false, error: userFriendlyMessage });

        // Handle session expiration
        if (isSessionExpiredError(err)) {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(TOKEN_KEY);
          }
          // Notify callback (e.g., SessionProvider will handle routing)
          if (onSessionExpiredCallback) {
            onSessionExpiredCallback();
          }
        }
      } finally {
        initializePromise = null;
      }
    })();

    return initializePromise;
  },

  refresh: async () => {
    const { isLoading } = get();
    if (isLoading) return;

    set({ isLoading: true, error: null });

    try {
      const sessionData = await fetchSessionData();
      set({ session: sessionData, isLoading: false, error: null });
    } catch (err: any) {
      const userFriendlyMessage = getUserFriendlyErrorMessage(err);
      set({ isLoading: false, error: userFriendlyMessage });

      // Handle session expiration
      if (isSessionExpiredError(err)) {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(TOKEN_KEY);
        }
        // Notify callback (e.g., SessionProvider will handle routing)
        if (onSessionExpiredCallback) {
          onSessionExpiredCallback();
        }
      }
    }
  },

  clear: () => {
    set({ session: null, isLoading: false, error: null });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  },
}));
