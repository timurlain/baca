import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StatsCard from './StatsCard';

describe('StatsCard', () => {
  it('renders label and numeric value', () => {
    render(<StatsCard label="Celkem úkolů" value={42} />);
    expect(screen.getByText('Celkem úkolů')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders string value', () => {
    render(<StatsCard label="Hotovo" value="50 %" />);
    expect(screen.getByText('50 %')).toBeInTheDocument();
  });

  it('renders zero value without crashing', () => {
    render(<StatsCard label="Po termínu" value={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('applies custom color class', () => {
    render(<StatsCard label="Test" value={1} color="text-red-600" />);
    const valueEl = screen.getByText('1');
    expect(valueEl.className).toContain('text-red-600');
  });

  it('applies default color when no color prop', () => {
    render(<StatsCard label="Test" value={1} />);
    const valueEl = screen.getByText('1');
    expect(valueEl.className).toContain('text-gray-900');
  });

  it('adds button role and cursor-pointer when onClick is provided', () => {
    const onClick = vi.fn();
    render(<StatsCard label="Click me" value={5} onClick={onClick} />);
    const card = screen.getByRole('button');
    expect(card).toBeInTheDocument();
    expect(card.className).toContain('cursor-pointer');
  });

  it('does not add button role when onClick is not provided', () => {
    render(<StatsCard label="Static" value={5} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<StatsCard label="Click me" value={5} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('calls onClick on Enter key press', () => {
    const onClick = vi.fn();
    render(<StatsCard label="Key press" value={5} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('sets tabIndex when onClick is provided', () => {
    const onClick = vi.fn();
    render(<StatsCard label="Focus" value={5} onClick={onClick} />);
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
  });
});
