import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useFocus } from '@/hooks/useFocus';
import Avatar from '../shared/Avatar';
import Badge from '../shared/Badge';
import { DEFAULT_APP_NAME } from '@/utils/constants';
import { UserRole } from '@/types';

export default function Header() {
  const { user } = useAuth();
  const { tasks } = useFocus();

  return (
    <header className="bg-forest-800 text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and Main Nav */}
        <div className="flex items-center space-x-8">
          <Link to="/" className="text-xl font-bold flex items-center space-x-2">
            <span className="bg-white text-forest-800 w-8 h-8 rounded flex items-center justify-center">B</span>
            <span className="hidden sm:inline">{DEFAULT_APP_NAME}</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-4">
            <NavLink to="/dashboard" className={({ isActive }) => `text-sm font-medium hover:text-green-200 transition-colors ${isActive ? 'text-white border-b-2 border-white' : 'text-green-100'}`}>
              Dashboard
            </NavLink>
            <NavLink to="/board" className={({ isActive }) => `text-sm font-medium hover:text-green-200 transition-colors ${isActive ? 'text-white border-b-2 border-white' : 'text-green-100'}`}>
              Board
            </NavLink>
            <NavLink to="/board/user" className={({ isActive }) => `text-sm font-medium hover:text-green-200 transition-colors ${isActive ? 'text-white border-b-2 border-white' : 'text-green-100'}`}>
              Uživatelé
            </NavLink>
            <NavLink to="/voice" className={({ isActive }) => `text-sm font-medium hover:text-green-200 transition-colors ${isActive ? 'text-white border-b-2 border-white' : 'text-green-100'}`}>
              Hlas
            </NavLink>
            {user?.role === UserRole.Admin && (
              <NavLink to="/admin/users" className={({ isActive }) => `text-sm font-medium hover:text-green-200 transition-colors ${isActive ? 'text-white border-b-2 border-white' : 'text-green-100'}`}>
                Admin
              </NavLink>
            )}
          </nav>
        </div>

        {/* User and Actions */}
        <div className="flex items-center space-x-4">
          <Link to="/guide" className="p-2 hover:bg-forest-700 rounded-full transition-colors" title="Nápověda">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Link>
          
          <div className="hidden md:flex items-center space-x-3 border-l border-forest-600 pl-4">
            <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity relative">
              <span className="text-sm font-medium">Můj fokus</span>
              {tasks.length > 0 && (
                <Badge color="bg-red-500 text-white" className="absolute -top-1 -right-3 px-1.5 py-0.5 min-w-[1.25rem] justify-center">
                  {tasks.length}
                </Badge>
              )}
            </Link>
            <Avatar name={user?.name} color={user?.avatarColor} size="sm" />
          </div>

          {/* Mobile Avatar */}
          <div className="md:hidden">
            <Avatar name={user?.name} color={user?.avatarColor} size="sm" />
          </div>
        </div>
      </div>
    </header>
  );
}
