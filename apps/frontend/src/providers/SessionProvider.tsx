"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore, setSessionExpiredCallback } from "../state/sessionStore";

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const {session, isLoading, error, initialize, refresh } = useSessionStore();
  const router = useRouter();

  // Set up session expiration callback - sessionStore will notify us when session expires
  useEffect(() => {
    setSessionExpiredCallback(() => {
      router.replace("/auth/login");
    });

    // Clean up callback on unmount
    return () => {
      setSessionExpiredCallback(() => {});
    };
  }, [router]);

  useEffect(() => {
    initialize();
    // initialize is stable and idempotent, safe to call once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle routing based on role and onboarding status
  useEffect(() => {
    if (isLoading || !session) return;

    const { role, onboardingStatus } = session;

    // ROLE-BASED ONBOARDING RULES:
    // - leadops_admin: MUST complete onboarding before accessing /app/*
    //   If onboardingStatus !== "completed", redirect to /onboarding
    // - Non-admin roles (owner, admin, member, customer_user, etc.):
    //   Bypass onboarding entirely, can access /app/* directly regardless of onboardingStatus
    if (role === "leadops_admin" && onboardingStatus !== "completed") {
      router.push("/onboarding");
    }
  }, [session, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p>Loading session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "red" }}>
        <h2>Session Error</h2>
        <p>{error}</p>
        <button
          onClick={refresh}
          style={{
            marginTop: 16,
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p>No active session</p>
      </div>
    );
  }

  return <>{children}</>;
}
