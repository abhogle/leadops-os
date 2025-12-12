/**
 * Shell Access E2E Tests
 * Tests for app shell access with different user roles and scenarios
 *
 * NOTE: These tests are currently skipped as the authentication
 * system is not yet fully implemented. Un-skip when ready.
 */

import { test, expect } from '@playwright/test';

test.describe('App Shell Access - Non-Admin Users', () => {
  test.skip('should allow non-admin (owner) to access app shell', async ({ page, context }) => {
    // TODO: Set up authenticated session for non-admin user
    // For now, this would require API helpers to create session cookies

    await page.goto('/app/inbox');

    // Should see the app shell
    await expect(page.getByTestId('sidebar-nav')).toBeVisible();
    await expect(page.getByTestId('top-bar')).toBeVisible();

    // Should see navigation items
    await expect(page.getByRole('link', { name: /inbox/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /workflows/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /prompts/i })).toBeVisible();

    // Should NOT see admin navigation
    await expect(page.getByRole('link', { name: /^admin$/i })).not.toBeVisible();
  });

  test.skip('should allow non-admin (member) to access app shell', async ({ page }) => {
    // TODO: Set up authenticated session for member user

    await page.goto('/app/inbox');

    // Should see the app shell
    await expect(page.getByTestId('sidebar-nav')).toBeVisible();
    await expect(page.getByTestId('top-bar')).toBeVisible();

    // Should NOT see admin navigation
    await expect(page.getByRole('link', { name: /^admin$/i })).not.toBeVisible();
  });

  test.skip('should redirect non-admin from /app/admin to /app/inbox', async ({ page }) => {
    // TODO: Set up authenticated session for non-admin user

    await page.goto('/app/admin');

    // Should be redirected to inbox
    await expect(page).toHaveURL('/app/inbox');
  });
});

test.describe('App Shell Access - Unauthenticated', () => {
  test.skip('should redirect unauthenticated users to login', async ({ page }) => {
    // TODO: Implement when auth guards are in place

    await page.goto('/app/inbox');

    // Should be redirected to login
    await expect(page).toHaveURL('/auth/login');
  });

  test.skip('should redirect unauthenticated users from admin routes to login', async ({ page }) => {
    await page.goto('/app/admin');

    // Should be redirected to login
    await expect(page).toHaveURL('/auth/login');
  });
});
