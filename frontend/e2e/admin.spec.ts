import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.request.post('http://localhost:5000/api/test/login/admin@baca.local');
}

test.describe('Admin Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('users page shows user table', async ({ page }) => {
    await page.goto('/admin/users');

    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Admin user should be listed (seeded as "Tomáš" with email "admin@baca.local")
    await expect(page.getByText('admin@baca.local')).toBeVisible({ timeout: 10000 });
  });

  test('add new user appears in table', async ({ page }) => {
    await page.goto('/admin/users');

    // Click "Přidat uživatele" button
    await page.getByRole('button', { name: /přidat/i }).click();

    // Fill in user details - labels are "Jméno" and "Email"
    await page.getByLabel(/jméno/i).fill('E2E Test User');
    await page.getByLabel(/email/i).fill('e2e-test-user@baca.local');

    // Submit with "Přidat" button
    await page.getByRole('button', { name: /přidat/i }).last().click();

    // New user should appear in the table
    await expect(page.getByText('e2e-test-user@baca.local')).toBeVisible({ timeout: 10000 });
  });

  test('categories page shows seeded categories', async ({ page }) => {
    await page.goto('/admin/categories');

    const expectedCategories = ['Hra', 'Logistika', 'Jídlo', 'Rekvizity', 'Komunikace'];

    for (const category of expectedCategories) {
      await expect(page.getByText(category, { exact: false })).toBeVisible({ timeout: 10000 });
    }
  });

  test('settings page is accessible', async ({ page }) => {
    await page.goto('/admin/settings');

    await expect(page).not.toHaveURL(/\/login/);

    // Settings heading should be visible
    await expect(page.getByText('Nastavení')).toBeVisible({ timeout: 10000 });
  });
});
