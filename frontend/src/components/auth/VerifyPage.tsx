import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '@/api/client';

export default function VerifyPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(true);
      return;
    }

    auth.verifyToken(token)
      .then(() => {
        window.location.href = '/';
      })
      .catch(() => {
        setError(true);
      });
  }, [token, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <p className="text-red-600 font-medium">Odkaz je neplatný nebo vypršel.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-forest-600 text-white rounded-lg"
          >
            Zpět na přihlášení
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-forest-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-gray-500 font-medium">Ověřování…</span>
      </div>
    </div>
  );
}
