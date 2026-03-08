import { useState, useEffect } from 'react';
import { categories } from '@/api/client';
import type { Category, CreateCategoryRequest } from '@/types';

const DEFAULT_COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

export default function CategoryManagement() {
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    categories
      .list()
      .then(setCategoryList)
      .catch(() => setMessage('Chyba načítání kategorií'))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setName('');
    setColor(DEFAULT_COLORS[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      if (editId !== null) {
        const updated = await categories.update(editId, { name, color });
        setCategoryList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setMessage('Kategorie upravena');
      } else {
        const created = await categories.create({ name, color } as CreateCategoryRequest);
        setCategoryList((prev) => [...prev, created]);
        setMessage('Kategorie přidána');
      }
      resetForm();
    } catch {
      setMessage('Chyba při ukládání');
    }
  };

  const handleEdit = (cat: Category) => {
    setEditId(cat.id);
    setName(cat.name);
    setColor(cat.color);
    setShowForm(true);
  };

  const handleDelete = async (cat: Category) => {
    setMessage(null);
    try {
      await categories.delete(cat.id);
      setCategoryList((prev) => prev.filter((c) => c.id !== cat.id));
      setMessage('Kategorie smazána');
    } catch {
      setMessage('Nelze smazat — kategorie má přiřazené úkoly');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Načítání kategorií...</div>;
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Správa kategorií</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700">
            Přidat kategorii
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
          <h3 className="font-medium text-gray-900">{editId !== null ? 'Upravit kategorii' : 'Přidat kategorii'}</h3>
          <div>
            <label htmlFor="catName" className="block text-sm text-gray-600 mb-1">Název</label>
            <input id="catName" type="text" required value={name} onChange={(e) => setName(e.target.value)}
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
        {categoryList.map((cat) => (
          <div key={cat.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="text-sm font-medium text-gray-900">{cat.name}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleEdit(cat)}
                className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1">Upravit</button>
              <button onClick={() => handleDelete(cat)}
                className="text-xs text-red-500 hover:text-red-700 px-2 py-1">Smazat</button>
            </div>
          </div>
        ))}
        {categoryList.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Žádné kategorie</p>
        )}
      </div>
    </div>
  );
}
