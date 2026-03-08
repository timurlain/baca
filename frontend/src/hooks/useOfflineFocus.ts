import { useState, useEffect, useCallback } from 'react';
import { focus, tasks } from '@/api/client';
import { getAll, putAll } from '@/offline/db';
import { addAction } from '@/offline/syncQueue';
import type { FocusTask, StatusChangeRequest } from '@/types';

interface UseOfflineFocusResult {
  focusTasks: FocusTask[];
  loading: boolean;
  error: string | null;
  changeStatus: (taskId: number, req: StatusChangeRequest) => Promise<void>;
  refresh: () => Promise<void>;
}

export default function useOfflineFocus(): UseOfflineFocusResult {
  const [focusTasks, setFocusTasks] = useState<FocusTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (navigator.onLine) {
        const data = await focus.list();
        setFocusTasks(data);
        // Cache to IndexedDB
        await putAll('focusTasks', data);
      } else {
        // Read from IndexedDB
        const cached = await getAll('focusTasks');
        setFocusTasks(cached as FocusTask[]);
      }
    } catch {
      // Fallback to IndexedDB on any error
      try {
        const cached = await getAll('focusTasks');
        setFocusTasks(cached as FocusTask[]);
      } catch {
        setError('Nepodařilo se načíst úkoly');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const changeStatus = useCallback(async (taskId: number, req: StatusChangeRequest) => {
    if (navigator.onLine) {
      await tasks.changeStatus(taskId, req);
      await fetchTasks();
    } else {
      // Queue action for later sync
      await addAction({
        type: 'STATUS_CHANGE',
        taskId,
        payload: req as unknown as Record<string, unknown>,
      });
      // Optimistic update in local state
      setFocusTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: req.status } : t)),
      );
    }
  }, [fetchTasks]);

  return { focusTasks, loading, error, changeStatus, refresh: fetchTasks };
}
