import { useState, useEffect } from 'react';
import { tasks, users as usersApi, categories as categoriesApi } from '@/api/client';
import { Priority, TaskStatus } from '@/types';
import type { VoiceParseResponse, User, Category, CreateTaskRequest } from '@/types';

const PRIORITY_LABELS: Record<string, string> = {
  High: 'Vysoká',
  Medium: 'Střední',
  Low: 'Nízká',
};

const STATUS_LABELS: Record<string, string> = {
  Idea: 'Nápad',
  Open: 'Otevřený',
  InProgress: 'Rozpracovaný',
  ForReview: 'K review',
  Done: 'Hotovo',
};

function confidenceClass(confidence: number | null): string {
  if (confidence === null || confidence === 0) return 'border-gray-300';
  if (confidence < 0.5) return 'border-red-400 bg-red-50';
  if (confidence < 0.8) return 'border-amber-300 bg-amber-50';
  return 'border-gray-300';
}

function WarningIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 inline ml-1">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  );
}

interface VoiceTaskPreviewProps {
  parsed: VoiceParseResponse;
  onSave: () => void;
  onRetry: () => void;
  onCancel: () => void;
}

export default function VoiceTaskPreview({ parsed, onSave, onRetry, onCancel }: VoiceTaskPreviewProps) {
  const [title, setTitle] = useState(parsed.title ?? '');
  const [description, setDescription] = useState(parsed.description ?? '');
  const [assigneeId, setAssigneeId] = useState<number | null>(parsed.assigneeId);
  const [categoryId, setCategoryId] = useState<number | null>(parsed.categoryId);
  const [priority, setPriority] = useState<Priority>(parsed.priority ?? Priority.Medium);
  const [dueDate, setDueDate] = useState(parsed.dueDate?.split('T')[0] ?? '');
  const [status, setStatus] = useState(parsed.status ?? TaskStatus.Open);

  const [userList, setUserList] = useState<User[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    usersApi.list().then(setUserList).catch(() => {});
    categoriesApi.list().then(setCategoryList).catch(() => {});
  }, []);

  const handleSave = async () => {
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
        dueDate: dueDate || undefined,
        status,
      };
      await tasks.create(req);
      onSave();
    } catch {
      setError('Nepodařilo se vytvořit úkol');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-md p-3">
        <p className="text-xs text-gray-500 mb-1">Přepis</p>
        <p className="text-sm text-gray-600 italic">{parsed.rawTranscription}</p>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="vtp-title" className="block text-sm font-medium text-gray-700 mb-1">Název</label>
          <input
            id="vtp-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${confidenceClass(parsed.title ? 0.9 : 0)}`}
          />
        </div>

        <div>
          <label htmlFor="vtp-assignee" className="block text-sm font-medium text-gray-700 mb-1">
            Přiřazeno
            {parsed.assigneeConfidence !== null && parsed.assigneeConfidence < 0.5 && <WarningIcon />}
          </label>
          <select
            id="vtp-assignee"
            value={assigneeId ?? ''}
            onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : null)}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${confidenceClass(parsed.assigneeConfidence)}`}
          >
            <option value="">— Nepřiřazeno —</option>
            {userList.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="vtp-category" className="block text-sm font-medium text-gray-700 mb-1">
            Kategorie
            {parsed.categoryConfidence !== null && parsed.categoryConfidence < 0.5 && <WarningIcon />}
          </label>
          <select
            id="vtp-category"
            value={categoryId ?? ''}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${confidenceClass(parsed.categoryConfidence)}`}
          >
            <option value="">— Bez kategorie —</option>
            {categoryList.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="vtp-priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priorita
              {parsed.priorityConfidence !== null && parsed.priorityConfidence < 0.5 && <WarningIcon />}
            </label>
            <select
              id="vtp-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${confidenceClass(parsed.priorityConfidence)}`}
            >
              {Object.values(Priority).map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="vtp-status" className="block text-sm font-medium text-gray-700 mb-1">Stav</label>
            <select
              id="vtp-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof TaskStatus[keyof typeof TaskStatus])}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(TaskStatus).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="vtp-dueDate" className="block text-sm font-medium text-gray-700 mb-1">
            Termín
            {parsed.dueDateConfidence !== null && parsed.dueDateConfidence < 0.5 && <WarningIcon />}
          </label>
          <input
            id="vtp-dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${confidenceClass(parsed.dueDateConfidence)}`}
          />
        </div>

        <div>
          <label htmlFor="vtp-desc" className="block text-sm font-medium text-gray-700 mb-1">Popis</label>
          <textarea
            id="vtp-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Ukládání...' : 'Uložit úkol'}
        </button>
        <button
          onClick={onRetry}
          className="border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Zkusit znovu
        </button>
        <button
          onClick={onCancel}
          className="border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Zrušit
        </button>
      </div>
    </div>
  );
}
