import { useState } from 'react';
import useVoiceFlow from '@/hooks/useVoiceFlow';
import VoiceRecorder from './VoiceRecorder';
import VoiceTaskPreview from './VoiceTaskPreview';

export default function VoiceFab() {
  const flow = useVoiceFlow();
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => {
    flow.handleReset();
    setIsOpen(false);
  };

  const handleSaved = () => {
    handleClose();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white shadow hover:bg-green-700"
        aria-label="Hlasový vstup"
        title="Hlasový vstup"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
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

        {flow.flowState !== 'preview' && (
          <VoiceRecorder
            state={flow.recorderState}
            duration={flow.recorderDuration}
            error={flow.recorderError}
            isProcessing={flow.flowState === 'processing'}
            onStart={flow.handleStart}
            onStop={flow.handleStop}
            onCancel={handleClose}
          />
        )}

        {flow.flowState === 'preview' && flow.parsed && (
          <VoiceTaskPreview
            parsed={flow.parsed}
            onSave={handleSaved}
            onRetry={flow.handleRetry}
            onCancel={handleClose}
          />
        )}
      </div>
    </div>
  );
}
