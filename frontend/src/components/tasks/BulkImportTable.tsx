import { useState, useEffect } from 'react';
import {
  tasks as tasksApi,
  users as usersApi,
  categories as categoriesApi,
} from '@/api/client';
import { Priority, TaskStatus } from '@/types';
import type { VoiceParseResponse, User, Category } from '@/types';
import { PRIORITY_LABELS, STATUS_LABELS } from '@/utils/constants';

interface BulkImportTableProps {
  parsedTasks: VoiceParseResponse[];
  onSaveComplete: (count: number) => void;
}

interface EditableRow {
  key: number;
  title: string;
  assigneeId: number | null;
  categoryId: number | null;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  description: string;
  assigneeConfidence: number | null;
  categoryConfidence: number | null;
  priorityConfidence: number | null;
  dueDateConfidence: number | null;
  error: string | null;
  saved: boolean;
}

function cellClass(confidence: number | null): string {
  if (confidence === null || confidence === 0) return '';
  if (confidence < 0.5) return 'bg-red-50';
  if (confidence < 0.8) return 'bg-amber-50';
  return '';
}

const inputClasses =
  'border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-forest-600 w-full';

export default function BulkImportTable({
  parsedTasks,
  onSaveComplete,
}: BulkImportTableProps) {
  const [rows, setRows] = useState<EditableRow[]>(() =>
    parsedTasks.map((t, i) => ({
      key: i,
      title: t.title ?? '',
      assigneeId: t.assigneeId,
      categoryId: t.categoryId,
      priority: t.priority ?? Priority.Medium,
      status: t.status ?? TaskStatus.Idea,
      dueDate: t.dueDate ?? '',
      description: t.description ?? '',
      assigneeConfidence: t.assigneeConfidence,
      categoryConfidence: t.categoryConfidence,
      priorityConfidence: t.priorityConfidence,
      dueDateConfidence: t.dueDateConfidence,
      error: null,
      saved: false,
    })),
  );
  const [userList, setUserList] = useState<User[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    usersApi.list().then(setUserList).catch(() => {});
    categoriesApi.list().then(setCategoryList).catch(() => {});
  }, []);

  function updateRow(key: number, patch: Partial<EditableRow>) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }

  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  const unsavedRows = rows.filter((r) => !r.saved && r.title.trim() !== '');
  const unsavedCount = unsavedRows.length;

  async function handleSaveAll() {
    setSaving(true);
    let savedCount = 0;

    for (const row of rows) {
      if (row.saved || row.title.trim() === '') continue;

      try {
        await tasksApi.create({
          title: row.title,
          description: row.description || null,
          assigneeId: row.assigneeId,
          categoryId: row.categoryId,
          priority: row.priority,
          status: row.status,
          dueDate: row.dueDate || null,
        });
        updateRow(row.key, { saved: true, error: null });
        savedCount++;
      } catch {
        updateRow(row.key, { error: 'Nepodařilo se uložit' });
      }
    }

    setSaving(false);

    if (savedCount === unsavedCount) {
      onSaveComplete(savedCount);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">
        Nebyly nalezeny žádné úkoly v textu.
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">
                Název
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">
                Přiřazeno
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">
                Kategorie
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">
                Priorita
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">
                Termín
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">
                Stav
              </th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr
                key={row.key}
                className={
                  row.saved
                    ? 'opacity-50'
                    : row.error
                      ? 'bg-red-50'
                      : ''
                }
              >
                {/* Title */}
                <td className="px-3 py-2" style={{ minWidth: 200 }}>
                  <input
                    type="text"
                    className={inputClasses}
                    style={{ minWidth: 200 }}
                    value={row.title}
                    disabled={row.saved}
                    onChange={(e) =>
                      updateRow(row.key, { title: e.target.value })
                    }
                  />
                </td>

                {/* Assignee */}
                <td
                  className={`px-3 py-2 ${cellClass(row.assigneeConfidence)}`}
                  style={{ minWidth: 120 }}
                >
                  <select
                    className={inputClasses}
                    style={{ minWidth: 120 }}
                    value={row.assigneeId ?? ''}
                    disabled={row.saved}
                    onChange={(e) =>
                      updateRow(row.key, {
                        assigneeId: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  >
                    <option value="">—</option>
                    {userList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Category */}
                <td
                  className={`px-3 py-2 ${cellClass(row.categoryConfidence)}`}
                  style={{ minWidth: 120 }}
                >
                  <select
                    className={inputClasses}
                    style={{ minWidth: 120 }}
                    value={row.categoryId ?? ''}
                    disabled={row.saved}
                    onChange={(e) =>
                      updateRow(row.key, {
                        categoryId: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  >
                    <option value="">—</option>
                    {categoryList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Priority */}
                <td
                  className={`px-3 py-2 ${cellClass(row.priorityConfidence)}`}
                  style={{ minWidth: 90 }}
                >
                  <select
                    className={inputClasses}
                    style={{ minWidth: 90 }}
                    value={row.priority}
                    disabled={row.saved}
                    onChange={(e) =>
                      updateRow(row.key, {
                        priority: e.target.value as Priority,
                      })
                    }
                  >
                    {Object.values(Priority).map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Due date */}
                <td
                  className={`px-3 py-2 ${cellClass(row.dueDateConfidence)}`}
                  style={{ minWidth: 130 }}
                >
                  <input
                    type="date"
                    className={inputClasses}
                    style={{ minWidth: 130 }}
                    value={row.dueDate}
                    disabled={row.saved}
                    onChange={(e) =>
                      updateRow(row.key, { dueDate: e.target.value })
                    }
                  />
                </td>

                {/* Status */}
                <td className="px-3 py-2" style={{ minWidth: 100 }}>
                  <select
                    className={inputClasses}
                    style={{ minWidth: 100 }}
                    value={row.status}
                    disabled={row.saved}
                    onChange={(e) =>
                      updateRow(row.key, {
                        status: e.target.value as TaskStatus,
                      })
                    }
                  >
                    {Object.values(TaskStatus).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Action / status column */}
                <td className="px-3 py-2 text-center whitespace-nowrap">
                  {row.saved ? (
                    <span className="text-green-600 font-medium text-sm">
                      OK
                    </span>
                  ) : row.error ? (
                    <span className="text-red-600 text-sm">{row.error}</span>
                  ) : (
                    <button
                      type="button"
                      title="Odebrat"
                      className="text-gray-400 hover:text-red-600"
                      onClick={() => removeRow(row.key)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {unsavedCount > 0 && (
        <button
          type="button"
          className="w-full bg-forest-800 text-white rounded-lg px-4 py-3 text-sm font-medium mt-4 disabled:opacity-50"
          disabled={saving}
          onClick={handleSaveAll}
        >
          {saving
            ? 'Ukládání...'
            : `Uložit vše (${unsavedCount} úkolů)`}
        </button>
      )}
    </div>
  );
}
