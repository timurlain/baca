import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

async function loginAsAdmin(page: Page) {
  await page.request.post('http://localhost:5000/api/test/login/admin@baca.local');
}

async function loginAsGuest(page: Page) {
  await page.request.post('http://localhost:5000/api/auth/guest', {
    data: { pin: 'ovcina2026' },
  });
}

test.describe('Mobile Layout', () => {
  test('default page is Focus, not Dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');

    // Should land on Focus page (not dashboard/board)
    await expect(page).not.toHaveURL(/\/board/);
    await expect(page).not.toHaveURL(/\/dashboard/);

    // Focus-related content should be visible
    await expect(
      page.getByText(/focus|úkoly|moje úkoly/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('bottom tab bar is visible with tabs', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');

    // Bottom navigation bar should be visible
    const tabBar = page.locator(
      'nav, [role="tablist"], [data-testid="tab-bar"], [data-testid="bottom-nav"]'
    ).last();
    await expect(tabBar).toBeVisible({ timeout: 10000 });

    // Should have multiple tab items
    const tabs = tabBar.getByRole('tab').or(tabBar.getByRole('link')).or(tabBar.locator('a, button'));
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(2);
  });

  test('board page shows columns', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/board');

    // At least some columns should be present (they may scroll horizontally on mobile)
    const columnNames = ['Nápad', 'Otevřeno', 'V řešení', 'K revizi', 'Hotovo'];
    let visibleColumns = 0;

    for (const name of columnNames) {
      const column = page.getByText(name, { exact: false });
      if (await column.isVisible({ timeout: 3000 }).catch(() => false)) {
        visibleColumns++;
      }
    }

    // At least one column should be visible (others may require scrolling)
    expect(visibleColumns).toBeGreaterThanOrEqual(1);
  });

  test('task cards are present on focus page', async ({ page }) => {
    await loginAsAdmin(page);

    // Seed a task
    await page.request.post('/api/tasks', {
      data: { title: 'E2E Mobile Focus Card', priority: 'High' },
    });

    await page.goto('/');

    await expect(page.getByText('E2E Mobile Focus Card')).toBeVisible({ timeout: 10000 });
  });

  test('admin tab hidden for non-admin (guest) users', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/');

    // Admin tab/link should not be visible for guests
    await expect(
      page.getByRole('link', { name: /admin/i }).or(page.getByText(/admin/i))
    ).not.toBeVisible({ timeout: 5000 });
  });
});
