import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_APP_NAME } from '@/utils/constants';

export default function LoginPage() {
  const { login, guestLogin } = useAuth();
  const [activeTab, setActiveTab] = useState<'organizer' | 'guest'>('organizer');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleOrganizerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setMessage(null);
    try {
      await login(email);
      setMessage({ type: 'success', text: 'Odkaz k přihlášení byl odeslán na váš email.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Nepodařilo se odeslat email. Zkontrolujte adresu.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;

    setLoading(true);
    setMessage(null);
    try {
      await guestLogin(pin);
      // useAuth hook handles the state, parent AuthGuard will redirect
    } catch (err) {
      setMessage({ type: 'error', text: 'Nesprávný PIN.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-forest-800 p-8 text-center text-white">
          <div className="bg-white text-forest-800 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-4">
            B
          </div>
          <h1 className="text-2xl font-bold">{DEFAULT_APP_NAME}</h1>
          <p className="text-green-100 mt-2 text-sm">Organizace Ovčiny 2026</p>
        </div>

        <div className="flex border-b">
          <button
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'organizer' ? 'text-forest-700 border-b-2 border-forest-700' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('organizer')}
          >
            Organizátor
          </button>
          <button
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'guest' ? 'text-forest-700 border-b-2 border-forest-700' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('guest')}
          >
            Host
          </button>
        </div>

        <div className="p-8">
          {message && (
            <div className={`mb-6 p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.text}
            </div>
          )}

          {activeTab === 'organizer' ? (
            <form onSubmit={handleOrganizerLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  id="email"
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all"
                  placeholder="vasi@email.cz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-forest-800 text-white py-3 rounded-lg font-medium hover:bg-forest-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Odesílám...' : 'Poslat odkaz'}
              </button>
              <p className="text-center text-xs text-gray-400 mt-4">
                Na váš e-mail přijde jednorázový odkaz pro přihlášení.
              </p>
            </form>
          ) : (
            <form onSubmit={handleGuestLogin} className="space-y-4">
              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">PIN hosta</label>
                <input
                  id="pin"
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-forest-800 text-white py-3 rounded-lg font-medium hover:bg-forest-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Vstupuji...' : 'Vstoupit'}
              </button>
              <p className="text-center text-xs text-gray-400 mt-4">
                Read-only přístup pro hosty a rodiče.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
