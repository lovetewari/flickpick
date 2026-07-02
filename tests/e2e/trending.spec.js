import { test, expect } from '@playwright/test';
import { stubExternal, TREND_ITEMS } from './fixtures';

// Trending section on the landing — every state, both viewports.
test.describe('trending section', () => {
  test('shows a skeleton while loading, then real poster cards', async ({ page }) => {
    await stubExternal(page);
    await page.unroute('**/api/posters');
    let release;
    const gate = new Promise(res => { release = res; });
    await page.route('**/api/posters', async r => {
      await gate; // hold the response open until the skeleton is asserted
      await r.fulfill({ json: { items: TREND_ITEMS, posters: TREND_ITEMS.map(i => i.poster) } });
    });
    await page.goto('/');
    await expect(page.getByTestId('trending-skeleton')).toBeVisible();      // loading state
    release();
    await expect(page.getByAltText('The Matrix poster')).toBeVisible({ timeout: 8000 });
    await expect(page.getByAltText('Breaking Bad poster')).toBeVisible();   // series mixed in
    await expect(page.getByTestId('trending-skeleton')).not.toBeVisible();
    // Cards don't break layout
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('shows an error state with retry when the service fails, and recovers', async ({ page }) => {
    await stubExternal(page);
    await page.unroute('**/api/posters');
    let fail = true;
    await page.route('**/api/posters', r => fail
      ? r.fulfill({ status: 500, json: { error: 'boom' } })
      : r.fulfill({ json: { items: TREND_ITEMS, posters: [] } }));
    await page.goto('/');
    await expect(page.getByText("Couldn't load trending titles")).toBeVisible();
    fail = false;
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByAltText('The Matrix poster')).toBeVisible();
  });

  test('shows an empty state when no titles are returned', async ({ page }) => {
    await stubExternal(page); // default stub: empty items
    await page.goto('/');
    await expect(page.getByText('Trending list is warming up')).toBeVisible();
  });
});
