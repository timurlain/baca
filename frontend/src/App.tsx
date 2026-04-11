import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, type ReactNode } from 'react';
import { auth } from '@/api/client';
import type { AuthResponse } from '@/types';
import { UserRole } from '@/types';
import { AuthContext, useAuthContext } from '@/context/AuthContext';

// Layout (Agent C)
import Layout from '@/components/layout/Layout';

// Auth (Agent C)
import LoginPage from '@/components/auth/LoginPage';

// Board + Focus (Agent C)
import KanbanBoard from '@/components/board/KanbanBoard';
import UserBoardPage from '@/components/board/UserBoardPage';
import FocusPage from '@/components/focus/FocusPage';

// Dashboard (Agent D)
import Dashboard from '@/components/dashboard/Dashboard';

// Voice (Agent D)
import VoicePage from '@/components/voice/VoicePage';
import VoiceFab from '@/components/voice/VoiceFab';

// Admin (Agent D)
import UserManagement from '@/components/admin/UserManagement';
import CategoryManagement from '@/components/admin/CategoryManagement';
import TagManagement from '@/components/admin/TagManagement';
import GameRoleManagement from '@/components/admin/GameRoleManagement';
import Settings from '@/components/admin/Settings';
import TrashManagement from '@/components/admin/TrashManagement';

// Task creation & list
import CreateTaskPage from '@/components/tasks/CreateTaskPage';
import TaskListPage from '@/components/tasks/TaskListPage';

// Guide (Phase 2b)
import GuidePage from '@/components/guide/GuidePage';
import GuideWelcome from '@/components/guide/GuideWelcome';
import GuideBoard from '@/components/guide/GuideBoard';
import GuideFocus from '@/components/guide/GuideFocus';
import GuideVoice from '@/components/guide/GuideVoice';
import GuideAdmin from '@/components/guide/GuideAdmin';
import GuideOffline from '@/components/guide/GuideOffline';

// Offline (Agent D)
import OfflineIndicator from '@/offline/offlineIndicator';

function ResponsiveHome() {
  const isMobile = window.innerWidth < 768;
  return isMobile
    ? <FocusPage />
    : <Dashboard />;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    auth.me()
      .then(setUser)
      .catch((err) => {
        setUser(null);
        if (err?.status === 403) {
          setAuthError(err.message || 'Přístup odepřen. Zkuste se odhlásit a přihlásit znovu.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, authError }}>
      {children}
    </AuthContext.Provider>
  );
}

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthContext();
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

function AuthenticatedApp() {
  const { user } = useAuthContext();

  return (
    <>
      <OfflineIndicator />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Home — mobile: Focus, desktop: Dashboard */}
        <Route path="/" element={<AuthGuard><ResponsiveHome /></AuthGuard>} />
        <Route path="/focus" element={<AuthGuard><FocusPage /></AuthGuard>} />
        <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />

        {/* Board (Agent C) */}
        <Route path="/board" element={<AuthGuard><KanbanBoard /></AuthGuard>} />
        <Route path="/board/user" element={<AuthGuard><UserBoardPage /></AuthGuard>} />

        {/* Tasks */}
        <Route path="/tasks" element={<AuthGuard><TaskListPage /></AuthGuard>} />
        <Route path="/tasks/new" element={<AuthGuard><CreateTaskPage /></AuthGuard>} />

        {/* Voice (Agent D) */}
        <Route path="/voice" element={<AuthGuard><VoicePage /></AuthGuard>} />

        {/* Admin (Agent D) */}
        <Route path="/admin/users" element={<AuthGuard><UserManagement /></AuthGuard>} />
        <Route path="/admin/categories" element={<AuthGuard><CategoryManagement /></AuthGuard>} />
        <Route path="/admin/tags" element={<AuthGuard><TagManagement /></AuthGuard>} />
        <Route path="/admin/gameroles" element={<AuthGuard><GameRoleManagement /></AuthGuard>} />
        <Route path="/admin/settings" element={<AuthGuard><Settings /></AuthGuard>} />
        <Route path="/admin/trash" element={<AuthGuard><TrashManagement /></AuthGuard>} />

        {/* Guide (Phase 2b) */}
        <Route path="/guide" element={<AuthGuard><GuidePage /></AuthGuard>}>
          <Route index element={<GuideWelcome />} />
          <Route path="board" element={<GuideBoard />} />
          <Route path="focus" element={<GuideFocus />} />
          <Route path="voice" element={<GuideVoice />} />
          <Route path="admin" element={<GuideAdmin />} />
          <Route path="offline" element={<GuideOffline />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {user?.role !== UserRole.Guest && <VoiceFab />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </BrowserRouter>
  );
}
