import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import type { DashboardData } from '@/types';
import Dashboard from './Dashboard';

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

const fullMock: DashboardData = {
  totalTasks: 10,
  tasksByStatus: { Open: 3, InProgress: 2, Done: 5 },
  overdueTasks: 1,
  progressPercent: 50,
  categoryProgress: [
    { categoryId: 1, categoryName: 'Hra', categoryColor: '#3B82F6', totalTasks: 5, doneTasks: 3, progressPercent: 60 },
  ],
  recentTasks: [
    {
      id: 1, title: 'Testový úkol', description: null, status: 'Open' as const, priority: 'High' as const,
      categoryId: 1, categoryName: 'Hra', categoryColor: '#3B82F6',
      assigneeId: null, assigneeName: null, assigneeAvatarColor: null, assigneeShortcut: null,
      parentTaskId: null, dueDate: null, sortOrder: 0,
      createdById: 1, createdByName: 'Tomáš',
      createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
      subTaskCount: 0, subTaskDoneCount: 0, commentCount: 0,
    },
  ],
  myTaskCount: 3,
};

describe('Dashboard', () => {
  it('renders stats cards with data', async () => {
    server.use(
      http.get('/api/dashboard', () => HttpResponse.json(fullMock)),
    );
    renderDashboard();
    expect(await screen.findByText('Celkem úkolů')).toBeInTheDocument();
    expect(screen.getByText('Moje úkoly')).toBeInTheDocument();
    expect(screen.getByText('Po termínu')).toBeInTheDocument();
    expect(screen.getByText('Hotovo', { selector: 'p' })).toBeInTheDocument();
  });

  it('renders donut chart with status counts', async () => {
    server.use(
      http.get('/api/dashboard', () => HttpResponse.json(fullMock)),
    );
    renderDashboard();
    expect(await screen.findByText(/Otevřeno: 3/)).toBeInTheDocument();
    expect(screen.getByText(/V řešení: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Hotovo: 5/)).toBeInTheDocument();
  });

  it('renders overall progress bar', async () => {
    server.use(
      http.get('/api/dashboard', () => HttpResponse.json(fullMock)),
    );
    renderDashboard();
    expect(await screen.findByText('Hotové úkoly')).toBeInTheDocument();
    expect(screen.getByText('Celkový pokrok')).toBeInTheDocument();
  });

  it('renders per-category progress', async () => {
    server.use(
      http.get('/api/dashboard', () => HttpResponse.json(fullMock)),
    );
    renderDashboard();
    expect(await screen.findByText('Hra (3/5)')).toBeInTheDocument();
    expect(screen.getByText('60 %')).toBeInTheDocument();
  });

  it('renders overdue count', async () => {
    server.use(
      http.get('/api/dashboard', () => HttpResponse.json(fullMock)),
    );
    renderDashboard();
    expect(await screen.findByText('Po termínu')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('handles empty data gracefully', async () => {
    const emptyMock: DashboardData = {
      totalTasks: 0,
      tasksByStatus: {},
      overdueTasks: 0,
      progressPercent: 0,
      categoryProgress: [],
      recentTasks: [],
      myTaskCount: 0,
    };
    server.use(
      http.get('/api/dashboard', () => HttpResponse.json(emptyMock)),
    );
    renderDashboard();
    expect(await screen.findByText('Žádné úkoly')).toBeInTheDocument();
    expect(screen.getByText('Celkem úkolů')).toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    server.use(
      http.get('/api/dashboard', () => new HttpResponse('Server error', { status: 500 })),
    );
    renderDashboard();
    expect(await screen.findByText(/Server error/)).toBeInTheDocument();
  });
});
