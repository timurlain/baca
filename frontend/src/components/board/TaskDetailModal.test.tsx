import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import type { TaskDetail, User, Category } from '@/types';
import { TaskStatus, Priority, UserRole } from '@/types';
import TaskDetailModal from './TaskDetailModal';

// Mock useAuth
const mockUser: { id: number; name: string; role: UserRole; avatarColor: string } = { id: 1, name: 'Tomáš', role: UserRole.Admin, avatarColor: '#10B981' };
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

const mockTaskDetail: TaskDetail = {
  id: 42,
  title: 'Test úkol detail',
  description: 'Popis úkolu',
  status: TaskStatus.Open,
  priority: Priority.High,
  categoryId: 1,
  categoryName: 'Hra',
  categoryColor: '#3B82F6',
  assigneeId: 1,
  assigneeName: 'Tomáš',
  assigneeAvatarColor: '#10B981',
  assigneeEmail: null,
  assigneeShortcut: null,
  parentTaskId: null,
  parentTaskTitle: null,
  dueDate: '2026-05-01T00:00:00Z',
  sortOrder: 0,
  createdById: 1,
  createdByName: 'Tomáš',
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
  subtasks: [],
  comments: [],
  tags: [],
};

const mockUsers: User[] = [
  { id: 1, name: 'Tomáš', email: 'tomas@baca.local', phone: null, role: UserRole.Admin, gameRoleId: null, gameRoleName: null, avatarColor: '#10B981', isActive: true, createdAt: '2026-01-01T00:00:00Z', shortcut: 'TO' },
  { id: 2, name: 'Jana', email: 'jana@baca.local', phone: null, role: UserRole.User, gameRoleId: null, gameRoleName: null, avatarColor: '#3B82F6', isActive: true, createdAt: '2026-01-02T00:00:00Z', shortcut: null },
];

const mockCategories: Category[] = [
  { id: 1, name: 'Hra', color: '#3B82F6', sortOrder: 1, createdAt: '2026-01-01T00:00:00Z' },
  { id: 2, name: 'Logistika', color: '#F59E0B', sortOrder: 2, createdAt: '2026-01-01T00:00:00Z' },
];

function renderModal(props: Partial<React.ComponentProps<typeof TaskDetailModal>> = {}) {
  const defaultProps = {
    taskId: 42,
    isOpen: true,
    onClose: vi.fn(),
    onUpdate: vi.fn(),
  };
  return render(<TaskDetailModal {...defaultProps} {...props} />);
}

