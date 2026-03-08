import { useState, useEffect, useCallback, useRef } from 'react';
import { processQueue, getPendingCount } from '@/offline/syncQueue';

interface UseOnlineStatusResult {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  triggerSync: () => Promise<void>;
}

export default function useOnlineStatus(): UseOnlineStatusResult {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const isSyncingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB not available
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      await processQueue();
      await refreshPendingCount();
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    void refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync, refreshPendingCount]);

  return { isOnline, isSyncing, pendingCount, triggerSync };
}
