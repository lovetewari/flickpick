import { test, expect } from '@playwright/test';
import { stubExternal } from './fixtures';

// Runs in BOTH projects (desktop + iPhone 13), covering responsive behavior.
test.describe('landing page', () => {
  test.beforeEach(async ({ page }) => {
    await stubExternal(page);
    await page.goto('/');
  });

  test('renders the hero sequence: logo first, then the icon cluster', async ({ page }) => {
    // Logo (cluster center) is part of the first paint
    await expect(page.locator('.hero-center')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'FlickPick' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get started' }).first()).toBeVisible();

    // Satellites pop in AFTER the logo moment (delays start ~1.95s)
    await expect(page.locator('.sat .app-tile').first()).toBeVisible({ timeout: 6000 });
    expect(await page.locator('.sat').count()).toBe(7);
  });

  test('shows the brand tagline', async ({ page }) => {
    await expect(page.getByText('Watch together. Pick together.')).toBeVisible();
  });

  test('exactly ONE Get started CTA on the landing screen', async ({ page }) => {
    expect(await page.getByRole('button', { name: 'Get started' }).count()).toBe(1);
  });

  test('"Get started" opens the choice flow — never auto-guest', async ({ page }) => {
    await page.getByRole('button', { name: 'Get started' }).click();
    const dialog = page.getByRole('dialog', { name: 'Get started' });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/$/); // still on landing — no automatic redirect
    await expect(dialog.getByRole('button', { name: /Sign in \/ Create account/ })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Continue as guest/ })).toBeVisible();
    // Escape closes it
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('guest mode opens ONLY after choosing Continue as guest', async ({ page }) => {
    await page.getByRole('button', { name: 'Get started' }).click();
    await page.getByRole('button', { name: /Continue as guest/ }).click();
    await expect(page).toHaveURL(/\/app/);
    await expect(page.getByRole('button', { name: /Host a room/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Guest' })).toBeVisible();
  });

  test('/app without guest choice or session bounces back to landing', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
  });

  test('login page "Continue as guest" enters the app (not a redirect loop)', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Continue as guest/ }).click();
    await expect(page).toHaveURL(/\/app/);
    await expect(page.getByRole('button', { name: /Host a room/ })).toBeVisible();
  });

  test('platform row shows validated real logos, IMAX mark, and legal credits', async ({ page }) => {
    await page.unroute('**/api/providers');
    await page.route('**/api/providers', r => r.fulfill({ json: { providers: [
      { name: 'Netflix', logo: 'https://image.tmdb.org/t/p/w92/nf.jpg' },
      { name: 'Prime Video', logo: 'https://image.tmdb.org/t/p/w92/pv.jpg' },
    ] } }));
    await page.goto('/');
    await expect(page.getByAltText('Netflix')).toBeVisible();
    await expect(page.getByAltText('Prime Video')).toBeVisible();
    await expect(page.getByText('IMAX', { exact: true })).toBeVisible();
    await expect(page.getByText(/courtesy of/)).toBeVisible();        // JustWatch/TMDB credit
    await expect(page.getByText(/not endorsed or certified by TMDB/)).toBeVisible();
  });

  test('features section explains the product', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Movie night, decided.' })).toBeVisible();
    await expect(page.getByText('Swipe together', { exact: true })).toBeVisible();
    await expect(page.getByText('Match instantly', { exact: true })).toBeVisible();
  });

  test('no horizontal overflow at this viewport', async ({ page }) => {
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

});
