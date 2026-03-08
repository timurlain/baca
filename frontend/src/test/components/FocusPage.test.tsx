import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FocusPage from '@/components/focus/FocusPage';
import { tasks as tasksApi } from '@/api/client';
import * as useFocusHook from '@/hooks/useFocus';

// Mock the hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Test User', avatarColor: '#00ff00', role: 'User' },
    loading: false,
  }),
}));

const mockTasks = [
  { id: 1, title: 'Task 1', status: 'Open', priority: 'High', categoryName: 'Hra', categoryColor: '#ff0000', dueDate: null, subTaskCount: 0, subTaskDoneCount: 0 },
];

const mockRefresh = vi.fn();

vi.mock('@/hooks/useFocus', () => ({
  useFocus: vi.fn(() => ({
    tasks: mockTasks,
    loading: false,
    error: null,
    refresh: mockRefresh,
  })),
}));

vi.mock('@/api/client', () => ({
  tasks: {
    changeStatus: vi.fn(),
  },
  users: { list: vi.fn() },
  categories: { list: vi.fn() }
}));

describe('FocusPage', () => {
  it('renders tasks', () => {
    render(
      <BrowserRouter>
        <FocusPage />
      </BrowserRouter>
    );
    expect(screen.getByText('Task 1')).toBeInTheDocument();
  });

  it('calls changeStatus when Hotovo is clicked', async () => {
    render(
      <BrowserRouter>
        <FocusPage />
      </BrowserRouter>
    );
    
    const doneButton = screen.getByText('Hotovo');
    await act(async () => {
      fireEvent.click(doneButton);
    });
    
    expect(tasksApi.changeStatus).toHaveBeenCalledWith(1, { status: 'Done' });
  });

  it('renders empty state when no tasks', () => {
    vi.mocked(useFocusHook.useFocus).mockReturnValueOnce({
      tasks: [],
      loading: false,
      error: null,
      refresh: mockRefresh,
    });

    render(
      <BrowserRouter>
        <FocusPage />
      </BrowserRouter>
    );
    expect(screen.getByText('Všechno splněno!')).toBeInTheDocument();
  });
});
