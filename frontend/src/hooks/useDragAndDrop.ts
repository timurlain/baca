import type { DragEndEvent } from '@dnd-kit/core';
import type { TaskItem, TaskStatus } from '@/types';

export function useDragAndDrop(
  tasks: TaskItem[],
  onMoveTask: (taskId: number, newStatus: TaskStatus, newIndex: number) => Promise<void>
) {
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = Number(active.id);
    const overId = over.id;

    // Over could be a task ID or a column ID (status)
    const task = tasks.find(t => t.id === activeId);
    if (!task) return;

    let newStatus: TaskStatus;
    let newIndex: number;

    // Check if over a task or a container
    const overTask = tasks.find(t => t.id === Number(overId));
    
    if (overTask) {
      newStatus = overTask.status;
      const columnTasks = tasks.filter(t => t.status === newStatus).sort((a, b) => a.sortOrder - b.sortOrder);
      const oldIndex = columnTasks.findIndex(t => t.id === activeId);
      const overIndex = columnTasks.findIndex(t => t.id === Number(overId));
      
      if (task.status === newStatus) {
        // Just reordering in same column
        newIndex = overIndex;
        if (oldIndex === overIndex) return;
      } else {
        // Moving to new column at specific position
        newIndex = overIndex;
      }
    } else {
      // Over a column container
      newStatus = overId as TaskStatus;
      if (task.status === newStatus) return; // Dropped in same column but not over a task
      
      const columnTasks = tasks.filter(t => t.status === newStatus);
      newIndex = columnTasks.length; // End of column
    }

    await onMoveTask(activeId, newStatus, newIndex);
  };

  return { handleDragEnd };
}
