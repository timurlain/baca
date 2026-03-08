import { useState, useEffect } from 'react';
import type { User } from '@/types';
import { users as usersApi } from '@/api/client';
import Sidebar from '../layout/Sidebar';
import KanbanBoard from './KanbanBoard';

export default function UserBoardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    usersApi.list()
      .then(setUsers)
      .catch(err => console.error('Failed to fetch users:', err));
  }, []);

  return (
    <div className="flex h-[calc(100vh-160px)] md:h-[calc(100vh-100px)] -mx-4 -my-6 overflow-hidden">
      <div className="hidden md:block">
        <Sidebar 
          users={users} 
          selectedUserId={selectedUserId} 
          onSelectUser={setSelectedUserId} 
        />
      </div>
      
      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        {/* Mobile User Select */}
        <div className="md:hidden mb-4">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
            Uživatel
          </label>
          <select 
            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            value={selectedUserId || ''}
            onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Všichni</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <KanbanBoard forceAssigneeId={selectedUserId} />
      </div>
    </div>
  );
}
