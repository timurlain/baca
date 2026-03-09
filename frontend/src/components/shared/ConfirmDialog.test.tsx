import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog';

function renderDialog(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const defaultProps = {
    isOpen: true,
    title: 'Potvrzení',
    message: 'Opravdu chcete pokračovat?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };
  const merged = { ...defaultProps, ...props };
  render(<ConfirmDialog {...merged} />);
  return merged;
}

describe('ConfirmDialog', () => {
  it('returns null when not open', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Test"
        message="Test"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders title and message when open', () => {
    renderDialog();
    expect(screen.getByText('Potvrzení')).toBeInTheDocument();
    expect(screen.getByText('Opravdu chcete pokračovat?')).toBeInTheDocument();
  });

  it('uses default button labels', () => {
    renderDialog();
    expect(screen.getByText('Potvrdit')).toBeInTheDocument();
    expect(screen.getByText('Zrušit')).toBeInTheDocument();
  });

  it('uses custom button labels', () => {
    renderDialog({ confirmLabel: 'Ano', cancelLabel: 'Ne' });
    expect(screen.getByText('Ano')).toBeInTheDocument();
    expect(screen.getByText('Ne')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const { onConfirm } = renderDialog();
    fireEvent.click(screen.getByText('Potvrdit'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const { onCancel } = renderDialog();
    fireEvent.click(screen.getByText('Zrušit'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('applies danger styling when isDanger is true', () => {
    renderDialog({ isDanger: true });
    const confirmBtn = screen.getByText('Potvrdit');
    expect(confirmBtn.className).toContain('bg-red-600');
  });

  it('applies default (forest) styling when isDanger is false', () => {
    renderDialog({ isDanger: false });
    const confirmBtn = screen.getByText('Potvrdit');
    expect(confirmBtn.className).toContain('bg-forest-800');
  });
});
