interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function Badge({ 
  children, 
  color = 'bg-gray-100 text-gray-800', 
  className = '',
  style
}: BadgeProps) {
  return (
    <span 
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color} ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}
