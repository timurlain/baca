import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskItem } from '@/types';
import TaskCard from './TaskCard';

interface SortableTaskCardProps {
  task: TaskItem;
  onSelect: (task: TaskItem) => void;
  onAssignMe?: (taskId: number) => void;
  disabled?: boolean;
}

export default function SortableTaskCard({ task, onSelect, onAssignMe, disabled }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    disabled
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard 
        task={task} 
        onSelect={onSelect} 
        onAssignMe={onAssignMe} 
        isDraggable={!disabled}
      />
    </div>
  );
}
