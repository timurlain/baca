import { useState } from 'react';
import { voice } from '@/api/client';
import type { VoiceParseResponse } from '@/types';
import useVoiceRecorder from '@/hooks/useVoiceRecorder';
import VoiceRecorder from './VoiceRecorder';
import VoiceTaskPreview from './VoiceTaskPreview';

type PageState = 'idle' | 'recording' | 'processing' | 'preview';

export default function VoicePage() {
  const recorder = useVoiceRecorder();
  const [pageState, setPageState] = useState<PageState>('idle');
  const [parsed, setParsed] = useState<VoiceParseResponse | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const handleStart = async () => {
    setProcessingError(null);
    await recorder.startRecording();
    setPageState('recording');
  };

  const handleStop = () => {
    recorder.stopRecording();
  };

  const handleCancel = () => {
    recorder.reset();
    setParsed(null);
    setPageState('idle');
    setProcessingError(null);
  };

  // Process audio after recording stops
  const processAudio = async (blob: Blob) => {
    setPageState('processing');
    setProcessingError(null);
    try {
      const { transcription } = await voice.transcribe(blob);
      const result = await voice.parse({ transcription });
      setParsed(result);
      setPageState('preview');
    } catch {
      setProcessingError('Nepodařilo se zpracovat nahrávku');
      setPageState('idle');
      recorder.reset();
    }
  };

  // When recorder moves to stopped state and we have a blob, process it
  if (recorder.state === 'stopped' && recorder.audioBlob && pageState === 'recording') {
    processAudio(recorder.audioBlob);
  }

  const handleSaved = () => {
    recorder.reset();
    setParsed(null);
    setPageState('idle');
  };

  const handleRetry = () => {
    recorder.reset();
    setParsed(null);
    setPageState('idle');
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Hlasový vstup</h1>

      {pageState !== 'preview' && (
        <VoiceRecorder
          state={recorder.state === 'recording' ? 'recording' : 'idle'}
          duration={recorder.duration}
          error={recorder.error ?? processingError}
          isProcessing={pageState === 'processing'}
          onStart={handleStart}
          onStop={handleStop}
          onCancel={handleCancel}
        />
      )}

      {pageState === 'preview' && parsed && (
        <VoiceTaskPreview
          parsed={parsed}
          onSave={handleSaved}
          onRetry={handleRetry}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
