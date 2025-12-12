"use client";

import type { ReactNode } from "react";

interface InboxLayoutProps {
  children: ReactNode;
}

/**
 * Inbox 3-Pane Layout
 *
 * Layout structure:
 * - Left (28%): Lead list (conversation previews)
 * - Center (47%): Conversation timeline (messages + notes)
 * - Right (25%): Lead intelligence panel
 *
 * This layout overrides the default AppShellLayout padding to provide
 * a full-height, edge-to-edge grid layout for the inbox interface.
 */
export default function InboxLayout({ children }: InboxLayoutProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "28% 47% 25%",
        height: "100%",
        overflow: "hidden",
        margin: -24, // Counteract AppShellLayout padding
        backgroundColor: "#fff",
      }}
    >
      {children}
    </div>
  );
}
