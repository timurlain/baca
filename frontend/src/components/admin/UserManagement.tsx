import { useState, useEffect } from 'react';
import { users, auth } from '@/api/client';
import { UserRole } from '@/types';
import type { User, CreateUserRequest, UpdateUserRequest, AuthResponse } from '@/types';
import { ROLE_LABELS, ROLE_BADGE_CLASSES } from '@/utils/constants';
import { getGravatarUrl } from '@/utils/helpers';
import StatusMessage, { type Message } from './StatusMessage';
import AdminNav from './AdminNav';
import Avatar from '../shared/Avatar';

interface UserFormProps {
  onSubmit: (data: CreateUserRequest) => void;
  onCancel: () => void;
}

function AddUserForm({ onSubmit, onCancel }: UserFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.User);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      email,
      phone: phone ? `+420${phone}` : null,
      role,
      shortcut: shortcut || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
      <h3 className="font-medium text-gray-900">Přidat uživatele</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor="userName" className="block text-sm text-gray-600 mb-1">Jméno</label>
          <input id="userName" type="text" required value={name} onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label htmlFor="userShortcut" className="block text-sm text-gray-600 mb-1">Zkratka (max 2 znaky)</label>
          <input id="userShortcut" type="text" value={shortcut} onChange={(e) => setShortcut(e.target.value.slice(0, 2))}
            maxLength={2} placeholder="JN"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
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

interface EditUserFormProps {
  user: User;
  onSave: (id: number, data: UpdateUserRequest) => void;
  onCancel: () => void;
  isSelf: boolean;
}

function EditUserForm({ user, onSave, onCancel, isSelf }: EditUserFormProps) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone?.replace('+420', '') ?? '');
  const [shortcut, setShortcut] = useState(user.shortcut ?? '');
  const [role, setRole] = useState<UserRole>(user.role);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(user.id, {
      name,
      phone: phone ? `+420${phone}` : '',
      role,
      shortcut: shortcut || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 rounded-lg border border-blue-200 p-4 space-y-3">
      <h3 className="font-medium text-gray-900">Upravit uživatele</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor="editName" className="block text-sm text-gray-600 mb-1">Jméno</label>
          <input id="editName" type="text" required value={name} onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label htmlFor="editShortcut" className="block text-sm text-gray-600 mb-1">Zkratka (max 2 znaky)</label>
          <input id="editShortcut" type="text" value={shortcut} onChange={(e) => setShortcut(e.target.value.slice(0, 2))}
            maxLength={2} placeholder="JN"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div>
        <label htmlFor="editPhone" className="block text-sm text-gray-600 mb-1">Telefon</label>
        <div className="flex">
          <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 text-gray-500 text-sm">+420</span>
          <input id="editPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            pattern="[0-9]{9}" placeholder="123456789"
            className="flex-1 border border-gray-300 rounded-r-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div>
        <label htmlFor="editRole" className="block text-sm text-gray-600 mb-1">Role</label>
        <select id="editRole" value={role} onChange={(e) => setRole(e.target.value as UserRole)}
          disabled={isSelf}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
          <option value={UserRole.Admin}>Admin</option>
          <option value={UserRole.User}>Uživatel</option>
        </select>
        {isSelf && <p className="text-xs text-gray-400 mt-1">Vlastní roli nelze změnit.</p>}
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700">
          Uložit
        </button>
        <button type="button" onClick={onCancel} className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          Zrušit
        </button>
      </div>
    </form>
  );
}

interface BulkAddFormProps {
  onSubmit: (entries: { name: string; email: string }[]) => void;
  onCancel: () => void;
}

