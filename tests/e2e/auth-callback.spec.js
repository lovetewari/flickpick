import { test, expect } from '@playwright/test';
import { stubExternal, seedSignedIn } from './fixtures';

// OAuth return page — the fix for the sign-in loop. Runs on desktop + mobile.
test.describe('OAuth callback', () => {
  test('completes sign-in (session present) → lands in the app', async ({ page }) => {
    await stubExternal(page, {
      profile: { id: 'user_123', full_name: 'Ava', email: 'ava@example.com', plan: 'free' },
    });
    await seedSignedIn(page, { id: 'user_123', email: 'ava@example.com', name: 'Ava' });
    await page.goto('/auth/callback?code=fake-oauth-code');
    await expect(page).toHaveURL(/\/app/);
    await expect(page.getByRole('heading', { name: 'Ava' })).toBeVisible();
  });

  test('provider error bounces cleanly back to /login (no loop)', async ({ page }) => {
    await stubExternal(page);
    await page.goto('/auth/callback?error=access_denied&error_description=denied');
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows a "signing you in" state while resolving', async ({ page }) => {
    await stubExternal(page);
    await page.goto('/auth/callback?code=pending');
    await expect(page.getByText('Signing you in…')).toBeVisible();
  });
});
