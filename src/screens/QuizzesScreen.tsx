import { useEffect, useState } from 'react';
import { ArrowLeft, HelpCircle, ChevronRight, Clock, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNav } from '@/lib/nav';
import { SkeletonList, EmptyState } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import type { Quiz, Question } from '@/lib/types';

export function QuizzesScreen() {
  const { view, viewParams, navigate, goBack } = useNav();
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('quizzes')
        .select('*, subjects(name, classes(name))')
        .order('created_at', { ascending: false });
      setQuizzes((data as unknown as Quiz[]) ?? []);
    })();
  }, []);

  if (view === 'quiz') {
    return <QuizPlayer quizId={viewParams?.id ?? ''} onBack={goBack} />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-6 w-6 text-accent-400" />
        <h1 className="font-display text-2xl font-bold">Quizzes</h1>
      </div>
      <p className="text-sm text-slate-400">Test your knowledge and earn points for every correct answer.</p>

      {!quizzes ? <SkeletonList count={4} /> : quizzes.length === 0 ? (
        <EmptyState icon={<HelpCircle className="h-8 w-8" />} title="No quizzes yet" message="Browse classes to find quizzes." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {quizzes.map((q, i) => {
            const meta = q as unknown as { subjects?: { name?: string; classes?: { name?: string } } };
            return (
              <button
                key={q.id}
                onClick={() => navigate('quiz', { id: q.id })}
                className="card card-hover group p-4 text-left animate-fade-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{q.title}</h3>
                  <span className={`badge ${
                    q.difficulty === 'easy' ? 'bg-success-500/15 text-success-400' :
                    q.difficulty === 'medium' ? 'bg-warning-500/15 text-warning-400' :
                    'bg-error-500/15 text-error-400'
                  }`}>{q.difficulty}</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">{q.description}</p>
                {meta.subjects && (
                  <p className="mt-2 text-xs text-slate-500">
                    {meta.subjects.classes?.name} · {meta.subjects.name}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {q.time_limit_seconds && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {q.time_limit_seconds}s</span>}
                    <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" /> {q.points_per_correct} pts</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-500 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuizPlayer({ quizId, onBack }: { quizId: string; onBack: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<'intro' | 'playing' | 'submitting' | 'result'>('intro');
  const [result, setResult] = useState<{ score: number; total: number; points_awarded: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [q, qs] = await Promise.all([
        supabase.from('quizzes').select('*').eq('id', quizId).maybeSingle(),
        supabase.from('questions').select('*').eq('quiz_id', quizId).order('sort_order'),
      ]);
      setQuiz(q.data as Quiz | null);
      setQuestions((qs.data as Question[]) ?? []);
    })();
  }, [quizId]);

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || !quiz?.time_limit_seconds) return;
    setTimeLeft(quiz.time_limit_seconds);
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null) return null;
        if (t <= 1) {
          clearInterval(interval);
          submitQuiz();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, quiz]);

  const startQuiz = () => {
    setPhase('playing');
    setCurrent(0);
    setAnswers([]);
    setSelected(null);
  };

  const nextQuestion = () => {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);
    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      submitQuiz(newAnswers);
    }
  };

  const submitQuiz = async (finalAnswers?: number[]) => {
    const allAnswers = finalAnswers ?? [...answers, selected ?? -1];
    setPhase('submitting');
    setError(null);
    try {
      if (!profile) throw new Error('Not signed in.');
      const { data, error: rpcError } = await supabase.rpc('submit_quiz_result', {
        p_profile_id: profile.id,
        p_quiz_id: quizId,
        p_answers: allAnswers,
        p_duration_seconds: quiz?.time_limit_seconds ? quiz.time_limit_seconds - (timeLeft ?? 0) : null,
      });
      if (rpcError) throw rpcError;
      const r = data as { score: number; total: number; points_awarded: number };
      setResult({ score: r.score, total: r.total, points_awarded: r.points_awarded });
      setPhase('result');
      refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit quiz.');
      setPhase('playing');
    }
  };

  if (phase === 'intro' && quiz) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={onBack} className="btn-ghost px-3 py-2 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="card mx-auto max-w-lg p-6 text-center">
          <div className="mx-auto mb-4 w-fit rounded-2xl bg-accent-500/15 p-4">
            <HelpCircle className="h-8 w-8 text-accent-400" />
          </div>
          <h1 className="font-display text-2xl font-bold">{quiz.title}</h1>
          <p className="mt-2 text-sm text-slate-400">{quiz.description}</p>
          <div className="mt-4 flex justify-center gap-3">
            <span className={`badge ${quiz.difficulty === 'easy' ? 'bg-success-500/15 text-success-400' : quiz.difficulty === 'medium' ? 'bg-warning-500/15 text-warning-400' : 'bg-error-500/15 text-error-400'}`}>{quiz.difficulty}</span>
            {quiz.time_limit_seconds && <span className="badge bg-white/5 text-slate-300"><Clock className="h-3 w-3" /> {quiz.time_limit_seconds}s</span>}
            <span className="badge bg-white/5 text-slate-300">{questions.length} questions</span>
            <span className="badge bg-white/5 text-slate-300"><Trophy className="h-3 w-3" /> {quiz.points_per_correct} pts each</span>
          </div>
          <button onClick={startQuiz} className="btn-primary mt-6 w-full py-3.5">
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'result' && result) {
    const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="card mx-auto max-w-lg p-8 text-center">
          <div className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full ${pct >= 80 ? 'bg-success-500/15' : pct >= 50 ? 'bg-warning-500/15' : 'bg-error-500/15'}`}>
            <Trophy className={`h-12 w-12 ${pct >= 80 ? 'text-success-400' : pct >= 50 ? 'text-warning-400' : 'text-error-400'}`} />
          </div>
          <h1 className="font-display text-3xl font-bold">{pct}%</h1>
          <p className="mt-1 text-slate-400">{result.score} out of {result.total} correct</p>
          <div className="mt-4 rounded-xl bg-brand-500/10 p-3">
            <p className="text-sm text-slate-300">Points earned</p>
            <p className="font-display text-2xl font-bold text-brand-400">+{result.points_awarded}</p>
          </div>
          <button onClick={onBack} className="btn-ghost mt-6 w-full py-3">
            Back to quizzes
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'submitting') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        <p className="text-sm text-slate-400">Submitting your answers…</p>
      </div>
    );
  }

  // Playing
  const q = questions[current];
  if (!quiz || !q) return <div className="py-12 text-center text-slate-400">Loading quiz…</div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="btn-ghost px-3 py-2 text-sm">
          <ArrowLeft className="h-4 w-4" /> Quit
        </button>
        {timeLeft !== null && (
          <span className={`badge ${timeLeft <= 10 ? 'bg-error-500/15 text-error-400' : 'bg-white/5 text-slate-300'}`}>
            <Clock className="h-3 w-3" /> {timeLeft}s
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-brand-500 transition-all duration-300" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
        <span className="text-xs text-slate-400">{current + 1}/{questions.length}</span>
      </div>

      {/* Question */}
      <div className="card p-6 animate-scale-in">
        <p className="text-xs font-semibold text-brand-400">Question {current + 1}</p>
        <h2 className="mt-2 text-lg font-semibold">{q.question_text}</h2>
        <div className="mt-4 space-y-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                selected === i
                  ? 'border-brand-500/60 bg-brand-500/10 text-white'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
              }`}
            >
              <span className="mr-2 font-mono text-xs text-slate-500">{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-error-400">{error}</p>}

      <button
        onClick={nextQuestion}
        disabled={selected === null}
        className="btn-primary w-full py-3.5"
      >
        {current + 1 < questions.length ? 'Next Question' : 'Submit Quiz'}
      </button>
    </div>
  );
}

