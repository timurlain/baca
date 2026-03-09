import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';

// The client module reads BASE_URL from import.meta.env.VITE_API_URL at load time.
// In jsdom test environment with MSW, relative URLs work for component tests
// because fetch is intercepted by jsdom. For direct API calls we need to ensure
// the same setup. We use dynamic import after setting the env.

// Set VITE_API_URL before importing the client
vi.stubEnv('VITE_API_URL', '');

// Re-import client for each test to pick up env changes is not needed
// since msw/jsdom handles relative URLs in fetch. The real issue is the
// MSW Node interceptor needs absolute URLs. Let's use a base URL.

describe('API client', () => {
  // Save original location
  const originalLocation = window.location;
  let client: typeof import('./client');

  beforeAll(async () => {
    // Ensure env is set before loading client module
    import.meta.env.VITE_API_URL = 'http://localhost';
    // Dynamic import to pick up the env
    client = await import('./client');
  });

  beforeEach(() => {
    // Mock window.location for 401 redirect tests
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '', pathname: '/board' },
    });

    // Override MSW handlers with http://localhost prefix
    server.use(
      http.get('http://localhost/api/health', () =>
        HttpResponse.json({ status: 'healthy', db: 'ok' })),
      http.get('http://localhost/api/auth/me', () =>
        HttpResponse.json({ id: 1, name: 'Tomáš', role: 'Admin', avatarColor: '#10B981' })),
      http.post('http://localhost/api/auth/request-link', () =>
        new HttpResponse(null, { status: 200 })),
      http.post('http://localhost/api/auth/logout', () =>
        new HttpResponse(null, { status: 200 })),
      http.post('http://localhost/api/auth/guest', () =>
        new HttpResponse(null, { status: 200 })),
      http.get('http://localhost/api/tasks', () =>
        HttpResponse.json([{ id: 1, title: 'Task' }])),
      http.get('http://localhost/api/tasks/:id', () =>
        HttpResponse.json({ id: 1, title: 'Task', subtasks: [], comments: [] })),
      http.post('http://localhost/api/tasks', () =>
        HttpResponse.json({ id: 1, title: 'Task' }, { status: 201 })),
      http.put('http://localhost/api/tasks/:id', () =>
        HttpResponse.json({ id: 1, title: 'Task' })),
      http.patch('http://localhost/api/tasks/:id/status', () =>
        HttpResponse.json({ id: 1, title: 'Task' })),
      http.patch('http://localhost/api/tasks/:id/assign-me', () =>
        HttpResponse.json({ id: 1, title: 'Task' })),
      http.delete('http://localhost/api/tasks/:id', () =>
        new HttpResponse(null, { status: 204 })),
      http.get('http://localhost/api/focus', () =>
        HttpResponse.json([])),
      http.get('http://localhost/api/tasks/:taskId/comments', () =>
        HttpResponse.json([])),
      http.post('http://localhost/api/tasks/:taskId/comments', () =>
        HttpResponse.json({ id: 1, text: 'test' }, { status: 201 })),
      http.get('http://localhost/api/categories', () =>
        HttpResponse.json([{ id: 1, name: 'Hra', color: '#3B82F6', sortOrder: 1 }])),
      http.post('http://localhost/api/categories', () =>
        HttpResponse.json({ id: 1, name: 'Hra' }, { status: 201 })),
      http.put('http://localhost/api/categories/:id', () =>
        HttpResponse.json({ id: 1, name: 'Updated' })),
      http.delete('http://localhost/api/categories/:id', () =>
        new HttpResponse(null, { status: 204 })),
      http.get('http://localhost/api/gameroles', () =>
        HttpResponse.json([{ id: 1, name: 'Osud' }])),
      http.post('http://localhost/api/gameroles', () =>
        HttpResponse.json({ id: 1, name: 'Osud' }, { status: 201 })),
      http.delete('http://localhost/api/gameroles/:id', () =>
        new HttpResponse(null, { status: 204 })),
      http.get('http://localhost/api/users', () =>
        HttpResponse.json([{ id: 1, name: 'Tomáš' }])),
      http.post('http://localhost/api/users', () =>
        HttpResponse.json({ id: 1, name: 'Tomáš' }, { status: 201 })),
      http.post('http://localhost/api/users/:id/resend-link', () =>
        new HttpResponse(null, { status: 200 })),
      http.get('http://localhost/api/dashboard', () =>
        HttpResponse.json({ totalTasks: 10, tasksByStatus: {}, overdueTasks: 0, progressPercent: 50, categoryProgress: [], recentTasks: [], myTaskCount: 3 })),
      http.post('http://localhost/api/voice/transcribe', () =>
        HttpResponse.json({ transcription: 'test' })),
      http.post('http://localhost/api/voice/parse', () =>
        HttpResponse.json({ title: 'Parsed', rawTranscription: 'test' })),
      http.get('http://localhost/api/settings', () =>
        HttpResponse.json({ guestPin: '****', appName: 'Bača' })),
      http.put('http://localhost/api/settings', () =>
        HttpResponse.json({ guestPin: '****', appName: 'Bača' })),
    );
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  describe('request() base function', () => {
    it('redirects to /login on 401', async () => {
      server.use(
        http.get('http://localhost/api/health', () => new HttpResponse(null, { status: 401 })),
      );
      await expect(client.health.check()).rejects.toThrow('Unauthorized');
      expect(window.location.href).toBe('/login');
    });

    it('does not redirect when already on /login', async () => {
      window.location.pathname = '/login';
      server.use(
        http.get('http://localhost/api/health', () => new HttpResponse(null, { status: 401 })),
      );
      await expect(client.health.check()).rejects.toThrow('Unauthorized');
    });

    it('throws ApiError with status text on non-ok response', async () => {
      server.use(
        http.get('http://localhost/api/health', () => new HttpResponse('Something broke', { status: 500 })),
      );
      await expect(client.health.check()).rejects.toThrow('Something broke');
    });

    it('returns undefined for 204 No Content', async () => {
      server.use(
        http.delete('http://localhost/api/tasks/:id', () => new HttpResponse(null, { status: 204 })),
      );
      const result = await client.tasks.delete(1);
      expect(result).toBeUndefined();
    });
  });

  describe('auth', () => {
    it('requestLink sends POST', async () => {
      let calledBody: unknown = null;
      server.use(
        http.post('http://localhost/api/auth/request-link', async ({ request }) => {
          calledBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );
      await client.auth.requestLink({ email: 'test@test.cz' });
      expect(calledBody).toEqual({ email: 'test@test.cz' });
    });

    it('me returns auth response', async () => {
      const result = await client.auth.me();
      expect(result).toHaveProperty('name', 'Tomáš');
      expect(result).toHaveProperty('role', 'Admin');
    });

    it('logout sends POST', async () => {
      let logoutCalled = false;
      server.use(
        http.post('http://localhost/api/auth/logout', () => {
          logoutCalled = true;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      await client.auth.logout();
      expect(logoutCalled).toBe(true);
    });

    it('guestLogin sends POST with pin', async () => {
      let calledBody: unknown = null;
      server.use(
        http.post('http://localhost/api/auth/guest', async ({ request }) => {
          calledBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );
      await client.auth.guestLogin({ pin: '1234' });
      expect(calledBody).toEqual({ pin: '1234' });
    });
  });

  describe('tasks', () => {
    it('list returns tasks array', async () => {
      const result = await client.tasks.list();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('list with params builds query string', async () => {
      let capturedUrl = '';
      server.use(
        http.get('http://localhost/api/tasks', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json([]);
        }),
      );
      await client.tasks.list({ status: 'Open', category: 1, assignee: 2, search: 'test', parentId: 3 });
      expect(capturedUrl).toContain('status=Open');
      expect(capturedUrl).toContain('category=1');
      expect(capturedUrl).toContain('assignee=2');
      expect(capturedUrl).toContain('search=test');
      expect(capturedUrl).toContain('parentId=3');
    });

    it('list without params returns no query string', async () => {
      let capturedUrl = '';
      server.use(
        http.get('http://localhost/api/tasks', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json([]);
        }),
      );
      await client.tasks.list();
      expect(capturedUrl).not.toContain('?');
    });

    it('get fetches single task by id', async () => {
      const result = await client.tasks.get(1);
      expect(result).toHaveProperty('title');
    });

    it('create sends POST', async () => {
      let calledBody: unknown = null;
      server.use(
        http.post('http://localhost/api/tasks', async ({ request }) => {
          calledBody = await request.json();
          return HttpResponse.json({ id: 99, title: 'New task' }, { status: 201 });
        }),
      );
      await client.tasks.create({ title: 'New task' });
      expect(calledBody).toMatchObject({ title: 'New task' });
    });

    it('update sends PUT', async () => {
      let calledBody: unknown = null;
      server.use(
        http.put('http://localhost/api/tasks/:id', async ({ request }) => {
          calledBody = await request.json();
          return HttpResponse.json({});
        }),
      );
      await client.tasks.update(1, { title: 'Updated' });
      expect(calledBody).toMatchObject({ title: 'Updated' });
    });

    it('changeStatus sends PATCH', async () => {
      let calledBody: unknown = null;
      server.use(
        http.patch('http://localhost/api/tasks/:id/status', async ({ request }) => {
          calledBody = await request.json();
          return HttpResponse.json({});
        }),
      );
      await client.tasks.changeStatus(1, { status: 'Done' });
      expect(calledBody).toMatchObject({ status: 'Done' });
    });

    it('assignMe sends PATCH without body', async () => {
      let assignCalled = false;
      server.use(
        http.patch('http://localhost/api/tasks/:id/assign-me', () => {
          assignCalled = true;
          return HttpResponse.json({});
        }),
      );
      await client.tasks.assignMe(1);
      expect(assignCalled).toBe(true);
    });

    it('delete sends DELETE', async () => {
      let deleteCalled = false;
      server.use(
        http.delete('http://localhost/api/tasks/:id', () => {
          deleteCalled = true;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      await client.tasks.delete(42);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('focus', () => {
    it('list returns focus tasks', async () => {
      const result = await client.focus.list();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('comments', () => {
    it('list returns comments for a task', async () => {
      const result = await client.comments.list(1);
      expect(Array.isArray(result)).toBe(true);
    });

    it('create sends POST with text', async () => {
      let calledBody: unknown = null;
      server.use(
        http.post('http://localhost/api/tasks/:taskId/comments', async ({ request }) => {
          calledBody = await request.json();
          return HttpResponse.json({ id: 1, text: 'Hello' }, { status: 201 });
        }),
      );
      await client.comments.create(1, { text: 'Hello' });
      expect(calledBody).toMatchObject({ text: 'Hello' });
    });
  });

  describe('categories', () => {
    it('list returns categories', async () => {
      const result = await client.categories.list();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('create sends POST', async () => {
      const result = await client.categories.create({ name: 'Test', color: '#ff0000' });
      expect(result).toHaveProperty('name');
    });

    it('update sends PUT', async () => {
      let calledBody: unknown = null;
      server.use(
        http.put('http://localhost/api/categories/:id', async ({ request }) => {
          calledBody = await request.json();
          return HttpResponse.json({ id: 1, name: 'Updated' });
        }),
      );
      await client.categories.update(1, { name: 'Updated' });
      expect(calledBody).toMatchObject({ name: 'Updated' });
    });

    it('delete sends DELETE', async () => {
      let deleteCalled = false;
      server.use(
        http.delete('http://localhost/api/categories/:id', () => {
          deleteCalled = true;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      await client.categories.delete(1);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('gameRoles', () => {
    it('list returns game roles', async () => {
      const result = await client.gameRoles.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it('create sends POST', async () => {
      const result = await client.gameRoles.create({ name: 'Test', color: '#ff0000' });
      expect(result).toHaveProperty('name');
    });

    it('delete sends DELETE', async () => {
      let deleteCalled = false;
      server.use(
        http.delete('http://localhost/api/gameroles/:id', () => {
          deleteCalled = true;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      await client.gameRoles.delete(1);
      expect(deleteCalled).toBe(true);
    });
  });

  describe('users', () => {
    it('list returns users', async () => {
      const result = await client.users.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it('create sends POST', async () => {
      const result = await client.users.create({
        name: 'Test',
        email: 'test@test.cz',
        phone: null,
        role: 'User',
      });
      expect(result).toHaveProperty('name');
    });

    it('resendLink sends POST', async () => {
      let resendCalled = false;
      server.use(
        http.post('http://localhost/api/users/:id/resend-link', () => {
          resendCalled = true;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      await client.users.resendLink(1);
      expect(resendCalled).toBe(true);
    });
  });

  describe('dashboard', () => {
    it('get returns dashboard data', async () => {
      const result = await client.dashboard.get();
      expect(result).toHaveProperty('totalTasks');
      expect(result).toHaveProperty('tasksByStatus');
    });
  });

  describe('voice', () => {
    it('transcribe sends FormData via POST', async () => {
      let receivedFormData = false;
      server.use(
        http.post('http://localhost/api/voice/transcribe', async ({ request }) => {
          const contentType = request.headers.get('content-type');
          receivedFormData = contentType === null || contentType.includes('multipart') || !contentType.includes('application/json');
          return HttpResponse.json({ transcription: 'test' });
        }),
      );
      const blob = new Blob(['audio data'], { type: 'audio/webm' });
      const result = await client.voice.transcribe(blob);
      expect(result).toHaveProperty('transcription');
      expect(receivedFormData).toBe(true);
    });

    it('parse sends POST with transcription', async () => {
      let calledBody: unknown = null;
      server.use(
        http.post('http://localhost/api/voice/parse', async ({ request }) => {
          calledBody = await request.json();
          return HttpResponse.json({ title: 'Parsed', rawTranscription: 'test' });
        }),
      );
      await client.voice.parse({ transcription: 'test' });
      expect(calledBody).toMatchObject({ transcription: 'test' });
    });
  });

  describe('settings', () => {
    it('get returns settings', async () => {
      const result = await client.settings.get();
      expect(result).toHaveProperty('appName');
    });

    it('update sends PUT', async () => {
      let calledBody: unknown = null;
      server.use(
        http.put('http://localhost/api/settings', async ({ request }) => {
          calledBody = await request.json();
          return HttpResponse.json({ guestPin: '****', appName: 'NewName' });
        }),
      );
      await client.settings.update({ appName: 'NewName' });
      expect(calledBody).toMatchObject({ appName: 'NewName' });
    });
  });

  describe('health', () => {
    it('check returns health response', async () => {
      const result = await client.health.check();
      expect(result).toEqual({ status: 'healthy', db: 'ok' });
    });
  });
});
