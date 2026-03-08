import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect, type ReactNode } from 'react'
import { auth } from '@/api/client'
import type { AuthResponse } from '@/types'

function Placeholder({ name }: { name: string }) {
  return <div className="p-8 text-center text-gray-600">Stránka: {name} — Zatím neimplementováno</div>
}

function ResponsiveHome() {
  const isMobile = window.innerWidth < 768
  return isMobile
    ? <Placeholder name="Můj fokus" />
    : <Placeholder name="Dashboard" />
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Placeholder name="Přihlášení" />} />
        <Route path="/" element={<AuthGuard><ResponsiveHome /></AuthGuard>} />
        <Route path="/dashboard" element={<AuthGuard><Placeholder name="Dashboard" /></AuthGuard>} />
        <Route path="/board" element={<AuthGuard><Placeholder name="Kanban Board" /></AuthGuard>} />
        <Route path="/board/user" element={<AuthGuard><Placeholder name="Board — Per User" /></AuthGuard>} />
        <Route path="/voice" element={<AuthGuard><Placeholder name="Hlasový vstup" /></AuthGuard>} />
        <Route path="/admin/users" element={<AuthGuard><Placeholder name="Správa uživatelů" /></AuthGuard>} />
        <Route path="/admin/categories" element={<AuthGuard><Placeholder name="Správa kategorií" /></AuthGuard>} />
        <Route path="/admin/gameroles" element={<AuthGuard><Placeholder name="Správa herních rolí" /></AuthGuard>} />
        <Route path="/admin/settings" element={<AuthGuard><Placeholder name="Nastavení" /></AuthGuard>} />
        <Route path="/guide" element={<AuthGuard><Placeholder name="Příručka" /></AuthGuard>} />
        <Route path="/guide/board" element={<AuthGuard><Placeholder name="Příručka — Board" /></AuthGuard>} />
        <Route path="/guide/focus" element={<AuthGuard><Placeholder name="Příručka — Fokus" /></AuthGuard>} />
        <Route path="/guide/voice" element={<AuthGuard><Placeholder name="Příručka — Hlasový vstup" /></AuthGuard>} />
        <Route path="/guide/admin" element={<AuthGuard><Placeholder name="Příručka — Správa" /></AuthGuard>} />
        <Route path="/guide/offline" element={<AuthGuard><Placeholder name="Příručka — Offline" /></AuthGuard>} />
      </Routes>
    </BrowserRouter>
  )
}
