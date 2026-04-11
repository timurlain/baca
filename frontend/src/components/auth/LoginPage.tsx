import { DEFAULT_APP_NAME } from '@/utils/constants';
import { useAuthContext } from '@/context/AuthContext';

export default function LoginPage() {
  const { authError } = useAuthContext();

  const handleLogin = () => {
    const current = window.location.pathname;
    const returnUrl = current === '/login' ? '/' : current + window.location.search;
    window.location.href = `/api/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  };

  const handleClearAndLogin = () => {
    // Clear auth cookies and redirect to fresh login
    document.cookie = '.AspNetCore.Cookies=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    handleLogin();
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

        <div className="p-8 text-center">
          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 text-sm text-left">
              <p className="font-bold mb-1">Problém s přihlášením</p>
              <p>{authError}</p>
              <button
                onClick={handleClearAndLogin}
                className="mt-3 text-xs font-bold uppercase tracking-widest text-red-800 hover:underline"
              >
                Zkusit znovu (vyčistit cookies)
              </button>
            </div>
          )}
          <p className="text-gray-600 mb-6">Přihlaste se přes registrace.ovcina.cz</p>
          <button
            onClick={handleLogin}
            className="w-full bg-forest-800 text-white py-3 rounded-lg font-medium hover:bg-forest-700 transition-colors"
          >
            Přihlásit se
          </button>
        </div>
      </div>
    </div>
  );
}
