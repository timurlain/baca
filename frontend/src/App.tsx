import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import { auth } from '@/api/client'
import type { AuthResponse } from '@/types'
import { UserRole } from '@/types'
import Dashboard from '@/components/dashboard/Dashboard'
import VoicePage from '@/components/voice/VoicePage'
import VoiceFab from '@/components/voice/VoiceFab'
import UserManagement from '@/components/admin/UserManagement'
import CategoryManagement from '@/components/admin/CategoryManagement'
import GameRoleManagement from '@/components/admin/GameRoleManagement'
import Settings from '@/components/admin/Settings'
import OfflineIndicator from '@/offline/offlineIndicator'

function Placeholder({ name }: { name: string }) {
  return <div className="p-8 text-center text-gray-600">Stránka: {name} — Zatím neimplementováno</div>
}

function ResponsiveHome() {
  const isMobile = window.innerWidth < 768
  return isMobile
    ? <Placeholder name="Můj fokus" />
    : <Dashboard />
}

// Auth context — single auth.me() call shared across the app
const AuthContext = createContext<{ user: AuthResponse | null; loading: boolean }>({ user: null, loading: true })

export function useAuthContext() {
  return useContext(AuthContext)
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auth.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthContext()
  const location = useLocation()

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Načítání…</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

function AuthenticatedApp() {
  const { user } = useAuthContext()

  return (
    <>
      <OfflineIndicator />
      <Routes>
        <Route path="/login" element={<Placeholder name="Přihlášení" />} />
        <Route path="/" element={<AuthGuard><ResponsiveHome /></AuthGuard>} />
        <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
        <Route path="/board" element={<AuthGuard><Placeholder name="Kanban Board" /></AuthGuard>} />
        <Route path="/board/user" element={<AuthGuard><Placeholder name="Board — Per User" /></AuthGuard>} />
        <Route path="/voice" element={<AuthGuard><VoicePage /></AuthGuard>} />
        <Route path="/admin/users" element={<AuthGuard><UserManagement /></AuthGuard>} />
        <Route path="/admin/categories" element={<AuthGuard><CategoryManagement /></AuthGuard>} />
        <Route path="/admin/gameroles" element={<AuthGuard><GameRoleManagement /></AuthGuard>} />
        <Route path="/admin/settings" element={<AuthGuard><Settings /></AuthGuard>} />
        <Route path="/guide" element={<AuthGuard><Placeholder name="Příručka" /></AuthGuard>} />
        <Route path="/guide/board" element={<AuthGuard><Placeholder name="Příručka — Board" /></AuthGuard>} />
        <Route path="/guide/focus" element={<AuthGuard><Placeholder name="Příručka — Fokus" /></AuthGuard>} />
        <Route path="/guide/voice" element={<AuthGuard><Placeholder name="Příručka — Hlasový vstup" /></AuthGuard>} />
        <Route path="/guide/admin" element={<AuthGuard><Placeholder name="Příručka — Správa" /></AuthGuard>} />
        <Route path="/guide/offline" element={<AuthGuard><Placeholder name="Příručka — Offline" /></AuthGuard>} />
      </Routes>
      {user?.role !== UserRole.Guest && <VoiceFab />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </BrowserRouter>
  )
}
