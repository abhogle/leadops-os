import { render, screen } from "@testing-library/react";
import { MessageBubble } from "../MessageBubble";
import type { Message } from "../Timeline";

describe("MessageBubble", () => {
  it("renders lead message with gray background", () => {
    const message: Message = {
      id: "msg_1",
      sender: "lead",
      body: "Hello, I need help",
      created_at: new Date().toISOString(),
    };

    const { container } = render(<MessageBubble message={message} />);

    expect(screen.getByText("Hello, I need help")).toBeInTheDocument();

    // Check for lead message styling (gray background)
    const bubble = container.querySelector('div[style*="background-color"]');
    expect(bubble).toBeInTheDocument();
  });

  it("renders human message with dark navy background", () => {
    const message: Message = {
      id: "msg_2",
      sender: "human",
      body: "How can I help you?",
      created_at: new Date().toISOString(),
      sent_by_name: "Agent Jane",
    };

    render(<MessageBubble message={message} />);

    expect(screen.getByText("How can I help you?")).toBeInTheDocument();
    expect(screen.getByText("Agent Jane")).toBeInTheDocument();
  });

  it("renders AI message with blue background", () => {
    const message: Message = {
      id: "msg_3",
      sender: "ai",
      body: "AI-generated response",
      created_at: new Date().toISOString(),
      sent_by_name: "LeadOps AI",
    };

    render(<MessageBubble message={message} />);

    expect(screen.getByText("AI-generated response")).toBeInTheDocument();
    expect(screen.getByText("LeadOps AI")).toBeInTheDocument();
  });

  it("renders system message centered with italic style", () => {
    const message: Message = {
      id: "msg_4",
      sender: "system",
      body: "Conversation started",
      created_at: new Date().toISOString(),
    };

    const { container } = render(<MessageBubble message={message} />);

    expect(screen.getByText("Conversation started")).toBeInTheDocument();

    // System messages are centered
    const wrapper = container.querySelector(
      'div[style*="justify-content: center"]'
    );
    expect(wrapper).toBeInTheDocument();
  });

  it("shows delivery status icons", () => {
    const message: Message = {
      id: "msg_5",
      sender: "human",
      body: "Test message",
      created_at: new Date().toISOString(),
      status: "delivered",
    };

    render(<MessageBubble message={message} />);

    // Status indicator should be present
    expect(screen.getByText(/✓✓/)).toBeInTheDocument();
  });

  it("formats timestamp correctly", () => {
    const now = new Date();
    const message: Message = {
      id: "msg_6",
      sender: "lead",
      body: "Test",
      created_at: now.toISOString(),
    };

    render(<MessageBubble message={message} />);

    // Timestamp should be formatted (e.g., "12:30 PM")
    const timeString = now.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    expect(screen.getByText(timeString)).toBeInTheDocument();
  });
});
