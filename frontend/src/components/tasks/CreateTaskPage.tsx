import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tasks } from '@/api/client';
import { TaskStatus } from '@/types';
import type { CreateTaskRequest } from '@/types';
import TaskForm from '@/components/shared/TaskForm';

type Tab = 'single' | 'bulk';

function isValidTaskStatus(value: string): value is TaskStatus {
  return Object.values(TaskStatus).includes(value as TaskStatus);
}

export default function CreateTaskPage() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('single');
  const [toast, setToast] = useState(false);

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{"Nov\u00fd \u00fakol"}</h1>

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
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-500">
          {"Hromadn\u00fd import \u2014 p\u0159ipravuje se\u2026"}
        </div>
      )}
    </div>
  );
}
