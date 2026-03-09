import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GuideWelcome from './GuideWelcome';
import { UserRole } from '@/types';

vi.mock('@/App', () => ({
  useAuthContext: vi.fn(() => ({
    user: { role: UserRole.Admin },
    loading: false,
  })),
}));

import { useAuthContext } from '@/App';
const mockUseAuthContext = vi.mocked(useAuthContext);

describe('GuideWelcome', () => {
  it('renders the heading', () => {
    render(
      <MemoryRouter>
        <GuideWelcome />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Příručka' })).toBeInTheDocument();
  });

  it('contains ≤200 words of body text', () => {
    const { container } = render(
      <MemoryRouter>
        <GuideWelcome />
      </MemoryRouter>
    );
    const text = container.textContent || '';
    const words = text.trim().split(/\s+/).length;
    expect(words).toBeLessThanOrEqual(200);
  });

  it('shows quick-start steps', () => {
    render(
      <MemoryRouter>
        <GuideWelcome />
      </MemoryRouter>
    );
    expect(screen.getByText(/Vezmu si to/)).toBeInTheDocument();
    expect(screen.getByText(/Splněné označ/)).toBeInTheDocument();
  });

  it('shows all topic cards for admin', () => {
    render(
      <MemoryRouter>
        <GuideWelcome />
      </MemoryRouter>
    );
    // Topic card headings (h3 elements)
    const headings = screen.getAllByRole('heading', { level: 3 });
    const titles = headings.map((h) => h.textContent);
    expect(titles).toContain('Nástěnka (Board)');
    expect(titles).toContain('Můj fokus');
    expect(titles).toContain('Hlasový vstup');
    expect(titles).toContain('Správa');
    expect(titles).toContain('Offline režim');
  });

  it('hides Správa card for non-admin', () => {
    mockUseAuthContext.mockReturnValue({
      user: { role: UserRole.User } as never,
      loading: false,
    });

    render(
      <MemoryRouter>
        <GuideWelcome />
      </MemoryRouter>
    );
    const headings = screen.getAllByRole('heading', { level: 3 });
    const titles = headings.map((h) => h.textContent);
    expect(titles).not.toContain('Správa');
  });
});
