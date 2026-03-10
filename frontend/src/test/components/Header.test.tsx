import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { UserRole } from '@/types';

// Mock the hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Test User', avatarColor: '#00ff00', role: UserRole.User },
    loading: false,
    logout: vi.fn(),
  }),
}));

vi.mock('@/hooks/useFocus', () => ({
  useFocus: () => ({
    tasks: [{ id: 1 }, { id: 2 }],
    loading: false,
  }),
}));

describe('Header', () => {
  it('renders app name', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    expect(screen.getByText('Bača')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    expect(screen.getByText('Přehled')).toBeInTheDocument();
    expect(screen.getByText('Board')).toBeInTheDocument();
  });

  it('renders task count badge', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders user avatar', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    expect(screen.getByText('TU')).toBeInTheDocument();
  });
});
