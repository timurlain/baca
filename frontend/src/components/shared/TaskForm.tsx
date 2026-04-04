import { useState, useEffect, type FormEvent } from 'react';
import { users as usersApi, categories as categoriesApi } from '@/api/client';
import { Priority, TaskStatus } from '@/types';
import type { User, Category, CreateTaskRequest } from '@/types';
import { PRIORITY_LABELS, STATUS_LABELS } from '@/utils/constants';

export interface TaskFormValues {
  title: string;
  description: string;
  assigneeId: number | null;
  categoryId: number | null;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
}

export interface FieldConfidence {
  title?: number | null;
  assignee?: number | null;
  category?: number | null;
  priority?: number | null;
  dueDate?: number | null;
}

interface TaskFormProps {
  initialValues?: Partial<TaskFormValues>;
  confidence?: FieldConfidence;
  onSubmit: (req: CreateTaskRequest) => Promise<void>;
  submitLabel?: string;
  submittingLabel?: string;
  idPrefix?: string;
}

function confidenceClass(confidence: number | null | undefined): string {
  if (confidence === null || confidence === undefined) return 'border-gray-300';
  if (confidence < 0.5) return 'border-red-400 bg-red-50';
  if (confidence < 0.8) return 'border-amber-300 bg-amber-50';
  return 'border-green-400 bg-green-50';
}

function WarningIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 inline ml-1">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  );
}

export default function TaskForm({
  initialValues,
  confidence,
  onSubmit,
  submitLabel = 'Uložit úkol',
  submittingLabel = 'Ukládání...',
  idPrefix = 'tf',
}: TaskFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [assigneeId, setAssigneeId] = useState<number | null>(initialValues?.assigneeId ?? null);
  const [categoryId, setCategoryId] = useState<number | null>(initialValues?.categoryId ?? null);
  const [priority, setPriority] = useState<Priority>(initialValues?.priority ?? Priority.Medium);
  const [status, setStatus] = useState<TaskStatus>(initialValues?.status ?? TaskStatus.Open);
  const [dueDate, setDueDate] = useState(initialValues?.dueDate ?? '');

  const [userList, setUserList] = useState<User[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    usersApi.list().then(setUserList).catch(() => {});
    categoriesApi.list().then(setCategoryList).catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Název úkolu je povinný');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const req: CreateTaskRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        assigneeId: assigneeId ?? undefined,
        categoryId: categoryId ?? undefined,
        priority,
        dueDate: dueDate ? `${dueDate}T00:00:00Z` : undefined,
        status,
      };
      await onSubmit(req);
      // Reset only title, description, dueDate — keep category, priority, assignee, status
      setTitle('');
      setDescription('');
      setDueDate('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se vytvořit úkol');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor={`${idPrefix}-title`} className="block text-sm font-medium text-gray-700 mb-1">Název</label>
        <input
          id={`${idPrefix}-title`}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 ${confidenceClass(confidence?.title)}`}
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-assignee`} className="block text-sm font-medium text-gray-700 mb-1">
          Přiřazeno
          {confidence?.assignee != null && confidence.assignee < 0.5 && <WarningIcon />}
        </label>
        <select
          id={`${idPrefix}-assignee`}
          value={assigneeId ?? ''}
          onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : null)}
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 ${confidenceClass(confidence?.assignee)}`}
        >
          <option value="">— Nepřiřazeno —</option>
          {userList.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-category`} className="block text-sm font-medium text-gray-700 mb-1">
          Kategorie
          {confidence?.category != null && confidence.category < 0.5 && <WarningIcon />}
        </label>
        <select
          id={`${idPrefix}-category`}
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 ${confidenceClass(confidence?.category)}`}
        >
          <option value="">— Bez kategorie —</option>
          {categoryList.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idPrefix}-priority`} className="block text-sm font-medium text-gray-700 mb-1">
            Priorita
            {confidence?.priority != null && confidence.priority < 0.5 && <WarningIcon />}
          </label>
          <select
            id={`${idPrefix}-priority`}
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 ${confidenceClass(confidence?.priority)}`}
          >
            {Object.values(Priority).map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${idPrefix}-status`} className="block text-sm font-medium text-gray-700 mb-1">Stav</label>
          <select
            id={`${idPrefix}-status`}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof TaskStatus[keyof typeof TaskStatus])}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
          >
            {Object.values(TaskStatus).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-dueDate`} className="block text-sm font-medium text-gray-700 mb-1">
          Termín
          {confidence?.dueDate != null && confidence.dueDate < 0.5 && <WarningIcon />}
        </label>
        <input
          id={`${idPrefix}-dueDate`}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 ${confidenceClass(confidence?.dueDate)}`}
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-desc`} className="block text-sm font-medium text-gray-700 mb-1">Popis</label>
        <textarea
          id={`${idPrefix}-desc`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-forest-700 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-forest-800 disabled:opacity-50"
      >
        {saving ? submittingLabel : submitLabel}
      </button>
    </form>
  );
}
