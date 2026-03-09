import { useState, useEffect, useCallback } from 'react';
import { tasks as tasksApi } from '@/api/client';
import type { TaskItem, TaskStatus } from '@/types';

interface TaskFilters {
  status?: TaskStatus;
  categoryId?: number;
  assigneeId?: number;
  search?: string;
}

export function useTasks(initialFilters: TaskFilters = {}) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFilters>(initialFilters);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tasksApi.list({
        status: filters.status,
        category: filters.categoryId,
        assignee: filters.assigneeId,
        search: filters.search
      });
      setTasks(data);
      setError(null);
    } catch {
      setError('Nepodařilo se načíst úkoly.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const updateTaskStatus = async (taskId: number, newStatus: TaskStatus, sortOrder?: number) => {
    // Optimistic update
    const previousTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, sortOrder: sortOrder ?? t.sortOrder } : t));

    try {
      await tasksApi.changeStatus(taskId, { status: newStatus, sortOrder });
    } catch (err) {
      setTasks(previousTasks); // Revert on error
      throw err;
    }
  };

  const assignMe = async (taskId: number) => {
    const updatedTask = await tasksApi.assignMe(taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
  };

  return { 
    tasks, 
    loading, 
    error, 
    filters, 
    setFilters, 
    refresh: fetchTasks,
    updateTaskStatus,
    assignMe
  };
}
