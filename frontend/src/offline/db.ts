import { openDB, type IDBPDatabase } from 'idb';
import type { TaskItem, Category, User, FocusTask } from '@/types';

const DB_NAME = 'baca-offline';
const DB_VERSION = 1;

export interface PendingAction {
  id: string;
  type: 'STATUS_CHANGE' | 'SORT_CHANGE';
  taskId: number;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

interface BacaDB {
  tasks: {
    key: number;
    value: TaskItem;
  };
  focusTasks: {
    key: number;
    value: FocusTask;
  };
  categories: {
    key: number;
    value: Category;
  };
  users: {
    key: number;
    value: User;
  };
  pendingActions: {
    key: string;
    value: PendingAction;
  };
}

let dbInstance: IDBPDatabase<BacaDB> | null = null;

export async function getDb(): Promise<IDBPDatabase<BacaDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<BacaDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('tasks')) {
        db.createObjectStore('tasks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('focusTasks')) {
        db.createObjectStore('focusTasks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pendingActions')) {
        db.createObjectStore('pendingActions', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// Generic helpers
export async function putAll<S extends keyof BacaDB>(
  store: S,
  items: BacaDB[S]['value'][],
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(store, 'readwrite');
  for (const item of items) {
    await tx.store.put(item);
  }
  await tx.done;
}

export async function getAll<S extends keyof BacaDB>(
  store: S,
): Promise<BacaDB[S]['value'][]> {
  const db = await getDb();
  return db.getAll(store);
}

export async function clearStore<S extends keyof BacaDB>(store: S): Promise<void> {
  const db = await getDb();
  await db.clear(store);
}
