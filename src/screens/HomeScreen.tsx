import { useEffect, useState } from 'react';
import { ArrowRight, Trophy, Gamepad2, HelpCircle, GraduationCap, Users, Sparkles, TrendingUp } from 'lucide-react';
import { useNav } from '@/lib/nav';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/Avatar';
import { SkeletonList } from '@/components/ui';
import type { Profile, ClassRoom } from '@/lib/types';
import { SubjectIcon } from '@/components/SubjectIcon';

export function HomeScreen() {
  const { profile, isGuest } = useAuth();
  const { setTab } = useNav();
  const [topPlayers, setTopPlayers] = useState<Profile[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, c] = await Promise.all([
        supabase.from('profiles').select('*').order('total_points', { ascending: false }).limit(3),
        supabase.from('classes').select('*').order('sort_order').limit(5),
      ]);
      setTopPlayers((p.data as Profile[]) ?? []);
      setClasses((c.data as ClassRoom[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero greeting */}
      <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-brand-500/15 via-ink-850 to-accent-500/10 p-6">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative">
          <p className="text-sm text-slate-400">Welcome back,</p>
          <h1 className="font-display text-2xl font-bold">{profile?.name ?? 'Guest'} {isGuest && <span className="badge ml-2 bg-accent-500/15 text-accent-400"><Sparkles className="h-3 w-3" />Guest</span>}</h1>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5 rounded-full bg-warning-500/10 px-3 py-1.5">
              <Trophy className="h-4 w-4 text-warning-400" />
              <span className="font-semibold text-warning-400">{profile?.total_points ?? 0}</span>
              <span className="text-xs text-slate-400">points</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-400">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction icon={GraduationCap} label="Classes" color="brand" onClick={() => setTab('classes')} />
          <QuickAction icon={HelpCircle} label="Quizzes" color="accent" onClick={() => setTab('quizzes')} />
          <QuickAction icon={Gamepad2} label="Games" color="success" onClick={() => setTab('games')} />
          <QuickAction icon={Users} label="Community" color="warning" onClick={() => setTab('community')} />
        </div>
      </section>

      {/* Classes preview */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-400">Your classes</h2>
          <button onClick={() => setTab('classes')} className="text-xs font-semibold text-brand-400 hover:text-brand-300">
            View all <ArrowRight className="inline h-3 w-3" />
          </button>
        </div>
        {loading ? <SkeletonList count={4} /> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {classes.map((c) => (
              <button key={c.id} onClick={() => setTab('classes')} className="card card-hover flex items-center gap-3 p-4 text-left">
                <div className="rounded-xl p-2.5" style={{ backgroundColor: `${c.color}22` }}>
                  <SubjectIcon name={c.icon} className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Top players */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-400">
            <TrendingUp className="h-4 w-4" /> Top players
          </h2>
          <button onClick={() => setTab('leaderboard')} className="text-xs font-semibold text-brand-400 hover:text-brand-300">
            Leaderboard <ArrowRight className="inline h-3 w-3" />
          </button>
        </div>
        <div className="space-y-2">
          {topPlayers.map((p, i) => (
            <div key={p.id} className="card flex items-center gap-3 p-3">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-warning-500/20 text-warning-400' : i === 1 ? 'bg-slate-400/20 text-slate-300' : 'bg-orange-700/20 text-orange-400'}`}>
                {i + 1}
              </span>
              <Avatar name={p.username} size={36} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-slate-400">@{p.username}</p>
              </div>
              <span className="flex items-center gap-1 text-sm font-bold text-warning-400">
                <Trophy className="h-4 w-4" /> {p.total_points}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function QuickAction({ icon: Icon, label, color, onClick }: { icon: typeof GraduationCap; label: string; color: string; onClick: () => void }) {
  const colorMap: Record<string, string> = {
    brand: 'bg-brand-500/15 text-brand-400',
    accent: 'bg-accent-500/15 text-accent-400',
    success: 'bg-success-500/15 text-success-400',
    warning: 'bg-warning-500/15 text-warning-400',
  };
  return (
    <button onClick={onClick} className="card card-hover flex flex-col items-center gap-2 p-4">
      <div className={`rounded-xl p-3 ${colorMap[color]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
