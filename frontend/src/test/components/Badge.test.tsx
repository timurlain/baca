import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from '@/components/shared/Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('applies custom color class', () => {
    const { container } = render(<Badge color="bg-red-500">Red Badge</Badge>);
    expect(container.firstChild).toHaveClass('bg-red-500');
  });
});
