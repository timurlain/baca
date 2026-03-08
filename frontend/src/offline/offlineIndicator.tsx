import useOnlineStatus from '@/hooks/useOnlineStatus';

export default function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount } = useOnlineStatus();

  if (isOnline && !isSyncing && pendingCount === 0) return null;

  if (!isOnline) {
    return (
      <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-center text-sm text-amber-800 sticky top-0 z-40">
        Offline režim — změny se synchronizují po připojení
        {pendingCount > 0 && (
          <span className="ml-2 bg-amber-600 text-white text-xs rounded-full px-2 py-0.5">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-center text-sm text-blue-700 sticky top-0 z-40">
        <span className="inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
        Synchronizace změn...
      </div>
    );
  }

  return null;
}
