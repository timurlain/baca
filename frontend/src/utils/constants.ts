import type { TaskStatus, Priority, UserRole } from '@/types';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  Idea: 'Nápad',
  Open: 'Otevřený',
  InProgress: 'Rozpracovaný',
  ForReview: 'K review',
  Done: 'Hotovo',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  Idea: '#9CA3AF',
  Open: '#3B82F6',
  InProgress: '#F59E0B',
  ForReview: '#8B5CF6',
  Done: '#10B981',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  High: 'Vysoká',
  Medium: 'Střední',
  Low: 'Nízká',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  Admin: 'Admin',
  User: 'Uživatel',
  Guest: 'Host',
};

export const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  Admin: 'bg-red-100 text-red-700',
  User: 'bg-blue-100 text-blue-700',
  Guest: 'bg-gray-100 text-gray-700',
};

export const DEFAULT_PALETTE = [
  '#3B82F6', '#EF4444', '#F59E0B', '#10B981',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

export const GAME_ROLE_PALETTE = [
  '#7DD3FC', '#8B5CF6', '#D4A017', '#EF4444',
  '#10B981', '#EC4899', '#06B6D4', '#F97316',
];
