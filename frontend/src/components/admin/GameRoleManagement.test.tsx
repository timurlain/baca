import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import type { GameRole } from '@/types';
import GameRoleManagement from './GameRoleManagement';

const mockRoles: GameRole[] = [
  { id: 1, name: 'Osud', description: 'Game Master', color: '#7DD3FC', sortOrder: 1, createdAt: '2026-01-01T00:00:00Z' },
  { id: 2, name: 'Vládce', description: 'Nation Ruler', color: '#8B5CF6', sortOrder: 2, createdAt: '2026-01-01T00:00:00Z' },
];

describe('GameRoleManagement', () => {
  it('renders role list', async () => {
    server.use(http.get('/api/gameroles', () => HttpResponse.json(mockRoles)));
    render(<GameRoleManagement />);
    expect(await screen.findByText('Osud')).toBeInTheDocument();
    expect(screen.getByText('Vládce')).toBeInTheDocument();
    expect(screen.getByText('Game Master')).toBeInTheDocument();
  });

  it('add role form submits correctly', async () => {
    server.use(
      http.get('/api/gameroles', () => HttpResponse.json(mockRoles)),
      http.post('/api/gameroles', () =>
        HttpResponse.json(
          { id: 3, name: 'Hrdina', description: 'Hero', color: '#10B981', sortOrder: 3, createdAt: '2026-03-01T00:00:00Z' },
          { status: 201 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<GameRoleManagement />);
    await screen.findByText('Osud');

    await user.click(screen.getByText('Přidat herní roli'));
    await user.type(screen.getByLabelText('Název'), 'Hrdina');
    await user.type(screen.getByLabelText('Popis'), 'Hero');
    await user.click(screen.getByRole('button', { name: 'Přidat' }));

    await waitFor(() => {
      expect(screen.getByText('Herní role přidána')).toBeInTheDocument();
    });
  });

  it('edit role updates list', async () => {
    server.use(
      http.get('/api/gameroles', () => HttpResponse.json(mockRoles)),
      http.put('/api/gameroles/1', () =>
        HttpResponse.json({ ...mockRoles[0], name: 'Osud Upravený' }),
      ),
    );
    const user = userEvent.setup();
    render(<GameRoleManagement />);
    await screen.findByText('Osud');

    const editButtons = screen.getAllByText('Upravit');
    await user.click(editButtons[0]);

    const nameInput = screen.getByLabelText('Název');
    await user.clear(nameInput);
    await user.type(nameInput, 'Osud Upravený');
    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    await waitFor(() => {
      expect(screen.getByText('Herní role upravena')).toBeInTheDocument();
    });
  });

  it('delete role removes from list', async () => {
    server.use(
      http.get('/api/gameroles', () => HttpResponse.json(mockRoles)),
      http.delete('/api/gameroles/1', () => new HttpResponse(null, { status: 204 })),
    );
    const user = userEvent.setup();
    render(<GameRoleManagement />);
    await screen.findByText('Osud');

    const deleteButtons = screen.getAllByText('Smazat');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Herní role smazána')).toBeInTheDocument();
    });
  });

  it('shows error when delete fails', async () => {
    server.use(
      http.get('/api/gameroles', () => HttpResponse.json(mockRoles)),
      http.delete('/api/gameroles/1', () => new HttpResponse('Conflict', { status: 409 })),
    );
    const user = userEvent.setup();
    render(<GameRoleManagement />);
    await screen.findByText('Osud');

    const deleteButtons = screen.getAllByText('Smazat');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Nelze smazat — role má přiřazené uživatele')).toBeInTheDocument();
    });
  });
});
