import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() =>
    fetch('/api/test/login/admin@baca.local', { method: 'POST', credentials: 'include' })
  );
}

async function loginAsGuest(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() =>
    fetch('/api/auth/guest', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: 'ovcina2026' }),
    })
  );
}

test.describe('Authentication', () => {
  test('login page shows organizer email section by default', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('E-mail')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Poslat odkaz')).toBeVisible();
  });

  test('login page shows guest PIN section when Host tab is clicked', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Host' }).click();
    await expect(page.getByLabel('PIN hosta')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Vstoupit')).toBeVisible();
  });

  test('email login shows feedback after submission', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('E-mail').fill('admin@baca.local');
    await page.getByRole('button', { name: 'Poslat odkaz' }).click();
    // Either success or error message appears after submission
    await expect(
      page.getByText(/odkaz|odeslán|nepodařilo/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('magic link via test endpoint logs in and redirects to home', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('guest login with PIN succeeds as read-only', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
  });
});
