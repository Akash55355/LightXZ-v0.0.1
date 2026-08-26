import { useEffect, useState, useCallback } from 'react';
import { Gamepad2, ChevronRight, Trophy, Users, Bot, ArrowLeft, RotateCcw, Plus, Hash } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useNav } from '@/lib/nav';
import { EmptyState } from '@/components/ui';
import type { GameResult } from '@/lib/types';

type GameKey = 'memory' | 'tic-tac-toe';

interface GameMeta {
  key: GameKey;
  title: string;
  description: string;
  icon: typeof Gamepad2;
  color: string;
  difficulties: { key: string; label: string; points: number }[];
}

const GAMES: GameMeta[] = [
  {
    key: 'memory',
    title: 'Memory Match',
    description: 'Flip cards and find matching pairs. Fewer mistakes, more points.',
    icon: Gamepad2,
    color: '#3380ff',
    difficulties: [
      { key: 'easy', label: 'Easy (6 pairs)', points: 30 },
      { key: 'medium', label: 'Medium (8 pairs)', points: 60 },
      { key: 'hard', label: 'Hard (12 pairs)', points: 120 },
    ],
  },
  {
    key: 'tic-tac-toe',
    title: 'Tic-Tac-Toe',
    description: 'Classic 3x3. Play vs AI or create a multiplayer room with a code.',
    icon: Trophy,
    color: '#22d3ee',
    difficulties: [
      { key: 'easy', label: 'vs AI: Easy', points: 10 },
      { key: 'medium', label: 'vs AI: Medium', points: 20 },
      { key: 'hard', label: 'vs AI: Hard', points: 35 },
      { key: 'multiplayer', label: 'Multiplayer room', points: 30 },
    ],
  },
];

