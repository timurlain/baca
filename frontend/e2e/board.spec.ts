import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() =>
    fetch('/api/test/login/admin@baca.local', { method: 'POST', credentials: 'include' })
  );
}

test.describe('Board', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('board page shows 5 columns', async ({ page }) => {
    await page.goto('/board');
    await page.waitForLoadState('networkidle');

    const columns = ['Nápad', 'Otevřeno', 'V řešení', 'K revizi', 'Hotovo'];
    for (const column of columns) {
      await expect(page.getByText(column, { exact: false })).toBeVisible({ timeout: 10000 });
    }
  });

  test('task created via API appears on the board', async ({ page }) => {
    // Create task via browser fetch to ensure cookies are sent
    await page.goto('/board');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() =>
      fetch('/api/tasks', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'E2E Board Test Task', priority: 'Medium' }),
      })
    );

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('E2E Board Test Task')).toBeVisible({ timeout: 10000 });
  });

  test('clicking a task card opens detail modal', async ({ page }) => {
    // Create task
    await page.goto('/board');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() =>
      fetch('/api/tasks', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'E2E Detail Modal Task', priority: 'Medium' }),
      })
    );

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByText('E2E Detail Modal Task').click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('E2E Detail Modal Task')).toBeVisible();
  });

  test('delete task removes it from board', async ({ page }) => {
    // Create task
    await page.goto('/board');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() =>
      fetch('/api/tasks', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'E2E Delete This Task', priority: 'Medium' }),
      })
    );

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByText('E2E Delete This Task').click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /smazat/i }).click();

    // Confirm deletion
    const confirmButton = page.getByRole('button', { name: /smazat/i }).last();
    await confirmButton.click();

    await expect(page.getByText('E2E Delete This Task')).not.toBeVisible({ timeout: 10000 });
  });
});
