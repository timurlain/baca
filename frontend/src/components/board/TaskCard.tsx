import type { TaskItem } from '@/types';
import { UserRole } from '@/types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/utils/constants';
import { formatDate, isOverdue, cn } from '@/utils/helpers';
import Badge from '../shared/Badge';
import Avatar from '../shared/Avatar';
import { useAuth } from '@/hooks/useAuth';

interface TaskCardProps {
  task: TaskItem;
  onSelect: (task: TaskItem) => void;
  onAssignMe?: (taskId: number) => void;
  isDraggable?: boolean;
}

export default function TaskCard({ task, onSelect, onAssignMe, isDraggable = true }: TaskCardProps) {
  const { user } = useAuth();
  const overdue = isOverdue(task.dueDate) && task.status !== 'Done';
  const isGuest = user?.role === UserRole.Guest;

  const handleAssignMe = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAssignMe) onAssignMe(task.id);
  };

  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-3 hover:shadow-md transition-shadow cursor-pointer group",
        isDraggable ? "active:cursor-grabbing" : ""
      )}
      onClick={() => onSelect(task)}
    >
      {/* Row 1: Category + Priority + Assignee */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          {task.categoryName && (
            <Badge
              color="text-white"
              className="text-[10px] px-1.5 py-0 shrink-0"
              style={{ backgroundColor: task.categoryColor || '#9CA3AF' }}
            >
              {task.categoryName}
            </Badge>
          )}
          {task.dueDate && (
            <span className={cn(
              "text-[10px] font-medium px-1 py-0 rounded shrink-0",
              overdue ? "bg-red-50 text-red-600" : "text-gray-400"
            )}>
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", PRIORITY_COLORS[task.priority])}>
            {PRIORITY_LABELS[task.priority]}
          </span>
          {task.assigneeId ? (
            <Avatar
              name={task.assigneeName}
              shortcut={task.assigneeShortcut}
              color={task.assigneeAvatarColor}
              gravatarEmail={task.assigneeEmail}
              size="xs"
            />
          ) : (
            <button
              onClick={!isGuest ? handleAssignMe : undefined}
              disabled={isGuest}
              className="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-forest-600 hover:border-forest-600 transition-colors disabled:hover:text-gray-400 disabled:hover:border-gray-300 disabled:cursor-default"
              title={isGuest ? "Nepřiřazeno" : "Vezmu si to"}
              aria-label={isGuest ? "Nepřiřazeno" : "Vezmu si to"}
            >
              <span className="text-xs font-bold">?</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Title */}
      <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
        {task.title}
      </h3>
    </div>
  );
}
