import { TaskStatus, Priority, UserRole } from '@/types';

export const STATUS_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.Idea]: 'bg-status-idea',
  [TaskStatus.Open]: 'bg-status-open',
  [TaskStatus.InProgress]: 'bg-status-inprogress',
  [TaskStatus.ForReview]: 'bg-status-forreview',
  [TaskStatus.Done]: 'bg-status-done',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.Idea]: 'Nápad',
  [TaskStatus.Open]: 'Otevřeno',
  [TaskStatus.InProgress]: 'V řešení',
  [TaskStatus.ForReview]: 'K revizi',
  [TaskStatus.Done]: 'Hotovo',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.Low]: 'Nízká',
  [Priority.Medium]: 'Střední',
  [Priority.High]: 'Vysoká',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.Low]: 'text-gray-500',
  [Priority.Medium]: 'text-blue-500',
  [Priority.High]: 'text-red-600',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Admin]: 'Administrátor',
  [UserRole.User]: 'Organizátor',
  [UserRole.Guest]: 'Host',
};

export const DEFAULT_APP_NAME = 'Bača';
