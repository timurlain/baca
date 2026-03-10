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
      <div className="flex justify-between items-start mb-2">
        {task.categoryName && (
          <Badge 
            color="text-white"
            className="text-[10px] px-1.5 py-0"
            style={{ backgroundColor: task.categoryColor || '#9CA3AF' }}
          >
            {task.categoryName}
          </Badge>
        )}
        <span className={cn("text-[10px] font-bold uppercase tracking-wider", PRIORITY_COLORS[task.priority])}>
          {PRIORITY_LABELS[task.priority]}
        </span>
      </div>

      <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
        {task.title}
      </h3>

      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map(tag => (
            <span key={tag.id} className="text-[10px] font-medium px-1.5 py-0 rounded-full text-white" style={{ backgroundColor: tag.color }}>
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex -space-x-1 items-center">
          {task.assigneeId ? (
            <Avatar
              name={task.assigneeName}
              shortcut={task.assigneeShortcut}
              color={task.assigneeAvatarColor}
              size="xs"
            />
          ) : !isGuest && (
            <button
              onClick={handleAssignMe}
              className="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-forest-600 hover:border-forest-600 transition-colors"
              title="Vezmu si to"
              aria-label="Vezmu si to"
            >
              <span className="text-xs">🙋</span>
            </button>
          )}
          
          {(task.subTaskCount > 0 || task.commentCount > 0) && (
            <div className="ml-2 flex items-center space-x-2 text-[10px] text-gray-400">
              {task.subTaskCount > 0 && (
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {task.subTaskDoneCount}/{task.subTaskCount}
                </span>
              )}
              {task.commentCount > 0 && (
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  {task.commentCount}
                </span>
              )}
            </div>
          )}
        </div>

        {task.dueDate && (
          <span className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded",
            overdue ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"
          )}>
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}
