import { useState, useMemo, useEffect } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  PointerSensor, 
  useSensor, 
  useSensors,
  TouchSensor,
  type DragEndEvent
} from '@dnd-kit/core';
import type { TaskItem, TaskStatus } from '@/types';
import { UserRole } from '@/types';
import { useTasks } from '@/hooks/useTasks';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';
import TaskDetailModal from './TaskDetailModal';

const COLUMNS: TaskStatus[] = ['Idea', 'Open', 'InProgress', 'ForReview', 'Done'];

interface KanbanBoardProps {
  forceAssigneeId?: number | null;
}

export default function KanbanBoard({ forceAssigneeId }: KanbanBoardProps) {
  const { user } = useAuth();
  const { tasks, loading, error, refresh, updateTaskStatus, assignMe, setFilters } = useTasks({ 
    assigneeId: forceAssigneeId ?? undefined 
  });

  useEffect(() => {
    setFilters(prev => ({ ...prev, assigneeId: forceAssigneeId ?? undefined }));
  }, [forceAssigneeId, setFilters]);

  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const isGuest = user?.role === UserRole.Guest;
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 300, tolerance: 5 },
    })
  );

  const handleMoveTask = async (taskId: number, newStatus: TaskStatus, newIndex: number) => {
    try {
      await updateTaskStatus(taskId, newStatus, newIndex);
    } catch (err) {
      console.error('Failed to move task:', err);
    }
  };

  const { handleDragEnd } = useDragAndDrop(tasks, handleMoveTask);

  const tasksByStatus = useMemo(() => {
    return COLUMNS.reduce((acc, status) => {
      acc[status] = tasks
        .filter(t => t.status === status)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      return acc;
    }, {} as Record<TaskStatus, TaskItem[]>);
  }, [tasks]);

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest-800"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-3 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{"\u00dakol\u006fv\u00e1 tabule"}</h1>
        {!isGuest && (
          <button
            onClick={() => navigate('/tasks/new')}
            className="inline-flex items-center gap-2 bg-forest-800 text-white hover:bg-forest-700 px-4 py-2 rounded-lg text-sm font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Nový úkol
          </button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(event) => {
          const id = Number(event.active.id);
          const task = tasks.find(t => t.id === id);
          if (task) setActiveTask(task);
        }}
        onDragEnd={(event: DragEndEvent) => {
          setActiveTask(null);
          handleDragEnd(event);
        }}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex h-full space-x-4 min-w-max pb-4">
            {COLUMNS.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={tasksByStatus[status]}
                onSelectTask={(task) => setSelectedTask(task)}
                onAssignMe={assignMe}
                disabled={isGuest}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-[280px] sm:w-[320px] rotate-3 shadow-xl pointer-events-none">
              <TaskCard task={activeTask} onSelect={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskDetailModal
          taskId={selectedTask.id}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={refresh}
        />
      )}
    </div>
  );
}
