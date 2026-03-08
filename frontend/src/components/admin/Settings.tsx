import { useState, useEffect } from 'react';
import { settings } from '@/api/client';
import type { AppSettings } from '@/types';

export default function Settings() {
  const [data, setData] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [guestPin, setGuestPin] = useState('');
  const [appName, setAppName] = useState('');

  useEffect(() => {
    settings
      .get()
      .then((s) => {
        setData(s);
        setGuestPin(s.guestPin);
        setAppName(s.appName);
      })
      .catch(() => setMessage('Chyba načítání nastavení'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await settings.update({ guestPin, appName });
      setData(updated);
      setMessage('Nastavení uloženo');
    } catch {
      setMessage('Chyba při ukládání');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Načítání nastavení...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-red-500">{message ?? 'Chyba'}</div>;
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

        {message && (
          <p className={`text-sm text-center ${message.includes('Chyba') ? 'text-red-500' : 'text-green-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
