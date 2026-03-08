import { getDb, type PendingAction } from './db';
import { tasks } from '@/api/client';
import type { StatusChangeRequest, SortChangeRequest } from '@/types';

const MAX_RETRIES = 3;

export async function addAction(action: Omit<PendingAction, 'id' | 'createdAt' | 'retryCount'>): Promise<void> {
  const db = await getDb();
  const pending: PendingAction = {
    ...action,
    id: `${action.type}-${action.taskId}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  await db.put('pendingActions', pending);
}

export async function getPendingActions(): Promise<PendingAction[]> {
  const db = await getDb();
  return db.getAll('pendingActions');
}

export async function getPendingCount(): Promise<number> {
  const db = await getDb();
  return db.count('pendingActions');
}

export interface SyncResult {
  processed: number;
  failed: number;
  conflicts: number;
}

export async function processQueue(): Promise<SyncResult> {
  const db = await getDb();
  const pending = await db.getAll('pendingActions');
  const result: SyncResult = { processed: 0, failed: 0, conflicts: 0 };

  for (const action of pending) {
    try {
      if (action.type === 'STATUS_CHANGE') {
        await tasks.changeStatus(action.taskId, action.payload as unknown as StatusChangeRequest);
      } else if (action.type === 'SORT_CHANGE') {
        await tasks.changeSort(action.taskId, action.payload as unknown as SortChangeRequest);
      }

      await db.delete('pendingActions', action.id);
      result.processed++;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 409) {
        // Conflict — flag for user resolution, don't retry
        result.conflicts++;
        await db.delete('pendingActions', action.id);
      } else if (action.retryCount >= MAX_RETRIES - 1) {
        // Max retries exceeded — remove
        await db.delete('pendingActions', action.id);
        result.failed++;
      } else {
        // Increment retry count
        await db.put('pendingActions', {
          ...action,
          retryCount: action.retryCount + 1,
        });
        result.failed++;
      }
    }
  }

  return result;
}
