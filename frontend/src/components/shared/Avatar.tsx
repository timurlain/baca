import { useState, useEffect } from 'react';
import { getInitials, getGravatarUrl } from '@/utils/helpers';

interface AvatarProps {
  name?: string | null;
  shortcut?: string | null;
  imageUrl?: string | null;
  gravatarEmail?: string | null;
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
  gravatarEmail,
  color = '#3B82F6',
  size = 'md',
  className = ''
}: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [gravatarUrl, setGravatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!gravatarEmail || imageUrl) return;
    let cancelled = false;
    getGravatarUrl(gravatarEmail).then(url => {
      if (!cancelled) setGravatarUrl(url);
    });
    return () => { cancelled = true; };
  }, [gravatarEmail, imageUrl]);

  const resolvedUrl = imageUrl && !imgFailed
    ? imageUrl
    : gravatarUrl;

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 overflow-hidden ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: resolvedUrl ? 'transparent' : (color || '#3B82F6') }}
      title={name || ''}
    >
      {resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt={name || ''}
          className="w-full h-full object-cover"
          onError={() => {
            if (resolvedUrl === imageUrl) setImgFailed(true);
            else setGravatarUrl(null);
          }}
        />
      ) : (
        shortcut || getInitials(name)
      )}
    </div>
  );
}
