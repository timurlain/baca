import { useState } from 'react';
import { getInitials } from '@/utils/helpers';

interface AvatarProps {
  name?: string | null;
  shortcut?: string | null;
  imageUrl?: string | null;
  color?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export default function Avatar({
  name,
  shortcut,
  imageUrl,
  color = '#3B82F6',
  size = 'md',
  className = ''
}: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const showImage = imageUrl && !imgFailed;

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 overflow-hidden ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: showImage ? 'transparent' : (color || '#3B82F6') }}
      title={name || ''}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={name || ''}
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        shortcut || getInitials(name)
      )}
    </div>
  );
}
