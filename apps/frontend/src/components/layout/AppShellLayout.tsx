"use client";

import { SidebarNav } from "../navigation/SidebarNav";
import { TopBar } from "../navigation/TopBar";

interface AppShellLayoutProps {
  children: React.ReactNode;
}

export function AppShellLayout({ children }: AppShellLayoutProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <TopBar />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <aside
          style={{
            width: 240,
            borderRight: "1px solid #e0e0e0",
            backgroundColor: "#fafafa",
            overflowY: "auto",
          }}
        >
          <SidebarNav />
        </aside>
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 24,
            backgroundColor: "#fff",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
