import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { TaskItem } from '@/types';
import { TaskStatus, Priority, UserRole } from '@/types';
import TaskCard from './TaskCard';

// Mock useAuth
const mockUser: { id: number; name: string; role: UserRole; avatarColor: string } = { id: 1, name: 'Tomáš', role: UserRole.Admin, avatarColor: '#10B981' };
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

function makeTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 1,
    title: 'Test task',
    description: null,
    status: TaskStatus.Open,
    priority: Priority.Medium,
    categoryId: 1,
    categoryName: 'Hra',
    categoryColor: '#3B82F6',
    assigneeId: 1,
    assigneeName: 'Tomáš',
    assigneeAvatarColor: '#10B981',
    assigneeEmail: null,
    assigneeShortcut: null,
    parentTaskId: null,
    dueDate: null,
    sortOrder: 0,
    createdById: 1,
    createdByName: 'Tomáš',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    subTaskCount: 0,
    subTaskDoneCount: 0,
    commentCount: 0,
    tags: [],
    ...overrides,
  };
}

describe('TaskCard', () => {
  it('renders task title', () => {
    render(<TaskCard task={makeTask()} onSelect={vi.fn()} />);
    expect(screen.getByText('Test task')).toBeInTheDocument();
  });

  it('truncates very long title (200 chars) with line-clamp', () => {
    const longTitle = 'A'.repeat(200);
    render(<TaskCard task={makeTask({ title: longTitle })} onSelect={vi.fn()} />);
    const titleEl = screen.getByText(longTitle);
    expect(titleEl.className).toContain('line-clamp-2');
  });

  it('renders without category when categoryName is null', () => {
    render(<TaskCard task={makeTask({ categoryName: null, categoryColor: null })} onSelect={vi.fn()} />);
    expect(screen.getByText('Test task')).toBeInTheDocument();
    // No category badge
    expect(screen.queryByText('Hra')).not.toBeInTheDocument();
  });

  it('renders without assignee when assigneeId is null', () => {
    render(<TaskCard task={makeTask({ assigneeId: null, assigneeName: null })} onSelect={vi.fn()} />);
    expect(screen.getByText('Test task')).toBeInTheDocument();
    // Should show the "Vezmu si to" button for non-guest users
    expect(screen.getByLabelText('Vezmu si to')).toBeInTheDocument();
  });

  it('renders without due date when dueDate is null', () => {
    render(<TaskCard task={makeTask({ dueDate: null })} onSelect={vi.fn()} />);
    expect(screen.getByText('Test task')).toBeInTheDocument();
  });

  it('renders with no category, no assignee, and no due date', () => {
    render(
      <TaskCard
        task={makeTask({
          categoryName: null,
          categoryColor: null,
          assigneeId: null,
          assigneeName: null,
          dueDate: null,
        })}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('Test task')).toBeInTheDocument();
  });

  it('renders priority label', () => {
    render(<TaskCard task={makeTask({ priority: Priority.High })} onSelect={vi.fn()} />);
    expect(screen.getByText('Vysoká')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    const task = makeTask();
    render(<TaskCard task={task} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Test task'));
    expect(onSelect).toHaveBeenCalledWith(task);
  });

  it('shows subtask count when present', () => {
    render(<TaskCard task={makeTask({ subTaskCount: 5, subTaskDoneCount: 3 })} onSelect={vi.fn()} />);
    expect(screen.getByText('3/5')).toBeInTheDocument();
  });

  it('shows comment count when present', () => {
    render(<TaskCard task={makeTask({ commentCount: 7 })} onSelect={vi.fn()} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('hides subtask and comment counts when zero', () => {
    render(<TaskCard task={makeTask({ subTaskCount: 0, commentCount: 0 })} onSelect={vi.fn()} />);
    expect(screen.queryByText('0/0')).not.toBeInTheDocument();
  });

  it('shows overdue styling for past due dates on non-Done tasks', () => {
    const pastDate = '2020-01-01T00:00:00Z';
    render(<TaskCard task={makeTask({ dueDate: pastDate })} onSelect={vi.fn()} />);
    const dateEl = screen.getByText(/1\./); // Czech date format
    expect(dateEl.className).toContain('text-red-600');
  });

  it('does not show overdue styling for Done tasks', () => {
    const pastDate = '2020-01-01T00:00:00Z';
    render(<TaskCard task={makeTask({ dueDate: pastDate, status: TaskStatus.Done })} onSelect={vi.fn()} />);
    const dateEl = screen.getByText(/1\./); // Czech date format
    expect(dateEl.className).not.toContain('text-red-600');
  });

  it('calls onAssignMe when assign button is clicked', () => {
    const onAssignMe = vi.fn();
    render(
      <TaskCard
        task={makeTask({ assigneeId: null, assigneeName: null })}
        onSelect={vi.fn()}
        onAssignMe={onAssignMe}
      />,
    );
    fireEvent.click(screen.getByLabelText('Vezmu si to'));
    expect(onAssignMe).toHaveBeenCalledWith(1);
  });

  it('hides assign button for guest users', () => {
    mockUser.role = UserRole.Guest;
    render(
      <TaskCard
        task={makeTask({ assigneeId: null, assigneeName: null })}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('Vezmu si to')).not.toBeInTheDocument();
    mockUser.role = UserRole.Admin;
  });
});
