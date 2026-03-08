import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

async function loginAsAdmin(page: Page) {
  await page.request.post('/api/test/login/admin@baca.local');
}

async function loginAsGuest(page: Page) {
  await page.request.post('/api/auth/guest', {
    data: { pin: 'ovcina2026' },
  });
}

test.describe('Mobile Layout', () => {
  test('default page is Focus, not Dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');

    await expect(page).not.toHaveURL(/\/board/);
    await expect(page).not.toHaveURL(/\/dashboard/);

    // Focus heading "Můj fokus" should be visible
    await expect(
      page.getByText(/fokus|focus|moje/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('bottom tab bar is visible with navigation links', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');

    // Bottom navigation bar (last <nav> on page)
    const nav = page.locator('nav').last();
    await expect(nav).toBeVisible({ timeout: 10000 });

    // Should have multiple navigation links
    const links = nav.locator('a');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThanOrEqual(2);
  });

  test('board page shows columns', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/board');

    // At least some columns should be present
    const columnNames = ['Nápad', 'Otevřeno', 'V řešení', 'K revizi', 'Hotovo'];
    let visibleColumns = 0;

    for (const name of columnNames) {
      const column = page.getByText(name, { exact: false });
      if (await column.isVisible({ timeout: 3000 }).catch(() => false)) {
        visibleColumns++;
      }
    }

    expect(visibleColumns).toBeGreaterThanOrEqual(1);
  });

  test('task cards are present on focus page', async ({ page }) => {
    await loginAsAdmin(page);

    // Create and assign task to current user
    const response = await page.request.post('/api/tasks', {
      data: { title: 'E2E Mobile Focus Card', priority: 'High' },
    });
    const task = await response.json();
    await page.request.patch(`/api/tasks/${task.id}/assign-me`);

    await page.goto('/');
    await expect(page.getByText('E2E Mobile Focus Card')).toBeVisible({ timeout: 10000 });
  });

  test('admin tab hidden for non-admin (guest) users', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/');

    // Admin link should not be visible for guests
    await expect(
      page.getByRole('link', { name: /admin/i })
    ).not.toBeVisible({ timeout: 5000 });
  });
});
