import { useState } from 'react';
import { ArrowRight, Sparkles, Trophy, Gamepad2, Users } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { setOnboarded } from '@/lib/storage';

export function WelcomeScreen({ onGetStarted }: { onGetStarted: () => void }) {
  const [leaving, setLeaving] = useState(false);

  const handleStart = () => {
    setLeaving(true);
    setOnboarded();
    setTimeout(onGetStarted, 550);
  };

  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-ink-950 transition-all duration-500 ${
        leaving ? 'opacity-0 scale-95' : 'opacity-100'
      }`}
    >
      {/* Background grid + glow */}
      <div className="absolute inset-0 bg-grid-dark bg-[size:40px_40px] opacity-40" />
      <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-accent-500/15 blur-[100px]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 pt-8 sm:px-10">
          <Logo />
          <span className="badge bg-white/5 text-slate-300">Beta</span>
        </header>

        {/* Hero */}
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
          {/* Hero visual */}
          <div className="relative mb-8 animate-fade-up">
            <div className="absolute inset-0 animate-pulse-glow rounded-[2rem]" />
            <div className="relative h-44 w-44 rounded-[2rem] bg-gradient-to-br from-brand-500/30 via-accent-500/20 to-transparent p-1 backdrop-blur-sm sm:h-56 sm:w-56">
              <div className="flex h-full w-full items-center justify-center rounded-[1.75rem] bg-ink-850/80">
                <div className="relative">
                  <div className="absolute inset-0 animate-float">
                    <Sparkles className="h-24 w-24 text-brand-400 sm:h-28 sm:w-28" strokeWidth={1.2} />
                  </div>
                  <Sparkles className="h-24 w-24 text-brand-400/40 sm:h-28 sm:w-28" strokeWidth={1.2} />
                </div>
              </div>
            </div>
            {/* Floating chips */}
            <div className="absolute -left-6 top-4 hidden animate-float rounded-xl border border-white/10 bg-ink-800/80 px-3 py-2 text-xs font-semibold text-slate-200 backdrop-blur sm:flex" style={{ animationDelay: '0.5s' }}>
              <Trophy className="mr-1.5 h-4 w-4 text-warning-400" /> Compete
            </div>
            <div className="absolute -right-6 top-16 hidden animate-float rounded-xl border border-white/10 bg-ink-800/80 px-3 py-2 text-xs font-semibold text-slate-200 backdrop-blur sm:flex" style={{ animationDelay: '1s' }}>
              <Gamepad2 className="mr-1.5 h-4 w-4 text-accent-400" /> Play
            </div>
            <div className="absolute -bottom-2 left-1/2 hidden -translate-x-1/2 animate-float rounded-xl border border-white/10 bg-ink-800/80 px-3 py-2 text-xs font-semibold text-slate-200 backdrop-blur sm:flex" style={{ animationDelay: '1.5s' }}>
              <Users className="mr-1.5 h-4 w-4 text-success-400" /> Community
            </div>
          </div>

          <h1 className="animate-fade-up font-display text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: '0.1s' }}>
            Learn. Play. <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">Compete.</span>
          </h1>
          <p className="mt-4 max-w-md animate-fade-up text-base text-slate-400 sm:text-lg" style={{ animationDelay: '0.2s' }}>
            LightXZ brings class-based learning, quizzes, games, and a safe community together —
            earn points, climb the leaderboard, and master your subjects.
          </p>

          <button
            onClick={handleStart}
            className="btn-primary mt-8 animate-fade-up px-8 py-4 text-base sm:px-10 sm:py-5"
            style={{ animationDelay: '0.3s' }}
          >
            Get Started
            <ArrowRight className="h-5 w-5" />
          </button>

          <div className="mt-6 flex animate-fade-up items-center gap-6 text-xs text-slate-500" style={{ animationDelay: '0.4s' }}>
            <span>Free to explore</span>
            <span className="h-1 w-1 rounded-full bg-slate-600" />
            <span>Guest or member</span>
            <span className="h-1 w-1 rounded-full bg-slate-600" />
            <span>Safe & moderated</span>
          </div>
        </main>
      </div>
    </div>
  );
}
