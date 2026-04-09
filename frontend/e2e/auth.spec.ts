import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  const status = await page.evaluate(async () => {
    const resp = await fetch('/api/test/login/admin@baca.local', {
      method: 'POST',
      credentials: 'include',
    });
    return { status: resp.status, text: await resp.text() };
  });
  if (status.status !== 200) {
    throw new Error(`Admin login failed: ${status.status} - ${status.text}`);
  }
}

async function loginAsGuest(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  const status = await page.evaluate(async () => {
    const resp = await fetch('/api/test/login/guest@baca.local', {
      method: 'POST',
      credentials: 'include',
    });
    return { status: resp.status, text: await resp.text() };
  });
  if (status.status !== 200) {
    throw new Error(`Guest login failed: ${status.status} - ${status.text}`);
  }
}

test.describe('Authentication', () => {
  test('login page shows sign-in button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /přihlásit/i })).toBeVisible({ timeout: 10000 });
  });

  test('login page shows registrace redirect message', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/registrace\.ovcina\.cz/i)).toBeVisible({ timeout: 10000 });
  });

  test('test endpoint login works and redirects to home', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('guest login via test endpoint works', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
  });
});
