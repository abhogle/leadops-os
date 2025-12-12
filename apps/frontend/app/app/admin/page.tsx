"use client";

import Link from "next/link";

export default function AdminPage() {
  return (
    <div>
      <h1>Admin</h1>
      <p>LeadOps Admin Dashboard</p>
      <nav style={{ marginTop: 24 }}>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li style={{ marginBottom: 8 }}>
            <Link href="/app/admin/client-settings" style={{ color: "#0070f3" }}>
              Client Settings
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
