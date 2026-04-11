import { createContext, useContext } from 'react';
import type { AuthResponse } from '@/types';

export const AuthContext = createContext<{ user: AuthResponse | null; loading: boolean; authError?: string | null }>({ user: null, loading: true });

export function useAuthContext() {
  return useContext(AuthContext);
}
