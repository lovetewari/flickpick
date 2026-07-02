import { test, expect } from '@playwright/test';
import { stubExternal, seedGuest, ROOM, PLAYERS } from './fixtures';

// The app home (/app) — runs on BOTH desktop and mobile projects.
test.describe('app dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await stubExternal(page);
    await seedGuest(page); // explicit guest choice persisted
    await page.goto('/app');
  });

  test('shows all the working tiles and guest state', async ({ page }) => {
    for (const tile of ['Host a room', 'Join a room', 'History', 'Matches', 'My rooms', 'Profile']) {
      await expect(page.getByRole('button', { name: new RegExp(tile) })).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: 'Guest' })).toBeVisible(); // guest profile card
    await expect(page.getByText('Sign in to sync')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('no horizontal overflow at this viewport', async ({ page }) => {
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('guest hosting asks for a name, shows loading, then surfaces API errors', async ({ page }) => {
    await page.route('**/api/create-room', async r => {
      await new Promise(res => setTimeout(res, 600));
      await r.fulfill({ status: 500, json: { error: 'Database unreachable' } });
    });
    await page.getByRole('button', { name: /Host a room/ }).click();
    // guest → name modal; button disabled until a name is typed
    const create = page.getByRole('button', { name: /Create room/ });
    await expect(create).toBeDisabled();
    await page.getByLabel('Your name').fill('Ava');
    await create.click();
    await expect(page.getByText('Creating…')).toBeVisible();            // loading state
    await expect(page.getByText('Database unreachable')).toBeVisible(); // failure toast
  });

  test('guest hosting creates the room and enters the lobby', async ({ page }) => {
    await page.route('**/api/create-room', r => r.fulfill({
      json: { room: ROOM, player: PLAYERS[0], sessionToken: 'tok_host' },
    }));
    await page.getByRole('button', { name: /Host a room/ }).click();
    await page.getByLabel('Your name').fill('Ava');
    await page.getByRole('button', { name: /Create room/ }).click();
    await expect(page).toHaveURL(/\/room\/ABC234/);
    await expect(page.getByText('Invite friends')).toBeVisible();
  });

  test('login-required tiles are greyed out for guests and open the sign-in modal', async ({ page }) => {
    for (const t of ['History', 'Matches', 'My rooms', 'Profile']) {
      await expect(page.getByRole('button', { name: new RegExp(t) })).toHaveAttribute('aria-disabled', 'true');
    }
    await page.getByRole('button', { name: /History/ }).click({ force: true }); // aria-disabled: real users can click
    const dialog = page.getByRole('dialog', { name: 'Sign in required' });
    await expect(dialog).toBeVisible();
    // Escape closes
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    // Cross button closes
    await page.getByRole('button', { name: /Matches/ }).click({ force: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).not.toBeVisible();
    // Sign in redirect works
    await page.getByRole('button', { name: /Profile/ }).click({ force: true });
    await dialog.getByRole('button', { name: /^Sign in$/ }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('join modal validates and joins a room by code', async ({ page }) => {
    await page.route('**/api/join-room', r => r.fulfill({
      json: { room: ROOM, player: PLAYERS[1], sessionToken: 'tok_guest' },
    }));
    await page.getByRole('button', { name: /Join a room/ }).click();
    await page.getByPlaceholder('ABC123').fill('ABC234');
    await page.getByRole('button', { name: /Join room/ }).click();
    await expect(page).toHaveURL(/\/room\/ABC234/);
  });
});
