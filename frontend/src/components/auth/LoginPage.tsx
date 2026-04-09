import { DEFAULT_APP_NAME } from '@/utils/constants';

export default function LoginPage() {
  const handleLogin = () => {
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/api/auth/login?returnUrl=${returnUrl}`;
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
