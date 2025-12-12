"use client";

import type { ConversationPreview } from "./LeadList";

interface LeadListItemProps {
  conversation: ConversationPreview;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * LeadListItem Component
 *
 * Individual conversation preview in the lead list.
 * Displays lead info, last message preview, timestamp, and unread badge.
 *
 * Visual states:
 * - Default: White background
 * - Hover: Light gray background
 * - Selected: Blue border + light blue background
 * - Unread: Bold text + blue unread dot
 */
export function LeadListItem({
  conversation,
  isSelected,
  onClick,
}: LeadListItemProps) {
  const {
    lead_name,
    lead_phone,
    last_message,
    last_message_at,
    has_unread,
    status,
  } = conversation;

  // Format timestamp (relative time)
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "new":
        return "#3b82f6"; // Blue
      case "contacted":
        return "#8b5cf6"; // Purple
      case "qualified":
        return "#10b981"; // Green
      case "unqualified":
        return "#ef4444"; // Red
      case "closed":
        return "#6b7280"; // Gray
      default:
        return "#6b7280";
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        padding: 12,
        borderBottom: "1px solid #e5e7eb",
        cursor: "pointer",
        backgroundColor: isSelected ? "#eff6ff" : "#fff",
        borderLeft: isSelected ? "3px solid #3b82f6" : "3px solid transparent",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = "#f9fafb";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = "#fff";
        }
      }}
    >
      {/* Header: Name + Timestamp */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: has_unread ? 600 : 500,
            color: "#111827",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {lead_name || "Unknown Lead"}
          {has_unread && (
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#3b82f6",
              }}
            />
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#6b7280",
          }}
        >
          {formatTimestamp(last_message_at)}
        </div>
      </div>

      {/* Phone Number */}
      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
          marginBottom: 6,
        }}
      >
        {lead_phone}
      </div>

      {/* Last Message Preview */}
      {last_message && (
        <div
          style={{
            fontSize: 13,
            color: "#4b5563",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 6,
          }}
        >
          {last_message}
        </div>
      )}

      {/* Status Badge */}
      <div
        style={{
          display: "inline-block",
          fontSize: 11,
          fontWeight: 500,
          padding: "2px 8px",
          borderRadius: 4,
          backgroundColor: `${getStatusColor(status)}15`,
          color: getStatusColor(status),
          textTransform: "capitalize",
        }}
      >
        {status}
      </div>
    </div>
  );
}
