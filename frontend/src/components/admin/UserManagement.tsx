import { useState, useEffect } from 'react';
import { users, auth } from '@/api/client';
import { UserRole } from '@/types';
import type { User, CreateUserRequest, AuthResponse } from '@/types';

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-red-100 text-red-700',
  User: 'bg-blue-100 text-blue-700',
  Guest: 'bg-gray-100 text-gray-700',
};

const ROLE_LABELS: Record<string, string> = {
  Admin: 'Admin',
  User: 'Uživatel',
  Guest: 'Host',
};

interface AddUserFormProps {
  onSubmit: (data: CreateUserRequest) => void;
  onCancel: () => void;
}

function AddUserForm({ onSubmit, onCancel }: AddUserFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.User);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      email,
      phone: phone || null,
      role,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
      <h3 className="font-medium text-gray-900">Přidat uživatele</h3>
      <div>
        <label htmlFor="userName" className="block text-sm text-gray-600 mb-1">Jméno</label>
        <input id="userName" type="text" required value={name} onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label htmlFor="userEmail" className="block text-sm text-gray-600 mb-1">Email</label>
        <input id="userEmail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label htmlFor="userPhone" className="block text-sm text-gray-600 mb-1">Telefon</label>
        <div className="flex">
          <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 text-gray-500 text-sm">+420</span>
          <input id="userPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            pattern="[0-9]{9}" placeholder="123456789"
            className="flex-1 border border-gray-300 rounded-r-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div>
        <label htmlFor="userRole" className="block text-sm text-gray-600 mb-1">Role</label>
        <select id="userRole" value={role} onChange={(e) => setRole(e.target.value as UserRole)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value={UserRole.Admin}>Admin</option>
          <option value={UserRole.User}>Uživatel</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700">
          Přidat
        </button>
        <button type="button" onClick={onCancel} className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          Zrušit
        </button>
      </div>
    </form>
  );
}

export default function UserManagement() {
  const [userList, setUserList] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([users.list(), auth.me()])
      .then(([u, me]) => {
        setUserList(u);
        setCurrentUser(me);
      })
      .catch(() => setMessage('Chyba načítání'))
      .finally(() => setLoading(false));
  }, []);

  const handleAddUser = async (data: CreateUserRequest) => {
    try {
      const newUser = await users.create(data);
      setUserList((prev) => [...prev, newUser]);
      setShowForm(false);
      setMessage('Uživatel přidán');
    } catch {
      setMessage('Chyba při přidávání uživatele');
    }
  };

  const handleToggleActive = async (user: User) => {
    if (currentUser && user.id === currentUser.id) {
      setMessage('Nelze deaktivovat sám sebe');
      return;
    }
    try {
      const updated = await users.update(user.id, { isActive: !user.isActive });
      setUserList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch {
      setMessage('Chyba při změně stavu');
    }
  };

  const handleResendLink = async (userId: number) => {
    try {
      await users.resendLink(userId);
      setMessage('Odkaz odeslán');
    } catch {
      setMessage('Chyba při odesílání odkazu');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Načítání uživatelů...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Správa uživatelů</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            Přidat uživatele
          </button>
        )}
      </div>

      {message && (
        <p className={`text-sm ${message.includes('Chyba') || message.includes('Nelze') ? 'text-red-500' : 'text-green-600'}`}>
          {message}
        </p>
      )}

      {showForm && <AddUserForm onSubmit={handleAddUser} onCancel={() => setShowForm(false)} />}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Jméno</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Telefon</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Stav</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Akce</th>
              </tr>
            </thead>
            <tbody>
              {userList.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: user.avatarColor }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                      {user.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{user.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{user.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] ?? ''}`}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${user.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                      {user.isActive ? 'Aktivní' : 'Neaktivní'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleResendLink(user.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1"
                        title="Znovu odeslat odkaz"
                      >
                        Odeslat odkaz
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`text-xs px-2 py-1 ${currentUser !== null && user.id === currentUser.id ? 'opacity-30 cursor-not-allowed text-gray-400' : 'text-gray-500 hover:text-gray-700'}`}
                        title={user.isActive ? 'Deaktivovat' : 'Aktivovat'}
                      >
                        {user.isActive ? 'Deaktivovat' : 'Aktivovat'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
