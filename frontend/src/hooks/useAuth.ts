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

  const login = async (email: string) => {
    return auth.requestLink({ email });
  };

  const guestLogin = async (pin: string) => {
    await auth.guestLogin({ pin });
    const res = await auth.me();
    setUser(res);
    return res;
  };

  const logout = async () => {
    await auth.logout();
    setUser(null);
  };

  return { user, loading, login, guestLogin, logout };
}
