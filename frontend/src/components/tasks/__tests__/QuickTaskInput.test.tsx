import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import QuickTaskInput from '../QuickTaskInput';

// Mock the API
vi.mock('@/api/client', () => ({
  tasks: {
    create: vi.fn().mockResolvedValue({ id: 1, title: 'Test task' }),
  },
  voice: {
    transcribe: vi.fn(),
  },
}));

describe('QuickTaskInput', () => {
  const onTaskCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders input with placeholder and buttons', () => {
    render(<QuickTaskInput onTaskCreated={onTaskCreated} />);
    expect(screen.getByPlaceholderText(/Nový úkol/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /přidat/i })).toBeInTheDocument();
  });

  it('submits task on Enter key', async () => {
    const { tasks } = await import('@/api/client');
    render(<QuickTaskInput onTaskCreated={onTaskCreated} />);

    const input = screen.getByPlaceholderText(/Nový úkol/);
    await userEvent.type(input, 'Připravit program{Enter}');

    await waitFor(() => {
      expect(tasks.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Připravit program' })
      );
    });
    expect(onTaskCreated).toHaveBeenCalled();
  });

  it('submits task on button click', async () => {
    const { tasks } = await import('@/api/client');
    render(<QuickTaskInput onTaskCreated={onTaskCreated} />);

    const input = screen.getByPlaceholderText(/Nový úkol/);
    await userEvent.type(input, 'Nový úkol test');
    await userEvent.click(screen.getByRole('button', { name: /přidat/i }));

    await waitFor(() => {
      expect(tasks.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Nový úkol test' })
      );
    });
  });

  it('clears input after successful submit', async () => {
    render(<QuickTaskInput onTaskCreated={onTaskCreated} />);

    const input = screen.getByPlaceholderText(/Nový úkol/) as HTMLInputElement;
    await userEvent.type(input, 'Test{Enter}');

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('does not submit when input is empty', async () => {
    const { tasks } = await import('@/api/client');
    render(<QuickTaskInput onTaskCreated={onTaskCreated} />);

    const input = screen.getByPlaceholderText(/Nový úkol/);
    await userEvent.type(input, '{Enter}');

    expect(tasks.create).not.toHaveBeenCalled();
  });

  it('uses stored defaults for status and priority', async () => {
    localStorage.setItem('baca-quick-task-defaults', JSON.stringify({
      status: 'Idea',
      priority: 'High',
      categoryId: 2,
    }));

    const { tasks } = await import('@/api/client');
    render(<QuickTaskInput onTaskCreated={onTaskCreated} />);

    const input = screen.getByPlaceholderText(/Nový úkol/);
    await userEvent.type(input, 'Úkol s defaults{Enter}');

    await waitFor(() => {
      expect(tasks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Úkol s defaults',
          status: 'Idea',
          priority: 'High',
          categoryId: 2,
        })
      );
    });
  });

  it('renders mic button', () => {
    render(<QuickTaskInput onTaskCreated={onTaskCreated} />);
    expect(screen.getByRole('button', { name: /nahrát/i })).toBeInTheDocument();
  });

  it('exports isConfirmWord that recognizes Czech confirm words', async () => {
    const { isConfirmWord } = await import('../QuickTaskInput');
    expect(isConfirmWord('jo')).toBe(true);
    expect(isConfirmWord('ano')).toBe(true);
    expect(isConfirmWord('hotovo')).toBe(true);
    expect(isConfirmWord('Ok')).toBe(true);
    expect(isConfirmWord('  JO  ')).toBe(true);
    expect(isConfirmWord('Nějaký úkol')).toBe(false);
    expect(isConfirmWord('jo prosím')).toBe(false);
    expect(isConfirmWord('')).toBe(false);
  });
});
