import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.request.post('http://localhost:5000/api/test/login/admin@baca.local');
}

function mockMediaRecorder(page: Page) {
  return page.addInitScript(() => {
    // Mock MediaRecorder API
    class MockMediaRecorder {
      state = 'inactive';
      ondataavailable: ((event: any) => void) | null = null;
      onstop: (() => void) | null = null;
      onstart: (() => void) | null = null;
      onerror: ((event: any) => void) | null = null;

      static isTypeSupported() {
        return true;
      }

      start() {
        this.state = 'recording';
        if (this.onstart) this.onstart();
      }

      stop() {
        this.state = 'inactive';
        // Emit a fake blob
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

      addEventListener(event: string, handler: any) {
        if (event === 'dataavailable') this.ondataavailable = handler;
        if (event === 'stop') this.onstop = handler;
        if (event === 'start') this.onstart = handler;
        if (event === 'error') this.onerror = handler;
      }

      removeEventListener() {}
    }

    (window as any).MediaRecorder = MockMediaRecorder;

    // Mock getUserMedia
    if (!navigator.mediaDevices) {
      (navigator as any).mediaDevices = {};
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

    // Mock voice API endpoints
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
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('click mic button shows recording UI', async ({ page }) => {
    await page.goto('/voice');

    const micButton = page.getByRole('button', { name: /mikrofon|nahrát|nahrávat|mic/i }).or(
      page.locator('[data-testid="mic-button"], button[aria-label*="mic"], button[aria-label*="record"]')
    );

    await expect(micButton).toBeVisible({ timeout: 10000 });
    await micButton.click();

    // Recording UI should appear (e.g., stop button, recording indicator, timer)
    const recordingIndicator = page.getByText(/nahrávání|nahrávám|recording/i).or(
      page.getByRole('button', { name: /stop|zastavit/i })
    ).or(
      page.locator('[data-testid="recording-indicator"], .recording')
    );

    await expect(recordingIndicator).toBeVisible({ timeout: 10000 });
  });

  test('preview shows parsed fields after recording', async ({ page }) => {
    await page.goto('/voice');

    const micButton = page.getByRole('button', { name: /mikrofon|nahrát|nahrávat|mic/i }).or(
      page.locator('[data-testid="mic-button"], button[aria-label*="mic"], button[aria-label*="record"]')
    );

    await micButton.click();

    // Stop recording
    const stopButton = page.getByRole('button', { name: /stop|zastavit|dokončit/i });
    if (await stopButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await stopButton.click();
    }

    // After transcription and parsing, preview should show parsed fields
    await expect(
      page.getByText('Koupit rekvizity na scénu 3').or(page.getByText('Rekvizity'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('FAB button visible on board page for non-guests', async ({ page }) => {
    await page.goto('/board');

    // Voice FAB (floating action button) should be visible
    const fab = page.locator(
      '[data-testid="voice-fab"], button[aria-label*="hlas"], button[aria-label*="voice"], .fab'
    ).or(page.getByRole('button', { name: /hlas|voice|mikrofon/i }));

    await expect(fab).toBeVisible({ timeout: 10000 });
  });
});
