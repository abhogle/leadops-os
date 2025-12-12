/**
 * Login E2E Tests
 * Tests for user authentication and login flow
 *
 * NOTE: These tests are currently skipped as the authentication
 * system is not yet implemented. Un-skip when auth is ready.
 */

import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login');
  });

  test.skip('should display login form', async ({ page }) => {
    // TODO: Implement when login page exists
    await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
  });

  test.skip('should successfully log in a non-admin user and redirect to inbox', async ({ page }) => {
    // TODO: Implement when auth system is ready
    // Fill in login form
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/password/i).fill('password123');

    // Submit form
    await page.getByRole('button', { name: /log in/i }).click();

    // Should redirect to /app/inbox
    await expect(page).toHaveURL('/app/inbox');

    // Should see inbox page
    await expect(page.getByRole('heading', { name: /inbox/i })).toBeVisible();
  });

  test.skip('should show error message for invalid credentials', async ({ page }) => {
    // TODO: Implement when auth system is ready
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /log in/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();

    // Should remain on login page
    await expect(page).toHaveURL('/auth/login');
  });

  test.skip('should validate required fields', async ({ page }) => {
    // TODO: Implement when auth system is ready
    await page.getByRole('button', { name: /log in/i }).click();

    // Should show validation errors
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });
});
