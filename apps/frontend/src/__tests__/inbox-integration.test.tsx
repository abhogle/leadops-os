import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import InboxConversationPage from "../../app/app/inbox/[conversationId]/page";

// Mock Next.js hooks
jest.mock("next/navigation", () => ({
  useParams: () => ({ conversationId: "conv_test_123" }),
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// MSW server setup
const server = setupServer(
  // GET /api/v1/inbox
  http.get("/api/v1/inbox", () => {
    return HttpResponse.json({
      conversations: [
        {
          conversation_id: "conv_test_123",
          lead_id: "lead_456",
          lead_name: "John Doe",
          lead_phone: "+15551234567",
          last_message: "Hello, I need help",
          last_message_at: new Date().toISOString(),
          has_unread: true,
          assigned_to_name: "Agent Jane",
          status: "new",
        },
      ],
      total: 1,
    });
  }),

  // GET /api/v1/conversations/:id/messages
  http.get("/api/v1/conversations/:conversationId/messages", ({ params }) => {
    return HttpResponse.json({
      conversation_id: params.conversationId,
      lead: {
        id: "lead_456",
        name: "John Doe",
        phone: "+15551234567",
        status: "new",
      },
      assigned_to_name: "Agent Jane",
      messages: [
        {
          id: "msg_1",
          sender: "lead",
          body: "Hello, I need help with plumbing",
          created_at: new Date().toISOString(),
        },
        {
          id: "msg_2",
          sender: "human",
          body: "Hi John, how can I help?",
          created_at: new Date().toISOString(),
          sent_by_name: "Agent Jane",
          status: "delivered",
        },
      ],
      notes: [
        {
          id: "note_1",
          body: "Lead seems urgent",
          created_at: new Date().toISOString(),
          created_by_name: "Agent Jane",
        },
      ],
    });
  }),

  // POST /api/v1/conversations/:id/messages
  http.post(
    "/api/v1/conversations/:conversationId/messages",
    async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json(
        {
          id: "msg_new",
          conversation_id: "conv_test_123",
          sender: "human",
          body: (body as any).body,
          created_at: new Date().toISOString(),
          status: "sent",
        },
        { status: 201 }
      );
    }
  ),

  // POST /api/v1/notes
  http.post("/api/v1/notes", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        id: "note_new",
        conversation_id: (body as any).conversation_id,
        body: (body as any).body,
        created_at: new Date().toISOString(),
        created_by_name: "Test User",
      },
      { status: 201 }
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("Inbox Integration Tests", () => {
  it("loads and displays conversation list and timeline", async () => {
    render(<InboxConversationPage />);

    // Wait for inbox to load
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Wait for timeline to load
    await waitFor(() => {
      expect(
        screen.getByText("Hello, I need help with plumbing")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Hi John, how can I help?")
      ).toBeInTheDocument();
      expect(screen.getByText("Lead seems urgent")).toBeInTheDocument();
    });
  });

  it("sends a message successfully", async () => {
    const user = userEvent.setup();

    render(<InboxConversationPage />);

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText("Type a message...");
    const sendButton = screen.getByText("Send");

    await user.type(textarea, "This is a test message");
    await user.click(sendButton);

    // Message should be sent and textarea cleared
    await waitFor(() => {
      expect((textarea as HTMLTextAreaElement).value).toBe("");
    });
  });

  it("creates a note successfully", async () => {
    const user = userEvent.setup();

    render(<InboxConversationPage />);

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText("+ Add Note")).toBeInTheDocument();
    });

    const addNoteButton = screen.getByText("+ Add Note");
    await user.click(addNoteButton);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByText("Add Internal Note")).toBeInTheDocument();
    });

    const noteTextarea = screen.getByPlaceholderText("Enter your note here...");
    const saveButton = screen.getByText("Save Note");

    await user.type(noteTextarea, "This is a test note");
    await user.click(saveButton);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText("Add Internal Note")).not.toBeInTheDocument();
    });
  });

  it("handles API errors gracefully", async () => {
    // Override handler to return error
    server.use(
      http.get("/api/v1/inbox", () => {
        return HttpResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      })
    );

    render(<InboxConversationPage />);

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText("Failed to load conversations")).toBeInTheDocument();
    });
  });

  it("shows empty state when no conversations", async () => {
    // Override handler to return empty list
    server.use(
      http.get("/api/v1/inbox", () => {
        return HttpResponse.json({
          conversations: [],
          total: 0,
        });
      })
    );

    render(<InboxConversationPage />);

    // Should show empty state
    await waitFor(() => {
      expect(screen.getByText("No conversations yet")).toBeInTheDocument();
    });
  });
});
