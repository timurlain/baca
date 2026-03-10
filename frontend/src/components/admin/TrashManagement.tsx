import { useState, useEffect, useCallback } from 'react';
import { trash, type DeletedItem } from '@/api/client';
import AdminNav from './AdminNav';
import { formatDate } from '@/utils/helpers';

const ENTITY_LABELS: Record<string, string> = {
  task: 'Úkol',
  category: 'Kategorie',
  tag: 'Značka',
  user: 'Uživatel',
  gamerole: 'Herní role',
};

export default function TrashManagement() {
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const data = await trash.list();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleRestore = async (entity: string, id: number) => {
    const key = `${entity}-${id}`;
    setRestoring(key);
    try {
      await trash.restore(entity, id);
      setItems(prev => prev.filter(i => !(i.entity === entity && i.id === id)));
    } catch {
      // ignore
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Administrace</h1>
      <AdminNav />

      <h2 className="text-lg font-semibold text-gray-800 mb-4">Koš</h2>

      {loading ? (
        <p className="text-sm text-gray-400">Načítání...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400">Koš je prázdný.</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-2">Typ</th>
                <th className="px-4 py-2">Název</th>
                <th className="px-4 py-2">Smazáno</th>
                <th className="px-4 py-2 text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => {
                const key = `${item.entity}-${item.id}`;
                return (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium text-gray-500">
                        {ENTITY_LABELS[item.entity] ?? item.entity}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {formatDate(item.deletedAt)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleRestore(item.entity, item.id)}
                        disabled={restoring === key}
                        className="text-xs font-medium text-forest-700 hover:text-forest-900 disabled:opacity-50"
                      >
                        {restoring === key ? 'Obnovuji...' : 'Obnovit'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