function BulkAddForm({ onSubmit, onCancel }: BulkAddFormProps) {
  const [text, setText] = useState('');

  const parseEntries = (): { name: string; email: string }[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const entries: { name: string; email: string }[] = [];
    for (const line of lines) {
      // Match "Name <email@x.cz>" or "Name email@x.cz" or "email@x.cz"
      const angleMatch = line.match(/^(.+?)\s*<([^>]+)>\s*$/);
      if (angleMatch) {
        entries.push({ name: angleMatch[1].trim(), email: angleMatch[2].trim() });
        continue;
      }
      const emailOnly = line.match(/^([^\s,;]+@[^\s,;]+)$/);
      if (emailOnly) {
        const email = emailOnly[1];
        const namePart = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        entries.push({ name: namePart, email });
        continue;
      }
      const tabSplit = line.split(/[\t,;]/).map(s => s.trim()).filter(s => s.length > 0);
      if (tabSplit.length >= 2 && tabSplit[1].includes('@')) {
        entries.push({ name: tabSplit[0], email: tabSplit[1] });
        continue;
      }
      if (tabSplit.length >= 1 && tabSplit[0].includes('@')) {
        const email = tabSplit[0];
        const namePart = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        entries.push({ name: namePart, email });
      }
    }
    return entries;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entries = parseEntries();
    if (entries.length === 0) return;
    onSubmit(entries);
  };

  const preview = parseEntries();

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
      <h3 className="font-medium text-gray-900">Hromadné přidání z registrace</h3>
      <p className="text-xs text-gray-500">
        Zkopíruj seznam z <a href="https://registrace.ovcina.cz/admin/uzivatele" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">registrace.ovcina.cz/admin/uzivatele</a>.
        Akceptované formáty (jeden na řádek):
      </p>
      <ul className="text-xs text-gray-500 list-disc pl-5 space-y-0.5">
        <li><code>Jan Novák &lt;jan@example.cz&gt;</code></li>
        <li><code>Jan Novák, jan@example.cz</code></li>
        <li><code>Jan Novák	jan@example.cz</code> (tab)</li>
        <li><code>jan@example.cz</code> (jméno se odvodí)</li>
      </ul>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder="Jan Novák &lt;jan@example.cz&gt;&#10;Marie Svobodová &lt;marie@example.cz&gt;&#10;..."
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {preview.length > 0 && (
        <div className="text-xs text-gray-600">
          Načteno <strong>{preview.length}</strong> uživatelů. Po přidání se automaticky propojí s OIDC při prvním přihlášení.
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={preview.length === 0} className="flex-1 bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          Přidat {preview.length > 0 ? `(${preview.length})` : ''}
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
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [gravatarUrls, setGravatarUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    Promise.all([users.list(), auth.me()])
      .then(([u, me]) => {
        setUserList(u);
        setCurrentUser(me);
        // Compute Gravatar URLs asynchronously
        Promise.all(u.map(async (user) => {
          const url = await getGravatarUrl(user.email);
          return [user.id, url] as const;
        })).then((entries) => {
          const urls: Record<number, string> = {};
          for (const [id, url] of entries) {
            if (url) urls[id] = url;
          }
          setGravatarUrls(urls);
        });
      })
      .catch(() => setMessage({ text: 'Chyba načítání', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const handleAddUser = async (data: CreateUserRequest) => {
    try {
      const newUser = await users.create(data);
      setUserList((prev) => [...prev, newUser]);
      setShowForm(false);
      setMessage({ text: 'Uživatel přidán', type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Chyba při přidávání uživatele';
      setMessage({ text: msg, type: 'error' });
    }
  };

  const handleBulkAdd = async (entries: { name: string; email: string }[]) => {
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const entry of entries) {
      try {
        const newUser = await users.create({
          name: entry.name,
          email: entry.email,
          phone: null,
          role: UserRole.User,
        });
        setUserList((prev) => [...prev, newUser]);
        added++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        if (msg.includes('duplicate') || msg.includes('Email already')) {
          skipped++;
        } else {
          errors.push(`${entry.email}: ${msg}`);
        }
      }
    }
    setShowBulkForm(false);
    if (errors.length > 0) {
      setMessage({ text: `Přidáno ${added}, přeskočeno ${skipped}, chyby: ${errors.join('; ')}`, type: 'error' });
    } else {
      setMessage({ text: `Přidáno ${added} uživatelů, přeskočeno ${skipped} (již existovali)`, type: 'success' });
    }
  };

  const handleEditUser = async (id: number, data: UpdateUserRequest) => {
    try {
      const updated = await users.update(id, data);
      setUserList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingUser(null);
      setMessage({ text: 'Uživatel upraven', type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Chyba při úpravě uživatele';
      setMessage({ text: msg, type: 'error' });
    }
  };

  const handleToggleActive = async (user: User) => {
    if (currentUser && String(user.id) === currentUser.id) {
      setMessage({ text: 'Nelze deaktivovat sám sebe', type: 'error' });
      return;
    }
    try {
      const updated = await users.update(user.id, { isActive: !user.isActive });
      setUserList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch {
      setMessage({ text: 'Chyba při změně stavu', type: 'error' });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Načítání uživatelů...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <AdminNav />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Správa uživatelů</h1>
        {!showForm && !showBulkForm && !editingUser && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkForm(true)}
              className="border border-blue-600 text-blue-600 rounded-md px-3 py-2 text-sm font-medium hover:bg-blue-50"
            >
              Hromadně z registrace
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700"
            >
              Přidat uživatele
            </button>
          </div>
        )}
      </div>

      <StatusMessage message={message} />

      {showForm && <AddUserForm onSubmit={handleAddUser} onCancel={() => setShowForm(false)} />}
      {showBulkForm && <BulkAddForm onSubmit={handleBulkAdd} onCancel={() => setShowBulkForm(false)} />}
      {editingUser && (
        <EditUserForm
          user={editingUser}
          onSave={handleEditUser}
          onCancel={() => setEditingUser(null)}
          isSelf={currentUser !== null && String(editingUser.id) === currentUser.id}
        />
      )}

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
                      <Avatar
                        name={user.name}
                        shortcut={user.shortcut}
                        imageUrl={gravatarUrls[user.id]}
                        color={user.avatarColor}
                        size="sm"
                      />
                      {user.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{user.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{user.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE_CLASSES[user.role] ?? ''}`}>
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
                        onClick={() => { setEditingUser(user); setShowForm(false); }}
                        className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1"
                        title="Upravit uživatele"
                      >
                        Upravit
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`text-xs px-2 py-1 ${currentUser !== null && String(user.id) === currentUser.id ? 'opacity-30 cursor-not-allowed text-gray-400' : 'text-gray-500 hover:text-gray-700'}`}
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
