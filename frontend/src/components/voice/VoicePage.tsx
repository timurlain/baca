import useVoiceFlow from '@/hooks/useVoiceFlow';
import VoiceRecorder from './VoiceRecorder';
import VoiceTaskPreview from './VoiceTaskPreview';

export default function VoicePage() {
  const flow = useVoiceFlow();

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Hlasový vstup</h1>

      {flow.flowState !== 'preview' && (
        <VoiceRecorder
          state={flow.recorderState}
          duration={flow.recorderDuration}
          error={flow.recorderError ?? flow.processingError}
          isProcessing={flow.flowState === 'processing'}
          onStart={flow.handleStart}
          onStop={flow.handleStop}
          onCancel={flow.handleReset}
        />
      )}

      {flow.flowState === 'preview' && flow.parsed && (
        <VoiceTaskPreview
          parsed={flow.parsed}
          onSave={flow.handleReset}
          onRetry={flow.handleRetry}
          onCancel={flow.handleReset}
        />
      )}
    </div>
  );
}
