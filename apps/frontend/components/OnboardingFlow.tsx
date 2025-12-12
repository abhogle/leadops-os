"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "../lib/api";
import {
  AvailableIndustriesResponseSchema,
  OnboardingStateResponseSchema,
  type AvailableIndustriesResponse,
  type OnboardingStateResponse,
  type SetIndustryRequest,
  type ConfirmConfigRequest,
} from "@leadops/schemas";
import { useSessionStore } from "../src/state/sessionStore";
import { TOKEN_KEY } from "../src/config";

export function OnboardingFlow() {
  const router = useRouter();
  const { session, isLoading, error, refresh } = useSessionStore();
  const [token, setToken] = useState<string | null>(null);
  const [industries, setIndustries] = useState<string[]>([]);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    // TODO: Implement proper auth - token should come from HttpOnly cookie or Authorization header
    // For now, reading from localStorage (should be set by login flow)
    const saved = window.localStorage.getItem(TOKEN_KEY);

    if (saved) {
      setToken(saved);
    }

    setInitLoading(false);
  }, []);

  useEffect(() => {
    if (!token || initLoading) return;
    (async () => {
      try {
        const avail = await apiGet<AvailableIndustriesResponse>(
          "/onboarding/available-industries",
          AvailableIndustriesResponseSchema
        );
        setIndustries(avail.industries || []);
        // Trigger session load if not already loaded
        await refresh();
      } catch (e: any) {
        console.error("Failed to load onboarding data:", e);
      }
    })();
  }, [token, initLoading, refresh]);

  // Redirect to app when onboarding is completed
  useEffect(() => {
    if (session?.onboardingStatus === "completed") {
      router.replace("/app");
    }
  }, [session?.onboardingStatus, router]);

  async function handleSetIndustry(industry: string) {
    if (!token) return;
    const requestData: SetIndustryRequest = { industry };
    await apiPost<OnboardingStateResponse>(
      "/onboarding/set-industry",
      requestData,
      OnboardingStateResponseSchema,
      token
    );
    // Refresh session to get updated state
    await refresh();
  }

  async function handleConfirmConfig() {
    if (!token || !session?.config) return;
    const requestData: ConfirmConfigRequest = {
      leadFields: session.config.leadFields,
      workflows: session.config.workflows,
      settings: session.config.settings,
    };
    await apiPost<OnboardingStateResponse>(
      "/onboarding/confirm-config",
      requestData,
      OnboardingStateResponseSchema,
      token
    );
    // Refresh session to get updated state
    await refresh();
  }

  async function handleFinish() {
    if (!token) return;
    await apiPost<OnboardingStateResponse>(
      "/onboarding/finish",
      {},
      OnboardingStateResponseSchema,
      token
    );
    // Refresh session to get updated state
    await refresh();
  }

  if (initLoading || isLoading) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: "red" }}>{error}</div>;
  }

  if (!token) {
    return (
      <div style={{ padding: 24 }}>
        <h1>LeadOps OS Onboarding</h1>
        <p>No active session found. Please log in to continue.</p>
      </div>
    );
  }

  if (!session) {
    return <div style={{ padding: 24 }}>Loading session…</div>;
  }

  if (session.onboardingStatus === "completed") {
    // Show nothing while redirecting (useEffect above handles the redirect)
    return null;
  }

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <h1>LeadOps OS Onboarding</h1>
      <p>Org: {session.org?.name}</p>
      <p>Current step: {session.onboardingStatus}</p>

      {session.onboardingStatus === "org_created" && (
        <IndustryStep
          industries={industries}
          onSelect={handleSetIndustry}
        />
      )}

      {session.onboardingStatus === "industry_selected" && session.config && (
        <ConfigReviewStep
          config={session.config}
          onConfirm={handleConfirmConfig}
        />
      )}

      {session.onboardingStatus === "config_confirmed" && (
        <FinishStep onFinish={handleFinish} />
      )}
    </div>
  );
}

function IndustryStep({
  industries,
  onSelect,
}: {
  industries: string[];
  onSelect: (ind: string) => void;
}) {
  return (
    <div style={{ marginTop: 24 }}>
      <h2>Select your industry</h2>
      <ul>
        {industries.map((ind) => (
          <li key={ind}>
            <button
              type="button"
              onClick={() => onSelect(ind)}
              style={{ margin: 4 }}
            >
              {ind}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConfigReviewStep({
  config,
  onConfirm,
}: {
  config: import("@leadops/schemas").OrgConfig;
  onConfirm: () => void;
}) {
  return (
    <div style={{ marginTop: 24 }}>
      <h2>Review your configuration</h2>
      <h3>Lead Fields</h3>
      <pre>{JSON.stringify(config.leadFields, null, 2)}</pre>
      <h3>Workflows</h3>
      <pre>{JSON.stringify(config.workflows, null, 2)}</pre>
      <h3>Settings</h3>
      <pre>{JSON.stringify(config.settings, null, 2)}</pre>
      <button type="button" onClick={onConfirm} style={{ marginTop: 8 }}>
        Confirm configuration
      </button>
    </div>
  );
}

function FinishStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h2>All set!</h2>
      <p>When you click finish, onboarding will be marked complete.</p>
      <button type="button" onClick={onFinish}>
        Finish onboarding
      </button>
    </div>
  );
}
