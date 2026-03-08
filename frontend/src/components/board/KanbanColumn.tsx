import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { TaskItem, TaskStatus } from '@/types';
import { STATUS_LABELS } from '@/utils/constants';
import SortableTaskCard from './SortableTaskCard';

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
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    disabled
  });

  return (
    <div className="flex flex-col h-full min-w-[280px] max-w-[320px] bg-gray-100 rounded-lg p-2 border border-gray-200">
      <div className="flex items-center justify-between px-2 mb-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
          {STATUS_LABELS[status]}
        </h2>
        <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">
          {tasks.length}
        </span>
      </div>

      <div 
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto min-h-[150px] transition-colors rounded-md ${isOver ? 'bg-forest-50 border-2 border-dashed border-forest-200' : ''}`}
      >
        <SortableContext 
          items={tasks.map(t => t.id)} 
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableTaskCard 
              key={task.id} 
              task={task} 
              onSelect={onSelectTask} 
              onAssignMe={onAssignMe}
              disabled={disabled}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
