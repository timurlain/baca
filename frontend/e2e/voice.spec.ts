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

function mockMediaRecorder(page: Page) {
  return page.addInitScript(() => {
    class MockMediaRecorder {
      state = 'inactive';
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onstart: (() => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      static isTypeSupported() {
        return true;
      }

      start() {
        this.state = 'recording';
        if (this.onstart) this.onstart();
      }

      stop() {
        this.state = 'inactive';
        const blob = new Blob(['fake-audio-data'], { type: 'audio/webm' });
        if (this.ondataavailable) {
          this.ondataavailable({ data: blob });
        }
        if (this.onstop) this.onstop();
      }

      pause() {
        this.state = 'paused';
      }

      resume() {
        this.state = 'recording';
      }

      addEventListener(event: string, handler: (() => void) | ((event: { data: Blob }) => void)) {
        if (event === 'dataavailable') this.ondataavailable = handler;
        if (event === 'stop') this.onstop = handler;
        if (event === 'start') this.onstart = handler;
        if (event === 'error') this.onerror = handler;
      }

      removeEventListener() {}
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as unknown as Record<string, any>).MediaRecorder = MockMediaRecorder;

    if (!navigator.mediaDevices) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as unknown as Record<string, any>).mediaDevices = {};
    }
    navigator.mediaDevices.getUserMedia = async () => {
      return new MediaStream();
    };
  });
}

test.describe('Voice Input', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockMediaRecorder(page);

    await page.route('**/api/voice/transcribe', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ transcription: 'Koupit rekvizity na scénu 3' }),
      });
    });

    await page.route('**/api/voice/parse', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          title: 'Koupit rekvizity na scénu 3',
          description: null,
          assigneeName: null,
          assigneeId: null,
          assigneeConfidence: null,
          categoryName: 'Rekvizity',
          categoryId: 4,
          categoryConfidence: 0.9,
          priority: 'Medium',
          priorityConfidence: 0.8,
          dueDate: null,
          dueDateConfidence: null,
          status: 'Open',
          rawTranscription: 'Koupit rekvizity na scénu 3',
        }),
      });
    });
  });

  test('voice page is accessible', async ({ page }) => {
    await page.goto('/voice');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('click mic button shows recording UI', async ({ page }) => {
    await page.goto('/voice');
    await page.waitForLoadState('networkidle');

    const micButton = page.getByRole('button', { name: /nahrávat|nahrát/i });
    await expect(micButton).toBeVisible({ timeout: 10000 });
    await micButton.click();

    await expect(
      page.getByRole('button', { name: /zastavit/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test('FAB button visible on board page for non-guests', async ({ page }) => {
    await page.goto('/board');
    await page.waitForLoadState('networkidle');

    const fab = page.getByRole('button', { name: /hlasový/i });
    await expect(fab).toBeVisible({ timeout: 10000 });
  });
});
