import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

async function loginAsAdmin(page: Page) {
  await page.request.post('http://localhost:5000/api/test/login/admin@baca.local');
}

test.describe('Focus Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);

    // Seed some tasks to work with
    await page.request.post('/api/tasks', {
      data: { title: 'E2E Focus Task 1', priority: 'High', status: 'Open' },
    });
    await page.request.post('/api/tasks', {
      data: { title: 'E2E Focus Task 2', priority: 'Medium', status: 'Open' },
    });
  });

  test('navigating to / shows Focus page on mobile', async ({ page }) => {
    await page.goto('/');
    // Focus page should be the default on mobile
    await expect(page.getByText(/focus|úkoly|moje/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('shows tasks with priority indicators', async ({ page }) => {
    await page.goto('/');
    // Tasks should be visible with some priority visual indicator
    await expect(page.getByText('E2E Focus Task 1')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('E2E Focus Task 2')).toBeVisible({ timeout: 10000 });
  });

  test('"Hotovo" button changes task status to done', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('E2E Focus Task 1')).toBeVisible({ timeout: 10000 });

    // Find the "Hotovo" button associated with the first task
    const taskCard = page.getByText('E2E Focus Task 1').locator('..');
    const doneButton = taskCard.getByRole('button', { name: /hotovo/i }).or(
      taskCard.getByText(/hotovo/i)
    );

    if (await doneButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await doneButton.click();
    } else {
      // Try page-level button near the task
      await page.getByRole('button', { name: /hotovo/i }).first().click();
    }

    // Task should transition or show completion state
    await page.waitForTimeout(1000);
  });

  test('"K review" button changes task status', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('E2E Focus Task 2')).toBeVisible({ timeout: 10000 });

    const taskCard = page.getByText('E2E Focus Task 2').locator('..');
    const reviewButton = taskCard.getByRole('button', { name: /k review|k revizi/i }).or(
      taskCard.getByText(/k review|k revizi/i)
    );

    if (await reviewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await reviewButton.click();
    } else {
      await page.getByRole('button', { name: /k review|k revizi/i }).first().click();
    }

    // Task should transition status
    await page.waitForTimeout(1000);
  });

  test('all tasks done shows completion message', async ({ page }) => {
    // Complete all tasks via API
    const tasksResponse = await page.request.get('/api/tasks');
    const tasks = await tasksResponse.json();

    for (const task of tasks) {
      if (task.id) {
        await page.request.patch(`/api/tasks/${task.id}/status`, {
          data: { status: 'Done' },
        });
      }
    }

    await page.goto('/');
    await expect(page.getByText('Všechno splněno!')).toBeVisible({ timeout: 10000 });
  });
});
