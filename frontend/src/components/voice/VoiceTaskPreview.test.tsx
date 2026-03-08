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

describe('VoiceTaskPreview', () => {
  it('displays raw transcription text', () => {
    renderPreview();
    expect(screen.getByText('Připrav hru na sobotu vysoká priorita')).toBeInTheDocument();
  });

  it('fills form with parsed values', () => {
    renderPreview();
    expect(screen.getByDisplayValue('Test úkol')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Popis úkolu')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-05-01')).toBeInTheDocument();
  });

  it('yellow highlight for confidence 0.5-0.79', () => {
    renderPreview();
    // Category has confidence 0.7 → amber border
    const categorySelect = screen.getByLabelText(/Kategorie/);
    expect(categorySelect.className).toContain('border-amber-300');
    expect(categorySelect.className).toContain('bg-amber-50');
  });

  it('red border for confidence < 0.5', () => {
    const lowConfidence: VoiceParseResponse = {
      ...baseParsed,
      assigneeConfidence: 0.3,
    };
    renderPreview(lowConfidence);
    const assigneeSelect = screen.getByLabelText(/Přiřazeno/);
    expect(assigneeSelect.className).toContain('border-red-400');
  });

  it('empty fields for null values', () => {
    const nullParsed: VoiceParseResponse = {
      ...baseParsed,
      title: null,
      description: null,
      assigneeId: null,
      assigneeName: null,
      assigneeConfidence: null,
      categoryId: null,
      categoryName: null,
      categoryConfidence: null,
      dueDate: null,
      dueDateConfidence: null,
    };
    renderPreview(nullParsed);
    expect(screen.getByLabelText('Název')).toHaveValue('');
    expect(screen.getByLabelText('Popis')).toHaveValue('');
  });

  it('"Uložit" calls create task API', async () => {
    server.use(
      http.post('/api/tasks', () =>
        HttpResponse.json({ id: 99, title: 'Test úkol' }, { status: 201 }),
      ),
    );
    const { onSave } = renderPreview();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Uložit úkol' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce();
    });
  });

  it('"Zkusit znovu" resets to recording state', async () => {
    const { onRetry } = renderPreview();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Zkusit znovu' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('fields are editable (user can override AI suggestions)', async () => {
    renderPreview();
    const user = userEvent.setup();

    const titleInput = screen.getByLabelText('Název');
    await user.clear(titleInput);
    await user.type(titleInput, 'Upravený název');
    expect(titleInput).toHaveValue('Upravený název');
  });
});