describe('TaskDetailModal', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/tasks/:id', () => HttpResponse.json(mockTaskDetail)),
      http.get('/api/users', () => HttpResponse.json(mockUsers)),
      http.get('/api/categories', () => HttpResponse.json(mockCategories)),
      http.get('/api/tags', () => HttpResponse.json([])),
    );
  });

  it('returns null when not open', () => {
    const { container } = renderModal({ isOpen: false });
    expect(container.innerHTML).toBe('');
  });

  it('shows loading spinner initially', () => {
    renderModal();
    expect(screen.getByText('Načítání detailu...')).toBeInTheDocument();
  });

  it('renders task title and id after loading', async () => {
    renderModal();
    expect(await screen.findByText('Test úkol detail')).toBeInTheDocument();
    expect(screen.getByText('#42')).toBeInTheDocument();
  });

  it('renders description textarea for non-guest users', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByDisplayValue('Popis úkolu')).toBeInTheDocument();
    });
  });

  it('renders status and priority selects', async () => {
    renderModal();
    await screen.findByText('Test úkol detail');
    // Status select
    expect(screen.getByText('Stav')).toBeInTheDocument();
    expect(screen.getByText('Priorita')).toBeInTheDocument();
  });

  it('renders category select with loaded categories', async () => {
    renderModal();
    await screen.findByText('Test úkol detail');
    expect(screen.getByText('Kategorie')).toBeInTheDocument();
    expect(screen.getByText('Bez kategorie')).toBeInTheDocument();
  });

  it('renders assignee select with loaded users', async () => {
    renderModal();
    await screen.findByText('Test úkol detail');
    expect(screen.getByText('Řešitel')).toBeInTheDocument();
    expect(screen.getByText('Nepřiřazeno')).toBeInTheDocument();
  });

  it('renders delete button for non-guest users', async () => {
    renderModal();
    await screen.findByText('Test úkol detail');
    expect(screen.getByText('Smazat úkol')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await screen.findByText('Test úkol detail');
    // Header close button (the X) — second button after the copy-link button
    const closeButtons = screen.getAllByRole('button');
    const headerCloseBtn = closeButtons[1];
    fireEvent.click(headerCloseBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows confirm dialog when delete is clicked', async () => {
    renderModal();
    await screen.findByText('Test úkol detail');
    fireEvent.click(screen.getByText('Smazat úkol'));
    expect(await screen.findByText('Smazat úkol?')).toBeInTheDocument();
    expect(screen.getByText('Tato akce je nevratná. Budou smazány i všechny subtasky a komentáře.')).toBeInTheDocument();
  });

  it('calls delete API and onClose/onUpdate when confirmed', async () => {
    const onClose = vi.fn();
    const onUpdate = vi.fn();
    let deleteCalled = false;
    server.use(
      http.delete('/api/tasks/:id', () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderModal({ onClose, onUpdate });
    await screen.findByText('Test úkol detail');
    fireEvent.click(screen.getByText('Smazat úkol'));
    await screen.findByText('Smazat úkol?');
    // Click the confirm "Smazat" button inside the dialog
    const confirmBtn = screen.getByRole('button', { name: 'Smazat' });
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(deleteCalled).toBe(true);
      expect(onUpdate).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('handles API fetch error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    server.use(
      http.get('/api/tasks/:id', () => new HttpResponse('Server error', { status: 500 })),
    );
    renderModal();
    // Should stop loading without crashing
    await waitFor(() => {
      expect(screen.queryByText('Načítání detailu...')).not.toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('renders description as read-only for guest users', async () => {
    mockUser.role = UserRole.Guest;
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('Popis úkolu')).toBeInTheDocument();
    });
    // Guest should see text, not textarea
    expect(screen.queryByPlaceholderText('Přidejte podrobnější popis...')).not.toBeInTheDocument();
    // Restore
    mockUser.role = UserRole.Admin;
  });

  it('hides delete button for guest users', async () => {
    mockUser.role = UserRole.Guest;
    renderModal();
    await screen.findByText('Test úkol detail');
    expect(screen.queryByText('Smazat úkol')).not.toBeInTheDocument();
    mockUser.role = UserRole.Admin;
  });

  it('renders "Bez popisu" when description is null', async () => {
    server.use(
      http.get('/api/tasks/:id', () =>
        HttpResponse.json({ ...mockTaskDetail, description: null })),
    );
    mockUser.role = UserRole.Guest;
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('Bez popisu')).toBeInTheDocument();
    });
    mockUser.role = UserRole.Admin;
  });

  it('updates status when select changes', async () => {
    let updateBody: Record<string, unknown> | null = null;
    server.use(
      http.put('/api/tasks/:id', async ({ request }) => {
        updateBody = await request.json() as Record<string, unknown>;
        return HttpResponse.json(mockTaskDetail);
      }),
    );
    renderModal();
    await screen.findByText('Test úkol detail');
    // Find status select - it has the task status as value
    const statusSelect = screen.getByDisplayValue('Otevřeno');
    fireEvent.change(statusSelect, { target: { value: 'Done' } });
    await waitFor(() => {
      expect(updateBody).toMatchObject({ status: 'Done' });
    });
  });

  it('renders the date input with correct value', async () => {
    renderModal();
    await screen.findByText('Test úkol detail');
    expect(screen.getByDisplayValue('2026-05-01')).toBeInTheDocument();
  });
});
