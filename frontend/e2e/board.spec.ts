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

async function createTask(page: Page, title: string) {
  const result = await page.evaluate(async (title) => {
    const resp = await fetch('/api/tasks', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Create task failed: ${resp.status} - ${text}`);
    }
    return resp.json();
  }, title);
  return result;
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
    await page.goto('/board');
    await page.waitForLoadState('networkidle');

    await createTask(page, 'E2E Board Test Task');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('E2E Board Test Task')).toBeVisible({ timeout: 10000 });
  });

  test('clicking a task card opens detail modal', async ({ page }) => {
    await page.goto('/board');
    await page.waitForLoadState('networkidle');

    await createTask(page, 'E2E Detail Modal Task');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByText('E2E Detail Modal Task').click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('E2E Detail Modal Task')).toBeVisible();
  });

  test('delete task removes it from board', async ({ page }) => {
    const taskName = `E2E Delete ${Date.now()}`;
    await page.goto('/board');
    await page.waitForLoadState('networkidle');

    await createTask(page, taskName);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByText(taskName).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Click "Smazat úkol" button in the detail modal
    await dialog.getByRole('button', { name: /smazat úkol/i }).click();

    // Click "Smazat" confirm button in the confirmation dialog
    await page.getByRole('button', { name: /^smazat$/i }).click();

    // Wait for dialog to close after deletion
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
  });
});
