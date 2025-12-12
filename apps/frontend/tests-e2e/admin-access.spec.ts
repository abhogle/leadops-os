/**
 * Admin Access E2E Tests
 * Tests for admin user access with completed onboarding
 *
 * NOTE: These tests are currently skipped as the authentication
 * and onboarding systems are not yet fully implemented.
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Access - Completed Onboarding', () => {
  test.skip('should allow admin with completed onboarding to access /app/inbox', async ({ page }) => {
    // TODO: Set up authenticated session for admin with completed onboarding

    await page.goto('/app/inbox');

    // Should see the app shell
    await expect(page.getByTestId('sidebar-nav')).toBeVisible();
    await expect(page.getByTestId('top-bar')).toBeVisible();

    // Should see all navigation items including Admin
    await expect(page.getByRole('link', { name: /inbox/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /workflows/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^admin$/i })).toBeVisible();
  });

  test.skip('should allow admin to access /app/admin routes', async ({ page }) => {
    // TODO: Set up authenticated session for admin with completed onboarding

    await page.goto('/app/admin');

    // Should see admin page
    await expect(page).toHaveURL('/app/admin');
    await expect(page.getByRole('heading', { name: /admin/i })).toBeVisible();
  });

  test.skip('should allow admin to access nested admin routes', async ({ page }) => {
    // TODO: Set up authenticated session for admin with completed onboarding

    await page.goto('/app/admin/client-settings');

    // Should see client settings page
    await expect(page).toHaveURL('/app/admin/client-settings');
    await expect(page.getByRole('heading', { name: /client settings/i })).toBeVisible();

    // Admin nav should be highlighted as active
    const adminLink = page.getByRole('link', { name: /^admin$/i });
    await expect(adminLink).toHaveCSS('font-weight', '600');
  });

  test.skip('should show full navigation menu for admin', async ({ page }) => {
    // TODO: Set up authenticated session for admin with completed onboarding

    await page.goto('/app/inbox');

    // Should see all nav items
    const navLinks = [
      'Inbox',
      'Workflows',
      'Prompts',
      'Intelligence',
      'Connectors',
      'Admin',
    ];

    for (const linkText of navLinks) {
      await expect(page.getByRole('link', { name: linkText })).toBeVisible();
    }
  });

  test.skip('should allow navigation between admin and non-admin routes', async ({ page }) => {
    // TODO: Set up authenticated session for admin with completed onboarding

    await page.goto('/app/inbox');
    await expect(page).toHaveURL('/app/inbox');

    // Navigate to admin
    await page.getByRole('link', { name: /^admin$/i }).click();
    await expect(page).toHaveURL('/app/admin');

    // Navigate back to inbox
    await page.getByRole('link', { name: /inbox/i }).click();
    await expect(page).toHaveURL('/app/inbox');
  });
});
