import { TaskStatus, Priority, UserRole } from '@/types';

// Status labels (Czech)
export const STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.Idea]: 'Nápad',
  [TaskStatus.Open]: 'Otevřeno',
  [TaskStatus.InProgress]: 'V řešení',
  [TaskStatus.ForReview]: 'K revizi',
  [TaskStatus.Done]: 'Hotovo',
};

// Status — Tailwind classes (for components)
export const STATUS_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.Idea]: 'bg-status-idea',
  [TaskStatus.Open]: 'bg-status-open',
  [TaskStatus.InProgress]: 'bg-status-inprogress',
  [TaskStatus.ForReview]: 'bg-status-forreview',
  [TaskStatus.Done]: 'bg-status-done',
};

// Status — hex colors (for charts, SVG donut, progress bars)
export const STATUS_HEX_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.Idea]: '#9CA3AF',
  [TaskStatus.Open]: '#3B82F6',
  [TaskStatus.InProgress]: '#F59E0B',
  [TaskStatus.ForReview]: '#8B5CF6',
  [TaskStatus.Done]: '#10B981',
};

// Priority
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

// Roles
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Admin]: 'Administrátor',
  [UserRole.User]: 'Organizátor',
  [UserRole.Guest]: 'Host',
};

export const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  [UserRole.Admin]: 'bg-red-100 text-red-700',
  [UserRole.User]: 'bg-blue-100 text-blue-700',
  [UserRole.Guest]: 'bg-gray-100 text-gray-700',
};

// Color palettes (for admin color pickers)
export const DEFAULT_PALETTE = [
  '#3B82F6', '#EF4444', '#F59E0B', '#10B981',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

export const GAME_ROLE_PALETTE = [
  '#7DD3FC', '#8B5CF6', '#D4A017', '#EF4444',
  '#10B981', '#EC4899', '#06B6D4', '#F97316',
];

export const DEFAULT_APP_NAME = 'Bača';