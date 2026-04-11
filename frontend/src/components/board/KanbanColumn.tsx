import { useState, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useNavigate } from 'react-router-dom';
import type { TaskItem, TaskStatus, Priority } from '@/types';
import { STATUS_LABELS } from '@/utils/constants';
import SortableTaskCard from './SortableTaskCard';

const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: TaskItem[];
  onSelectTask: (task: TaskItem) => void;
  onAssignMe?: (taskId: number) => void;
  disabled?: boolean;
}

export default function KanbanColumn({
  status,
  tasks,
  onSelectTask,
  onAssignMe,
  disabled
}: KanbanColumnProps) {
  const navigate = useNavigate();
  const [sortByPriority, setSortByPriority] = useState(false);
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    disabled: disabled || sortByPriority
  });

  const sortedTasks = useMemo(
    () => sortByPriority
      ? [...tasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
      : tasks,
    [tasks, sortByPriority]
  );

  return (
    <div className="flex flex-col h-full w-[calc(100vw-3rem)] sm:w-auto sm:min-w-[280px] sm:max-w-[320px] bg-gray-100 rounded-lg p-2 border border-gray-200">
      <div className="flex items-center justify-between px-2 mb-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
          {STATUS_LABELS[status]}
        </h2>
        <div className="flex items-center gap-1">
          {!disabled && (
            <>
              <button
                onClick={() => setSortByPriority(prev => !prev)}
                title={sortByPriority ? "Ruční řazení" : "Řadit dle priority"}
                className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                  sortByPriority
                    ? 'text-forest-700 bg-forest-50'
                    : 'text-gray-400 hover:text-forest-700 hover:bg-forest-50'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h11.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zM2 7.5a.75.75 0 01.75-.75h7.508a.75.75 0 010 1.5H2.75A.75.75 0 012 7.5zM14 7a.75.75 0 01.75.75v6.59l1.95-2.1a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 111.1-1.02l1.95 2.1V7.75A.75.75 0 0114 7zM2 11.25a.75.75 0 01.75-.75h4.562a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => navigate(`/tasks/new?status=${status}`)}
                title="Nový úkol"
                className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-forest-700 hover:bg-forest-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
              </button>
            </>
          )}
          <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">
            {tasks.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto min-h-[150px] transition-colors rounded-md ${isOver ? 'bg-forest-50 border-2 border-dashed border-forest-200' : ''}`}
      >
        <SortableContext
          items={sortedTasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedTasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onSelect={onSelectTask}
              onAssignMe={onAssignMe}
              disabled={disabled || sortByPriority}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
