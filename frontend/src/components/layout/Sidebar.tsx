import type { User } from '@/types';
import Avatar from '../shared/Avatar';
import { cn } from '@/utils/helpers';

interface SidebarProps {
  users: User[];
  selectedUserId: number | null;
  onSelectUser: (userId: number | null) => void;
  title?: string;
}

export default function Sidebar({ 
  users, 
  selectedUserId, 
  onSelectUser, 
  title = 'Uživatelé' 
}: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <button
          onClick={() => onSelectUser(null)}
          className={cn(
            "w-full flex items-center px-4 py-3 text-sm font-medium transition-colors",
            selectedUserId === null ? "bg-forest-50 text-forest-800 border-r-4 border-forest-600" : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3 text-gray-500 font-bold text-xs">
            ALL
          </div>
          Všichni
        </button>
        
        {users.map((user) => (
          <button
            key={user.id}
            onClick={() => onSelectUser(user.id)}
            className={cn(
              "w-full flex items-center px-4 py-3 text-sm font-medium transition-colors",
              selectedUserId === user.id ? "bg-forest-50 text-forest-800 border-r-4 border-forest-600" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <Avatar 
              name={user.name} 
              color={user.avatarColor} 
              size="sm" 
              className="mr-3" 
            />
            <div className="text-left overflow-hidden">
              <div className="truncate">{user.name}</div>
              {user.gameRoleName && (
                <div className="text-[10px] text-gray-400 truncate uppercase font-bold">
                  {user.gameRoleName}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
