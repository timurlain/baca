import { useState, useEffect, useCallback } from 'react';
import type { TaskDetail, TaskStatus, Priority, User, Category, Tag, TaskItem, UpdateTaskRequest } from '@/types';
import { UserRole } from '@/types';
import type { TaskImage } from '@/types';
import { tasks as tasksApi, categories as categoriesApi, users as usersApi, tags as tagsApi, comments as commentsApi, images as imagesApi } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { STATUS_LABELS, PRIORITY_LABELS, STATUS_COLORS } from '@/utils/constants';
import { cn, formatDate } from '@/utils/helpers';

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'právě teď';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(diffMs / 3600000);
  if (hrs < 24) return `${hrs} hod`;
  const days = Math.floor(diffMs / 86400000);
  if (days === 1) return 'včera';
  if (days < 7) return `${days} dní`;
  return formatDate(dateStr);
}
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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [taskImages, setTaskImages] = useState<TaskImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const isGuest = user?.role === UserRole.Guest;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [detail, categoriesData, tagsData] = await Promise.all([
        tasksApi.get(taskId),
        categoriesApi.list(),
        tagsApi.list(),
      ]);
      setTask(detail);
      setAllCategories(categoriesData);
      setAllTags(tagsData);
      // Non-critical data — load separately, don't break the modal
      usersApi.list().then(setAllUsers).catch(() => setAllUsers([]));
      imagesApi.list(taskId).then(setTaskImages).catch(() => setTaskImages([]));
    } catch (err: unknown) {
      console.error('Failed to fetch task detail:', err);
      const msg = err instanceof Error ? err.message : 'Neznámá chyba';
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchData();
    }
  }, [isOpen, taskId, fetchData]);

  const handleUpdate = async (patch: UpdateTaskRequest) => {
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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newComment.trim();
    if (!text) return;
    setSubmittingComment(true);
    try {
      await commentsApi.create(taskId, { text });
      setNewComment('');
      fetchData();
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploadingImage(true);
    const uploaded: TaskImage[] = [];
    try {
      for (const file of files) {
        try {
          uploaded.push(await imagesApi.upload(taskId, file));
        } catch (err) {
          console.error('Failed to upload image:', err);
        }
      }
    } finally {
      if (uploaded.length > 0) {
        setTaskImages(prev => [...prev, ...uploaded]);
        onUpdate();
      }
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleImageDelete = async (imageId: number) => {
    try {
      await imagesApi.delete(taskId, imageId);
      setTaskImages(prev => prev.filter(i => i.id !== imageId));
      onUpdate();
    } catch (err) {
      console.error('Failed to delete image:', err);
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
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                const url = `${window.location.origin}/tasks/${taskId}`;
                navigator.clipboard?.writeText(url).then(() => {
                  const btn = document.getElementById('copy-link-btn');
                  if (btn) { btn.textContent = '✓'; setTimeout(() => { btn.textContent = '🔗'; }, 1500); }
                });
              }}
              id="copy-link-btn"
              className="text-gray-400 hover:text-forest-600 p-2 text-sm"
              title="Zkopírovat odkaz"
            >🔗</button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-4 border-forest-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-500">Načítání detailu...</span>
            </div>
          ) : fetchError ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center">
              <p className="font-bold mb-2">Chyba</p>
              <p className="text-sm">{fetchError}</p>
              <button onClick={fetchData} className="mt-4 text-xs font-bold uppercase tracking-widest text-red-800 hover:underline">
                Zkusit znovu
              </button>
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

                {/* Images */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Obrázky
                      {taskImages.length > 0 && (
                        <span className="ml-1 text-gray-500 normal-case font-normal">
                          ({taskImages.length})
                        </span>
                      )}
                    </h3>
                    {!isGuest && (
                      <label className={cn(
                        "text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer",
                        uploadingImage && "opacity-50 pointer-events-none"
                      )}>
                        {uploadingImage ? 'Nahrávám...' : '+ Přidat'}
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp"
                          multiple
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                      </label>
                    )}
                  </div>
                  {taskImages.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {taskImages.map(img => (
                        <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
                          {img.url ? (
                            <a href={img.url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={img.url}
                                alt={img.fileName}
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              {img.fileName}
                            </div>
                          )}
                          {!isGuest && (
                            <button
                              type="button"
                              onClick={() => handleImageDelete(img.id)}
                              className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Smazat"
                              aria-label="Smazat obrázek"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Žádné obrázky</p>
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

                {/* Comments */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Komentáře
                    {task.comments.length > 0 && (
                      <span className="ml-1 text-gray-500 normal-case font-normal">
                        ({task.comments.length})
                      </span>
                    )}
                  </h3>

                  <div className="space-y-3">
                    {task.comments.map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar
                          name={comment.authorName}
                          color={comment.authorAvatarColor}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium text-gray-900">{comment.authorName}</span>
                            <span className="text-xs text-gray-400">{formatRelativeTime(comment.createdAt)}</span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mt-0.5">{comment.text}</p>
                        </div>
                      </div>
                    ))}
                    {task.comments.length === 0 && (
                      <p className="text-xs text-gray-400 italic">Zatím žádné komentáře</p>
                    )}
                  </div>

                  {!isGuest && (
                    <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Napsat komentář..."
                        maxLength={2000}
                        className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest-600"
                      />
                      <button
                        type="submit"
                        disabled={submittingComment || !newComment.trim()}
                        className="text-sm bg-forest-700 text-white rounded-lg px-4 py-2 hover:bg-forest-800 disabled:opacity-50 shrink-0"
                      >
                        Odeslat
                      </button>
                    </form>
                  )}
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
                      {allUsers.filter(u => u.isActive || u.id === task.assigneeId).map(u => (
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
                    onChange={(e) => handleUpdate({ dueDate: e.target.value ? `${e.target.value}T00:00:00Z` : null })}
                  />
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Značky</h4>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {task.tags.map((tag) => (
                      <span key={tag.id} className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: tag.color }}>
                        {tag.name}
                        {!isGuest && (
                          <button
                            onClick={() => handleUpdate({ tagIds: task.tags.filter(t => t.id !== tag.id).map(t => t.id) })}
                            className="hover:text-gray-200 ml-0.5"
                          >
                            &times;
                          </button>
                        )}
                      </span>
                    ))}
                    {task.tags.length === 0 && <span className="text-xs text-gray-400 italic">Bez značek</span>}
                  </div>
                  {!isGuest && (() => {
                    const available = allTags.filter(t => !task.tags.some(tt => tt.id === t.id));
                    return available.length > 0 ? (
                      <select
                        className="w-full text-xs font-medium py-1.5 px-2 rounded border border-gray-200 bg-white"
                        value=""
                        onChange={(e) => {
                          const tagId = Number(e.target.value);
                          if (tagId) handleUpdate({ tagIds: [...task.tags.map(t => t.id), tagId] });
                        }}
                      >
                        <option value="">+ Přidat značku</option>
                        {available.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    ) : null;
                  })()}
                  {!isGuest && (
                    <form className="mt-1 flex gap-1" onSubmit={async (e) => {
                      e.preventDefault();
                      const name = newTagName.trim();
                      if (!name) return;
                      try {
                        const created = await tagsApi.create({ name, color: '#3B82F6' });
                        setAllTags(prev => [...prev, created]);
                        await handleUpdate({ tagIds: [...task.tags.map(t => t.id), created.id] });
                        setNewTagName('');
                      } catch { /* duplicate or error — ignore */ }
                    }}>
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="Nová značka..."
                        className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button type="submit" disabled={!newTagName.trim()} className="text-xs bg-blue-600 text-white rounded px-2 py-1 hover:bg-blue-700 disabled:opacity-50">+</button>
                    </form>
                  )}
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
