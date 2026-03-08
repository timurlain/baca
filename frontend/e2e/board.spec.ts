import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.request.post('http://localhost:5000/api/test/login/admin@baca.local');
}

test.describe('Board', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('board page shows 5 columns', async ({ page }) => {
    await page.goto('/board');

    const columns = ['Nápad', 'Otevřeno', 'V řešení', 'K revizi', 'Hotovo'];
    for (const column of columns) {
      await expect(page.getByText(column, { exact: false })).toBeVisible({ timeout: 10000 });
    }
  });

  test('task created via API appears on the board', async ({ page }) => {
    await page.request.post('/api/tasks', {
      data: { title: 'E2E Board Test Task', priority: 'Medium' },
    });

    await page.goto('/board');
    await expect(page.getByText('E2E Board Test Task')).toBeVisible({ timeout: 10000 });
  });

  test('clicking a task card opens detail modal', async ({ page }) => {
    await page.request.post('/api/tasks', {
      data: { title: 'E2E Detail Modal Task', priority: 'Medium' },
    });

    await page.goto('/board');
    await page.getByText('E2E Detail Modal Task').click();

    // Modal should be visible with task details
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('E2E Detail Modal Task')).toBeVisible();
  });

  test('edit task description in modal saves changes', async ({ page }) => {
    await page.request.post('/api/tasks', {
      data: { title: 'E2E Edit Task', priority: 'Medium' },
    });

    await page.goto('/board');
    await page.getByText('E2E Edit Task').click();

    // Wait for modal to load
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    // The modal uses inline editing - fill in the description textarea
    const descField = page.getByPlaceholder('Přidejte podrobnější popis...');
    await expect(descField).toBeVisible({ timeout: 5000 });
    await descField.fill('Updated description via E2E');
    await descField.blur();

    // Wait for save to complete
    await page.waitForTimeout(1000);

    // Reload and verify persistence
    await page.goto('/board');
    await page.getByText('E2E Edit Task').click();
    await expect(page.getByText('Updated description via E2E')).toBeVisible({ timeout: 10000 });
  });

  test('"Vezmu si to" assigns task to me', async ({ page }) => {
    await page.request.post('/api/tasks', {
      data: { title: 'E2E Unassigned Task', priority: 'Medium' },
    });

    await page.goto('/board');

    // The claim button is on the task card itself (not in modal)
    const claimButton = page.getByRole('button', { name: /vezmu si to/i });
    await expect(claimButton).toBeVisible({ timeout: 10000 });
    await claimButton.click();

    // After assignment, the claim button should disappear (replaced by avatar)
    await expect(claimButton).not.toBeVisible({ timeout: 10000 });
  });

  test('delete task removes it from board', async ({ page }) => {
    await page.request.post('/api/tasks', {
      data: { title: 'E2E Delete This Task', priority: 'Medium' },
    });

    await page.goto('/board');
    await page.getByText('E2E Delete This Task').click();

    // Wait for modal
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    // Click delete button
    await page.getByRole('button', { name: /smazat/i }).click();

    // Confirm deletion in the confirm dialog
    const confirmButton = page.getByRole('button', { name: /smazat/i }).last();
    await confirmButton.click();

    await expect(page.getByText('E2E Delete This Task')).not.toBeVisible({ timeout: 10000 });
  });
});
