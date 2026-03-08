import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock syncQueue before importing the hook
vi.mock('@/offline/syncQueue', () => ({
  processQueue: vi.fn().mockResolvedValue({ processed: 0, failed: 0, conflicts: 0 }),
  getPendingCount: vi.fn().mockResolvedValue(0),
}));

import useOnlineStatus from './useOnlineStatus';
import { processQueue, getPendingCount } from '@/offline/syncQueue';

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
});

describe('useOnlineStatus', () => {
  it('returns isOnline based on navigator.onLine', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it('returns isOnline=false when navigator is offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(false);
  });

  it('triggers sync on reconnect', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(false);

    // Simulate going online
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
    expect(processQueue).toHaveBeenCalled();
  });

  it('returns correct pendingCount', async () => {
    vi.mocked(getPendingCount).mockResolvedValue(5);

    const { result } = renderHook(() => useOnlineStatus());

    // Wait for the initial count to load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.pendingCount).toBe(5);
  });
});
