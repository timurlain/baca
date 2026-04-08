import { useState, useRef, useEffect, useCallback } from 'react';
import { tasks as tasksApi, voice } from '@/api/client';
import { useQuickTaskDefaults } from '@/hooks/useQuickTaskDefaults';
import useVoiceRecorder from '@/hooks/useVoiceRecorder';

interface QuickTaskInputProps {
  onTaskCreated: () => void;
}

const CONFIRM_WORDS = new Set([
  'jo', 'ano', 'ok', 'okay', 'hotovo', 'yes', 'jasně', 'jasne', 'správně', 'spravne', 'tak',
]);

export function isConfirmWord(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized.length > 0 && CONFIRM_WORDS.has(normalized);
}

type VoicePhase = 'idle' | 'recording' | 'transcribing' | 'confirm';

export default function QuickTaskInput({ onTaskCreated }: QuickTaskInputProps) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const titleBeforeRecordingRef = useRef<string | null>(null);
  const wasInConfirmRef = useRef(false);
  const { defaults } = useQuickTaskDefaults();
  const recorder = useVoiceRecorder();

  // Use a ref for title so the processAudio closure always sees the latest value
  const titleRef = useRef(title);
  titleRef.current = title;

  const submitTask = useCallback(async (taskTitle: string) => {
    const trimmed = taskTitle.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    try {
      await tasksApi.create({
        title: trimmed,
        status: defaults.status,
        priority: defaults.priority,
        categoryId: defaults.categoryId,
        assigneeId: null,
      });
      setTitle('');
      setVoicePhase('idle');
      onTaskCreated();
      inputRef.current?.focus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg || 'Nepodařilo se vytvořit úkol');
    } finally {
      setSubmitting(false);
    }
  }, [defaults, onTaskCreated]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    await submitTask(titleRef.current);
  }, [submitting, submitTask]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleMicClick = useCallback(async () => {
    if (voicePhase === 'recording') {
      recorder.stopRecording();
      return;
    }
    if (voicePhase === 'transcribing' || submitting) return;

    // Remember whether we're in confirm phase and what text we had
    wasInConfirmRef.current = voicePhase === 'confirm';
    titleBeforeRecordingRef.current = titleRef.current;

    setError(null);
    recorder.reset();
    await recorder.startRecording();
    setVoicePhase('recording');
  }, [voicePhase, submitting, recorder]);

  // Process audio after recording stops — follows useVoiceFlow.ts pattern
  useEffect(() => {
    if (
      recorder.state === 'stopped' &&
      recorder.audioBlob &&
      voicePhase === 'recording' &&
      !processingRef.current
    ) {
      processingRef.current = true;
      setVoicePhase('transcribing');

      const processAudio = async () => {
        try {
          const { transcription } = await voice.transcribe(recorder.audioBlob!);
          const trimmed = transcription.trim();

          if (!trimmed) {
            setError('Nepodařilo se rozpoznat řeč');
            setVoicePhase(wasInConfirmRef.current ? 'confirm' : 'idle');
            recorder.reset();
            return;
          }

          // If we were in confirm phase and the transcription is a confirm word,
          // auto-submit with the previous title
          if (wasInConfirmRef.current && isConfirmWord(trimmed)) {
            const previousTitle = titleBeforeRecordingRef.current ?? '';
            recorder.reset();
            setVoicePhase('idle');
            await submitTask(previousTitle);
            return;
          }

          // Otherwise, set the transcribed text as the new title and enter confirm phase
          setTitle(trimmed);
          setVoicePhase('confirm');
          recorder.reset();
        } catch (err) {
          const msg = err instanceof Error ? err.message : '';
          setError(msg || 'Nepodařilo se přepsat nahrávku');
          setVoicePhase(wasInConfirmRef.current ? 'confirm' : 'idle');
          recorder.reset();
        } finally {
          processingRef.current = false;
        }
      };

      void processAudio();
    }
  }, [recorder.state, recorder.audioBlob, voicePhase, recorder, submitTask]);

  // Recorder error propagation
  useEffect(() => {
    if (recorder.error) {
      setError(recorder.error);
      setVoicePhase(wasInConfirmRef.current ? 'confirm' : 'idle');
    }
  }, [recorder.error]);

  return (
    <div className="mb-4">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (voicePhase === 'confirm') setVoicePhase('idle');
          }}
          onKeyDown={handleKeyDown}
          placeholder="Nový úkol — Enter pro přidání"
          disabled={submitting || voicePhase === 'transcribing'}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void handleMicClick()}
          disabled={submitting || voicePhase === 'transcribing'}
          aria-label={voicePhase === 'recording' ? 'Zastavit nahrávání' : voicePhase === 'transcribing' ? 'Přepisuji…' : 'Nahrát hlasem'}
          className={`flex items-center justify-center w-11 h-11 rounded-lg transition-colors ${
            voicePhase === 'recording'
              ? 'bg-red-600 text-white animate-pulse hover:bg-red-700'
              : voicePhase === 'transcribing'
                ? 'bg-gray-400 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {voicePhase === 'transcribing' ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || voicePhase === 'transcribing' || !title.trim()}
          aria-label="Přidat úkol"
          className="flex items-center justify-center w-11 h-11 rounded-lg bg-forest-800 text-white hover:bg-forest-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>
      {voicePhase === 'confirm' && (
        <p className="text-gray-500 text-xs mt-1">
          Klikni na mikrofon a řekni &quot;jo&quot; pro potvrzení, nebo zadej nový název
        </p>
      )}
      {error && (
        <p className="text-red-600 text-xs mt-1">{error}</p>
      )}
    </div>
  );
}
