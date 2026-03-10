import { useState, useEffect, useCallback } from 'react';
import type { TaskDetail, TaskStatus, Priority, User, Category, TaskItem } from '@/types';
import { UserRole } from '@/types';
import { tasks as tasksApi, categories as categoriesApi, users as usersApi } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { STATUS_LABELS, PRIORITY_LABELS, STATUS_COLORS } from '@/utils/constants';
import { cn } from '@/utils/helpers';
import Avatar from '../shared/Avatar';
import ConfirmDialog from '../shared/ConfirmDialog';

interface TaskDetailModalProps {
  taskId: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TaskDetailModal({ taskId, isOpen, onClose, onUpdate }: TaskDetailModalProps) {
  const { user } = useAuth();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const isGuest = user?.role === UserRole.Guest;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, usersData, categoriesData] = await Promise.all([
        tasksApi.get(taskId),
        usersApi.list(),
        categoriesApi.list(),
      ]);
      setTask(detail);
      setAllUsers(usersData);
      setAllCategories(categoriesData);
    } catch (err) {
      console.error('Failed to fetch task detail:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchData();
    }
  }, [isOpen, taskId, fetchData]);

  const handleUpdate = async (patch: Partial<TaskDetail>) => {
    if (isGuest) return;
    try {
      await tasksApi.update(taskId, patch);
      onUpdate();
      fetchData();
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await tasksApi.delete(taskId);
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newSubtaskTitle.trim();
    if (!title) return;
    setAddingSubtask(true);
    try {
      await tasksApi.create({ title, parentTaskId: taskId });
      setNewSubtaskTitle('');
      setShowSubtaskForm(false);
      fetchData();
    } catch (err) {
      console.error('Failed to create subtask:', err);
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleSubtaskStatusToggle = async (subtask: TaskItem) => {
    const nextStatus = subtask.status === 'Done' ? 'Open' : 'Done';
    try {
      await tasksApi.changeStatus(subtask.id, { status: nextStatus });
      fetchData();
    } catch (err) {
      console.error('Failed to update subtask status:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true">
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between sticky top-0">
          <div className="flex items-center space-x-2 overflow-hidden mr-4">
            <span className="text-gray-400 text-xs font-mono uppercase shrink-0">#{taskId}</span>
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {task?.title || 'Načítání...'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-4 border-forest-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-500">Načítání detailu...</span>
            </div>
          ) : task && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Main Info */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Popis</h3>
                  {isGuest ? (
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                      {task.description || <em className="text-gray-400 font-normal">Bez popisu</em>}
                    </div>
                  ) : (
                    <textarea
                      className="w-full p-3 border border-gray-200 rounded-lg text-sm min-h-[120px] focus:ring-2 focus:ring-forest-600 outline-none transition-all"
                      placeholder="Přidejte podrobnější popis..."
                      value={task.description || ''}
                      onChange={(e) => setTask({ ...task, description: e.target.value })}
                      onBlur={() => handleUpdate({ description: task.description })}
                    />
                  )}
                </div>

                {/* Subtasks */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Subtasky
                      {task.subtasks.length > 0 && (
                        <span className="ml-1 text-gray-500 normal-case font-normal">
                          ({task.subtasks.filter(s => s.status === 'Done').length}/{task.subtasks.length})
                        </span>
                      )}
                    </h3>
                    {!isGuest && !showSubtaskForm && (
                      <button
                        onClick={() => setShowSubtaskForm(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        + Přidat
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {task.subtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2 py-1">
                        {!isGuest ? (
                          <button
                            onClick={() => handleSubtaskStatusToggle(subtask)}
                            className={cn(
                              "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                              subtask.status === 'Done'
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-gray-300 hover:border-green-400"
                            )}
                          >
                            {subtask.status === 'Done' && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        ) : (
                          <span className={cn(
                            "w-4 h-4 rounded border-2 flex-shrink-0",
                            subtask.status === 'Done' ? "bg-green-500 border-green-500" : "border-gray-300"
                          )} />
                        )}
                        <span className={cn(
                          "text-sm flex-1",
                          subtask.status === 'Done' ? "line-through text-gray-400" : "text-gray-700"
                        )}>
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                    {task.subtasks.length === 0 && !showSubtaskForm && (
                      <p className="text-xs text-gray-400 italic">Žádné subtasky</p>
                    )}
                  </div>
                  {showSubtaskForm && (
                    <form onSubmit={handleAddSubtask} className="mt-2 flex gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        placeholder="Název subtasku..."
                        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-forest-600"
                      />
                      <button
                        type="submit"
                        disabled={addingSubtask || !newSubtaskTitle.trim()}
                        className="text-xs bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700 disabled:opacity-50"
                      >
                        Přidat
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowSubtaskForm(false); setNewSubtaskTitle(''); }}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                      >
                        Zrušit
                      </button>
                    </form>
                  )}
                </div>

                {/* Comments stub */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Komentáře</h3>
                  <div className="text-sm text-gray-500 italic">Zatím neimplementováno.</div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6 bg-gray-50 p-4 rounded-xl border border-gray-100 h-fit">
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Stav</h4>
                  <select
                    disabled={isGuest}
                    className={cn(
                      "w-full text-xs font-bold py-1.5 px-2 rounded border-none appearance-none cursor-pointer text-white",
                      STATUS_COLORS[task.status]
                    )}
                    value={task.status}
                    onChange={(e) => handleUpdate({ status: e.target.value as TaskStatus })}
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val} className="bg-white text-gray-900 font-normal">{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Priorita</h4>
                  <select
                    disabled={isGuest}
                    className="w-full text-xs font-medium py-1.5 px-2 rounded border border-gray-200 bg-white"
                    value={task.priority}
                    onChange={(e) => handleUpdate({ priority: e.target.value as Priority })}
                  >
                    {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Kategorie</h4>
                  <select
                    disabled={isGuest}
                    className="w-full text-xs font-medium py-1.5 px-2 rounded border border-gray-200 bg-white"
                    value={task.categoryId || ''}
                    onChange={(e) => handleUpdate({ categoryId: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">Bez kategorie</option>
                    {allCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Řešitel</h4>
                  <div className="flex items-center space-x-2">
                    <Avatar name={task.assigneeName} shortcut={task.assigneeShortcut} color={task.assigneeAvatarColor} size="sm" />
                    <select
                      disabled={isGuest}
                      className="flex-1 text-xs font-medium py-1.5 px-2 rounded border border-gray-200 bg-white truncate"
                      value={task.assigneeId || ''}
                      onChange={(e) => handleUpdate({ assigneeId: e.target.value ? Number(e.target.value) : null })}
                    >
                      <option value="">Nepřiřazeno</option>
                      {allUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Termín</h4>
                  <input
                    disabled={isGuest}
                    type="date"
                    className="w-full text-xs font-medium py-1.5 px-2 rounded border border-gray-200 bg-white"
                    value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                    onChange={(e) => handleUpdate({ dueDate: e.target.value || null })}
                  />
                </div>

                {!isGuest && (
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setIsDeleting(true)}
                      className="w-full text-xs font-bold text-red-600 py-2 hover:bg-red-50 rounded transition-colors flex items-center justify-center space-x-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Smazat úkol</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer for mobile */}
        <div className="sm:hidden bg-gray-50 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-forest-800 text-white py-3 rounded-lg font-bold"
          >
            Zavřít
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isDeleting}
        title="Smazat úkol?"
        message="Tato akce je nevratná. Budou smazány i všechny subtasky a komentáře."
        confirmLabel="Smazat"
        isDanger={true}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleting(false)}
      />
    </div>
  );
}
