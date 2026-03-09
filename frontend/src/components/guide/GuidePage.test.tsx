import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GuidePage from './GuidePage';
import { UserRole } from '@/types';

vi.mock('@/App', () => ({
  useAuthContext: vi.fn(() => ({
    user: { role: UserRole.Admin },
    loading: false,
  })),
}));

import { useAuthContext } from '@/App';
const mockUseAuthContext = vi.mocked(useAuthContext);

describe('GuidePage', () => {
  it('renders sidebar navigation links', () => {
    render(
      <MemoryRouter initialEntries={['/guide']}>
        <GuidePage />
      </MemoryRouter>
    );
    // Each label appears twice (mobile select option + desktop nav link)
    expect(screen.getAllByText('Vítejte')).toHaveLength(2);
    expect(screen.getAllByText('Nástěnka (Board)')).toHaveLength(2);
    expect(screen.getAllByText('Můj fokus')).toHaveLength(2);
    expect(screen.getAllByText('Hlasový vstup')).toHaveLength(2);
    expect(screen.getAllByText('Offline režim')).toHaveLength(2);
  });

  it('shows Správa link for admin', () => {
    render(
      <MemoryRouter initialEntries={['/guide']}>
        <GuidePage />
      </MemoryRouter>
    );
    expect(screen.getAllByText('Správa')).toHaveLength(2);
  });

  it('hides Správa link for non-admin', () => {
    mockUseAuthContext.mockReturnValue({
      user: { role: UserRole.User } as never,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/guide']}>
        <GuidePage />
      </MemoryRouter>
    );
    expect(screen.queryByText('Správa')).not.toBeInTheDocument();
  });

  it('renders mobile topic selector', () => {
    render(
      <MemoryRouter initialEntries={['/guide']}>
        <GuidePage />
      </MemoryRouter>
    );
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });
});
