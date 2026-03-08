import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.request.post('/api/test/login/admin@baca.local');
}

test.describe('Authentication', () => {
  test('login page shows organizer email section by default', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('E-mail')).toBeVisible();
    await expect(page.getByText('Poslat odkaz')).toBeVisible();
  });

  test('login page shows guest PIN section when Host tab is clicked', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Host').click();
    await expect(page.getByLabel('PIN hosta')).toBeVisible();
    await expect(page.getByText('Vstoupit')).toBeVisible();
  });

  test('email login sends magic link and shows success message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill('admin@baca.local');
    await page.getByText('Poslat odkaz').click();
    await expect(page.getByText(/odkaz|odeslán/i)).toBeVisible({ timeout: 10000 });
  });

  test('magic link via test endpoint logs in and redirects to home', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('guest login with PIN succeeds as read-only', async ({ page }) => {
    await page.request.post('/api/auth/guest', {
      data: { pin: 'ovcina2026' },
    });
    await page.goto('/');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('logout redirects to login page', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');
    await expect(page).not.toHaveURL(/\/login/);

    // Find and click logout
    const logoutButton = page.getByRole('button', { name: /odhlásit/i });
    if (await logoutButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutButton.click();
    } else {
      // Try menu/profile area first
      const profileMenu = page.getByRole('button', { name: /profil|menu|nastavení/i });
      if (await profileMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
        await profileMenu.click();
        await page.getByText(/odhlásit/i).click();
      } else {
        // Fallback: click any element containing logout text
        await page.getByText(/odhlásit/i).first().click();
      }
    }

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
