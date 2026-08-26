import { avatarUrl } from '@/lib/storage';

export function Avatar({
  name,
  size = 40,
  className = '',
  ring = false,
}: {
  name: string;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  return (
    <img
      src={avatarUrl(name)}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      className={`rounded-full bg-ink-700 object-cover ${ring ? 'ring-2 ring-brand-500/60' : ''} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
