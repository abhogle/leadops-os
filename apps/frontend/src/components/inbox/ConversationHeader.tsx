"use client";

interface ConversationHeaderProps {
  leadName: string;
  leadPhone: string;
  status: "new" | "contacted" | "qualified" | "unqualified" | "closed";
  assignedToName: string | null;
  onAddNote: () => void;
}

/**
 * ConversationHeader Component
 *
 * Displayed at the top of the conversation timeline (center pane).
 * Shows lead details and action buttons.
 *
 * Features:
 * - Lead name and phone number
 * - Status badge
 * - Assigned agent (if any)
 * - "Add Note" button
 */
export function ConversationHeader({
  leadName,
  leadPhone,
  status,
  assignedToName,
  onAddNote,
}: ConversationHeaderProps) {
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
      style={{
        padding: 16,
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {/* Left: Lead Info */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111827" }}>
            {leadName}
          </h2>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: "3px 10px",
              borderRadius: 6,
              backgroundColor: `${getStatusColor(status)}15`,
              color: getStatusColor(status),
              textTransform: "capitalize",
            }}
          >
            {status}
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", display: "flex", gap: 16 }}>
          <span>{leadPhone}</span>
          {assignedToName && (
            <span>
              • Assigned to: <strong>{assignedToName}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div>
        <button
          onClick={onAddNote}
          style={{
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 500,
            color: "#3b82f6",
            backgroundColor: "#eff6ff",
            border: "1px solid #3b82f6",
            borderRadius: 6,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#dbeafe";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#eff6ff";
          }}
        >
          + Add Note
        </button>
      </div>
    </div>
  );
}
