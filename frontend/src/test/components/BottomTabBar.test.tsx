import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BottomTabBar from '@/components/layout/BottomTabBar';
import { UserRole } from '@/types';

// Mock the hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Test User', avatarColor: '#00ff00', role: UserRole.User },
    loading: false,
  }),
}));

vi.mock('@/hooks/useFocus', () => ({
  useFocus: () => ({
    tasks: [{ id: 1 }, { id: 2 }, { id: 3 }],
    loading: false,
  }),
}));

describe('BottomTabBar', () => {
  it('renders mobile navigation items', () => {
    render(
      <BrowserRouter>
        <BottomTabBar />
      </BrowserRouter>
    );
    expect(screen.getByText('Fokus')).toBeInTheDocument();
    expect(screen.getByText('Tabule')).toBeInTheDocument();
    expect(screen.getByText('Hlas')).toBeInTheDocument();
    expect(screen.getByText('Staty')).toBeInTheDocument();
  });

  it('renders task count badge on Fokus tab', () => {
    render(
      <BrowserRouter>
        <BottomTabBar />
      </BrowserRouter>
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not render Admin tab for regular user', () => {
    render(
      <BrowserRouter>
        <BottomTabBar />
      </BrowserRouter>
    );
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });
});
