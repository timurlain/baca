import { useState, useEffect } from 'react';
import { auth } from '@/api/client';
import type { AuthResponse } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auth.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = () => {
    auth.login();
  };

  const logout = async () => {
    await auth.logout();
    setUser(null);
    window.location.href = '/login';
  };

  return { user, loading, login, logout };
}
