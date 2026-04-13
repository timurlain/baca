import { useState } from 'react';
import useOfflineFocus from '@/hooks/useOfflineFocus';
import type { TaskStatus } from '@/types';
import { formatDate, isOverdue, cn } from '@/utils/helpers';
import Badge from '../shared/Badge';
import TaskDetailModal from '../board/TaskDetailModal';
import VoiceFab from '../voice/VoiceFab';
import { Link } from 'react-router-dom';

export default function FocusPage() {
  const { focusTasks: tasks, loading, error, changeStatus, refresh } = useOfflineFocus();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const handleStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    setUpdatingId(taskId);
    try {
      await changeStatus(taskId, { status: newStatus });
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-forest-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-gray-500 font-medium">Načítání tvého fokusu...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center">
        <p className="font-bold mb-2">Chyba</p>
        <p className="text-sm">{error}</p>
        <button onClick={refresh} className="mt-4 text-xs font-bold uppercase tracking-widest text-red-800 hover:underline">
          Zkusit znovu
        </button>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-6">
        <div className="text-6xl">🎉</div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Všechno splněno!</h2>
          <p className="text-gray-500">Nemáš žádné aktivní úkoly k řešení.</p>
        </div>
        <Link 
          to="/board" 
          className="bg-forest-800 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-forest-200 active:scale-95 transition-transform"
        >
          Prohlédnout board
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Můj fokus</h1>
          <Badge color="bg-forest-100 text-forest-800" className="px-3 py-1 text-sm font-bold">
            {tasks.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/tasks/new"
            className="inline-flex items-center gap-1 bg-forest-800 text-white hover:bg-forest-700 px-3 py-2 rounded-lg text-sm font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            <span className="hidden sm:inline">Nový</span>
          </Link>
          <VoiceFab />
        </div>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => {
          const overdue = isOverdue(task.dueDate);
          const isUpdating = updatingId === task.id;

          return (
            <div 
              key={task.id}
              className={cn(
                "bg-white rounded-2xl shadow-md border-l-8 overflow-hidden transition-all active:scale-[0.98]",
                task.priority === 'High' ? 'border-red-500' : 
                task.priority === 'Medium' ? 'border-blue-500' : 'border-gray-300',
                isUpdating ? "opacity-50 pointer-events-none" : ""
              )}
            >
              <div 
                className="p-5 cursor-pointer"
                onClick={() => setSelectedTaskId(task.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  {task.categoryName && (
                    <Badge 
                      color="text-white"
                      className="px-2 py-0.5 text-[10px]"
                      style={{ backgroundColor: task.categoryColor || '#9CA3AF' }}
                    >
                      {task.categoryName}
                    </Badge>
                  )}
                  {task.dueDate && (
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded",
                      overdue ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"
                    )}>
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight">
                  {task.title}
                </h3>

                {task.subTaskCount > 0 && (
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-forest-600 h-full transition-all duration-500" 
                        style={{ width: `${(task.subTaskDoneCount / task.subTaskCount) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-gray-500 shrink-0">
                      {task.subTaskDoneCount}/{task.subTaskCount}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 border-t border-gray-100 h-16">
                <button
                  disabled={isUpdating}
                  onClick={() => handleStatusChange(task.id, 'Done')}
                  className="flex items-center justify-center space-x-2 text-forest-700 font-bold border-r border-gray-100 hover:bg-forest-50 active:bg-forest-100 transition-colors"
                >
                  <span className="text-xl">✓</span>
                  <span>Hotovo</span>
                </button>
                <button
                  disabled={isUpdating}
                  onClick={() => handleStatusChange(task.id, 'ForReview')}
                  className="flex items-center justify-center space-x-2 text-purple-700 font-bold hover:bg-purple-50 active:bg-purple-100 transition-colors"
                >
                  <span className="text-xl">→</span>
                  <span>K review</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-sm italic">
        💡 Tyto úkoly jsou vybrány jako nejdůležitější k řešení. Ostatní najdeš na celkovém boardu.
      </div>

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={refresh}
        />
      )}
    </div>
  );
}
