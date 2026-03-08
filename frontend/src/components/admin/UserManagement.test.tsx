import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { UserRole } from '@/types';
import type { User } from '@/types';
import UserManagement from './UserManagement';

const mockUsers: User[] = [
  {
    id: 1, name: 'Tomáš', email: 'tomas@baca.local', phone: null,
    role: UserRole.Admin, gameRoleId: 1, gameRoleName: 'Osud',
    avatarColor: '#10B981', isActive: true, createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2, name: 'Jana', email: 'jana@baca.local', phone: '+420123456789',
    role: UserRole.User, gameRoleId: null, gameRoleName: null,
    avatarColor: '#3B82F6', isActive: true, createdAt: '2026-01-02T00:00:00Z',
  },
];

function setup() {
  server.use(
    http.get('/api/users', () => HttpResponse.json(mockUsers)),
    http.get('/api/auth/me', () =>
      HttpResponse.json({ id: 1, name: 'Tomáš', role: UserRole.Admin, avatarColor: '#10B981' }),
    ),
  );
}

describe('UserManagement', () => {
  it('renders user table', async () => {
    setup();
    render(<UserManagement />);
    expect(await screen.findByText('Tomáš')).toBeInTheDocument();
    expect(screen.getByText('Jana')).toBeInTheDocument();
    expect(screen.getByText('Administrátor')).toBeInTheDocument();
    expect(screen.getByText('Organizátor')).toBeInTheDocument();
  });

  it('add user form submits correctly', async () => {
    setup();
    server.use(
      http.post('/api/users', () =>
        HttpResponse.json({
          id: 3, name: 'Petr', email: 'petr@test.cz', phone: null,
          role: UserRole.User, gameRoleId: null, gameRoleName: null,
          avatarColor: '#EF4444', isActive: true, createdAt: '2026-03-01T00:00:00Z',
        }, { status: 201 }),
      ),
    );
    const user = userEvent.setup();
    render(<UserManagement />);
    await screen.findByText('Tomáš');

    await user.click(screen.getByText('Přidat uživatele'));
    await user.type(screen.getByLabelText('Jméno'), 'Petr');
    await user.type(screen.getByLabelText('Email'), 'petr@test.cz');
    await user.click(screen.getByRole('button', { name: 'Přidat' }));

    await waitFor(() => {
      expect(screen.getByText('Uživatel přidán')).toBeInTheDocument();
    });
  });

  it('deactivate button works', async () => {
    setup();
    server.use(
      http.put('/api/users/2', () =>
        HttpResponse.json({ ...mockUsers[1], isActive: false }),
      ),
    );
    const user = userEvent.setup();
    render(<UserManagement />);
    await screen.findByText('Jana');

    const deactivateButtons = screen.getAllByText('Deaktivovat');
    // The second user's deactivate button (first is current user = disabled)
    await user.click(deactivateButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Neaktivní')).toBeInTheDocument();
    });
  });

  it('resend link button calls API', async () => {
    setup();
    server.use(
      http.post('/api/users/:id/resend-link', () => new HttpResponse(null, { status: 204 })),
    );
    const user = userEvent.setup();
    render(<UserManagement />);
    await screen.findByText('Tomáš');

    const resendButtons = screen.getAllByText('Odeslat odkaz');
    await user.click(resendButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Odkaz odeslán')).toBeInTheDocument();
    });
  });

  it('cannot deactivate yourself', async () => {
    setup();
    const user = userEvent.setup();
    render(<UserManagement />);
    await screen.findByText('Tomáš');

    // First deactivate button belongs to current user (id: 1)
    const deactivateButtons = screen.getAllByText('Deaktivovat');
    await user.click(deactivateButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Nelze deaktivovat sám sebe')).toBeInTheDocument();
    });
  });
});
