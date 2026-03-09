import { useState, useEffect } from 'react';
import { gameRoles } from '@/api/client';
import type { GameRole, CreateGameRoleRequest } from '@/types';
import { GAME_ROLE_PALETTE } from '@/utils/constants';
import ColorPicker from './ColorPicker';
import StatusMessage, { type Message } from './StatusMessage';
import AdminNav from './AdminNav';

export default function GameRoleManagement() {
  const [roleList, setRoleList] = useState<GameRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(GAME_ROLE_PALETTE[0]);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    gameRoles
      .list()
      .then(setRoleList)
      .catch(() => setMessage({ text: 'Chyba načítání herních rolí', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setName('');
    setDescription('');
    setColor(GAME_ROLE_PALETTE[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      if (editId !== null) {
        const updated = await gameRoles.update(editId, { name, description: description || null, color });
        setRoleList((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        setMessage({ text: 'Herní role upravena', type: 'success' });
      } else {
        const created = await gameRoles.create({ name, description: description || null, color } as CreateGameRoleRequest);
        setRoleList((prev) => [...prev, created]);
        setMessage({ text: 'Herní role přidána', type: 'success' });
      }
      resetForm();
    } catch {
      setMessage({ text: 'Chyba při ukládání', type: 'error' });
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
      setMessage({ text: 'Herní role smazána', type: 'success' });
    } catch {
      setMessage({ text: 'Nelze smazat — role má přiřazené uživatele', type: 'error' });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Načítání herních rolí...</div>;
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <AdminNav />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Správa herních rolí</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700">
            Přidat herní roli
          </button>
        )}
      </div>

      <StatusMessage message={message} />

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
            <ColorPicker colors={GAME_ROLE_PALETTE} value={color} onChange={setColor} />
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
