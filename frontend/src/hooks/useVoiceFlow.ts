import { useState, useEffect, useCallback, useRef } from 'react';
import { voice } from '@/api/client';
import type { VoiceParseResponse } from '@/types';
import useVoiceRecorder from './useVoiceRecorder';

export type VoiceFlowState = 'idle' | 'recording' | 'processing' | 'preview';

interface UseVoiceFlowResult {
  flowState: VoiceFlowState;
  parsed: VoiceParseResponse | null;
  recorderState: 'idle' | 'recording' | 'stopped';
  recorderDuration: number;
  recorderError: string | null;
  processingError: string | null;
  handleStart: () => Promise<void>;
  handleStop: () => void;
  handleRetry: () => void;
  handleReset: () => void;
}

export default function useVoiceFlow(): UseVoiceFlowResult {
  const recorder = useVoiceRecorder();
  const [flowState, setFlowState] = useState<VoiceFlowState>('idle');
  const [parsed, setParsed] = useState<VoiceParseResponse | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const processingRef = useRef(false);

  const handleStart = useCallback(async () => {
    setProcessingError(null);
    await recorder.startRecording();
    setFlowState('recording');
  }, [recorder]);

  const handleStop = useCallback(() => {
    recorder.stopRecording();
  }, [recorder]);

  const handleReset = useCallback(() => {
    recorder.reset();
    setParsed(null);
    setFlowState('idle');
    setProcessingError(null);
    processingRef.current = false;
  }, [recorder]);

  const handleRetry = useCallback(() => {
    handleReset();
  }, [handleReset]);

  // Process audio in useEffect — not during render
  useEffect(() => {
    if (
      recorder.state === 'stopped' &&
      recorder.audioBlob &&
      flowState === 'recording' &&
      !processingRef.current
    ) {
      processingRef.current = true;
      setFlowState('processing');
      setProcessingError(null);

      const processAudio = async () => {
        try {
          const { transcription } = await voice.transcribe(recorder.audioBlob!);
          const result = await voice.parse({ transcription });
          setParsed(result);
          setFlowState('preview');
        } catch {
          setProcessingError('Nepodařilo se zpracovat nahrávku');
          setFlowState('idle');
          recorder.reset();
        } finally {
          processingRef.current = false;
        }
      };

      void processAudio();
    }
  }, [recorder.state, recorder.audioBlob, flowState, recorder]);

  return {
    flowState,
    parsed,
    recorderState: recorder.state === 'recording' ? 'recording' : 'idle',
    recorderDuration: recorder.duration,
    recorderError: recorder.error,
    processingError,
    handleStart,
    handleStop,
    handleRetry,
    handleReset,
  };
}
