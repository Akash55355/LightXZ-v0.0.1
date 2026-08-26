import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function FullScreenLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Spinner className="h-8 w-8 text-brand-400" />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="rounded-full bg-error-500/10 p-4">
        <span className="text-2xl">!</span>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {message && <p className="max-w-sm text-sm text-slate-400">{message}</p>}
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost mt-2 px-4 py-2 text-sm">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      {icon && <div className="rounded-2xl bg-white/5 p-4 text-slate-400">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {message && <p className="max-w-sm text-sm text-slate-400">{message}</p>}
      {action}
    </div>
  );
}

export function SkeletonCard() {
  return <div className="skeleton h-32 w-full rounded-2xl" />;
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
