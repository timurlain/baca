import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboard } from '@/api/client';
import type { DashboardData, TaskItem } from '@/types';
import { STATUS_LABELS } from '@/utils/constants';
import StatsCard from './StatsCard';
import ProgressChart from './ProgressChart';

function RecentTask({ task }: { task: TaskItem }) {
  const time = new Date(task.updatedAt).toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-900 truncate">{task.title}</p>
        <p className="text-xs text-gray-500">{STATUS_LABELS[task.status] ?? task.status}</p>
      </div>
      <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">{time}</span>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    dashboard
      .get()
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Chyba načítání'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Načítání dashboardu...</div>;
  }

  if (error || !data) {
    return <div className="p-8 text-center text-red-500">{error ?? 'Nepodařilo se načíst data'}</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard label="Celkem úkolů" value={data.totalTasks} />
        <StatsCard label="Moje úkoly" value={data.myTaskCount} color="text-blue-600" />
        <StatsCard
          label="Po termínu"
          value={data.overdueTasks}
          color={data.overdueTasks > 0 ? 'text-red-600' : 'text-gray-900'}
          onClick={data.overdueTasks > 0 ? () => navigate('/board?overdue=true') : undefined}
        />
        <StatsCard
          label="Hotovo"
          value={`${Math.round(data.progressPercent)} %`}
          color="text-green-600"
        />
      </div>

      <ProgressChart
        tasksByStatus={data.tasksByStatus}
        totalTasks={data.totalTasks}
        progressPercent={data.progressPercent}
        categoryProgress={data.categoryProgress}
      />

      {data.recentTasks.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Poslední změny</h3>
          {data.recentTasks.map((task) => (
            <RecentTask key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
