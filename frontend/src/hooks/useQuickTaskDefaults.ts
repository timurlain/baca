import { useState, useCallback } from 'react';
import type { TaskStatus, Priority } from '@/types';

const STORAGE_KEY = 'baca-quick-task-defaults';

export interface QuickTaskDefaults {
  status: TaskStatus;
  priority: Priority;
  categoryId: number | null;
}

const FALLBACK: QuickTaskDefaults = {
  status: 'Open',
  priority: 'Medium',
  categoryId: null,
};

function loadFromStorage(): QuickTaskDefaults {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        status: parsed.status ?? FALLBACK.status,
        priority: parsed.priority ?? FALLBACK.priority,
        categoryId: parsed.categoryId ?? FALLBACK.categoryId,
      };
    }
  } catch { /* corrupted storage */ }
  return { ...FALLBACK };
}

export function useQuickTaskDefaults() {
  const [defaults, setDefaults] = useState<QuickTaskDefaults>(loadFromStorage);

  const saveDefaults = useCallback((next: QuickTaskDefaults) => {
    setDefaults(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  return { defaults, saveDefaults };
}
