import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeadListItem } from "../LeadListItem";
import type { ConversationPreview } from "../LeadList";

describe("LeadListItem", () => {
  const mockConversation: ConversationPreview = {
    conversation_id: "conv_123",
    lead_id: "lead_456",
    lead_name: "John Doe",
    lead_phone: "+15551234567",
    last_message: "Hello, I need help with plumbing",
    last_message_at: new Date().toISOString(),
    has_unread: false,
    assigned_to_name: "Jane Agent",
    status: "new",
  };

  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it("renders lead name and phone number", () => {
    render(
      <LeadListItem
        conversation={mockConversation}
        isSelected={false}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("+15551234567")).toBeInTheDocument();
  });

  it("renders last message preview", () => {
    render(
      <LeadListItem
        conversation={mockConversation}
        isSelected={false}
        onClick={mockOnClick}
      />
    );

    expect(
      screen.getByText("Hello, I need help with plumbing")
    ).toBeInTheDocument();
  });

  it("shows unread indicator when has_unread is true", () => {
    const unreadConversation = { ...mockConversation, has_unread: true };

    const { container } = render(
      <LeadListItem
        conversation={unreadConversation}
        isSelected={false}
        onClick={mockOnClick}
      />
    );

    // Unread dot should be present (visual indicator)
    const unreadDot = container.querySelector(
      'div[style*="border-radius: 50%"]'
    );
    expect(unreadDot).toBeInTheDocument();
  });

  it("shows status badge", () => {
    render(
      <LeadListItem
        conversation={mockConversation}
        isSelected={false}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText("new")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();

    render(
      <LeadListItem
        conversation={mockConversation}
        isSelected={false}
        onClick={mockOnClick}
      />
    );

    const item = screen.getByText("John Doe").closest("div");
    if (item) {
      await user.click(item);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    }
  });

  it("applies selected styling when isSelected is true", () => {
    const { container } = render(
      <LeadListItem
        conversation={mockConversation}
        isSelected={true}
        onClick={mockOnClick}
      />
    );

    const item = container.firstChild as HTMLElement;
    expect(item.style.backgroundColor).toBe("rgb(239, 246, 255)"); // #eff6ff
  });
});
