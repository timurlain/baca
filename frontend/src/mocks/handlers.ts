import { http, HttpResponse } from 'msw'
import type {
  TaskItem,
  Category,
  GameRole,
  User,
  AuthResponse,
  DashboardData,
  FocusTask,
  HealthResponse,
  AppSettings,
} from '@/types'
import { TaskStatus, Priority, UserRole } from '@/types'

const mockGameRoles: GameRole[] = [
  { id: 1, name: 'Osud', description: 'Game Master', color: '#7DD3FC', sortOrder: 1, createdAt: '2026-01-01T00:00:00Z' },
  { id: 2, name: 'Vládce', description: 'Nation Ruler', color: '#8B5CF6', sortOrder: 2, createdAt: '2026-01-01T00:00:00Z' },
  { id: 3, name: 'Obchodník', description: 'Merchant', color: '#D4A017', sortOrder: 3, createdAt: '2026-01-01T00:00:00Z' },
]

const mockUsers: User[] = [
  {
    id: 1,
    name: 'Tomáš',
    email: 'tomas@baca.local',
    phone: null,
    role: UserRole.Admin,
    gameRoleId: 1,
    gameRoleName: 'Osud',
    shortcut: 'TO',
    avatarColor: '#10B981',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Jana',
    email: 'jana@baca.local',
    phone: '+420123456789',
    role: UserRole.User,
    gameRoleId: null,
    gameRoleName: null,
    shortcut: null,
    avatarColor: '#3B82F6',
    isActive: true,
    createdAt: '2026-01-02T00:00:00Z',
  },
]

const mockCategories: Category[] = [
  { id: 1, name: 'Hra', color: '#3B82F6', sortOrder: 1, createdAt: '2026-01-01T00:00:00Z' },
  { id: 2, name: 'Logistika', color: '#F59E0B', sortOrder: 2, createdAt: '2026-01-01T00:00:00Z' },
  { id: 3, name: 'Jídlo', color: '#EF4444', sortOrder: 3, createdAt: '2026-01-01T00:00:00Z' },
]

const mockTasks: TaskItem[] = [
  {
    id: 1,
    title: 'Připravit hru na sobotu',
    description: null,
    status: TaskStatus.Open,
    priority: Priority.High,
    categoryId: 1,
    categoryName: 'Hra',
    categoryColor: '#3B82F6',
    assigneeId: 1,
    assigneeName: 'Tomáš',
    assigneeShortcut: 'TO',
    assigneeAvatarColor: '#10B981',
    assigneeEmail: 'test@baca.local',
    parentTaskId: null,
    dueDate: '2026-05-01T00:00:00Z',
    sortOrder: 0,
    createdById: 1,
    createdByName: 'Tomáš',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    subTaskCount: 0,
    subTaskDoneCount: 0,
    commentCount: 0,
    imageCount: 0,
    tags: [],
  },
]

