"use client";

import Link from "next/link";

export default function ClientSettingsPage() {
  return (
    <div>
      <h1>Client Settings</h1>
      <p>Manage client organization settings.</p>
      <nav style={{ marginTop: 24 }}>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li style={{ marginBottom: 8 }}>
            <Link href="/app/admin/client-settings/onboarding-config" style={{ color: "#0070f3" }}>
              Onboarding Configuration
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
