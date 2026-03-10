import { useState, useEffect } from 'react';
import { tags } from '@/api/client';
import type { Tag, CreateTagRequest } from '@/types';
import { DEFAULT_PALETTE } from '@/utils/constants';
import ColorPicker from './ColorPicker';
import StatusMessage, { type Message } from './StatusMessage';
import AdminNav from './AdminNav';

export default function TagManagement() {
  const [tagList, setTagList] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_PALETTE[0]);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    tags
      .list()
      .then(setTagList)
      .catch(() => setMessage({ text: 'Chyba načítání značek', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setName('');
    setColor(DEFAULT_PALETTE[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      if (editId !== null) {
        const updated = await tags.update(editId, { name, color });
        setTagList((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setMessage({ text: 'Značka upravena', type: 'success' });
      } else {
        const created = await tags.create({ name, color } as CreateTagRequest);
        setTagList((prev) => [...prev, created]);
        setMessage({ text: 'Značka přidána', type: 'success' });
      }
      resetForm();
    } catch {
      setMessage({ text: 'Chyba při ukládání', type: 'error' });
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditId(tag.id);
    setName(tag.name);
    setColor(tag.color);
    setShowForm(true);
  };

  const handleDelete = async (tag: Tag) => {
    setMessage(null);
    try {
      await tags.delete(tag.id);
      setTagList((prev) => prev.filter((t) => t.id !== tag.id));
      setMessage({ text: 'Značka smazána', type: 'success' });
    } catch {
      setMessage({ text: 'Chyba při mazání značky', type: 'error' });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">{"Na\u010D\u00EDt\u00E1n\u00ED zna\u010Dek\u2026"}</div>;
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <AdminNav />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{"Spr\u00E1va zna\u010Dek"}</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700">
            {"P\u0159idat zna\u010Dku"}
          </button>
        )}
      </div>

      <StatusMessage message={message} />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
          <h3 className="font-medium text-gray-900">{editId !== null ? 'Upravit značku' : 'Přidat značku'}</h3>
          <div>
            <label htmlFor="tagName" className="block text-sm text-gray-600 mb-1">{"N\u00E1zev"}</label>
            <input id="tagName" type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Barva</label>
            <ColorPicker colors={DEFAULT_PALETTE} value={color} onChange={setColor} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700">
              {editId !== null ? 'Uložit' : 'Přidat'}
            </button>
            <button type="button" onClick={resetForm} className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              {"Zru\u0161it"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {tagList.map((tag) => (
          <div key={tag.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full" style={{ backgroundColor: tag.color }} />
              <span className="text-sm font-medium text-gray-900">{tag.name}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleEdit(tag)}
                className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1">Upravit</button>
              <button onClick={() => handleDelete(tag)}
                className="text-xs text-red-500 hover:text-red-700 px-2 py-1">Smazat</button>
            </div>
          </div>
        ))}
        {tagList.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">{"\u017d\u00e1dn\u00e9 zna\u010dky"}</p>
        )}
      </div>
    </div>
  );
}
