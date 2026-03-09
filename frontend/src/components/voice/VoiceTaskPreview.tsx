import { tasks } from '@/api/client';
import type { VoiceParseResponse, CreateTaskRequest } from '@/types';
import TaskForm from '@/components/shared/TaskForm';
import type { TaskFormValues, FieldConfidence } from '@/components/shared/TaskForm';

interface VoiceTaskPreviewProps {
  parsed: VoiceParseResponse;
  onSave: () => void;
  onRetry: () => void;
  onCancel: () => void;
}

export default function VoiceTaskPreview({ parsed, onSave, onRetry, onCancel }: VoiceTaskPreviewProps) {
  const initialValues: Partial<TaskFormValues> = {
    title: parsed.title ?? '',
    description: parsed.description ?? '',
    assigneeId: parsed.assigneeId,
    categoryId: parsed.categoryId,
    priority: parsed.priority ?? undefined,
    status: parsed.status,
    dueDate: parsed.dueDate?.split('T')[0] ?? '',
  };

  const confidence: FieldConfidence = {
    title: parsed.title ? 0.9 : 0,
    assignee: parsed.assigneeConfidence,
    category: parsed.categoryConfidence,
    priority: parsed.priorityConfidence,
    dueDate: parsed.dueDateConfidence,
  };

  const handleSubmit = async (req: CreateTaskRequest) => {
    await tasks.create(req);
    onSave();
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-md p-3">
        <p className="text-xs text-gray-500 mb-1">Přepis</p>
        <p className="text-sm text-gray-600 italic">{parsed.rawTranscription}</p>
      </div>

      <TaskForm
        initialValues={initialValues}
        confidence={confidence}
        onSubmit={handleSubmit}
        submitLabel="Uložit úkol"
        idPrefix="vtp"
      />

      <div className="flex gap-2">
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
