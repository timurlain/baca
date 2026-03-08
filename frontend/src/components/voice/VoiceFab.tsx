import { useState } from 'react';
import { voice, tasks } from '@/api/client';
import type { VoiceParseResponse } from '@/types';
import useVoiceRecorder from '@/hooks/useVoiceRecorder';
import VoiceRecorder from './VoiceRecorder';
import VoiceTaskPreview from './VoiceTaskPreview';

type FabState = 'closed' | 'idle' | 'recording' | 'processing' | 'preview';

interface VoiceFabProps {
  isGuest?: boolean;
}

export default function VoiceFab({ isGuest = false }: VoiceFabProps) {
  const recorder = useVoiceRecorder();
  const [fabState, setFabState] = useState<FabState>('closed');
  const [parsed, setParsed] = useState<VoiceParseResponse | null>(null);

  if (isGuest) return null;

  const handleOpen = () => setFabState('idle');

  const handleClose = () => {
    recorder.reset();
    setParsed(null);
    setFabState('closed');
  };

  const handleStart = async () => {
    await recorder.startRecording();
    setFabState('recording');
  };

  const handleStop = () => {
    recorder.stopRecording();
  };

  const processAudio = async (blob: Blob) => {
    setFabState('processing');
    try {
      const { transcription } = await voice.transcribe(blob);
      const result = await voice.parse({ transcription });
      setParsed(result);
      setFabState('preview');
    } catch {
      setFabState('idle');
      recorder.reset();
    }
  };

  if (recorder.state === 'stopped' && recorder.audioBlob && fabState === 'recording') {
    processAudio(recorder.audioBlob);
  }

  const handleSaved = () => {
    // Trigger any global refetch by calling tasks.list (TanStack Query would invalidate here)
    void tasks.list();
    handleClose();
  };

  if (fabState === 'closed') {
    return (
      <button
        onClick={handleOpen}
        className="fixed right-4 bottom-20 md:bottom-8 w-14 h-14 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 flex items-center justify-center z-50"
        aria-label="Hlasový vstup"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M12 1a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4zm0 19a7 7 0 0 0 7-7h-2a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.93V22h2v-2.07z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-2xl md:rounded-2xl p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-900">Hlasový vstup</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Zavřít">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {fabState !== 'preview' && (
          <VoiceRecorder
            state={recorder.state === 'recording' ? 'recording' : 'idle'}
            duration={recorder.duration}
            error={recorder.error}
            isProcessing={fabState === 'processing'}
            onStart={handleStart}
            onStop={handleStop}
            onCancel={handleClose}
          />
        )}

        {fabState === 'preview' && parsed && (
          <VoiceTaskPreview
            parsed={parsed}
            onSave={handleSaved}
            onRetry={() => {
              recorder.reset();
              setParsed(null);
              setFabState('idle');
            }}
            onCancel={handleClose}
          />
        )}
      </div>
    </div>
  );
}
