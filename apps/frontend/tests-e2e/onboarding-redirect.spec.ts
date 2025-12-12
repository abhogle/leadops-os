/**
 * Onboarding Redirect E2E Tests
 * Tests for onboarding flow and redirect logic for admin users
 *
 * NOTE: These tests are currently skipped as the onboarding
 * system is not yet fully implemented.
 */

import { test, expect } from '@playwright/test';

test.describe('Onboarding Redirect - Admin Users', () => {
  test.skip('should redirect admin with incomplete onboarding to /onboarding from /app/inbox', async ({ page }) => {
    // TODO: Set up authenticated session for admin with incomplete onboarding
    // onboardingStatus: 'org_created' or 'email_connected', etc.

    await page.goto('/app/inbox');

    // Should be redirected to onboarding
    await expect(page).toHaveURL('/onboarding');
    await expect(page.getByRole('heading', { name: /onboarding/i })).toBeVisible();
  });

  test.skip('should redirect admin with incomplete onboarding to /onboarding from /app/workflows', async ({ page }) => {
    // TODO: Set up authenticated session for admin with incomplete onboarding

    await page.goto('/app/workflows');

    // Should be redirected to onboarding
    await expect(page).toHaveURL('/onboarding');
  });

  test.skip('should redirect admin with incomplete onboarding to /onboarding from /app/admin', async ({ page }) => {
    // TODO: Set up authenticated session for admin with incomplete onboarding

    await page.goto('/app/admin');

    // Should be redirected to onboarding
    await expect(page).toHaveURL('/onboarding');
  });

  test.skip('should NOT redirect admin if already on /onboarding page', async ({ page }) => {
    // TODO: Set up authenticated session for admin with incomplete onboarding

    await page.goto('/onboarding');

    // Should stay on onboarding (no redirect loop)
    await expect(page).toHaveURL('/onboarding');
    await expect(page.getByRole('heading', { name: /onboarding/i })).toBeVisible();
  });

  test.skip('should allow admin to complete onboarding and access app', async ({ page }) => {
    // TODO: Set up authenticated session for admin with incomplete onboarding
    // TODO: Implement onboarding flow completion

    await page.goto('/onboarding');

    // Complete onboarding steps (placeholder - actual steps depend on onboarding implementation)
    await page.getByRole('button', { name: /continue/i }).click();
    // ... more onboarding steps

    await page.getByRole('button', { name: /finish/i }).click();

    // Should be redirected to app after completion
    await expect(page).toHaveURL('/app/inbox');
  });
});

test.describe('Onboarding Redirect - Non-Admin Users', () => {
  test.skip('should NOT redirect non-admin (owner) users to /onboarding', async ({ page }) => {
    // TODO: Set up authenticated session for non-admin user

    await page.goto('/app/inbox');

    // Should stay on inbox (no onboarding redirect for non-admins)
    await expect(page).toHaveURL('/app/inbox');
    await expect(page.getByTestId('sidebar-nav')).toBeVisible();
  });

  test.skip('should NOT redirect non-admin (member) users to /onboarding', async ({ page }) => {
    // TODO: Set up authenticated session for member user

    await page.goto('/app/workflows');

    // Should stay on workflows (no onboarding redirect for non-admins)
    await expect(page).toHaveURL('/app/workflows');
  });
});

test.describe('Onboarding Status Progression', () => {
  test.skip('should handle onboarding status progression correctly', async ({ page }) => {
    // TODO: Set up authenticated session for admin
    // Start with onboardingStatus: 'org_created'

    await page.goto('/app/inbox');

    // Should redirect to onboarding
    await expect(page).toHaveURL('/onboarding');

    // TODO: Simulate onboarding completion via API
    // Update onboardingStatus to 'completed'

    // Navigate to app again
    await page.goto('/app/inbox');

    // Should now allow access without redirect
    await expect(page).toHaveURL('/app/inbox');
    await expect(page.getByTestId('sidebar-nav')).toBeVisible();
  });
});
