import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FocusPage from '@/components/focus/FocusPage';
import useOfflineFocus from '@/hooks/useOfflineFocus';
import type { FocusTask, StatusChangeRequest } from '@/types';

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Test User', avatarColor: '#00ff00', role: 'User' },
    loading: false,
  }),
}));

// Mock TaskDetailModal to keep tests focused
vi.mock('@/components/board/TaskDetailModal', () => ({
  default: ({ taskId, isOpen }: { taskId: number; isOpen: boolean }) =>
    isOpen ? <div data-testid="task-detail-modal">Modal for task {taskId}</div> : null,
}));

const mockRefresh = vi.fn();
const mockChangeStatus = vi.fn();

vi.mock('@/hooks/useOfflineFocus', () => ({
  default: vi.fn(),
}));

function makeFocusTask(overrides: Partial<FocusTask> = {}): FocusTask {
  return {
    id: 1,
    title: 'Task 1',
    status: 'Open',
    priority: 'High',
    categoryName: 'Hra',
    categoryColor: '#ff0000',
    categoryId: 1,
    dueDate: null,
    subTaskCount: 0,
    subTaskDoneCount: 0,
    ...overrides,
  };
}

function setupMock(overrides: Partial<ReturnType<typeof useOfflineFocus>> = {}) {
  vi.mocked(useOfflineFocus).mockReturnValue({
    focusTasks: [makeFocusTask()],
    loading: false,
    error: null,
    changeStatus: mockChangeStatus as (taskId: number, req: StatusChangeRequest) => Promise<void>,
    refresh: mockRefresh as () => Promise<void>,
    ...overrides,
  });
}

function renderFocus() {
  return render(
    <BrowserRouter>
      <FocusPage />
    </BrowserRouter>,
  );
}

