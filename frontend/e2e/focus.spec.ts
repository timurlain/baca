import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

async function loginAsAdmin(page: Page) {
  await page.request.post('/api/test/login/admin@baca.local');
}

async function createAndAssignTask(page: Page, title: string, priority = 'High') {
  const response = await page.request.post('/api/tasks', {
    data: { title, priority },
  });
  const task = await response.json();
  // Assign to current user so it appears in focus
  await page.request.patch(`/api/tasks/${task.id}/assign-me`);
  return task;
}

test.describe('Focus Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('navigating to / shows Focus page on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/fokus|focus|moje/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('shows assigned tasks', async ({ page }) => {
    await createAndAssignTask(page, 'E2E Focus Task 1', 'High');
    await createAndAssignTask(page, 'E2E Focus Task 2', 'Medium');

    await page.goto('/');
    await expect(page.getByText('E2E Focus Task 1')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('E2E Focus Task 2')).toBeVisible({ timeout: 10000 });
  });

  test('"Hotovo" button changes task status to done', async ({ page }) => {
    await createAndAssignTask(page, 'E2E Hotovo Task');

    await page.goto('/');
    await expect(page.getByText('E2E Hotovo Task')).toBeVisible({ timeout: 10000 });

    // Click the "Hotovo" button near the task
    await page.getByRole('button', { name: /hotovo/i }).first().click();

    // Task should disappear from focus (it's now Done)
    await expect(page.getByText('E2E Hotovo Task')).not.toBeVisible({ timeout: 10000 });
  });

  test('"K review" button changes task status', async ({ page }) => {
    await createAndAssignTask(page, 'E2E Review Task');

    await page.goto('/');
    await expect(page.getByText('E2E Review Task')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /k review/i }).first().click();

    // Task should disappear from focus (it's now ForReview)
    await expect(page.getByText('E2E Review Task')).not.toBeVisible({ timeout: 10000 });
  });

  test('all tasks done shows completion message', async ({ page }) => {
    // Don't create any tasks (or ensure all are done)
    await page.goto('/');
    await expect(page.getByText(/splněno|žádné/i)).toBeVisible({ timeout: 10000 });
  });
});
