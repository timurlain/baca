import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useVoiceRecorder from './useVoiceRecorder';

// Mock MediaRecorder
class MockMediaRecorder {
  state = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['audio'], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}

const mockGetUserMedia = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).MediaRecorder = MockMediaRecorder;
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
    configurable: true,
  });
});

describe('useVoiceRecorder', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useVoiceRecorder());
    expect(result.current.state).toBe('idle');
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('transitions: idle → recording → stopped → idle', async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] };
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result } = renderHook(() => useVoiceRecorder());

    // idle → recording
    await act(async () => {
      await result.current.startRecording();
    });
    expect(result.current.state).toBe('recording');

    // recording → stopped
    act(() => {
      result.current.stopRecording();
    });
    expect(result.current.state).toBe('stopped');
    expect(result.current.audioBlob).not.toBeNull();

    // stopped → idle
    act(() => {
      result.current.reset();
    });
    expect(result.current.state).toBe('idle');
    expect(result.current.audioBlob).toBeNull();
  });

  it('returns audio blob on stop', async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] };
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    expect(result.current.audioBlob).toBeInstanceOf(Blob);
  });

  it('handles microphone permission denied', async () => {
    mockGetUserMedia.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));

    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBe('Přístup k mikrofonu byl zamítnut');
  });

  it('handles MediaRecorder not supported', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).MediaRecorder;

    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBe('Nahrávání není podporováno v tomto prohlížeči');
  });
});
