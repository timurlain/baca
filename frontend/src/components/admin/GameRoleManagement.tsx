import { useState, useEffect } from 'react';
import { gameRoles } from '@/api/client';
import type { GameRole, CreateGameRoleRequest } from '@/types';

const DEFAULT_COLORS = ['#7DD3FC', '#8B5CF6', '#D4A017', '#EF4444', '#10B981', '#EC4899', '#06B6D4', '#F97316'];

export default function GameRoleManagement() {
  const [roleList, setRoleList] = useState<GameRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    gameRoles
      .list()
      .then(setRoleList)
      .catch(() => setMessage('Chyba načítání herních rolí'))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setName('');
    setDescription('');
    setColor(DEFAULT_COLORS[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      if (editId !== null) {
        const updated = await gameRoles.update(editId, { name, description: description || null, color });
        setRoleList((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        setMessage('Herní role upravena');
      } else {
        const created = await gameRoles.create({ name, description: description || null, color } as CreateGameRoleRequest);
        setRoleList((prev) => [...prev, created]);
        setMessage('Herní role přidána');
      }
      resetForm();
    } catch {
      setMessage('Chyba při ukládání');
    }
  };

  const handleEdit = (role: GameRole) => {
    setEditId(role.id);
    setName(role.name);
    setDescription(role.description ?? '');
    setColor(role.color);
    setShowForm(true);
  };

  const handleDelete = async (role: GameRole) => {
    setMessage(null);
    try {
      await gameRoles.delete(role.id);
      setRoleList((prev) => prev.filter((r) => r.id !== role.id));
      setMessage('Herní role smazána');
    } catch {
      setMessage('Nelze smazat — role má přiřazené uživatele');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Načítání herních rolí...</div>;
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Správa herních rolí</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700">
            Přidat herní roli
          </button>
        )}
      </div>

      {message && (
        <p className={`text-sm ${message.includes('Chyba') || message.includes('Nelze') ? 'text-red-500' : 'text-green-600'}`}>
          {message}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
          <h3 className="font-medium text-gray-900">{editId !== null ? 'Upravit herní roli' : 'Přidat herní roli'}</h3>
          <div>
            <label htmlFor="roleName" className="block text-sm text-gray-600 mb-1">Název</label>
            <input id="roleName" type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="roleDesc" className="block text-sm text-gray-600 mb-1">Popis</label>
            <textarea id="roleDesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Barva</label>
            <div className="flex gap-2 flex-wrap">
              {DEFAULT_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} aria-label={`Barva ${c}`} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700">
              {editId !== null ? 'Uložit' : 'Přidat'}
            </button>
            <button type="button" onClick={resetForm} className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Zrušit
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {roleList.map((role) => (
          <div key={role.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full" style={{ backgroundColor: role.color }} />
              <div>
                <span className="text-sm font-medium text-gray-900">{role.name}</span>
                {role.description && <p className="text-xs text-gray-500">{role.description}</p>}
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleEdit(role)}
                className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1">Upravit</button>
              <button onClick={() => handleDelete(role)}
                className="text-xs text-red-500 hover:text-red-700 px-2 py-1">Smazat</button>
            </div>
          </div>
        ))}
        {roleList.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Žádné herní role</p>
        )}
      </div>
    </div>
  );
}
