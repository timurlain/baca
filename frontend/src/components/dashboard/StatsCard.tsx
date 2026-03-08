interface StatsCardProps {
  label: string;
  value: number | string;
  color?: string;
  onClick?: () => void;
}

export default function StatsCard({ label, value, color, onClick }: StatsCardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color ?? 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