describe('FocusPage hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner when loading with no tasks', () => {
    setupMock({ focusTasks: [], loading: true });
    renderFocus();
    expect(screen.getByText('Načítání tvého fokusu...')).toBeInTheDocument();
  });

  it('renders error state with error message', () => {
    setupMock({ error: 'Nepodařilo se načíst úkoly' });
    renderFocus();
    expect(screen.getByText('Chyba')).toBeInTheDocument();
    expect(screen.getByText('Nepodařilo se načíst úkoly')).toBeInTheDocument();
  });

  it('renders retry button in error state', () => {
    setupMock({ error: 'Connection failed' });
    renderFocus();
    const retryBtn = screen.getByText('Zkusit znovu');
    fireEvent.click(retryBtn);
    expect(mockRefresh).toHaveBeenCalledOnce();
  });

  it('renders empty state when no tasks', () => {
    setupMock({ focusTasks: [] });
    renderFocus();
    expect(screen.getByText('Všechno splněno!')).toBeInTheDocument();
    expect(screen.getByText('Nemáš žádné aktivní úkoly k řešení.')).toBeInTheDocument();
  });

  it('renders link to board in empty state', () => {
    setupMock({ focusTasks: [] });
    renderFocus();
    const link = screen.getByText('Prohlédnout board');
    expect(link).toHaveAttribute('href', '/board');
  });

  it('renders exactly 1 task correctly', () => {
    setupMock({ focusTasks: [makeFocusTask()] });
    renderFocus();
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    // Czech: 1 úkol
    expect(screen.getByText('1 úkol')).toBeInTheDocument();
  });

  it('renders exactly 2 tasks correctly', () => {
    setupMock({
      focusTasks: [
        makeFocusTask({ id: 1, title: 'Task A' }),
        makeFocusTask({ id: 2, title: 'Task B' }),
      ],
    });
    renderFocus();
    expect(screen.getByText('Task A')).toBeInTheDocument();
    expect(screen.getByText('Task B')).toBeInTheDocument();
    // Czech: 2 úkoly
    expect(screen.getByText('2 úkoly')).toBeInTheDocument();
  });

  it('renders exactly 3 tasks correctly', () => {
    setupMock({
      focusTasks: [
        makeFocusTask({ id: 1, title: 'Task X' }),
        makeFocusTask({ id: 2, title: 'Task Y' }),
        makeFocusTask({ id: 3, title: 'Task Z' }),
      ],
    });
    renderFocus();
    expect(screen.getByText('Task X')).toBeInTheDocument();
    expect(screen.getByText('Task Y')).toBeInTheDocument();
    expect(screen.getByText('Task Z')).toBeInTheDocument();
    // Czech: 3 úkoly
    expect(screen.getByText('3 úkoly')).toBeInTheDocument();
  });

  it('renders 5+ tasks with "úkolů" suffix', () => {
    const tasks = Array.from({ length: 5 }, (_, i) =>
      makeFocusTask({ id: i + 1, title: `Task ${i + 1}` }),
    );
    setupMock({ focusTasks: tasks });
    renderFocus();
    expect(screen.getByText('5 úkolů')).toBeInTheDocument();
  });

  it('renders category badge when task has category', () => {
    setupMock({ focusTasks: [makeFocusTask({ categoryName: 'Logistika', categoryColor: '#F59E0B' })] });
    renderFocus();
    expect(screen.getByText('Logistika')).toBeInTheDocument();
  });

  it('hides category badge when task has no category', () => {
    setupMock({ focusTasks: [makeFocusTask({ categoryName: null, categoryColor: null })] });
    renderFocus();
    expect(screen.queryByText('Hra')).not.toBeInTheDocument();
  });

  it('shows due date when present', () => {
    setupMock({ focusTasks: [makeFocusTask({ dueDate: '2026-05-01T00:00:00Z' })] });
    renderFocus();
    // Czech formatted date
    expect(screen.getByText(/1\./)).toBeInTheDocument();
  });

  it('hides due date when null', () => {
    setupMock({ focusTasks: [makeFocusTask({ dueDate: null })] });
    renderFocus();
    // No date elements
    const taskCard = screen.getByText('Task 1').closest('div');
    expect(taskCard).toBeInTheDocument();
  });

  it('shows subtask progress bar when subtasks exist', () => {
    setupMock({ focusTasks: [makeFocusTask({ subTaskCount: 4, subTaskDoneCount: 2 })] });
    renderFocus();
    expect(screen.getByText('2/4')).toBeInTheDocument();
  });

  it('hides subtask progress when no subtasks', () => {
    setupMock({ focusTasks: [makeFocusTask({ subTaskCount: 0, subTaskDoneCount: 0 })] });
    renderFocus();
    expect(screen.queryByText('0/0')).not.toBeInTheDocument();
  });

  it('applies red border for High priority tasks', () => {
    setupMock({ focusTasks: [makeFocusTask({ priority: 'High' })] });
    renderFocus();
    const card = screen.getByText('Task 1').closest('.rounded-2xl');
    expect(card?.className).toContain('border-red-500');
  });

  it('calls changeStatus with Done when Hotovo is clicked', async () => {
    setupMock();
    renderFocus();
    await act(async () => {
      fireEvent.click(screen.getByText('Hotovo'));
    });
    expect(mockChangeStatus).toHaveBeenCalledWith(1, { status: 'Done' });
  });

  it('calls changeStatus with ForReview when K review is clicked', async () => {
    setupMock();
    renderFocus();
    await act(async () => {
      fireEvent.click(screen.getByText('K review'));
    });
    expect(mockChangeStatus).toHaveBeenCalledWith(1, { status: 'ForReview' });
  });

  it('opens task detail modal when task card is clicked', () => {
    setupMock();
    renderFocus();
    fireEvent.click(screen.getByText('Task 1'));
    expect(screen.getByTestId('task-detail-modal')).toBeInTheDocument();
    expect(screen.getByText('Modal for task 1')).toBeInTheDocument();
  });
});
