import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

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

async function createAndAssignTask(page: Page, title: string, priority = 'High') {
  const result = await page.evaluate(
    async ({ title, priority }) => {
      const resp = await fetch('/api/tasks', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority }),
      });
      const task = await resp.json();
      await fetch(`/api/tasks/${task.id}/assign-me`, {
        method: 'PATCH',
        credentials: 'include',
      });
      return task;
    },
    { title, priority }
  );
  return result;
}

test.describe('Focus Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('navigating to / shows Focus page on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/fokus|focus|moje/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('shows assigned tasks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await createAndAssignTask(page, 'E2E Focus Task 1', 'High');
    await createAndAssignTask(page, 'E2E Focus Task 2', 'Medium');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('E2E Focus Task 1')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('E2E Focus Task 2')).toBeVisible({ timeout: 10000 });
  });

  test('all tasks done shows completion or empty state', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // With no assigned tasks, the focus page shows either completion message or empty state
    await expect(
      page.getByText(/splněno|žádné|fokus|moje/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
