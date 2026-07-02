import { test, expect } from '@playwright/test';
import { stubExternal, ROOM, PLAYERS, DECK, RESULTS } from './fixtures';

// The complete host journey: create → lobby config → load deck → start →
// swipe all cards → reveal → results. All backends stubbed; runs on
// desktop AND mobile projects.
test('full host journey: create → configure → swipe → results', async ({ page }) => {
  await stubExternal(page);

  // ── API stubs for the journey ──
  await page.route('**/api/create-room', r => r.fulfill({
    json: { room: ROOM, player: PLAYERS[0], sessionToken: 'tok_host' },
  }));
  await page.route('**/api/content**', r => r.fulfill({ json: { results: DECK, count: DECK.length } }));
  const patches = [];
  await page.route('**/api/results/ABC234', r => {
    if (r.request().method() === 'PATCH') {
      patches.push(r.request().postDataJSON());
      return r.fulfill({ json: { room: { ...ROOM, status: 'swiping' } } });
    }
    return r.fulfill({ json: RESULTS });
  });
  await page.route('**/api/swipe', r => r.fulfill({ json: { ok: true } }));

  // ── 1. Landing → Get started launches the app → host from the dashboard ──
  await page.goto('/');
  await page.getByRole('button', { name: 'Get started' }).click();
  await page.getByRole('button', { name: /Continue as guest/ }).click(); // explicit choice
  await expect(page).toHaveURL(/\/app/);
  await page.getByRole('button', { name: /Host a room/ }).click();
  await page.getByLabel('Your name').fill('Ava'); // guest → name modal
  await page.getByRole('button', { name: /Create room/ }).click();

  // ── 2. Lobby renders with room code, members, deck-size pickers ──
  await expect(page).toHaveURL(/\/room\/ABC234/);
  await expect(page.getByText('ABC234').first()).toBeVisible();
  await expect(page.getByText('Invite friends')).toBeVisible();
  await expect(page.getByText('Ava', { exact: true })).toBeVisible();
  await expect(page.getByText('Deck size')).toBeVisible();

  // pick smaller decks (both pickers exist in "Both" mode)
  await page.getByRole('button', { name: '10', exact: true }).first().click();
  await page.getByRole('button', { name: '10', exact: true }).nth(1).click();

  // pick a platform, then load content
  await page.getByRole('button', { name: 'Netflix' }).click();
  await page.getByRole('button', { name: /Load movies & series/i }).click();
  await expect(page.getByText(/titles ready/)).toBeVisible();
  await expect(page.getByText('The Matrix').first()).toBeVisible();

  // ── 3. Start swiping — the deck is frozen onto the room ──
  await page.getByRole('button', { name: /Start swiping/ }).click();
  await expect(page.getByText(`${DECK.length} left`)).toBeVisible();
  expect(patches[0].deck).toHaveLength(DECK.length); // deck persisted at start
  expect(patches[0].movie_count).toBe(10);
  expect(patches[0].series_count).toBe(10);

  // ── 4. Swipe through every card (top card shows title + metadata) ──
  await expect(page.getByText('The Matrix')).toBeVisible();
  for (let i = 0; i < DECK.length; i++) {
    await page.getByRole('button', { name: 'Like' }).first().click();
    await page.waitForTimeout(260); // exit animation
  }

  // ── 5. Host reveal screen ──
  await expect(page.getByText('All done!')).toBeVisible();
  await page.getByRole('button', { name: /Reveal results/ }).click();

  // ── 6. Results: matches tab shows the unanimous pick ──
  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
  await expect(page.getByText(/1 perfect match/)).toBeVisible();
  await expect(page.getByText('The Matrix').first()).toBeVisible();

  // Top Picks tab shows ranked votes
  await page.getByRole('button', { name: /Top Picks/ }).click();
  await expect(page.getByText('2/2').first()).toBeVisible();
});
