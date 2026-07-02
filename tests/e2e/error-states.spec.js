import { test, expect } from '@playwright/test';
import { stubExternal, seedSession, ROOM, PLAYERS, DECK } from './fixtures';

test.describe('failure handling', () => {
  test('empty catalog → lobby surfaces the seed hint instead of hanging', async ({ page }) => {
    await stubExternal(page);
    await seedSession(page);
    await page.route('**/api/content**', r => r.fulfill({
      status: 503, json: { error: 'Catalog is empty — run `node scripts/seed-catalog.mjs` once (see README).', results: [] },
    }));

    await page.goto('/room/ABC234');
    await expect(page.getByText('Deck size')).toBeVisible();
    await page.getByRole('button', { name: 'Netflix' }).click();
    await page.getByRole('button', { name: /Load movies & series/i }).click();
    await expect(page.getByText(/Catalog is empty/)).toBeVisible(); // toast, not a dead spinner
  });

  test('results fetch failure → retry card instead of an infinite spinner', async ({ page }) => {
    await stubExternal(page, { room: { ...ROOM, status: 'results', deck: DECK } });
    await seedSession(page);
    let fail = true;
    await page.route('**/api/results/ABC234', r => {
      if (fail) return r.fulfill({ status: 500, json: { error: 'boom' } });
      return r.fulfill({ json: { room: { ...ROOM, status: 'results' }, players: PLAYERS, matchIds: [603], ranked: [{ contentId: 603, votes: 2, voterIds: ['p1', 'p2'] }], individual: {} } });
    });

    await page.goto('/room/ABC234');
    await expect(page.getByText("Couldn't load results")).toBeVisible();

    fail = false;
    // Tap Retry — in dev, a StrictMode duplicate fetch can self-recover the
    // screen at the same moment, detaching the button mid-click. Either
    // recovery path is correct; the contract is: results end up visible.
    await page.getByRole('button', { name: 'Retry' }).click({ timeout: 5000 }).catch(() => {});
    await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/1 perfect match/)).toBeVisible();
  });

  test('mid-game refresh resumes at the right card (progress restore)', async ({ page }) => {
    // Room already swiping with a frozen deck; this player already swiped card 1
    await stubExternal(page, { room: { ...ROOM, status: 'swiping', deck: DECK } });
    await seedSession(page, { host: false, token: 'tok_guest' });
    await page.unroute('**/rest/v1/swipes**');
    await page.route('**/rest/v1/swipes**', r => r.fulfill({ json: [{ content_id: DECK[0].id }] }));
    await page.route('**/api/swipe', r => r.fulfill({ json: { ok: true } }));

    await page.goto('/room/ABC234');
    // Deck has 3 cards, 1 already swiped server-side → "2 left", card 2 on top
    await expect(page.getByText('2 left')).toBeVisible();
    await expect(page.getByText(DECK[1].title)).toBeVisible();
  });

  test('invalid room link shows a clean error state (no silent redirect)', async ({ page }) => {
    await stubExternal(page, { room: null });
    await page.goto('/room/ZZZZZZ');
    await expect(page.getByText('Room not found')).toBeVisible();
    await page.getByRole('button', { name: 'Go home' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('invalid invite link on /join shows a clean error state', async ({ page }) => {
    await stubExternal(page, { room: null });
    await page.goto('/join/ZZZZZZ');
    await expect(page.getByText('Invite link not valid')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go home' })).toBeVisible();
  });
});
