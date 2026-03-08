import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect, type ReactNode } from 'react'
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

function AuthGuard({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    auth.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Načítání…</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

function AuthenticatedApp() {
  const [user, setUser] = useState<AuthResponse | null>(null)

  useEffect(() => {
    auth.me().then(setUser).catch(() => {})
  }, [])

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
      <VoiceFab isGuest={user?.role === UserRole.Guest} />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthenticatedApp />
    </BrowserRouter>
  )
}
