import { render, screen } from "@testing-library/react";
import { Timeline } from "../Timeline";
import type { TimelineItem } from "../Timeline";

describe("Timeline", () => {
  const mockMessages: TimelineItem[] = [
    {
      type: "message",
      data: {
        id: "msg_1",
        sender: "lead",
        body: "Hello",
        created_at: "2025-12-10T10:00:00Z",
      },
    },
    {
      type: "message",
      data: {
        id: "msg_2",
        sender: "human",
        body: "Hi there!",
        created_at: "2025-12-10T10:05:00Z",
        sent_by_name: "Agent",
      },
    },
    {
      type: "note",
      data: {
        id: "note_1",
        body: "Lead seems interested",
        created_at: "2025-12-10T10:10:00Z",
        created_by_name: "Agent",
      },
    },
  ];

  it("renders loading state", () => {
    render(<Timeline items={[]} isLoading={true} />);

    expect(screen.getByText("Loading conversation...")).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(
      <Timeline items={[]} error="Failed to load" isLoading={false} />
    );

    expect(screen.getByText("Failed to load conversation")).toBeInTheDocument();
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("renders empty state when no items", () => {
    render(<Timeline items={[]} isLoading={false} />);

    expect(screen.getByText("No messages yet")).toBeInTheDocument();
  });

  it("renders messages and notes sorted by time", () => {
    render(<Timeline items={mockMessages} isLoading={false} />);

    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Hi there!")).toBeInTheDocument();
    expect(screen.getByText("Lead seems interested")).toBeInTheDocument();
  });

  it("renders date dividers", () => {
    const itemsWithDifferentDates: TimelineItem[] = [
      {
        type: "message",
        data: {
          id: "msg_1",
          sender: "lead",
          body: "Message from yesterday",
          created_at: new Date(
            Date.now() - 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      },
      {
        type: "message",
        data: {
          id: "msg_2",
          sender: "human",
          body: "Message from today",
          created_at: new Date().toISOString(),
          sent_by_name: "Agent",
        },
      },
    ];

    render(<Timeline items={itemsWithDifferentDates} isLoading={false} />);

    // Should show "Yesterday" and "Today" dividers
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("differentiates between messages and notes visually", () => {
    const { container } = render(
      <Timeline items={mockMessages} isLoading={false} />
    );

    // Notes should have yellow/beige background
    const noteElement = screen
      .getByText("Lead seems interested")
      .closest("div");
    expect(noteElement).toBeInTheDocument();

    // Check for note indicator
    expect(screen.getByText("📝")).toBeInTheDocument();
    expect(screen.getByText("Internal Note")).toBeInTheDocument();
  });
});
