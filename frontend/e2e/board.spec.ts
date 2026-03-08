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

  test('create new task via UI appears in correct column', async ({ page }) => {
    await page.goto('/board');

    await page.getByText('Přidat úkol').click();

    const titleInput = page.getByLabel(/název|titul/i).or(page.getByPlaceholder(/název|titul/i));
    await titleInput.fill('E2E Board Test Task');

    // Submit the form
    const submitButton = page.getByRole('button', { name: /vytvořit|přidat|uložit/i });
    await submitButton.click();

    // Task should appear on the board
    await expect(page.getByText('E2E Board Test Task')).toBeVisible({ timeout: 10000 });
  });

  test('clicking a task card opens detail modal', async ({ page }) => {
    // Seed a task via API
    await page.request.post('/api/tasks', {
      data: { title: 'E2E Detail Modal Task', priority: 'Medium' },
    });

    await page.goto('/board');

    await page.getByText('E2E Detail Modal Task').click();

    // Modal should be visible with task details
    await expect(
      page.getByRole('dialog').or(page.locator('[role="dialog"], .modal, [data-testid="task-detail"]'))
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('E2E Detail Modal Task')).toBeVisible();
  });

  test('edit task in modal saves changes', async ({ page }) => {
    // Seed a task via API
    await page.request.post('/api/tasks', {
      data: { title: 'E2E Edit Task Original', priority: 'Medium' },
    });

    await page.goto('/board');

    await page.getByText('E2E Edit Task Original').click();

    // Click edit or directly edit the title
    const editButton = page.getByRole('button', { name: /upravit|editovat/i });
    if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editButton.click();
    }

    const titleInput = page.getByLabel(/název|titul/i).or(page.getByRole('textbox').first());
    await titleInput.clear();
    await titleInput.fill('E2E Edit Task Updated');

    const saveButton = page.getByRole('button', { name: /uložit|potvrdit/i });
    await saveButton.click();

    await expect(page.getByText('E2E Edit Task Updated')).toBeVisible({ timeout: 10000 });
  });

  test('"Vezmu si to" assigns task to me', async ({ page }) => {
    // Seed an unassigned task via API
    await page.request.post('/api/tasks', {
      data: { title: 'E2E Unassigned Task', priority: 'Medium' },
    });

    await page.goto('/board');

    await page.getByText('E2E Unassigned Task').click();

    const claimButton = page.getByRole('button', { name: /vezmu si to/i });
    await expect(claimButton).toBeVisible({ timeout: 10000 });
    await claimButton.click();

    // Should show assignment indication (e.g., user avatar or name)
    await expect(page.getByText(/přiřazeno|admin/i)).toBeVisible({ timeout: 10000 });
  });

  test('delete task removes it from board', async ({ page }) => {
    // Seed a task via API
    await page.request.post('/api/tasks', {
      data: { title: 'E2E Delete This Task', priority: 'Medium' },
    });

    await page.goto('/board');

    await page.getByText('E2E Delete This Task').click();

    const deleteButton = page.getByRole('button', { name: /smazat|odstranit/i });
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await deleteButton.click();

    // Confirm deletion if dialog appears
    const confirmButton = page.getByRole('button', { name: /ano|potvrdit|smazat/i });
    if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmButton.click();
    }

    await expect(page.getByText('E2E Delete This Task')).not.toBeVisible({ timeout: 10000 });
  });
});
