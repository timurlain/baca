import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useQuickTaskDefaults } from '../useQuickTaskDefaults';

const STORAGE_KEY = 'baca-quick-task-defaults';

describe('useQuickTaskDefaults', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns sensible defaults when localStorage is empty', () => {
    const { result } = renderHook(() => useQuickTaskDefaults());
    expect(result.current.defaults).toEqual({
      status: 'Open',
      priority: 'Medium',
      categoryId: null,
    });
  });

  it('saves and loads defaults from localStorage', () => {
    const { result } = renderHook(() => useQuickTaskDefaults());
    act(() => {
      result.current.saveDefaults({ status: 'Idea', priority: 'High', categoryId: 5 });
    });
    expect(result.current.defaults).toEqual({
      status: 'Idea',
      priority: 'High',
      categoryId: 5,
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.status).toBe('Idea');
  });

  it('loads previously stored defaults on mount', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      status: 'InProgress',
      priority: 'Low',
      categoryId: 3,
    }));
    const { result } = renderHook(() => useQuickTaskDefaults());
    expect(result.current.defaults).toEqual({
      status: 'InProgress',
      priority: 'Low',
      categoryId: 3,
    });
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    const { result } = renderHook(() => useQuickTaskDefaults());
    expect(result.current.defaults).toEqual({
      status: 'Open',
      priority: 'Medium',
      categoryId: null,
    });
  });
});
