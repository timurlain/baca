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

async function createAndAssignTask(page: Page, title: string) {
  const result = await page.evaluate(
    async ({ title }) => {
      const resp = await fetch('/api/tasks', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!resp.ok) throw new Error(`Create task failed: ${resp.status}`);
      const task = await resp.json();
      const assignResp = await fetch(`/api/tasks/${task.id}/assign-me`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!assignResp.ok) throw new Error(`Assign failed: ${assignResp.status}`);
      return task;
    },
    { title }
  );
  return result;
}

test.describe('Focus Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('focus page is accessible and shows content', async ({ page }) => {
    await page.goto('/focus');
    await page.waitForLoadState('networkidle');
    // Should show either "Můj fokus" (has tasks) or "Všechno splněno!" (empty)
    await expect(
      page.getByText(/fokus|splněno/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows assigned tasks', async ({ page }) => {
    await page.goto('/focus');
    await page.waitForLoadState('networkidle');

    await createAndAssignTask(page, 'E2E Focus Task 1');
    await createAndAssignTask(page, 'E2E Focus Task 2');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('E2E Focus Task 1')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('E2E Focus Task 2')).toBeVisible({ timeout: 10000 });
  });

  test('empty state shows completion message', async ({ page }) => {
    await page.goto('/focus');
    await page.waitForLoadState('networkidle');
    // With no assigned tasks, the focus page shows completion message
    await expect(
      page.getByText(/splněno|žádné/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
