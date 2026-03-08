// Enums as const objects (TS 5.8+ erasableSyntaxOnly compatibility)
export const TaskStatus = {
  Idea: 'Idea',
  Open: 'Open',
  InProgress: 'InProgress',
  ForReview: 'ForReview',
  Done: 'Done',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const Priority = {
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const UserRole = {
  Admin: 'Admin',
  User: 'User',
  Guest: 'Guest',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// User
export interface User {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  avatarColor: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
}

export interface UpdateUserRequest {
  name?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
}

// Task
export interface TaskItem {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  assigneeAvatarColor: string | null;
  parentTaskId: number | null;
  dueDate: string | null;
  sortOrder: number;
  createdById: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  subTaskCount: number;
  subTaskDoneCount: number;
  commentCount: number;
}

export interface TaskDetail {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  assigneeAvatarColor: string | null;
  parentTaskId: number | null;
  parentTaskTitle: string | null;
  dueDate: string | null;
  sortOrder: number;
  createdById: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  subTasks: TaskItem[];
  comments: Comment[];
}

export interface CreateTaskRequest {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  categoryId?: number | null;
  assigneeId?: number | null;
  parentTaskId?: number | null;
  dueDate?: string | null;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  categoryId?: number | null;
  assigneeId?: number | null;
  parentTaskId?: number | null;
  dueDate?: string | null;
}

export interface StatusChangeRequest {
  status: TaskStatus;
  sortOrder?: number;
}

export interface SortChangeRequest {
  sortOrder: number;
}

// Comment
export interface Comment {
  id: number;
  taskId: number;
  authorId: number;
  authorName: string;
  authorAvatarColor: string;
  text: string;
  createdAt: string;
}

export interface CreateCommentRequest {
  text: string;
}

// Category
export interface Category {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  color: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  color?: string;
  sortOrder?: number;
}

// Auth
export interface LoginRequest {
  email: string;
}

export interface GuestLoginRequest {
  pin: string;
}

export interface AuthResponse {
  id: number;
  name: string;
  role: UserRole;
  avatarColor: string;
}

// Voice
export interface VoiceParseResponse {
  title: string | null;
  description: string | null;
  assigneeName: string | null;
  assigneeId: number | null;
  assigneeConfidence: number | null;
  categoryName: string | null;
  categoryId: number | null;
  categoryConfidence: number | null;
  priority: Priority | null;
  priorityConfidence: number | null;
  dueDate: string | null;
  dueDateConfidence: number | null;
  status: TaskStatus;
  rawTranscription: string;
}

// Dashboard
export interface DashboardData {
  totalTasks: number;
  tasksByStatus: Record<string, number>;
  overdueTasks: number;
  progressPercent: number;
  categoryProgress: CategoryProgress[];
  recentTasks: TaskItem[];
  myTaskCount: number;
}

export interface CategoryProgress {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  totalTasks: number;
  doneTasks: number;
  progressPercent: number;
}

// Focus
export interface FocusTask {
  id: number;
  title: string;
  status: TaskStatus;
  priority: Priority;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  dueDate: string | null;
  subTaskCount: number;
  subTaskDoneCount: number;
}

// Settings
export interface AppSettings {
  guestPin: string;
  appName: string;
}

export interface UpdateSettingsRequest {
  guestPin?: string;
  appName?: string;
}

// Health
export interface HealthResponse {
  status: string;
  db: string;
}
