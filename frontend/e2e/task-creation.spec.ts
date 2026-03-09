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

async function loginAsGuest(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  const status = await page.evaluate(async () => {
    const resp = await fetch('/api/auth/guest', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: 'ovcina2026' }),
    });
    return { status: resp.status, text: await resp.text() };
  });
  if (status.status !== 200) {
    throw new Error(`Guest login failed: ${status.status} - ${status.text}`);
  }
}

test.describe('Task Creation Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('navigating to /tasks/new shows two tabs', async ({ page }) => {
    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Jeden úkol')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Hromadný import')).toBeVisible();
  });

  test('single task tab shows form fields', async ({ page }) => {
    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle');

    await expect(page.getByLabel('Název')).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('Přiřazeno')).toBeVisible();
    await expect(page.getByLabel('Kategorie')).toBeVisible();
    await expect(page.getByLabel('Priorita')).toBeVisible();
    await expect(page.getByLabel('Stav')).toBeVisible();
    await expect(page.getByLabel('Termín')).toBeVisible();
    await expect(page.getByLabel('Popis')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vytvořit úkol' })).toBeVisible();
  });

  test('status is pre-filled from query param', async ({ page }) => {
    await page.goto('/tasks/new?status=Open');
    await page.waitForLoadState('networkidle');

    const statusSelect = page.getByLabel('Stav');
    await expect(statusSelect).toHaveValue('Open', { timeout: 10000 });
  });

  test('status defaults to Idea when no query param', async ({ page }) => {
    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle');

    const statusSelect = page.getByLabel('Stav');
    await expect(statusSelect).toHaveValue('Idea', { timeout: 10000 });
  });

  test('creating a single task shows success toast', async ({ page }) => {
    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Název').fill('E2E Test Task Creation');
    await page.getByRole('button', { name: 'Vytvořit úkol' }).click();

    await expect(page.getByText('Úkol vytvořen')).toBeVisible({ timeout: 10000 });
  });

  test('created task appears on the board', async ({ page }) => {
    const taskTitle = `E2E Created Task ${Date.now()}`;

    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Název').fill(taskTitle);
    await page.getByRole('button', { name: 'Vytvořit úkol' }).click();
    await expect(page.getByText('Úkol vytvořen')).toBeVisible({ timeout: 10000 });

    // Navigate to board and verify task exists
    await page.goto('/board');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10000 });
  });

  test('form resets after successful creation (except status)', async ({ page }) => {
    await page.goto('/tasks/new?status=Open');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Název').fill('E2E Reset Test');
    await page.getByRole('button', { name: 'Vytvořit úkol' }).click();
    await expect(page.getByText('Úkol vytvořen')).toBeVisible({ timeout: 10000 });

    // Title should be cleared
    await expect(page.getByLabel('Název')).toHaveValue('');
    // Status should remain Open
    await expect(page.getByLabel('Stav')).toHaveValue('Open');
  });

  test('title is required — cannot submit empty form', async ({ page }) => {
    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle');

    // Try to submit without filling title
    await page.getByRole('button', { name: 'Vytvořit úkol' }).click();

    // Should not show success
    await expect(page.getByText('Úkol vytvořen')).not.toBeVisible({ timeout: 2000 });
  });

  test('bulk import tab shows textarea', async ({ page }) => {
    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle');

    await page.getByText('Hromadný import').click();

    await expect(page.getByPlaceholder(/Vložte text/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Zpracovat' })).toBeVisible();
  });

  test('bulk import Zpracovat button is disabled when textarea is empty', async ({ page }) => {
    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle');

    await page.getByText('Hromadný import').click();

    const button = page.getByRole('button', { name: 'Zpracovat' });
    await expect(button).toBeDisabled({ timeout: 10000 });
  });
});

test.describe('Board — Create Task Buttons', () => {
  test('board header shows + Nový úkol button for admin', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/board');
    await page.waitForLoadState('networkidle');

    const button = page.getByRole('button', { name: /Nový úkol/ });
    await expect(button).toBeVisible({ timeout: 10000 });
  });

  test('+ Nový úkol navigates to /tasks/new', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/board');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Nový úkol/ }).click();
    await expect(page).toHaveURL(/\/tasks\/new/, { timeout: 10000 });
  });

  test('column + button navigates to /tasks/new with status param', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/board');
    await page.waitForLoadState('networkidle');

    // Click the first + button in a column header (Nový úkol title attribute)
    const plusButtons = page.locator('button[title="Nový úkol"]');
    await expect(plusButtons.first()).toBeVisible({ timeout: 10000 });
    await plusButtons.first().click();

    await expect(page).toHaveURL(/\/tasks\/new\?status=/, { timeout: 10000 });
  });

  test('guest user does not see + Nový úkol button on board', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/board');
    await page.waitForLoadState('networkidle');

    // Wait for board to load
    await expect(page.getByText('Nápad')).toBeVisible({ timeout: 10000 });

    // No create button visible
    await expect(page.getByRole('button', { name: /Nový úkol/ })).not.toBeVisible();
  });

  test('guest user does not see column + buttons', async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/board');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Nápad')).toBeVisible({ timeout: 10000 });

    // No column + buttons
    await expect(page.locator('button[title="Nový úkol"]')).toHaveCount(0);
  });
});
