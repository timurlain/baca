/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// Precache static assets (injected by build tool)
precacheAndRoute(self.__WB_MANIFEST);

// Runtime cache: stale-while-revalidate for focus and dashboard data
registerRoute(
  ({ url }) =>
    url.pathname === '/api/focus' ||
    url.pathname === '/api/dashboard' ||
    (url.pathname === '/api/tasks' && url.searchParams.has('assignee')),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
  }),
);

// Network-only for all other API calls
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkOnly(),
);
