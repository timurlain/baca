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

    const table = page.getByRole('table').or(page.locator('table, [data-testid="user-table"]'));
    await expect(table).toBeVisible({ timeout: 10000 });

    // Admin user should be listed
    await expect(page.getByText('admin@baca.local')).toBeVisible();
  });

  test('add new user appears in table', async ({ page }) => {
    await page.goto('/admin/users');

    // Click add user button
    const addButton = page.getByRole('button', { name: /přidat|nový/i });
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // Fill in user details
    const emailInput = page.getByLabel(/e-mail|email/i);
    await emailInput.fill('e2e-test-user@baca.local');

    const nameInput = page.getByLabel(/jméno|name/i);
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('E2E Test User');
    }

    // Submit
    const submitButton = page.getByRole('button', { name: /uložit|přidat|vytvořit/i });
    await submitButton.click();

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

    // Settings page should render without redirecting to login
    await expect(page).not.toHaveURL(/\/login/);

    // Some settings content should be visible
    await expect(
      page.getByText(/nastavení|settings/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
