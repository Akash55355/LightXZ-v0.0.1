import { Zap } from 'lucide-react';

export function Logo({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-glow-sm"
        style={{ width: size, height: size }}
      >
        <Zap className="text-white" style={{ width: size * 0.55, height: size * 0.55 }} fill="white" />
      </div>
      <span className="font-display text-xl font-bold tracking-tight">
        Light<span className="text-brand-400">XZ</span>
      </span>
    </div>
  );
}

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-glow-sm"
      style={{ width: size, height: size }}
    >
      <Zap className="text-white" style={{ width: size * 0.55, height: size * 0.55 }} fill="white" />
    </div>
  );
}
