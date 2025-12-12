"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "../../state/sessionStore";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { session, isLoading } = useSessionStore();
  const router = useRouter();

  useEffect(() => {
    // Only perform redirects after loading is complete
    if (isLoading) return;

    if (!session) {
      router.replace("/auth/login");
      return;
    }

    if (session.role !== "leadops_admin") {
      router.replace("/app/inbox");
    }
  }, [session, isLoading, router]);

  // Show loading state while session is being fetched
  // This prevents flash of admin content
  if (isLoading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p>Loading...</p>
      </div>
    );
  }

  // Do not render children until we've verified the user is a leadops_admin
  // This prevents flash of unauthorized content before redirect completes
  if (!session || session.role !== "leadops_admin") {
    return null;
  }

  return <>{children}</>;
}
