import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageComposer } from "../MessageComposer";

describe("MessageComposer", () => {
  const mockOnSendMessage = jest.fn();

  beforeEach(() => {
    mockOnSendMessage.mockClear();
  });

  it("renders textarea with placeholder", () => {
    render(
      <MessageComposer
        conversationId="conv_123"
        onSendMessage={mockOnSendMessage}
      />
    );

    expect(
      screen.getByPlaceholderText("Type a message...")
    ).toBeInTheDocument();
    expect(screen.getByText("Send")).toBeInTheDocument();
  });

  it("sends message on button click", async () => {
    const user = userEvent.setup();
    mockOnSendMessage.mockResolvedValue(undefined);

    render(
      <MessageComposer
        conversationId="conv_123"
        onSendMessage={mockOnSendMessage}
      />
    );

    const textarea = screen.getByPlaceholderText("Type a message...");
    const sendButton = screen.getByText("Send");

    await user.type(textarea, "Hello world");
    await user.click(sendButton);

    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledWith("Hello world");
    });
  });

  it("sends message on Enter key", async () => {
    const user = userEvent.setup();
    mockOnSendMessage.mockResolvedValue(undefined);

    render(
      <MessageComposer
        conversationId="conv_123"
        onSendMessage={mockOnSendMessage}
      />
    );

    const textarea = screen.getByPlaceholderText("Type a message...");

    await user.type(textarea, "Test message{Enter}");

    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledWith("Test message");
    });
  });

  it("adds new line on Shift+Enter", async () => {
    const user = userEvent.setup();

    render(
      <MessageComposer
        conversationId="conv_123"
        onSendMessage={mockOnSendMessage}
      />
    );

    const textarea = screen.getByPlaceholderText(
      "Type a message..."
    ) as HTMLTextAreaElement;

    await user.type(textarea, "Line 1{Shift>}{Enter}{/Shift}Line 2");

    expect(textarea.value).toContain("\n");
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it("clears textarea after sending", async () => {
    const user = userEvent.setup();
    mockOnSendMessage.mockResolvedValue(undefined);

    render(
      <MessageComposer
        conversationId="conv_123"
        onSendMessage={mockOnSendMessage}
      />
    );

    const textarea = screen.getByPlaceholderText(
      "Type a message..."
    ) as HTMLTextAreaElement;
    const sendButton = screen.getByText("Send");

    await user.type(textarea, "Test");
    await user.click(sendButton);

    await waitFor(() => {
      expect(textarea.value).toBe("");
    });
  });

  it("shows character counter for long messages", async () => {
    const user = userEvent.setup();

    render(
      <MessageComposer
        conversationId="conv_123"
        onSendMessage={mockOnSendMessage}
      />
    );

    const textarea = screen.getByPlaceholderText("Type a message...");

    await user.type(textarea, "a".repeat(200));

    expect(screen.getByText(/200.*2 SMS/)).toBeInTheDocument();
  });

  it("disables send button when textarea is empty", () => {
    render(
      <MessageComposer
        conversationId="conv_123"
        onSendMessage={mockOnSendMessage}
      />
    );

    const sendButton = screen.getByText("Send");
    expect(sendButton).toBeDisabled();
  });

  it("shows sending state", () => {
    render(
      <MessageComposer
        conversationId="conv_123"
        onSendMessage={mockOnSendMessage}
        isSending={true}
      />
    );

    expect(screen.getByText("Sending...")).toBeInTheDocument();
  });

  it("displays error message", () => {
    render(
      <MessageComposer
        conversationId="conv_123"
        onSendMessage={mockOnSendMessage}
        error="Failed to send"
      />
    );

    expect(
      screen.getByText(/Failed to send message: Failed to send/)
    ).toBeInTheDocument();
  });
});
