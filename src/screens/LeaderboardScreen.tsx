import { useEffect, useState } from 'react';
import { Trophy, Crown, Medal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/Avatar';
import { FullScreenLoader, EmptyState } from '@/components/ui';
import type { Profile } from '@/lib/types';

export function LeaderboardScreen() {
  const [players, setPlayers] = useState<Profile[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, username, avatar_url, total_points, account_type')
        .order('total_points', { ascending: false })
        .limit(50);
      setPlayers((data as Profile[]) ?? []);
    })();
  }, []);

  if (!players) return <FullScreenLoader label="Loading leaderboard…" />;

  if (players.length === 0) {
    return (
      <EmptyState
        icon={<Trophy className="h-8 w-8" />}
        title="No players yet"
        message="Be the first to earn points and claim the top spot!"
      />
    );
  }

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  // Podium order: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumHeights = ['h-28', 'h-36', 'h-24'];
  const podiumRanks = [2, 1, 3];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-warning-400" />
        <h1 className="font-display text-2xl font-bold">Leaderboard</h1>
      </div>

      {/* Podium */}
      <section className="rounded-2xl border border-white/5 bg-gradient-to-b from-ink-850/80 to-ink-900/80 p-6">
        <div className="flex items-end justify-center gap-3 sm:gap-6">
          {podiumOrder.map((p, i) => {
            const rank = podiumRanks[i];
            const isFirst = rank === 1;
            return (
              <div key={p.id} className="flex flex-1 flex-col items-center" style={{ animationDelay: `${i * 100}ms` }}>
                <div className={`relative mb-3 ${isFirst ? 'animate-float' : ''}`}>
                  {isFirst && (
                    <Crown className="absolute -top-7 left-1/2 h-6 w-6 -translate-x-1/2 text-warning-400" fill="currentColor" />
                  )}
                  <Avatar name={p.username} size={isFirst ? 72 : 56} ring={isFirst} />
                  <span className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    rank === 1 ? 'bg-warning-500 text-white' : rank === 2 ? 'bg-slate-400 text-white' : 'bg-orange-600 text-white'
                  }`}>
                    {rank}
                  </span>
                </div>
                <p className="max-w-[100px] truncate text-center text-sm font-semibold">{p.name}</p>
                <p className="max-w-[100px] truncate text-center text-xs text-slate-400">@{p.username}</p>
                <p className="mt-1 flex items-center gap-1 text-sm font-bold text-warning-400">
                  <Trophy className="h-3.5 w-3.5" /> {p.total_points}
                </p>
                <div className={`mt-3 w-full rounded-t-xl ${podiumHeights[i]} ${
                  rank === 1 ? 'bg-gradient-to-t from-warning-500/30 to-warning-500/10' :
                  rank === 2 ? 'bg-gradient-to-t from-slate-500/30 to-slate-500/10' :
                  'bg-gradient-to-t from-orange-700/30 to-orange-700/10'
                } flex items-start justify-center pt-2`}>
                  <span className="font-display text-2xl font-bold opacity-50">{rank}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Rest of leaderboard */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-400">All rankings</h2>
        <div className="space-y-2">
          {rest.map((p, i) => (
            <div key={p.id} className="card flex items-center gap-3 p-3">
              <span className="w-6 text-center text-sm font-bold text-slate-500">{i + 4}</span>
              <Avatar name={p.username} size={40} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="truncate text-xs text-slate-400">@{p.username}</p>
              </div>
              {p.account_type === 'guest' && (
                <span className="badge bg-accent-500/10 text-accent-400 text-[10px]">Guest</span>
              )}
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
