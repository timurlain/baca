import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.request.post('http://localhost:5000/api/test/login/admin@baca.local');
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

    // VoiceRecorder has aria-label "Začít nahrávat" which matches /nahrávat/i
    const micButton = page.getByRole('button', { name: /nahrávat|nahrát/i });
    await expect(micButton).toBeVisible({ timeout: 10000 });
    await micButton.click();

    // After clicking, aria-label changes to "Zastavit nahrávání"
    await expect(
      page.getByRole('button', { name: /zastavit/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test('preview shows parsed fields after recording', async ({ page }) => {
    await page.goto('/voice');

    const micButton = page.getByRole('button', { name: /nahrávat|nahrát/i });
    await micButton.click();

    // Stop recording - same button toggles
    const stopButton = page.getByRole('button', { name: /zastavit/i });
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

    // VoiceFab has aria-label "Hlasový vstup"
    const fab = page.getByRole('button', { name: /hlasový/i });
    await expect(fab).toBeVisible({ timeout: 10000 });
  });
});
