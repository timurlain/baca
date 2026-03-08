import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import VoiceRecorder from './VoiceRecorder';

const defaultProps = {
  state: 'idle' as const,
  duration: 0,
  error: null,
  isProcessing: false,
  onStart: vi.fn(),
  onStop: vi.fn(),
  onCancel: vi.fn(),
};

describe('VoiceRecorder', () => {
  it('renders mic button in idle state', () => {
    render(<VoiceRecorder {...defaultProps} />);
    expect(screen.getByLabelText('Začít nahrávat')).toBeInTheDocument();
    expect(screen.getByText('Klepněte pro nahrání hlasového příkazu')).toBeInTheDocument();
  });

  it('click starts recording', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<VoiceRecorder {...defaultProps} onStart={onStart} />);
    await user.click(screen.getByLabelText('Začít nahrávat'));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('shows duration and stop button during recording', () => {
    render(<VoiceRecorder {...defaultProps} state="recording" duration={65} />);
    expect(screen.getByLabelText('Zastavit nahrávání')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('1:05');
  });

  it('click again stops recording', async () => {
    const onStop = vi.fn();
    const user = userEvent.setup();
    render(<VoiceRecorder {...defaultProps} state="recording" duration={5} onStop={onStop} />);
    await user.click(screen.getByLabelText('Zastavit nahrávání'));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('shows processing spinner while API calls', () => {
    render(<VoiceRecorder {...defaultProps} isProcessing />);
    expect(screen.getByText('Zpracování...')).toBeInTheDocument();
  });

  it('"Zrušit" resets to idle', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<VoiceRecorder {...defaultProps} state="recording" duration={3} onCancel={onCancel} />);
    await user.click(screen.getByText('Zrušit'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows error message', () => {
    render(<VoiceRecorder {...defaultProps} error="Přístup k mikrofonu byl zamítnut" />);
    expect(screen.getByText('Přístup k mikrofonu byl zamítnut')).toBeInTheDocument();
  });
});
