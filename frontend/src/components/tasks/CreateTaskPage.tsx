import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { tasks, voice } from '@/api/client';
import { TaskStatus } from '@/types';
import type { CreateTaskRequest, VoiceParseResponse } from '@/types';
import TaskForm from '@/components/shared/TaskForm';
import BulkImportTable from './BulkImportTable';

type Tab = 'single' | 'bulk';

function isValidTaskStatus(value: string): value is TaskStatus {
  return Object.values(TaskStatus).includes(value as TaskStatus);
}

export default function CreateTaskPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('single');
  const [toast, setToast] = useState(false);

  const [bulkText, setBulkText] = useState('');
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [parsedTasks, setParsedTasks] = useState<VoiceParseResponse[] | null>(null);

  const statusParam = searchParams.get('status') ?? '';
  const initialStatus: TaskStatus = isValidTaskStatus(statusParam)
    ? (statusParam as TaskStatus)
    : TaskStatus.Idea;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(false), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSubmit = useCallback(async (req: CreateTaskRequest) => {
    await tasks.create(req);
    setToast(true);
  }, []);

  const handleParseBulk = async () => {
    if (!bulkText.trim()) return;
    setBulkParsing(true);
    setBulkError(null);
    setParsedTasks(null);
    try {
      const result = await voice.parseBulk({ text: bulkText.trim() });
      if (result.tasks.length === 0) {
        setBulkError('Nebyly nalezeny \u017e\u00e1dn\u00e9 \u00fakoly v textu.');
      } else {
        setParsedTasks(result.tasks);
      }
    } catch {
      setBulkError('Nepoda\u0159ilo se zpracovat text. Zkuste to znovu.');
    } finally {
      setBulkParsing(false);
    }
  };

  const handleBulkSaveComplete = (_count: number) => {
    navigate('/board');
  };

  const handleBulkReset = () => {
    setParsedTasks(null);
    setBulkText('');
    setBulkError(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{"\u004eov\u00fd \u00fakol"}</h1>

      {toast && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 border border-green-200 text-sm font-medium">
          {"\u00dakol vytvo\u0159en"}
        </div>
      )}

      <div className="flex border-b mb-6">
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'single'
              ? 'text-forest-700 border-b-2 border-forest-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('single')}
        >
          {"Jeden \u00fakol"}
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'bulk'
              ? 'text-forest-700 border-b-2 border-forest-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('bulk')}
        >
          {"Hromadn\u00fd import"}
        </button>
      </div>

      {activeTab === 'single' ? (
        <div className="max-w-lg mx-auto">
          <TaskForm
            initialValues={{ status: initialStatus }}
            onSubmit={handleSubmit}
            submitLabel={"Vytvo\u0159it \u00fakol"}
            submittingLabel={"Vytv\u00e1\u0159\u00edm\u2026"}
            idPrefix="create"
          />
        </div>
      ) : parsedTasks === null ? (
        <div>
          <textarea
            rows={8}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 resize-y"
            placeholder="Vlo\u017ete text, tabulku z Excelu nebo pozn\u00e1mky z porady..."
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          {bulkError && (
            <p className="text-red-600 text-sm mt-2">{bulkError}</p>
          )}
          <button
            type="button"
            className="w-full bg-forest-800 text-white rounded-lg px-4 py-3 text-sm font-medium mt-4 disabled:opacity-50"
            disabled={bulkParsing || !bulkText.trim()}
            onClick={handleParseBulk}
          >
            {bulkParsing ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {"Zpracov\u00e1v\u00e1m\u2026"}
              </span>
            ) : (
              'Zpracovat'
            )}
          </button>
        </div>
      ) : (
        <div>
          <BulkImportTable parsedTasks={parsedTasks} onSaveComplete={handleBulkSaveComplete} />
          <button
            type="button"
            className="mt-4 text-sm text-gray-600 hover:text-gray-900 underline"
            onClick={handleBulkReset}
          >
            {"Zp\u011bt na import"}
          </button>
        </div>
      )}
    </div>
  );
}
