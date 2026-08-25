import { useState, useRef, useEffect, type ReactNode } from 'react';
import {
  Home, GraduationCap, HelpCircle, Gamepad2, Users, Trophy,
  ChevronDown, User as UserIcon, Palette, Settings, History, Coins,
  LogOut, X, Sparkles, ShieldCheck, ArrowLeft, Crown,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useNav, type Tab } from '@/lib/nav';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/Avatar';
import { LogoMark } from '@/components/Logo';

const TABS: { key: Tab; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'classes', label: 'Classes', icon: GraduationCap },
  { key: 'quizzes', label: 'Quizzes', icon: HelpCircle },
  { key: 'games', label: 'Games', icon: Gamepad2 },
  { key: 'community', label: 'Community', icon: Users },
  { key: 'leaderboard', label: 'Ranks', icon: Trophy },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, isGuest, isMember } = useAuth();
  const { tab, setTab, view, goBack } = useNav();
  const [menuOpen, setMenuOpen] = useState(false);
  const [subView, setSubView] = useState<string | null>(null);

  const openSubView = (v: string) => {
    setSubView(v);
    setMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/80 backdrop-blur-lg pt-safe">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {view && (
              <button onClick={goBack} className="btn-ghost px-2.5 py-2">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <button onClick={() => setTab('home')} className="flex items-center gap-2">
              <LogoMark size={32} />
              <span className="hidden font-display text-lg font-bold sm:block">
                Light<span className="text-brand-400">XZ</span>
              </span>
            </button>
          </div>

          {/* Profile area */}
          <button
            onClick={() => setMenuOpen((m) => !m)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-3 transition-all hover:border-brand-500/40 hover:bg-white/10"
          >
            <Avatar name={profile?.username ?? profile?.name ?? 'guest'} size={32} />
            <div className="hidden text-left sm:block">
              <p className="max-w-[120px] truncate text-sm font-semibold leading-tight">{profile?.name ?? 'Guest'}</p>
              <p className="flex items-center gap-1 text-xs text-slate-400">
                <Coins className="h-3 w-3 text-warning-400" />
                {profile?.total_points ?? 0}
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </header>

      {/* Profile menu */}
      {menuOpen && (
        <ProfileMenu
          onClose={() => setMenuOpen(false)}
          onNavigate={openSubView}
        />
      )}

      {/* Sub-view overlay (profile pages) */}
      {subView && (
        <SubViewOverlay view={subView} onClose={() => setSubView(null)} />
      )}

      {/* Main content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-4 sm:pb-10">
        {children}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-ink-900/90 backdrop-blur-lg pb-safe sm:hidden">
        <div className="flex items-stretch justify-around">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                tab === key ? 'text-brand-400' : 'text-slate-500'
              }`}
            >
              <Icon className={`h-5 w-5 ${tab === key ? 'scale-110' : ''} transition-transform`} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop side nav */}
      <nav className="fixed left-0 top-16 z-30 hidden w-56 flex-col gap-1 p-4 sm:flex">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              tab === key ? 'bg-brand-500/15 text-brand-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </nav>

      {/* Account-type badge */}
      {(isGuest || isMember) && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-30 -translate-x-1/2 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0">
          {isGuest && (
            <span className="badge border border-accent-500/30 bg-accent-500/10 text-accent-400 backdrop-blur">
              <Sparkles className="h-3 w-3" /> Guest session
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ onClose, onNavigate }: { onClose: () => void; onNavigate: (v: string) => void }) {
  const { profile, isGuest, signOut } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const items = [
    { key: 'my-profile', label: 'My Profile', icon: UserIcon },
    { key: 'theme', label: 'Theme', icon: Palette },
    { key: 'settings', label: 'Settings', icon: Settings },
    { key: 'quiz-history', label: 'Quiz History', icon: History },
    { key: 'game-history', label: 'Game History', icon: History },
    { key: 'points', label: 'Points', icon: Coins },
    { key: 'account', label: 'Account', icon: ShieldCheck },
  ];

  return (
    <div ref={ref} className="fixed right-4 top-16 z-50 w-72 animate-scale-in rounded-2xl border border-white/10 bg-ink-850/95 p-3 shadow-card backdrop-blur-lg sm:right-6">
      {/* Header */}
      <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
        <Avatar name={profile?.username ?? 'guest'} size={48} ring />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{profile?.name ?? 'Guest'}</p>
          <p className="truncate text-sm text-slate-400">@{profile?.username ?? 'guest'}</p>
        </div>
        <div className="text-right">
          <p className="flex items-center gap-1 text-sm font-bold text-warning-400">
            <Coins className="h-4 w-4" />
            {profile?.total_points ?? 0}
          </p>
          <p className="text-[10px] text-slate-500">points</p>
        </div>
      </div>

      {/* Items */}
      <div className="mt-2 space-y-0.5">
        {items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Icon className="h-4 w-4 text-slate-400" />
            {label}
          </button>
        ))}
      </div>

      {/* Divider + logout */}
      <div className="my-2 h-px bg-white/5" />
      <button
        onClick={() => { signOut(); onClose(); }}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-error-400 transition-colors hover:bg-error-500/10"
      >
        <LogOut className="h-4 w-4" />
        {isGuest ? 'Leave session' : 'Logout'}
      </button>
    </div>
  );
}

function SubViewOverlay({ view, onClose }: { view: string; onClose: () => void }) {
  const { profile } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-900 p-6 sm:rounded-3xl sm:animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold capitalize">{view.replace(/-/g, ' ')}</h2>
          <button onClick={onClose} className="btn-ghost rounded-full p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        {view === 'my-profile' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <Avatar name={profile?.username ?? 'guest'} size={96} ring />
              <div className="text-center">
                <p className="text-lg font-bold">{profile?.name}</p>
                <p className="text-sm text-slate-400">@{profile?.username}</p>
              </div>
              <div className="flex gap-3">
                <Stat label="Points" value={profile?.total_points ?? 0} icon={<Coins className="h-4 w-4 text-warning-400" />} />
                <Stat label="Type" value={profile?.account_type ?? 'guest'} icon={<Sparkles className="h-4 w-4 text-accent-400" />} />
              </div>
              <p className="text-xs text-slate-500">Member since {profile ? new Date(profile.created_at).toLocaleDateString() : '—'}</p>
            </div>
          </div>
        )}

        {view === 'theme' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Choose how LightXZ looks. Your preference is remembered.</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme('dark')}
                className={`card p-4 text-left transition-all ${theme === 'dark' ? 'border-brand-500/60 ring-2 ring-brand-500/20' : ''}`}
              >
                <div className="mb-2 h-16 rounded-lg bg-ink-900" />
                <p className="font-semibold">Dark</p>
                <p className="text-xs text-slate-400">Default</p>
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`card p-4 text-left transition-all ${theme === 'light' ? 'border-brand-500/60 ring-2 ring-brand-500/20' : ''}`}
              >
                <div className="mb-2 h-16 rounded-lg bg-slate-100" />
                <p className="font-semibold">Light</p>
                <p className="text-xs text-slate-400">Bright</p>
              </button>
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-3 text-sm text-slate-300">
            <SettingRow label="Notifications" desc="Manage your alerts" />
            <SettingRow label="Privacy" desc="Control who sees your profile" />
            <SettingRow label="Language" desc="English (US)" />
            <SettingRow label="Data & storage" desc="Manage your data" />
          </div>
        )}

        {view === 'quiz-history' && <HistoryView kind="quiz" />}
        {view === 'game-history' && <HistoryView kind="game" />}
        {view === 'points' && <PointsView />}
        {view === 'account' && (
          <div className="space-y-3 text-sm">
            <Row label="User ID" value={profile?.id ?? '—'} mono />
            <Row label="Name" value={profile?.name ?? '—'} />
            <Row label="Username" value={`@${profile?.username ?? '—'}`} />
            <Row label="Account type" value={profile?.account_type ?? '—'} />
            <Row label="Account status" value={profile?.account_status ?? '—'} />
            <Row label="Member since" value={profile ? new Date(profile.created_at).toLocaleString() : '—'} />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
      {icon}
      <div>
        <p className="text-sm font-bold capitalize">{value}</p>
        <p className="text-[10px] text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function SettingRow({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
      <ChevronDown className="h-4 w-4 -rotate-90 text-slate-500" />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
      <span className="text-slate-400">{label}</span>
      <span className={`font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}

function HistoryView({ kind }: { kind: 'quiz' | 'game' }) {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const table = kind === 'quiz' ? 'quiz_results' : 'game_results';
      const { data } = await supabase
        .from(table)
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setRows((data as Record<string, unknown>[]) ?? []);
      setLoading(false);
    })();
  }, [profile, kind]);

  if (loading) return <p className="py-8 text-center text-sm text-slate-400">Loading history…</p>;
  if (!rows || rows.length === 0) return <p className="py-8 text-center text-sm text-slate-400">No {kind} activity yet.</p>;

  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm">
          {kind === 'quiz' ? (
            <>
              <span className="font-medium">Quiz attempt</span>
              <span className="text-slate-400">
                {String(r.score)}/{String(r.total)} · +{String(r.points_awarded)} pts
              </span>
            </>
          ) : (
            <>
              <span className="font-medium capitalize">{String(r.game_key).replace(/-/g, ' ')}</span>
              <span className="text-slate-400">
                {String(r.difficulty ?? '—')} · +{String(r.points_awarded)} pts
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function PointsView() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('point_ledger')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(30);
      setRows((data as Record<string, unknown>[]) ?? []);
      setLoading(false);
    })();
  }, [profile]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-brand-500/15 to-accent-500/10 p-4 text-center">
        <Crown className="mx-auto mb-1 h-6 w-6 text-warning-400" />
        <p className="text-3xl font-bold">{profile?.total_points ?? 0}</p>
        <p className="text-xs text-slate-400">Total points</p>
      </div>
      {loading ? (
        <p className="py-4 text-center text-sm text-slate-400">Loading…</p>
      ) : !rows || rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">No points earned yet. Play quizzes and games to earn!</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm">
              <span className="capitalize text-slate-300">{String(r.reason).replace(/-/g, ' ')}</span>
              <span className="font-semibold text-success-400">+{String(r.delta)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
