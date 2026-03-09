import { useState, useEffect } from 'react';
import { focus } from '@/api/client';
import type { FocusTask } from '@/types';

export function useFocus() {
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFocus = async () => {
    try {
      setLoading(true);
      const data = await focus.list();
      setTasks(data);
      setError(null);
    } catch {
      setError('Nepodařilo se načíst úkoly.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFocus();
  }, []);

  return { tasks, loading, error, refresh: fetchFocus };
}
