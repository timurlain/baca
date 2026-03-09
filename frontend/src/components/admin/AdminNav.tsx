import { NavLink } from 'react-router-dom';

const adminLinks = [
  { to: '/admin/users', label: 'Uživatelé' },
  { to: '/admin/categories', label: 'Kategorie' },
  { to: '/admin/gameroles', label: 'Herní role' },
  { to: '/admin/settings', label: 'Nastavení' },
];

export default function AdminNav() {
  return (
    <nav className="flex gap-1 mb-6 border-b border-gray-200 pb-0">
      {adminLinks.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
