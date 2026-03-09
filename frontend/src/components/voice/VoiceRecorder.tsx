interface VoiceRecorderProps {
  state: 'idle' | 'recording' | 'stopped';
  duration: number;
  error: string | null;
  isProcessing: boolean;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VoiceRecorder({
  state,
  duration,
  error,
  isProcessing,
  onStart,
  onStop,
  onCancel,
}: VoiceRecorderProps) {
  if (isProcessing) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-24 h-24 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
        <p className="text-sm text-gray-500">Zpracování...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <button
        onClick={state === 'recording' ? onStop : onStart}
        className={`w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center transition-all ${
          state === 'recording'
            ? 'bg-red-500 shadow-[0_0_0_8px_rgba(239,68,68,0.3)] animate-pulse'
            : 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl'
        }`}
        aria-label={state === 'recording' ? 'Zastavit nahrávání' : 'Začít nahrávat'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="white"
          className="w-12 h-12 md:w-16 md:h-16"
        >
          {state === 'recording' ? (
            <rect x="6" y="6" width="12" height="12" rx="2" />
          ) : (
            <path d="M12 1a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4zm0 19a7 7 0 0 0 7-7h-2a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.93V22h2v-2.07z" />
          )}
        </svg>
      </button>

      {state === 'recording' && (
        <>
          <p className="text-lg font-mono text-red-600" role="timer">
            {formatDuration(duration)}
          </p>
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
          >
            Zrušit
          </button>
        </>
      )}

      {state === 'idle' && !error && (
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-400">Klepněte pro nahrání hlasového příkazu</p>
          <p className="text-xs text-gray-300 max-w-xs mx-auto">
            Např.: &quot;Koupit 50 metrů lana, přiřadit Honzovi, kategorie logistika, do pátku, vysoká priorita&quot;
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <p className="text-xs text-red-500 mt-1">Klepněte na tlačítko pro opakování</p>
        </div>
      )}
    </div>
  );
}
