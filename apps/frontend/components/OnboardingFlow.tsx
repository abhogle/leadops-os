"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";

type OnboardingState =
  | "org_created"
  | "industry_selected"
  | "config_confirmed"
  | "completed";

interface MeResponse {
  user: any;
  org: any;
  tokenClaims: any;
  onboardingState: OnboardingState;
}

interface ConfigResponse {
  org: any;
  onboardingState: OnboardingState;
  config: {
    leadFields: any[];
    workflows: any[];
    settings: Record<string, any>;
    vertical: any;
  };
}

const TOKEN_KEY = "leadops_auth_token";

export function OnboardingFlow() {
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [industries, setIndustries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    const urlToken = params.get("token");
    const saved = window.localStorage.getItem(TOKEN_KEY);

    if (urlToken) {
      window.localStorage.setItem(TOKEN_KEY, urlToken);
      setToken(urlToken);
      // Clean URL so token is not left hanging around in query string
      window.history.replaceState({}, "", window.location.pathname);
    } else if (saved) {
      setToken(saved);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!token || loading) return;
    (async () => {
      try {
        const [meRes, cfgRes, avail] = await Promise.all([
          apiGet("/me", token),
          apiGet("/onboarding/state", token),
          apiGet("/onboarding/available-industries"),
        ]);
        setMe(meRes as MeResponse);
        setConfig(cfgRes as ConfigResponse);
        setIndustries((avail as any).industries || []);
      } catch (e: any) {
        setError(e.message ?? "Failed to load onboarding data");
      }
    })();
  }, [token, loading]);

  async function handleSetIndustry(industry: string) {
    if (!token) return;
    await apiPost("/onboarding/set-industry", { industry }, token);
    const cfgRes = await apiGet("/onboarding/state", token);
    setConfig(cfgRes as ConfigResponse);
  }

  async function handleConfirmConfig() {
    if (!token || !config) return;
    await apiPost(
      "/onboarding/confirm-config",
      {
        leadFields: config.config.leadFields,
        workflows: config.config.workflows,
        settings: config.config.settings,
      },
      token
    );
    const cfgRes = await apiGet("/onboarding/state", token);
    setConfig(cfgRes as ConfigResponse);
  }

  async function handleFinish() {
    if (!token) return;
    await apiPost("/onboarding/finish", {}, token);
    const meRes = await apiGet("/me", token);
    setMe(meRes as MeResponse);
  }

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (error) return <div style={{ padding: 24, color: "red" }}>{error}</div>;
  if (!token) {
    return (
      <div style={{ padding: 24 }}>
        <h1>LeadOps OS Onboarding</h1>
        <p>No active session found. To begin onboarding, open this app with a valid token in the URL query string.</p>
      </div>
    );
  }

  if (!me || !config) {
    return <div style={{ padding: 24 }}>Loading session…</div>;
  }

  if (me.onboardingState === "completed") {
    return (
      <div style={{ padding: 24 }}>
        <h1>Welcome to LeadOps OS</h1>
        <p>Onboarding is complete. Main app dashboard will go here.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <h1>LeadOps OS Onboarding</h1>
      <p>Org: {me.org?.name}</p>
      <p>Current step: {me.onboardingState}</p>

      {me.onboardingState === "org_created" && (
        <IndustryStep
          industries={industries}
          onSelect={handleSetIndustry}
        />
      )}

      {me.onboardingState === "industry_selected" && config && (
        <ConfigReviewStep
          config={config}
          onConfirm={handleConfirmConfig}
        />
      )}

      {me.onboardingState === "config_confirmed" && (
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
  config: ConfigResponse;
  onConfirm: () => void;
}) {
  return (
    <div style={{ marginTop: 24 }}>
      <h2>Review your configuration</h2>
      <h3>Lead Fields</h3>
      <pre>{JSON.stringify(config.config.leadFields, null, 2)}</pre>
      <h3>Workflows</h3>
      <pre>{JSON.stringify(config.config.workflows, null, 2)}</pre>
      <h3>Settings</h3>
      <pre>{JSON.stringify(config.config.settings, null, 2)}</pre>
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
