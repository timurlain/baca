import { useState, useEffect } from 'react';
import { settings } from '@/api/client';
import StatusMessage, { type Message } from './StatusMessage';

export default function Settings() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [guestPin, setGuestPin] = useState('');
  const [appName, setAppName] = useState('');

  useEffect(() => {
    settings
      .get()
      .then((s) => {
        setGuestPin(s.guestPin);
        setAppName(s.appName);
        setLoaded(true);
      })
      .catch(() => setMessage({ text: 'Chyba načítání nastavení', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await settings.update({ guestPin, appName });
      setMessage({ text: 'Nastavení uloženo', type: 'success' });
    } catch {
      setMessage({ text: 'Chyba při ukládání', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Načítání nastavení...</div>;
  }

  if (!loaded) {
    return <div className="p-8 text-center text-red-500">{message?.text ?? 'Chyba'}</div>;
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Nastavení</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        <div>
          <label htmlFor="appName" className="block text-sm font-medium text-gray-700 mb-1">
            Název aplikace
          </label>
          <input
            id="appName"
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="guestPin" className="block text-sm font-medium text-gray-700 mb-1">
            Guest PIN
          </label>
          <input
            id="guestPin"
            type="text"
            value={guestPin}
            onChange={(e) => setGuestPin(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Ukládání...' : 'Uložit'}
        </button>

        <StatusMessage message={message} />
      </div>
    </div>
  );
}
