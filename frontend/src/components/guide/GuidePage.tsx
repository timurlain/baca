import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/App';
import { UserRole } from '@/types';

const topics = [
  { to: '/guide', label: 'Vítejte', end: true },
  { to: '/guide/board', label: 'Nástěnka (Board)' },
  { to: '/guide/focus', label: 'Můj fokus' },
  { to: '/guide/voice', label: 'Hlasový vstup' },
  { to: '/guide/admin', label: 'Správa', adminOnly: true },
  { to: '/guide/offline', label: 'Offline režim' },
];

export default function GuidePage() {
  const { user } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();

  const visibleTopics = topics.filter(
    (t) => !('adminOnly' in t) || user?.role === UserRole.Admin
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
      {/* Mobile topic selector */}
      <div className="sm:hidden mb-6">
        <select
          value={location.pathname}
          onChange={(e) => navigate(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {visibleTopics.map((t) => (
            <option key={t.to} value={t.to}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <nav className="hidden sm:block w-48 shrink-0">
          <ul className="space-y-1 sticky top-20">
            {visibleTopics.map((t) => (
              <li key={t.to}>
                <NavLink
                  to={t.to}
                  end={'end' in t ? t.end : undefined}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-forest-100 text-forest-800'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  {t.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
