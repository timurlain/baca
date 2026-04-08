import { useState, useCallback } from 'react';
import { TaskStatus, Priority } from '@/types';
import type { TaskStatus as TaskStatusType, Priority as PriorityType } from '@/types';

const STORAGE_KEY = 'baca-quick-task-defaults';

export interface QuickTaskDefaults {
  status: TaskStatusType;
  priority: PriorityType;
  categoryId: number | null;
}

const FALLBACK: QuickTaskDefaults = {
  status: 'Open',
  priority: 'Medium',
  categoryId: null,
};

const VALID_STATUSES = new Set(Object.values(TaskStatus));
const VALID_PRIORITIES = new Set(Object.values(Priority));

function loadFromStorage(): QuickTaskDefaults {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        status: VALID_STATUSES.has(parsed.status) ? parsed.status : FALLBACK.status,
        priority: VALID_PRIORITIES.has(parsed.priority) ? parsed.priority : FALLBACK.priority,
        categoryId: typeof parsed.categoryId === 'number' ? parsed.categoryId : FALLBACK.categoryId,
      };
    }
  } catch { /* corrupted storage */ }
  return { ...FALLBACK };
}

export function useQuickTaskDefaults() {
  const [defaults, setDefaults] = useState<QuickTaskDefaults>(loadFromStorage);

  const saveDefaults = useCallback((next: QuickTaskDefaults) => {
    setDefaults(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* storage unavailable/quota exceeded */ }
  }, []);

  return { defaults, saveDefaults };
}
