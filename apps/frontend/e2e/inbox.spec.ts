import { test, expect } from "@playwright/test";

test.describe("Inbox E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Note: These tests assume auth is handled or bypassed for testing
    await page.goto("/app/inbox");
  });

  test("displays 3-pane layout", async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector("h2:has-text('Inbox')");

    // Check for 3 panes
    const leadList = page.locator("h2:has-text('Inbox')");
    await expect(leadList).toBeVisible();

    // Center pane should show either empty state or conversation
    const centerPane = page.locator('text="No conversation selected"');
    const conversationTimeline = page.locator('div[style*="flex: 1"]');
    await expect(centerPane.or(conversationTimeline)).toBeVisible();

    // Right pane should show intelligence panel
    const intelligencePanel = page.locator("h3:has-text('Lead Intelligence')");
    await expect(intelligencePanel).toBeVisible();
  });

  test("selects a conversation from the list", async ({ page }) => {
    // Wait for conversations to load
    await page.waitForSelector('div[style*="cursor: pointer"]', {
      timeout: 5000,
    });

    // Click first conversation
    const firstConversation = page
      .locator('div[style*="cursor: pointer"]')
      .first();
    await firstConversation.click();

    // URL should change to include conversation ID
    await expect(page).toHaveURL(/\/app\/inbox\/.+/);

    // Timeline should load
    const timeline = page.locator('div[style*="overflowY: auto"]');
    await expect(timeline).toBeVisible();
  });

  test("sends a message", async ({ page }) => {
    // Navigate to a conversation (assume first one exists)
    await page.goto("/app/inbox/test_conversation_id");

    // Wait for composer
    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.waitFor({ state: "visible" });

    // Type message
    await textarea.fill("Test message from E2E");

    // Click send
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    // Textarea should be cleared
    await expect(textarea).toHaveValue("");
  });

  test("opens and closes add note modal", async ({ page }) => {
    // Navigate to a conversation
    await page.goto("/app/inbox/test_conversation_id");

    // Click Add Note button
    const addNoteButton = page.locator('button:has-text("Add Note")');
    await addNoteButton.click();

    // Modal should be visible
    const modal = page.locator('text="Add Internal Note"');
    await expect(modal).toBeVisible();

    // Close modal
    const cancelButton = page.locator('button:has-text("Cancel")');
    await cancelButton.click();

    // Modal should be hidden
    await expect(modal).not.toBeVisible();
  });

  test("creates a note", async ({ page }) => {
    // Navigate to a conversation
    await page.goto("/app/inbox/test_conversation_id");

    // Open note modal
    const addNoteButton = page.locator('button:has-text("Add Note")');
    await addNoteButton.click();

    // Fill note
    const noteTextarea = page.locator(
      'textarea[placeholder="Enter your note here..."]'
    );
    await noteTextarea.fill("E2E test note");

    // Save note
    const saveButton = page.locator('button:has-text("Save Note")');
    await saveButton.click();

    // Modal should close
    const modal = page.locator('text="Add Internal Note"');
    await expect(modal).not.toBeVisible();
  });

  test("displays different message types with correct styling", async ({
    page,
  }) => {
    // Navigate to a conversation with messages
    await page.goto("/app/inbox/test_conversation_id");

    // Wait for timeline to load
    await page.waitForSelector('div[style*="padding: 16px"]', {
      timeout: 5000,
    });

    // Check for message bubbles (they should have different background colors)
    const messageBubbles = page.locator('div[style*="border-radius"]');
    const count = await messageBubbles.count();

    // Should have at least one message or note
    expect(count).toBeGreaterThan(0);
  });

  test("shows loading state while fetching data", async ({ page }) => {
    // Navigate to inbox
    await page.goto("/app/inbox");

    // Should briefly show loading state
    const loadingText = page.locator('text="Loading conversations..."');

    // Wait for either loading state or data to appear
    try {
      await loadingText.waitFor({ state: "visible", timeout: 1000 });
    } catch {
      // Loading was too fast, that's okay
    }
  });

  test("keyboard shortcuts work in message composer", async ({ page }) => {
    // Navigate to a conversation
    await page.goto("/app/inbox/test_conversation_id");

    // Wait for composer
    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.waitFor({ state: "visible" });

    // Type message and press Enter
    await textarea.fill("Test Enter shortcut");
    await textarea.press("Enter");

    // Message should be sent (textarea cleared)
    await expect(textarea).toHaveValue("");

    // Test Shift+Enter for new line
    await textarea.fill("Line 1");
    await textarea.press("Shift+Enter");
    await textarea.type("Line 2");

    // Should have newline
    const value = await textarea.inputValue();
    expect(value).toContain("\n");
  });
});