export const handlers = [
  // Health
  http.get('/api/health', () =>
    HttpResponse.json<HealthResponse>({ status: 'healthy', db: 'ok' }),
  ),

  // Auth
  http.post('/api/auth/logout', () => new HttpResponse(null, { status: 200 })),
  http.get('/api/auth/me', () =>
    HttpResponse.json<AuthResponse>({
      id: '1',
      name: 'Tomáš',
      email: 'tomas@baca.local',
      role: UserRole.Admin,
      avatarColor: '#10B981',
    }),
  ),

  // Tasks
  http.get('/api/tasks', () => HttpResponse.json(mockTasks)),
  http.get('/api/tasks/:id', () => HttpResponse.json({ ...mockTasks[0], subtasks: [], comments: [] })),
  http.post('/api/tasks', () => HttpResponse.json(mockTasks[0], { status: 201 })),
  http.put('/api/tasks/:id', () => HttpResponse.json(mockTasks[0])),
  http.patch('/api/tasks/:id/status', () => HttpResponse.json(mockTasks[0])),
  http.patch('/api/tasks/:id/sort', () => new HttpResponse(null, { status: 204 })),
  http.patch('/api/tasks/:id/assign-me', () => HttpResponse.json(mockTasks[0])),
  http.delete('/api/tasks/:id', () => new HttpResponse(null, { status: 204 })),

  // Focus
  http.get('/api/focus', () =>
    HttpResponse.json<FocusTask[]>([
      {
        id: 1,
        title: 'Připravit hru na sobotu',
        status: TaskStatus.Open,
        priority: Priority.High,
        categoryId: 1,
        categoryName: 'Hra',
        categoryColor: '#3B82F6',
        dueDate: '2026-05-01T00:00:00Z',
        subTaskCount: 0,
        subTaskDoneCount: 0,
      },
    ]),
  ),

  // Images
  http.get('/api/tasks/:taskId/images', () => HttpResponse.json([])),
  http.post('/api/tasks/:taskId/images', () => HttpResponse.json({ id: 1, fileName: 'test.jpg', url: null }, { status: 201 })),
  http.delete('/api/tasks/:taskId/images/:imageId', () => new HttpResponse(null, { status: 204 })),

  // Comments
  http.get('/api/tasks/:taskId/comments', () => HttpResponse.json([])),
  http.post('/api/tasks/:taskId/comments', () =>
    HttpResponse.json({
      id: 1,
      taskId: 1,
      authorId: 1,
      authorName: 'Tomáš',
      authorAvatarColor: '#10B981',
      text: 'Test komentář',
      createdAt: new Date().toISOString(),
    }, { status: 201 }),
  ),

  // Game Roles
  http.get('/api/gameroles', () => HttpResponse.json(mockGameRoles)),
  http.post('/api/gameroles', () => HttpResponse.json(mockGameRoles[0], { status: 201 })),
  http.put('/api/gameroles/:id', () => HttpResponse.json(mockGameRoles[0])),
  http.delete('/api/gameroles/:id', () => new HttpResponse(null, { status: 204 })),

  // Categories
  http.get('/api/categories', () => HttpResponse.json(mockCategories)),
  http.post('/api/categories', () => HttpResponse.json(mockCategories[0], { status: 201 })),
  http.put('/api/categories/:id', () => HttpResponse.json(mockCategories[0])),
  http.delete('/api/categories/:id', () => new HttpResponse(null, { status: 204 })),

  // Users
  http.get('/api/users', () => HttpResponse.json(mockUsers)),
  http.post('/api/users', () => HttpResponse.json(mockUsers[0], { status: 201 })),
  http.put('/api/users/:id', () => HttpResponse.json(mockUsers[0])),

  // Dashboard
  http.get('/api/dashboard', () =>
    HttpResponse.json<DashboardData>({
      totalTasks: 10,
      tasksByStatus: { Open: 3, InProgress: 2, Done: 5 },
      overdueTasks: 1,
      progressPercent: 50,
      categoryProgress: [],
      recentTasks: mockTasks,
      myTaskCount: 3,
    }),
  ),

  // Voice
  http.post('/api/voice/transcribe', () =>
    HttpResponse.json({ transcription: 'Test přepis' }),
  ),
  http.post('/api/voice/parse', () =>
    HttpResponse.json({
      title: 'Test úkol',
      description: null,
      assigneeName: null,
      assigneeId: null,
      assigneeConfidence: null,
      categoryName: null,
      categoryId: null,
      categoryConfidence: null,
      priority: Priority.Medium,
      priorityConfidence: 0.5,
      dueDate: null,
      dueDateConfidence: null,
      status: TaskStatus.Open,
      rawTranscription: 'Test přepis',
    }),
  ),

  // Settings
  http.get('/api/settings', () =>
    HttpResponse.json<AppSettings>({ guestPin: '****', appName: 'Bača' }),
  ),
  http.put('/api/settings', () =>
    HttpResponse.json<AppSettings>({ guestPin: '****', appName: 'Bača' }),
  ),
]
