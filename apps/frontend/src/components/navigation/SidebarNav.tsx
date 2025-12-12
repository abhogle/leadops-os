"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionStore } from "../../state/sessionStore";

interface NavItem {
  label: string;
  href: string;
  rolesAllowed?: string[];
}

const navItems: NavItem[] = [
  { label: "Inbox", href: "/app/inbox" },
  { label: "Workflows", href: "/app/workflows" },
  { label: "Prompts", href: "/app/prompts" },
  { label: "Intelligence", href: "/app/intelligence" },
  { label: "Connectors", href: "/app/connectors" },
  { label: "Admin", href: "/app/admin", rolesAllowed: ["leadops_admin"] },
];

export function SidebarNav() {
  const { session } = useSessionStore();
  const pathname = usePathname();

  if (!session) return null;

  const filteredItems = navItems.filter((item) => {
    if (!item.rolesAllowed) return true;
    return item.rolesAllowed.includes(session.role);
  });

  return (
    <nav style={{ padding: "16px 0" }}>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <li key={item.href} style={{ marginBottom: 4 }}>
              <Link
                href={item.href}
                style={{
                  display: "block",
                  padding: "8px 16px",
                  textDecoration: "none",
                  color: isActive ? "#000" : "#666",
                  backgroundColor: isActive ? "#f0f0f0" : "transparent",
                  borderRadius: 4,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
