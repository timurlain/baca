import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import LoginPage from '@/components/auth/LoginPage';
import KanbanBoard from '@/components/board/KanbanBoard';
import UserBoardPage from '@/components/board/UserBoardPage';
import FocusPage from '@/components/focus/FocusPage';

function Placeholder({ name }: { name: string }) {
  return <div className="p-8 text-center text-gray-600">Stránka: {name} — Zatím neimplementováno</div>;
}

function ResponsiveHome() {
  const isMobile = window.innerWidth < 768;
  return isMobile
    ? <FocusPage />
    : <Placeholder name="Dashboard" />;
}

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-forest-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-500 font-medium">Načítání…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={<AuthGuard><ResponsiveHome /></AuthGuard>} />
        <Route path="/dashboard" element={<AuthGuard><Placeholder name="Dashboard" /></AuthGuard>} />
        <Route path="/board" element={<AuthGuard><KanbanBoard /></AuthGuard>} />
        <Route path="/board/user" element={<AuthGuard><UserBoardPage /></AuthGuard>} />
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
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
