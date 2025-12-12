"use client";

import { useSessionStore } from "../../state/sessionStore";

export function TopBar() {
  const { session, clear } = useSessionStore();

  function handleLogout() {
    clear();
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
  }

  if (!session) return null;

  return (
    <div
      style={{
        height: 64,
        borderBottom: "1px solid #e0e0e0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        backgroundColor: "#fff",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 600 }}>LeadOps OS</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 14, color: "#666" }}>
          {session.user.email}
        </div>
        <div style={{ fontSize: 12, color: "#999" }}>
          {session.org.name}
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: "6px 12px",
            fontSize: 14,
            cursor: "pointer",
            border: "1px solid #ccc",
            borderRadius: 4,
            backgroundColor: "#fff",
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
