import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Avatar from '@/components/shared/Avatar';

describe('Avatar', () => {
  it('renders initials from name', () => {
    render(<Avatar name="Jan Novák" />);
    expect(screen.getByText('JN')).toBeInTheDocument();
  });

  it('renders initials from single name', () => {
    render(<Avatar name="Honza" />);
    expect(screen.getByText('HO')).toBeInTheDocument();
  });

  it('renders question mark for empty name', () => {
    render(<Avatar name="" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('applies custom color', () => {
    const { container } = render(<Avatar name="Test" color="#ff0000" />);
    expect(container.firstChild).toHaveStyle({ backgroundColor: '#ff0000' });
  });
});
