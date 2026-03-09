import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { Priority, TaskStatus } from '@/types';
import type { VoiceParseResponse } from '@/types';
import VoiceTaskPreview from './VoiceTaskPreview';

const baseParsed: VoiceParseResponse = {
  title: 'Test úkol',
  description: 'Popis úkolu',
  assigneeName: 'Tomáš',
  assigneeId: 1,
  assigneeConfidence: 0.9,
  categoryName: 'Hra',
  categoryId: 1,
  categoryConfidence: 0.7,
  priority: Priority.High,
  priorityConfidence: 0.85,
  dueDate: '2026-05-01T00:00:00Z',
  dueDateConfidence: 0.6,
  status: TaskStatus.Open,
  rawTranscription: 'Připrav hru na sobotu vysoká priorita',
};

function renderPreview(parsed = baseParsed) {
  const onSave = vi.fn();
  const onRetry = vi.fn();
  const onCancel = vi.fn();
  render(<VoiceTaskPreview parsed={parsed} onSave={onSave} onRetry={onRetry} onCancel={onCancel} />);
  return { onSave, onRetry, onCancel };
}

describe('VoiceTaskPreview confidence combinations', () => {
  it('all high confidence — no amber/red borders', () => {
    const allHigh: VoiceParseResponse = {
      ...baseParsed,
      assigneeConfidence: 0.95,
      categoryConfidence: 0.92,
      priorityConfidence: 0.88,
      dueDateConfidence: 0.85,
    };
    renderPreview(allHigh);
    const assigneeSelect = screen.getByLabelText(/Přiřazeno/);
    expect(assigneeSelect.className).not.toContain('border-amber-300');
    expect(assigneeSelect.className).not.toContain('border-red-400');
    const categorySelect = screen.getByLabelText(/Kategorie/);
    expect(categorySelect.className).not.toContain('border-amber-300');
    expect(categorySelect.className).not.toContain('border-red-400');
  });

  it('all low confidence — red borders on all confidence fields', () => {
    const allLow: VoiceParseResponse = {
      ...baseParsed,
      assigneeConfidence: 0.2,
      categoryConfidence: 0.1,
      priorityConfidence: 0.3,
      dueDateConfidence: 0.15,
    };
    renderPreview(allLow);
    const assigneeSelect = screen.getByLabelText(/Přiřazeno/);
    expect(assigneeSelect.className).toContain('border-red-400');
    expect(assigneeSelect.className).toContain('bg-red-50');
    const categorySelect = screen.getByLabelText(/Kategorie/);
    expect(categorySelect.className).toContain('border-red-400');
    const prioritySelect = screen.getByLabelText(/Priorita/);
    expect(prioritySelect.className).toContain('border-red-400');
    const dueDateInput = screen.getByLabelText(/Termín/);
    expect(dueDateInput.className).toContain('border-red-400');
  });

  it('mixed confidence — correct borders per field', () => {
    const mixed: VoiceParseResponse = {
      ...baseParsed,
      assigneeConfidence: 0.95, // high -> gray
      categoryConfidence: 0.6,  // medium -> amber
      priorityConfidence: 0.3,  // low -> red
      dueDateConfidence: 0.7,   // medium -> amber
    };
    renderPreview(mixed);
    const assigneeSelect = screen.getByLabelText(/Přiřazeno/);
    expect(assigneeSelect.className).toContain('border-gray-300');
    const categorySelect = screen.getByLabelText(/Kategorie/);
    expect(categorySelect.className).toContain('border-amber-300');
    const prioritySelect = screen.getByLabelText(/Priorita/);
    expect(prioritySelect.className).toContain('border-red-400');
    const dueDateInput = screen.getByLabelText(/Termín/);
    expect(dueDateInput.className).toContain('border-amber-300');
  });

  it('null confidence values — gray borders (default)', () => {
    const nullConfidence: VoiceParseResponse = {
      ...baseParsed,
      assigneeConfidence: null,
      categoryConfidence: null,
      priorityConfidence: null,
      dueDateConfidence: null,
    };
    renderPreview(nullConfidence);
    const assigneeSelect = screen.getByLabelText(/Přiřazeno/);
    expect(assigneeSelect.className).toContain('border-gray-300');
    const categorySelect = screen.getByLabelText(/Kategorie/);
    expect(categorySelect.className).toContain('border-gray-300');
  });

  it('shows warning icon for low confidence assignee', () => {
    const lowAssignee: VoiceParseResponse = {
      ...baseParsed,
      assigneeConfidence: 0.3,
    };
    renderPreview(lowAssignee);
    // The warning icon SVG should be present near the assignee label
    const assigneeLabel = screen.getByText(/Přiřazeno/);
    const svg = assigneeLabel.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows warning icon for low confidence category', () => {
    const lowCategory: VoiceParseResponse = {
      ...baseParsed,
      categoryConfidence: 0.2,
    };
    renderPreview(lowCategory);
    const categoryLabel = screen.getByText(/Kategorie/);
    const svg = categoryLabel.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('does not show warning icon for high confidence fields', () => {
    const allHigh: VoiceParseResponse = {
      ...baseParsed,
      assigneeConfidence: 0.95,
      categoryConfidence: 0.92,
      priorityConfidence: 0.88,
      dueDateConfidence: 0.85,
    };
    renderPreview(allHigh);
    const assigneeLabel = screen.getByText(/Přiřazeno/);
    const svg = assigneeLabel.querySelector('svg');
    expect(svg).not.toBeInTheDocument();
  });

  it('cancel button calls onCancel', async () => {
    const { onCancel } = renderPreview();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Zrušit' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows error when trying to save with empty title', async () => {
    const emptyTitle: VoiceParseResponse = {
      ...baseParsed,
      title: null,
    };
    renderPreview(emptyTitle);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Uložit úkol' }));
    expect(await screen.findByText('Název úkolu je povinný')).toBeInTheDocument();
  });

  it('shows error when API call fails', async () => {
    server.use(
      http.post('/api/tasks', () => new HttpResponse('Server error', { status: 500 })),
    );
    renderPreview();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Uložit úkol' }));
    expect(await screen.findByText('Nepodařilo se vytvořit úkol')).toBeInTheDocument();
  });
});
