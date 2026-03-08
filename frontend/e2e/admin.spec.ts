import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() =>
    fetch('/api/test/login/admin@baca.local', { method: 'POST', credentials: 'include' })
  );
}

test.describe('Admin Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('users page shows user table', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('admin@baca.local')).toBeVisible({ timeout: 10000 });
  });

  test('categories page shows seeded categories', async ({ page }) => {
    await page.goto('/admin/categories');
    await page.waitForLoadState('networkidle');

    const expectedCategories = ['Hra', 'Logistika', 'Jídlo', 'Rekvizity', 'Komunikace'];

    for (const category of expectedCategories) {
      await expect(page.getByText(category, { exact: false })).toBeVisible({ timeout: 10000 });
    }
  });

  test('settings page is accessible', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText('Nastavení')).toBeVisible({ timeout: 10000 });
  });
});
