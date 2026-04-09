import type {
  TaskItem,
  TaskDetail,
  CreateTaskRequest,
  UpdateTaskRequest,
  StatusChangeRequest,
  SortChangeRequest,
  Comment,
  CreateCommentRequest,
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  Tag,
  CreateTagRequest,
  UpdateTagRequest,
  GameRole,
  CreateGameRoleRequest,
  UpdateGameRoleRequest,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  AuthResponse,
  TranscriptionResult,
  VoiceParseRequest,
  VoiceParseResponse,
  BulkParseRequest,
  BulkParseResponse,
  DashboardData,
  FocusTask,
  AppSettings,
  UpdateSettingsRequest,
  HealthResponse,
} from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: isFormData
      ? (options.headers as HeadersInit | undefined)
      : {
          'Content-Type': 'application/json',
          ...options.headers,
        },
  });

  if (res.status === 401) {
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/api/auth/login?returnUrl=${returnUrl}`;
    throw new ApiError(401, 'Unauthorized');
  }

  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text);
}

function postForm<T>(path: string, body: FormData): Promise<T> {
  return request<T>(path, { method: 'POST', body });
}

function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

function del<T = void>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

// Auth
export const auth = {
  login: () => {
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/api/auth/login?returnUrl=${returnUrl}`;
  },
  logout: () =>
    post<void>('/api/auth/logout'),
  me: () =>
    get<AuthResponse>('/api/auth/me'),
};

// Tasks
export const tasks = {
  list: (params?: {
    status?: string;
    category?: number;
    assignee?: number;
    search?: string;
    parentId?: number;
    tag?: number;
    priority?: string;
    overdue?: boolean;
    all?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', String(params.category));
    if (params?.assignee) query.set('assignee', String(params.assignee));
    if (params?.search) query.set('search', params.search);
    if (params?.parentId) query.set('parentId', String(params.parentId));
    if (params?.tag) query.set('tag', String(params.tag));
    if (params?.priority) query.set('priority', params.priority);
    if (params?.overdue) query.set('overdue', 'true');
    if (params?.all) query.set('all', 'true');
    const qs = query.toString();
    return get<TaskItem[]>(`/api/tasks${qs ? `?${qs}` : ''}`);
  },
  get: (id: number) =>
    get<TaskDetail>(`/api/tasks/${id}`),
  create: (data: CreateTaskRequest) =>
    post<TaskItem>('/api/tasks', data),
  update: (id: number, data: UpdateTaskRequest) =>
    put<TaskItem>(`/api/tasks/${id}`, data),
  changeStatus: (id: number, data: StatusChangeRequest) =>
    patch<TaskItem>(`/api/tasks/${id}/status`, data),
  changeSort: (id: number, data: SortChangeRequest) =>
    patch<void>(`/api/tasks/${id}/sort`, data),
  assignMe: (id: number) =>
    patch<TaskItem>(`/api/tasks/${id}/assign-me`),
  delete: (id: number) =>
    del(`/api/tasks/${id}`),
};

// Focus
export const focus = {
  list: () =>
    get<FocusTask[]>('/api/focus'),
};

// Comments
export const comments = {
  list: (taskId: number) =>
    get<Comment[]>(`/api/tasks/${taskId}/comments`),
  create: (taskId: number, data: CreateCommentRequest) =>
    post<Comment>(`/api/tasks/${taskId}/comments`, data),
};

// Categories
export const categories = {
  list: () =>
    get<Category[]>('/api/categories'),
  create: (data: CreateCategoryRequest) =>
    post<Category>('/api/categories', data),
  update: (id: number, data: UpdateCategoryRequest) =>
    put<Category>(`/api/categories/${id}`, data),
  delete: (id: number) =>
    del(`/api/categories/${id}`),
};

// Tags
export const tags = {
  list: () =>
    get<Tag[]>('/api/tags'),
  create: (data: CreateTagRequest) =>
    post<Tag>('/api/tags', data),
  update: (id: number, data: UpdateTagRequest) =>
    put<Tag>(`/api/tags/${id}`, data),
  delete: (id: number) =>
    del(`/api/tags/${id}`),
};

// Game Roles
export const gameRoles = {
  list: () =>
    get<GameRole[]>('/api/gameroles'),
  create: (data: CreateGameRoleRequest) =>
    post<GameRole>('/api/gameroles', data),
  update: (id: number, data: UpdateGameRoleRequest) =>
    put<GameRole>(`/api/gameroles/${id}`, data),
  delete: (id: number) =>
    del(`/api/gameroles/${id}`),
};

// Users
export const users = {
  list: () =>
    get<User[]>('/api/users'),
  create: (data: CreateUserRequest) =>
    post<User>('/api/users', data),
  update: (id: number, data: UpdateUserRequest) =>
    put<User>(`/api/users/${id}`, data),
};

// Dashboard
export const dashboard = {
  get: () =>
    get<DashboardData>('/api/dashboard'),
};

// Voice
export const voice = {
  transcribe: (audio: Blob): Promise<TranscriptionResult> => {
    const formData = new FormData();
    formData.append('audio', audio);
    return postForm<TranscriptionResult>('/api/voice/transcribe', formData);
  },
  parse: (data: VoiceParseRequest) =>
    post<VoiceParseResponse>('/api/voice/parse', data),
  parseBulk: (data: BulkParseRequest) =>
    post<BulkParseResponse>('/api/voice/parse-bulk', data),
};

// Settings
export const settings = {
  get: () =>
    get<AppSettings>('/api/settings'),
  update: (data: UpdateSettingsRequest) =>
    put<AppSettings>('/api/settings', data),
};

// Trash (Admin)
export interface DeletedItem {
  entity: string;
  id: number;
  name: string;
  deletedAt: string;
}

export const trash = {
  list: () =>
    get<DeletedItem[]>('/api/admin/trash'),
  restore: (entity: string, id: number) =>
    post<void>(`/api/admin/trash/${entity}/${id}/restore`),
  permanentDelete: (entity: string, id: number) =>
    del(`/api/admin/trash/${entity}/${id}`),
};

// Health
export const health = {
  check: () =>
    get<HealthResponse>('/api/health'),
};
