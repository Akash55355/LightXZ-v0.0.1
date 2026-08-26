import type { Profile } from './types';

const GUEST_KEY = 'lightxz_guest_profile';
const THEME_KEY = 'lightxz_theme';
const ONBOARDED_KEY = 'lightxz_onboarded';

export function loadGuestProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveGuestProfile(profile: Profile): void {
  localStorage.setItem(GUEST_KEY, JSON.stringify(profile));
}

export function clearGuestProfile(): void {
  localStorage.removeItem(GUEST_KEY);
}

export type Theme = 'dark' | 'light';

export function loadTheme(): Theme {
  const t = localStorage.getItem(THEME_KEY) as Theme | null;
  return t ?? 'dark';
}

export function saveTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
}

export function hasOnboarded(): boolean {
  return localStorage.getItem(ONBOARDED_KEY) === '1';
}

export function setOnboarded(): void {
  localStorage.setItem(ONBOARDED_KEY, '1');
}

export function clearOnboarded(): void {
  localStorage.removeItem(ONBOARDED_KEY);
}

/** Deterministic avatar fallback from a username/name. */
export function avatarSeed(name: string): string {
  return encodeURIComponent(name || 'lightxz');
}

export function avatarUrl(name: string): string {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed(name)}&backgroundColor=1d60f5,0891b2,10b981,f59e0b,ef4444`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
