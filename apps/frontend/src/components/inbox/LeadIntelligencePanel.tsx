"use client";

/**
 * LeadIntelligencePanel Component
 *
 * Right pane of the inbox showing lead insights and metadata.
 * For M16, this is just a skeleton placeholder.
 *
 * Future features (M17+):
 * - Lead contact info
 * - Service request details
 * - Lead score
 * - Conversation history summary
 * - AI-generated insights
 * - Tags and custom fields
 */
export function LeadIntelligencePanel() {
  return (
    <div style={{ padding: 16 }}>
      <h3
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 600,
          color: "#111827",
          marginBottom: 16,
        }}
      >
        Lead Intelligence
      </h3>

      {/* Contact Info Section (Skeleton) */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 8,
          }}
        >
          Contact Info
        </div>
        <div
          style={{
            padding: 12,
            backgroundColor: "#f9fafb",
            borderRadius: 6,
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: "#9ca3af", fontSize: 11 }}>Phone</div>
            <div style={{ color: "#111827" }}>+1 (555) 123-4567</div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: "#9ca3af", fontSize: 11 }}>Email</div>
            <div style={{ color: "#111827" }}>john.doe@example.com</div>
          </div>
          <div>
            <div style={{ color: "#9ca3af", fontSize: 11 }}>Location</div>
            <div style={{ color: "#111827" }}>San Francisco, CA</div>
          </div>
        </div>
      </div>

      {/* Service Request Section (Skeleton) */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 8,
          }}
        >
          Service Request
        </div>
        <div
          style={{
            padding: 12,
            backgroundColor: "#f9fafb",
            borderRadius: 6,
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: "#9ca3af", fontSize: 11 }}>Type</div>
            <div style={{ color: "#111827" }}>Plumbing</div>
          </div>
          <div>
            <div style={{ color: "#9ca3af", fontSize: 11 }}>Source</div>
            <div style={{ color: "#111827" }}>Google Ads</div>
          </div>
        </div>
      </div>

      {/* Lead Score Section (Skeleton) */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 8,
          }}
        >
          Lead Score
        </div>
        <div
          style={{
            padding: 12,
            backgroundColor: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: 6,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: "#15803d" }}>
            85
          </div>
          <div style={{ fontSize: 11, color: "#15803d", marginTop: 4 }}>
            High Quality
          </div>
        </div>
      </div>

      {/* AI Insights Section (Skeleton) */}
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 8,
          }}
        >
          AI Insights
        </div>
        <div
          style={{
            padding: 12,
            backgroundColor: "#eff6ff",
            border: "1px solid #93c5fd",
            borderRadius: 6,
            fontSize: 13,
            color: "#1e40af",
          }}
        >
          <div style={{ marginBottom: 8, fontWeight: 500 }}>
            💡 Quick Summary
          </div>
          <div style={{ fontSize: 12, lineHeight: "1.5" }}>
            Lead is interested in emergency plumbing service. Mentioned urgent
            need. High conversion probability.
          </div>
        </div>
      </div>

      {/* Placeholder note */}
      <div
        style={{
          marginTop: 24,
          padding: 12,
          backgroundColor: "#fef3c7",
          borderRadius: 6,
          fontSize: 12,
          color: "#92400e",
          textAlign: "center",
        }}
      >
        🚧 More intelligence features coming in M17
      </div>
    </div>
  );
}
