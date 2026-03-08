import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

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
    const resp = await fetch('/api/auth/guest', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: 'ovcina2026' }),
    });
    return { status: resp.status, text: await resp.text() };
  });
  if (status.status !== 200) {
    throw new Error(`Guest login failed: ${status.status} - ${status.text}`);
  }
}

test.describe('Mobile Layout', () => {
  test('default page is Focus, not Dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/board/);
    await expect(page).not.toHaveURL(/\/dashboard/);
    await expect(
      page.getByText(/fokus|focus|moje/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('bottom tab bar is visible with navigation links', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('nav').last();
    await expect(nav).toBeVisible({ timeout: 10000 });

    const links = nav.locator('a');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThanOrEqual(2);
  });

  test('admin tab hidden for non-admin (guest) users', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('link', { name: /admin/i })
    ).not.toBeVisible({ timeout: 5000 });
  });
});
