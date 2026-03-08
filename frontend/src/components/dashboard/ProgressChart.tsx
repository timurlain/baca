import type { CategoryProgress, TaskStatus } from '@/types';
import { STATUS_COLORS, STATUS_LABELS } from '@/utils/constants';

interface DonutChartProps {
  tasksByStatus: Record<string, number>;
  total: number;
}

function DonutChart({ tasksByStatus, total }: DonutChartProps) {
  const entries = Object.entries(tasksByStatus).filter(([, count]) => count > 0);
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Žádné úkoly
      </div>
    );
  }

  const size = 160;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {entries.map(([status, count]) => {
          const pct = count / total;
          const dashLength = pct * circumference;
          const dashOffset = -offset * circumference;
          offset += pct;
          return (
            <circle
              key={status}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={STATUS_COLORS[status as TaskStatus] ?? '#D1D5DB'}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
            />
          );
        })}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-gray-900 text-2xl font-bold"
          transform={`rotate(90 ${size / 2} ${size / 2})`}
        >
          {total}
        </text>
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
        {entries.map(([status, count]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[status as TaskStatus] }}
            />
            {STATUS_LABELS[status as TaskStatus] ?? status}: {count}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  percent: number;
  color?: string;
}

function ProgressBar({ label, percent, color = '#10B981' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-500">{Math.round(clamped)} %</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="h-2.5 rounded-full transition-all"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

interface ProgressChartProps {
  tasksByStatus: Record<string, number>;
  totalTasks: number;
  progressPercent: number;
  categoryProgress: CategoryProgress[];
}

export default function ProgressChart({
  tasksByStatus,
  totalTasks,
  progressPercent,
  categoryProgress,
}: ProgressChartProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Úkoly podle stavu</h3>
        <DonutChart tasksByStatus={tasksByStatus} total={totalTasks} />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Celkový pokrok</h3>
        <ProgressBar label="Hotové úkoly" percent={progressPercent} />
      </div>

      {categoryProgress.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Pokrok podle kategorií</h3>
          <div className="space-y-3">
            {categoryProgress.map((cp) => (
              <ProgressBar
                key={cp.categoryId}
                label={`${cp.categoryName} (${cp.doneTasks}/${cp.totalTasks})`}
                percent={cp.progressPercent}
                color={cp.categoryColor}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
