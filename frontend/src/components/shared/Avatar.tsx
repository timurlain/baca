import { getInitials } from '@/utils/helpers';

interface AvatarProps {
  name?: string | null;
  color?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Avatar({ 
  name, 
  color = '#3B82F6', 
  size = 'md', 
  className = '' 
}: AvatarProps) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <div 
      className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: color || '#3B82F6' }}
      title={name || ''}
    >
      {getInitials(name)}
    </div>
  );
}