export function GamesScreen() {
  const { view, viewParams, navigate, goBack } = useNav();
  const [results, setResults] = useState<GameResult[]>([]);

  useEffect(() => {
    // Load recent results for display
    (async () => {
      const { data } = await supabase.from('game_results').select('*').order('created_at', { ascending: false }).limit(6);
      setResults((data as GameResult[]) ?? []);
    })();
  }, []);

  if (view === 'play') {
    const game = GAMES.find((g) => g.key === viewParams?.game);
    if (game?.key === 'memory') return <MemoryGame difficulty={viewParams?.difficulty ?? 'easy'} onBack={goBack} />;
    if (game?.key === 'tic-tac-toe') return <TicTacToeGame difficulty={viewParams?.difficulty ?? 'easy'} onBack={goBack} />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Gamepad2 className="h-6 w-6 text-success-400" />
        <h1 className="font-display text-2xl font-bold">Games</h1>
      </div>
      <p className="text-sm text-slate-400">Play and earn points. Scores are validated by the server — no cheating.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {GAMES.map((g, i) => (
          <div key={g.key} className="card card-hover overflow-hidden p-5 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-start gap-4">
              <div className="rounded-2xl p-3" style={{ backgroundColor: `${g.color}22` }}>
                <g.icon className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold">{g.title}</h3>
                <p className="mt-0.5 text-sm text-slate-400">{g.description}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {g.difficulties.map((d) => (
                <button
                  key={d.key}
                  onClick={() => navigate('play', { game: g.key, difficulty: d.key })}
                  className="flex w-full items-center justify-between rounded-xl bg-white/5 px-4 py-2.5 text-sm transition-colors hover:bg-white/10"
                >
                  <span className="font-medium">{d.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="badge bg-warning-500/10 text-warning-400"><Trophy className="h-3 w-3" /> {d.points}</span>
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent results */}
      {results.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-400">Recent plays</h2>
          <div className="space-y-2">
            {results.map((r) => (
              <div key={r.id} className="card flex items-center justify-between p-3 text-sm">
                <span className="capitalize font-medium">{r.game_key.replace(/-/g, ' ')}</span>
                <span className="text-slate-400">{r.difficulty} · +{r.points_awarded} pts</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// =================== MEMORY GAME ===================
const SYMBOLS = ['circle', 'square', 'triangle', 'star', 'hexagon', 'diamond', 'cross', 'heart', 'pentagon', 'bolt', 'moon', 'sun'];

function MemoryGame({ difficulty, onBack }: { difficulty: string; onBack: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const [pairs, setPairs] = useState(6);
  const [cards, setCards] = useState<{ id: number; symbol: string; flipped: boolean; matched: boolean }[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'submitting' | 'done'>('playing');
  const [result, setResult] = useState<{ points_awarded: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const n = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : 12;
    setPairs(n);
    const chosen = SYMBOLS.slice(0, n);
    const deck = [...chosen, ...chosen]
      .map((symbol, i) => ({ id: i, symbol, flipped: false, matched: false }))
      .sort(() => Math.random() - 0.5)
      .map((c, i) => ({ ...c, id: i }));
    setCards(deck);
    setMoves(0);
    setMatches(0);
    setFlipped([]);
    setPhase('playing');
    setResult(null);
  }, [difficulty]);

  const handleFlip = useCallback((idx: number) => {
    if (flipped.length === 2 || cards[idx].flipped || cards[idx].matched) return;
    const newCards = cards.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
    setCards(newCards);
    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = newFlipped;
      if (newCards[a].symbol === newCards[b].symbol) {
        setTimeout(() => {
          setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
          setMatches((m) => m + 1);
          setFlipped([]);
        }, 500);
      } else {
        setTimeout(() => {
          setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)));
          setFlipped([]);
        }, 900);
      }
    }
  }, [cards, flipped]);

  // Submit when all matched
  useEffect(() => {
    if (matches > 0 && matches === pairs && phase === 'playing') {
      (async () => {
        setPhase('submitting');
        setError(null);
        try {
          if (!profile) throw new Error('Not signed in');
          const { data, error: rpcError } = await supabase.rpc('submit_game_result', {
            p_profile_id: profile.id,
            p_game_key: 'memory',
            p_difficulty: difficulty,
            p_score: matches,
            p_metadata: { moves, pairs },
          });
          if (rpcError) throw rpcError;
          setResult(data as { points_awarded: number });
          setPhase('done');
          refreshProfile();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to submit score.');
          setPhase('done');
        }
      })();
    }
  }, [matches, pairs, phase, profile, difficulty, moves, refreshProfile]);

  const restart = () => {
    const n = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : 12;
    const chosen = SYMBOLS.slice(0, n);
    const deck = [...chosen, ...chosen]
      .map((symbol, i) => ({ id: i, symbol, flipped: false, matched: false }))
      .sort(() => Math.random() - 0.5)
      .map((c, i) => ({ ...c, id: i }));
    setCards(deck);
    setMoves(0);
    setMatches(0);
    setFlipped([]);
    setPhase('playing');
    setResult(null);
  };

  const gridCols = pairs <= 6 ? 'grid-cols-4' : pairs <= 8 ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-6';

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="btn-ghost px-3 py-2 text-sm">
          <ArrowLeft className="h-4 w-4" /> Games
        </button>
        <div className="flex gap-2">
          <span className="badge bg-white/5 text-slate-300">Moves: {moves}</span>
          <span className="badge bg-brand-500/10 text-brand-400">Pairs: {matches}/{pairs}</span>
        </div>
      </div>

      <h1 className="font-display text-xl font-bold capitalize">Memory Match — {difficulty}</h1>

      {phase === 'done' ? (
        <div className="card mx-auto max-w-md p-6 text-center">
          <Trophy className="mx-auto mb-3 h-12 w-12 text-warning-400" />
          <h2 className="font-display text-2xl font-bold">Complete!</h2>
          <p className="mt-1 text-slate-400">{moves} moves to find {pairs} pairs</p>
          {result && (
            <div className="mt-4 rounded-xl bg-brand-500/10 p-3">
              <p className="text-sm text-slate-300">Points earned</p>
              <p className="font-display text-2xl font-bold text-brand-400">+{result.points_awarded}</p>
            </div>
          )}
          {error && <p className="mt-2 text-sm text-error-400">{error}</p>}
          <div className="mt-6 flex gap-2">
            <button onClick={restart} className="btn-ghost flex-1 py-3"><RotateCcw className="h-4 w-4" /> Play again</button>
            <button onClick={onBack} className="btn-primary flex-1 py-3">Done</button>
          </div>
        </div>
      ) : phase === 'submitting' ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className={`grid ${gridCols} gap-2 sm:gap-3`}>
          {cards.map((c, i) => (
            <button
              key={c.id}
              onClick={() => handleFlip(i)}
              disabled={c.matched || c.flipped}
              className={`aspect-square rounded-xl border transition-all duration-300 ${
                c.matched
                  ? 'border-success-500/40 bg-success-500/10'
                  : c.flipped
                  ? 'border-brand-500/60 bg-brand-500/10'
                  : 'border-white/10 bg-ink-800 hover:border-white/20 active:scale-95'
              }`}
            >
              {c.flipped || c.matched ? (
                <SymbolGlyph name={c.symbol} className="h-8 w-8 sm:h-10 sm:w-10" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-white/10" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// SVG symbols (no emojis)
function SymbolGlyph({ name, className }: { name: string; className?: string }) {
  const common = { className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 };
  switch (name) {
    case 'circle': return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
    case 'square': return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="2" /></svg>;
    case 'triangle': return <svg {...common}><path d="M12 3l9 16H3z" /></svg>;
    case 'star': return <svg {...common}><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" /></svg>;
    case 'hexagon': return <svg {...common}><path d="M12 2l9 5v10l-9 5-9-5V7z" /></svg>;
    case 'diamond': return <svg {...common}><path d="M12 2l9 10-9 10-9-10z" /></svg>;
    case 'cross': return <svg {...common}><path d="M12 2v20M2 12h20" /></svg>;
    case 'heart': return <svg {...common}><path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5 6 5c2 0 3.5 1.5 4 2.5C10.5 6.5 12 5 14 5c3.5 0 5 4 3.5 7-2.5 4.5-9.5 9-9.5 9z" /></svg>;
    case 'pentagon': return <svg {...common}><path d="M12 2l9.5 7-3.5 12h-12L2.5 9z" /></svg>;
    case 'bolt': return <svg {...common}><path d="M13 2L4 14h6l-1 8 9-12h-6z" /></svg>;
    case 'moon': return <svg {...common}><path d="M21 12.5A9 9 0 1112 3a7 7 0 009 9.5z" /></svg>;
    case 'sun': return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" /></svg>;
    default: return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
  }
}

// =================== TIC-TAC-TOE ===================
function TicTacToeGame({ difficulty, onBack }: { difficulty: string; onBack: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const [mode, setMode] = useState<'menu' | 'ai' | 'mp-menu' | 'mp-host' | 'mp-join' | 'mp-game'>(
    difficulty === 'multiplayer' ? 'mp-menu' : 'ai'
  );
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [winner, setWinner] = useState<string | null>(null);
  const [phase, setPhase] = useState<'playing' | 'submitting' | 'done'>('playing');
  const [result, setResult] = useState<{ points_awarded: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Multiplayer
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState<import('@/lib/types').GameRoom | null>(null);
  const [myMark, setMyMark] = useState<'X' | 'O'>('X');
  const [polling, setPolling] = useState<ReturnType<typeof setInterval> | null>(null);

  const aiDiff = difficulty === 'multiplayer' ? 'easy' : difficulty;

  const reset = () => {
    setBoard(Array(9).fill(null));
    setTurn('X');
    setWinner(null);
    setPhase('playing');
    setResult(null);
  };

  const checkWin = (b: (string | null)[]) => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a,b1,c] of lines) {
      if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
    }
    if (b.every((x) => x !== null)) return 'draw';
    return null;
  };

  const submitScore = async (outcome: 'win' | 'loss' | 'draw') => {
    setPhase('submitting');
    setError(null);
    try {
      if (!profile) throw new Error('Not signed in');
      const scoreVal = outcome === 'win' ? 1 : outcome === 'draw' ? 0 : -1;
      const { data, error: rpcError } = await supabase.rpc('submit_game_result', {
        p_profile_id: profile.id,
        p_game_key: 'tic-tac-toe',
        p_difficulty: difficulty === 'multiplayer' ? 'multiplayer' : aiDiff,
        p_score: scoreVal,
        p_metadata: { outcome },
      });
      if (rpcError) throw rpcError;
      setResult(data as { points_awarded: number });
      setPhase('done');
      refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit score.');
      setPhase('done');
    }
  };

  // AI move
  useEffect(() => {
    if (mode !== 'ai' || turn !== 'O' || winner || phase !== 'playing') return;
    const timer = setTimeout(() => {
      const move = aiDiff === 'easy' ? randomMove(board) : aiDiff === 'medium' ? mediumAI(board) : minimaxAI(board);
      if (move >= 0) {
        const nb = [...board];
        nb[move] = 'O';
        setBoard(nb);
        const w = checkWin(nb);
        if (w) {
          setWinner(w);
          if (w === 'O') submitScore('loss');
          else if (w === 'draw') submitScore('draw');
        } else {
          setTurn('X');
        }
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, board, mode, winner, phase]);

  const handleClick = (i: number) => {
    if (board[i] || winner || phase !== 'playing') return;
    if (mode === 'ai' && turn !== 'X') return;

    if (mode === 'ai') {
      const nb = [...board];
      nb[i] = 'X';
      setBoard(nb);
      const w = checkWin(nb);
      if (w) {
        setWinner(w);
        if (w === 'X') submitScore('win');
        else if (w === 'draw') submitScore('draw');
      } else {
        setTurn('O');
      }
    } else if (mode === 'mp-game' && room && turn === myMark) {
      const nb = [...board];
      nb[i] = myMark;
      setBoard(nb);
      updateRoom(nb, myMark);
      const w = checkWin(nb);
      if (w) {
        setWinner(w);
        if (w === myMark) submitScore('win');
        else if (w === 'draw') submitScore('draw');
      } else {
        setTurn(myMark === 'X' ? 'O' : 'X');
      }
    }
  };

  // Multiplayer: host room
  const hostRoom = async () => {
    if (!profile) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error: e } = await supabase.from('game_rooms').insert({
      code,
      game_key: 'tic-tac-toe',
      host_id: profile.id,
      status: 'waiting',
      board: Array(9).fill(null),
      turn: 'X',
    }).select().single();
    if (e) { setError(e.message); return; }
    setRoom(data as import('@/lib/types').GameRoom);
    setRoomCode(code);
    setMyMark('X');
    setMode('mp-host');
    // Poll for guest joining
    const interval = setInterval(async () => {
      const { data: updated } = await supabase.from('game_rooms').select('*').eq('code', code).single();
      const r = updated as import('@/lib/types').GameRoom;
      if (r && r.status === 'active' && r.guest_id) {
        clearInterval(interval);
        setPolling(null);
        setRoom(r);
        setBoard(r.board ?? Array(9).fill(null));
        setTurn(r.turn as 'X' | 'O');
        setMode('mp-game');
        startPolling(code);
      }
    }, 2000);
    setPolling(interval);
  };

  const joinRoom = async () => {
    if (!profile || !joinCode.trim()) return;
    const { data: existing, error: e1 } = await supabase.from('game_rooms').select('*').eq('code', joinCode.trim().toUpperCase()).maybeSingle();
    const r = existing as import('@/lib/types').GameRoom | null;
    if (e1 || !r) { setError('Room not found.'); return; }
    if (r.guest_id) { setError('Room is full.'); return; }
    const { data: updated, error: e2 } = await supabase.from('game_rooms').update({
      guest_id: profile.id,
      status: 'active',
    }).eq('code', joinCode.trim().toUpperCase()).select().single();
    if (e2) { setError(e2.message); return; }
    setRoom(updated as import('@/lib/types').GameRoom);
    setMyMark('O');
    setBoard((updated as import('@/lib/types').GameRoom).board ?? Array(9).fill(null));
    setTurn((updated as import('@/lib/types').GameRoom).turn as 'X' | 'O');
    setMode('mp-game');
    startPolling(joinCode.trim().toUpperCase());
  };

  const updateRoom = async (newBoard: (string | null)[], mark: 'X' | 'O') => {
    if (!room) return;
    const w = checkWin(newBoard);
    await supabase.from('game_rooms').update({
      board: newBoard,
      turn: mark === 'X' ? 'O' : 'X',
      winner: w ?? null,
      status: w ? 'finished' : 'active',
    }).eq('code', room.code);
  };

  const startPolling = (code: string) => {
    const interval = setInterval(async () => {
      const { data } = await supabase.from('game_rooms').select('*').eq('code', code).single();
      const r = data as import('@/lib/types').GameRoom;
      if (!r) return;
      setRoom(r);
      if (r.board) setBoard(r.board);
      setTurn(r.turn as 'X' | 'O');
      if (r.winner && !winner) {
        setWinner(r.winner);
        if (r.winner === myMark) submitScore('win');
        else if (r.winner === 'draw') submitScore('draw');
        else submitScore('loss');
        clearInterval(interval);
        setPolling(null);
      }
    }, 1500);
    setPolling(interval);
  };

  useEffect(() => () => { if (polling) clearInterval(polling); }, [polling]);

  // AI implementations
  function randomMove(b: (string | null)[]): number {
    const empty = b.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
    return empty[Math.floor(Math.random() * empty.length)] ?? -1;
  }
  function mediumAI(b: (string | null)[]): number {
    // Block or win
    for (let i = 0; i < 9; i++) {
      if (b[i] === null) {
        const t = [...b]; t[i] = 'O';
        if (checkWin(t) === 'O') return i;
      }
    }
    for (let i = 0; i < 9; i++) {
      if (b[i] === null) {
        const t = [...b]; t[i] = 'X';
        if (checkWin(t) === 'X') return i;
      }
    }
    return randomMove(b);
  }
  function minimaxAI(b: (string | null)[]): number {
    let best = -Infinity, move = -1;
    for (let i = 0; i < 9; i++) {
      if (b[i] === null) {
        const t = [...b]; t[i] = 'O';
        const score = minimax(t, 0, false);
        if (score > best) { best = score; move = i; }
      }
    }
    return move;
  }
  function minimax(b: (string | null)[], depth: number, max: boolean): number {
    const w = checkWin(b);
    if (w === 'O') return 10 - depth;
    if (w === 'X') return depth - 10;
    if (w === 'draw') return 0;
    if (max) {
      let best = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (b[i] === null) {
          const t = [...b]; t[i] = 'O';
          best = Math.max(best, minimax(t, depth + 1, false));
        }
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < 9; i++) {
        if (b[i] === null) {
          const t = [...b]; t[i] = 'X';
          best = Math.min(best, minimax(t, depth + 1, true));
        }
      }
      return best;
    }
  }

  const renderCell = (i: number) => (
    <button
      key={i}
      onClick={() => handleClick(i)}
      disabled={!!board[i] || !!winner || phase !== 'playing' || (mode === 'mp-game' && turn !== myMark)}
      className={`flex aspect-square items-center justify-center rounded-xl border text-3xl font-bold transition-all ${
        board[i] === 'X' ? 'border-brand-500/40 bg-brand-500/10 text-brand-400' :
        board[i] === 'O' ? 'border-accent-500/40 bg-accent-500/10 text-accent-400' :
        'border-white/10 bg-ink-800 hover:border-white/20 active:scale-95'
      } ${mode === 'mp-game' && turn !== myMark ? 'cursor-not-allowed' : ''}`}
    >
      {board[i]}
    </button>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <button onClick={onBack} className="btn-ghost px-3 py-2 text-sm">
        <ArrowLeft className="h-4 w-4" /> Games
      </button>

      {mode === 'mp-menu' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-accent-400" />
            <h1 className="font-display text-xl font-bold">Multiplayer</h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={hostRoom} className="card card-hover p-5 text-left">
              <Plus className="mb-2 h-6 w-6 text-success-400" />
              <h3 className="font-semibold">Create room</h3>
              <p className="mt-1 text-sm text-slate-400">Generate a code and share it with a friend.</p>
            </button>
            <button onClick={() => setMode('mp-join')} className="card card-hover p-5 text-left">
              <Hash className="mb-2 h-6 w-6 text-accent-400" />
              <h3 className="font-semibold">Join room</h3>
              <p className="mt-1 text-sm text-slate-400">Enter a code to play against a friend.</p>
            </button>
          </div>
        </div>
      )}

      {mode === 'mp-host' && room && (
        <div className="card mx-auto max-w-md p-6 text-center">
          <h2 className="font-display text-lg font-bold">Room created</h2>
          <p className="mt-1 text-sm text-slate-400">Share this code with your friend:</p>
          <div className="my-4 rounded-xl bg-white/5 py-4">
            <p className="font-mono text-3xl font-bold tracking-widest text-brand-400">{roomCode}</p>
          </div>
          <p className="text-sm text-slate-400">Waiting for opponent to join…</p>
          <div className="mx-auto mt-3 h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      )}

      {mode === 'mp-join' && (
        <div className="card mx-auto max-w-md space-y-4 p-6">
          <h2 className="font-display text-lg font-bold">Join a room</h2>
          <input className="input text-center font-mono text-lg uppercase" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="ENTER CODE" maxLength={6} />
          {error && <p className="text-sm text-error-400">{error}</p>}
          <button onClick={joinRoom} disabled={joinCode.length < 4} className="btn-primary w-full py-3">Join</button>
        </div>
      )}

      {(mode === 'ai' || mode === 'mp-game') && (
        <>
          <div className="flex items-center justify-between">
            <h1 className="font-display text-xl font-bold capitalize">
              {mode === 'ai' ? `vs AI — ${aiDiff}` : 'Multiplayer'}
            </h1>
            <div className="flex gap-2">
              {mode === 'ai' && (
                <span className="badge bg-white/5 text-slate-300">You are X</span>
              )}
              {mode === 'mp-game' && (
                <span className={`badge ${turn === myMark ? 'bg-brand-500/15 text-brand-400' : 'bg-white/5 text-slate-400'}`}>
                  {turn === myMark ? 'Your turn' : 'Opponent…'} ({myMark})
                </span>
              )}
            </div>
          </div>

          {phase === 'done' ? (
            <div className="card mx-auto max-w-md p-6 text-center">
              <Trophy className={`mx-auto mb-3 h-12 w-12 ${winner === (mode === 'ai' ? 'X' : myMark) ? 'text-success-400' : winner === 'draw' ? 'text-warning-400' : 'text-error-400'}`} />
              <h2 className="font-display text-2xl font-bold">
                {winner === 'draw' ? "It's a draw!" : winner === (mode === 'ai' ? 'X' : myMark) ? 'You win!' : 'You lose!'}
              </h2>
              {result && (
                <div className="mt-4 rounded-xl bg-brand-500/10 p-3">
                  <p className="text-sm text-slate-300">Points earned</p>
                  <p className="font-display text-2xl font-bold text-brand-400">+{result.points_awarded}</p>
                </div>
              )}
              {error && <p className="mt-2 text-sm text-error-400">{error}</p>}
              <div className="mt-6 flex gap-2">
                <button onClick={reset} className="btn-ghost flex-1 py-3"><RotateCcw className="h-4 w-4" /> Again</button>
                <button onClick={onBack} className="btn-primary flex-1 py-3">Done</button>
              </div>
            </div>
          ) : phase === 'submitting' ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          ) : (
            <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
              {board.map((_, i) => renderCell(i))}
            </div>
          )}

          {mode === 'ai' && !winner && phase === 'playing' && (
            <p className="text-center text-sm text-slate-400">{turn === 'X' ? 'Your turn' : 'AI thinking…'}</p>
          )}
        </>
      )}
    </div>
  );
}
