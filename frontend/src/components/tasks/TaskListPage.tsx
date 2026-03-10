import { useState, useEffect, useCallback, useRef } from 'react';
import { tasks as tasksApi, categories as categoriesApi, users as usersApi, tags as tagsApi } from '@/api/client';
import type { TaskItem, Category, User, Tag } from '@/types';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/utils/constants';
import { formatDate, isOverdue, cn } from '@/utils/helpers';
import Avatar from '@/components/shared/Avatar';
import TaskDetailModal from '@/components/board/TaskDetailModal';

interface Filters {
  status: string;
  assignee: string;
  priority: string;
  category: string;
  tag: string;
  overdue: string;
}

const COOKIE_KEY = 'baca_task_filters';

function loadFilters(): Filters {
  try {
    const raw = document.cookie.split('; ').find(c => c.startsWith(COOKIE_KEY + '='));
    if (raw) {
      return JSON.parse(decodeURIComponent(raw.split('=')[1]));
    }
  } catch { /* ignore */ }
  return { status: '', assignee: '', priority: '', category: '', tag: '', overdue: '' };
}

function saveFilters(filters: Filters) {
  const value = encodeURIComponent(JSON.stringify(filters));
  document.cookie = `${COOKIE_KEY}=${value};path=/;max-age=31536000;SameSite=Lax`;
}

export default function TaskListPage() {
  const [taskList, setTaskList] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(loadFilters);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load reference data
  useEffect(() => {
    Promise.all([usersApi.list(), categoriesApi.list(), tagsApi.list()]).then(
      ([u, c, t]) => { setAllUsers(u); setAllCategories(c); setAllTags(t); }
    );
  }, []);

  const fetchTasks = useCallback(async (searchTerm?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = { all: true };
      if (searchTerm) params.search = searchTerm;
      if (filters.status) params.status = filters.status;
      if (filters.assignee) params.assignee = Number(filters.assignee);
      if (filters.priority) params.priority = filters.priority;
      if (filters.category) params.category = Number(filters.category);
      if (filters.tag) params.tag = Number(filters.tag);
      if (filters.overdue === 'true') params.overdue = true;
      const result = await tasksApi.list(params as Parameters<typeof tasksApi.list>[0]);
      setTaskList(result);
    } catch {
      setTaskList([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTasks(search);
  }, [filters, fetchTasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchTasks(value), 300);
  };

  const updateFilter = (key: keyof Filters, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    saveFilters(next);
  };

  const clearFilters = () => {
    const empty: Filters = { status: '', assignee: '', priority: '', category: '', tag: '', overdue: '' };
    setFilters(empty);
    saveFilters(empty);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{"\u00dakoly"}</h1>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={"Hledat v n\u00e1zvu, popisu, koment\u00e1\u0159\u00edch\u2026"}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}
          className="text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white">
          <option value="">Stav</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        <select value={filters.assignee} onChange={(e) => updateFilter('assignee', e.target.value)}
          className="text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white">
          <option value="">{"\u0158e\u0161itel"}</option>
          {allUsers.filter(u => u.isActive).map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <select value={filters.priority} onChange={(e) => updateFilter('priority', e.target.value)}
          className="text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white">
          <option value="">Priorita</option>
          {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        <select value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}
          className="text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white">
          <option value="">Kategorie</option>
          {allCategories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select value={filters.tag} onChange={(e) => updateFilter('tag', e.target.value)}
          className="text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white">
          <option value="">{"\u0160t\u00edtky"}</option>
          {allTags.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <select value={filters.overdue} onChange={(e) => updateFilter('overdue', e.target.value)}
          className="text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white">
          <option value="">{"\u0054erm\u00edn"}</option>
          <option value="true">Po splatnosti</option>
        </select>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5">
            {"Zru\u0161it filtry"}
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="text-xs text-gray-400 mb-2">
        {loading ? 'Načítání...' : `${taskList.length} úkolů`}
      </div>

      {/* Task table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-2">{"N\u00e1zev"}</th>
              <th className="px-4 py-2 hidden sm:table-cell">Stav</th>
              <th className="px-4 py-2 hidden md:table-cell">Priorita</th>
              <th className="px-4 py-2 hidden md:table-cell">{"\u0158e\u0161itel"}</th>
              <th className="px-4 py-2 hidden lg:table-cell">Kategorie</th>
              <th className="px-4 py-2 hidden lg:table-cell">{"\u0054erm\u00edn"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {taskList.map(task => (
              <tr
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs font-mono">#{task.id}</span>
                    <span className="font-medium text-gray-900 truncate max-w-xs">{task.title}</span>
                  </div>
                  {task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {task.tags.map(tag => (
                        <span key={tag.id} className="text-[9px] font-medium px-1.5 py-0 rounded-full text-white" style={{ backgroundColor: tag.color }}>
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5 hidden sm:table-cell">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded text-white", STATUS_COLORS[task.status])}>
                    {STATUS_LABELS[task.status]}
                  </span>
                </td>
                <td className="px-4 py-2.5 hidden md:table-cell">
                  <span className={cn("text-xs font-medium", PRIORITY_COLORS[task.priority])}>
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                </td>
                <td className="px-4 py-2.5 hidden md:table-cell">
                  {task.assigneeId ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar name={task.assigneeName} shortcut={task.assigneeShortcut} color={task.assigneeAvatarColor} size="xs" />
                      <span className="text-xs text-gray-700 truncate">{task.assigneeName}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">&mdash;</span>
                  )}
                </td>
                <td className="px-4 py-2.5 hidden lg:table-cell">
                  {task.categoryName ? (
                    <span className="inline-flex items-center gap-1 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.categoryColor || '#9CA3AF' }} />
                      {task.categoryName}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">&mdash;</span>
                  )}
                </td>
                <td className="px-4 py-2.5 hidden lg:table-cell">
                  {task.dueDate ? (
                    <span className={cn("text-xs", isOverdue(task.dueDate) && task.status !== 'Done' ? "text-red-600 font-medium" : "text-gray-500")}>
                      {formatDate(task.dueDate)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">&mdash;</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && taskList.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  {hasActiveFilters || search ? 'Žádné úkoly neodpovídají filtrům.' : 'Žádné úkoly.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          isOpen={true}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={() => fetchTasks(search)}
        />
      )}
    </div>
  );
}
