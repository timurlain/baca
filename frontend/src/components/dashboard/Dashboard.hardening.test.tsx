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

describe('Dashboard hardening', () => {
  it('handles all-zero data without division by zero', async () => {
    const allZeros: DashboardData = {
      totalTasks: 0,
      tasksByStatus: { Open: 0, InProgress: 0, Done: 0 },
      overdueTasks: 0,
      progressPercent: 0,
      categoryProgress: [],
      recentTasks: [],
      myTaskCount: 0,
    };
    server.use(
      http.get('/api/dashboard', () => HttpResponse.json(allZeros)),
    );
    renderDashboard();
    expect(await screen.findByText('Celkem úkolů')).toBeInTheDocument();
    // The "0 %" appears in both StatsCard and ProgressChart — use getAllByText
    const zeroPercents = screen.getAllByText(/0\s*%/);
    expect(zeroPercents.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Žádné úkoly')).toBeInTheDocument();
  });

  it('handles API 500 error gracefully — shows error text', async () => {
    server.use(
      http.get('/api/dashboard', () => new HttpResponse('Internal Server Error', { status: 500 })),
    );
    renderDashboard();
    expect(await screen.findByText(/Internal Server Error/)).toBeInTheDocument();
  });

  it('handles empty tasksByStatus object', async () => {
    const emptyStatuses: DashboardData = {
      totalTasks: 0,
      tasksByStatus: {},
      overdueTasks: 0,
      progressPercent: 0,
      categoryProgress: [],
      recentTasks: [],
      myTaskCount: 0,
    };
    server.use(
      http.get('/api/dashboard', () => HttpResponse.json(emptyStatuses)),
    );
    renderDashboard();
    expect(await screen.findByText('Celkem úkolů')).toBeInTheDocument();
  });

  it('handles large numbers gracefully', async () => {
    const bigNumbers: DashboardData = {
      totalTasks: 999999,
      tasksByStatus: { Open: 500000, InProgress: 300000, Done: 199999 },
      overdueTasks: 100000,
      progressPercent: 20,
      categoryProgress: [],
      recentTasks: [],
      myTaskCount: 50000,
    };
    server.use(
      http.get('/api/dashboard', () => HttpResponse.json(bigNumbers)),
    );
    renderDashboard();
    expect(await screen.findByText('Celkem úkolů')).toBeInTheDocument();
    // 999999 appears in both StatsCard and SVG chart
    const bigNums = screen.getAllByText('999999');
    expect(bigNums.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('50000')).toBeInTheDocument();
    expect(screen.getByText('100000')).toBeInTheDocument();
  });

  it('renders multiple category progress items', async () => {
    const multiCategory: DashboardData = {
      totalTasks: 10,
      tasksByStatus: { Open: 5, Done: 5 },
      overdueTasks: 0,
      progressPercent: 50,
      categoryProgress: [
        { categoryId: 1, categoryName: 'Hra', categoryColor: '#3B82F6', totalTasks: 5, doneTasks: 3, progressPercent: 60 },
        { categoryId: 2, categoryName: 'Logistika', categoryColor: '#F59E0B', totalTasks: 5, doneTasks: 2, progressPercent: 40 },
      ],
      recentTasks: [],
      myTaskCount: 3,
    };
    server.use(
      http.get('/api/dashboard', () => HttpResponse.json(multiCategory)),
    );
    renderDashboard();
    expect(await screen.findByText('Hra (3/5)')).toBeInTheDocument();
    expect(screen.getByText('Logistika (2/5)')).toBeInTheDocument();
  });

  it('hides recent tasks section when no recent tasks', async () => {
    const noRecent: DashboardData = {
      totalTasks: 5,
      tasksByStatus: { Open: 5 },
      overdueTasks: 0,
      progressPercent: 0,
      categoryProgress: [],
      recentTasks: [],
      myTaskCount: 2,
    };
    server.use(
      http.get('/api/dashboard', () => HttpResponse.json(noRecent)),
    );
    renderDashboard();
    await screen.findByText('Celkem úkolů');
    expect(screen.queryByText('Poslední změny')).not.toBeInTheDocument();
  });
});
