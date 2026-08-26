import { useState, useRef, useEffect, type FormEvent } from 'react';
import { ArrowLeft, User, Mail, Lock, UserCircle, Sparkles, ShieldCheck, KeyRound } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth';

type Mode = 'choose' | 'guest' | 'email' | 'verify';

export function AccountAccess({ onBack }: { onBack: () => void }) {
  const { signInAsGuest, sendCode, verifyCode } = useAuth();
  const [mode, setMode] = useState<Mode>('choose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // form fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const codeInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setError(null);
    setInfo(null);
    setName(''); setUsername(''); setEmail(''); setCode('');
    setCooldown(0);
  };

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submitGuest = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !username.trim()) { setError('Please enter your name and a username.'); return; }
    setLoading(true);
    try {
      await signInAsGuest(name.trim(), username.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create guest session.');
    } finally {
      setLoading(false);
    }
  };

  const submitEmail = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await sendCode(email.trim());
      setInfo(`A 6-digit code was sent to ${email.trim()}. Check your inbox (and spam folder).`);
      setMode('verify');
      setCooldown(60);
      setTimeout(() => codeInputRef.current?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send code.');
    } finally {
      setLoading(false);
    }
  };

  const submitVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    try {
      await verifyCode(email.trim(), code.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (cooldown > 0) return;
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await sendCode(email.trim());
      setInfo(`A new code was sent to ${email.trim()}.`);
      setCooldown(60);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950">
      <div className="absolute inset-0 bg-grid-dark bg-[size:40px_40px] opacity-30" />
      <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-brand-500/20 blur-[100px]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 pt-6">
          <button onClick={onBack} className="btn-ghost px-3 py-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <Logo size={28} />
        </header>

        <main className="flex flex-1 items-center justify-center px-6 py-8">
          <div className="w-full max-w-md">
            {mode === 'choose' && (
              <div className="animate-scale-in space-y-6">
                <div className="text-center">
                  <h1 className="font-display text-3xl font-bold">Join LightXZ</h1>
                  <p className="mt-2 text-sm text-slate-400">Choose how you want to enter. You can always upgrade later.</p>
                </div>

                {/* Guest */}
                <button
                  onClick={() => { reset(); setMode('guest'); }}
                  className="card card-hover group w-full p-5 text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-accent-500/15 p-3">
                      <Sparkles className="h-6 w-6 text-accent-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Continue as Guest</h3>
                      <p className="mt-1 text-sm text-slate-400">Explore classes, quizzes, games, and the leaderboard. No account needed — progress is saved for this session only.</p>
                    </div>
                  </div>
                </button>

                {/* Member */}
                <button
                  onClick={() => { reset(); setMode('email'); }}
                  className="card card-hover group w-full border-brand-500/30 bg-brand-500/5 p-5 text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-brand-500/15 p-3">
                      <ShieldCheck className="h-6 w-6 text-brand-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Become a Member</h3>
                      <p className="mt-1 text-sm text-slate-400">Permanent account with saved progress, points history, community posting, and profile. Sign in with a one-time email code — no password needed.</p>
                    </div>
                  </div>
                </button>

                <p className="text-center text-sm text-slate-500">
                  Already a member?{' '}
                  <button onClick={() => { reset(); setMode('email'); }} className="font-semibold text-brand-400 hover:text-brand-300">
                    Sign in
                  </button>
                </p>
              </div>
            )}

            {mode === 'guest' && (
              <form onSubmit={submitGuest} className="card animate-scale-in space-y-4 p-6">
                <div className="mb-2 text-center">
                  <div className="mx-auto mb-3 w-fit rounded-xl bg-accent-500/15 p-3">
                    <Sparkles className="h-6 w-6 text-accent-400" />
                  </div>
                  <h2 className="font-display text-2xl font-bold">Guest Access</h2>
                  <p className="mt-1 text-sm text-slate-400">Quick entry — no account needed.</p>
                </div>
                <Field icon={<UserCircle className="h-5 w-5" />} label="Name">
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus />
                </Field>
                <Field icon={<User className="h-5 w-5" />} label="Username">
                  <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Pick a username" />
                </Field>
                {error && <ErrorBox message={error} />}
                <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
                  {loading ? 'Entering…' : 'Enter as Guest'}
                </button>
                <button type="button" onClick={() => { reset(); setMode('choose'); }} className="w-full text-center text-sm text-slate-400 hover:text-slate-300">
                  Back to options
                </button>
              </form>
            )}

            {mode === 'email' && (
              <form onSubmit={submitEmail} className="card animate-scale-in space-y-4 p-6">
                <div className="mb-2 text-center">
                  <div className="mx-auto mb-3 w-fit rounded-xl bg-brand-500/15 p-3">
                    <Mail className="h-6 w-6 text-brand-400" />
                  </div>
                  <h2 className="font-display text-2xl font-bold">Member Access</h2>
                  <p className="mt-1 text-sm text-slate-400">Enter your email and we'll send you a one-time code.</p>
                </div>
                <Field icon={<Mail className="h-5 w-5" />} label="Email">
                  <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
                </Field>
                {error && <ErrorBox message={error} />}
                <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
                  {loading ? 'Sending code…' : 'Send Code'}
                </button>
                <button type="button" onClick={() => { reset(); setMode('choose'); }} className="w-full text-center text-sm text-slate-400 hover:text-slate-300">
                  Back to options
                </button>
              </form>
            )}

            {mode === 'verify' && (
              <form onSubmit={submitVerify} className="card animate-scale-in space-y-4 p-6">
                <div className="mb-2 text-center">
                  <div className="mx-auto mb-3 w-fit rounded-xl bg-brand-500/15 p-3">
                    <KeyRound className="h-6 w-6 text-brand-400" />
                  </div>
                  <h2 className="font-display text-2xl font-bold">Enter Your Code</h2>
                  <p className="mt-1 text-sm text-slate-400">We sent a 6-digit code to <span className="font-medium text-slate-300">{email}</span></p>
                </div>
                {info && !error && <InfoBox message={info} />}
                <Field icon={<KeyRound className="h-5 w-5" />} label="Verification Code">
                  <input
                    ref={codeInputRef}
                    className="input text-center text-2xl tracking-[0.5em] font-mono"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    autoFocus
                  />
                </Field>
                {error && <ErrorBox message={error} />}
                <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full py-3.5">
                  {loading ? 'Verifying…' : 'Verify & Sign In'}
                </button>
                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={() => { reset(); setMode('email'); }} className="text-slate-400 hover:text-slate-300">
                    Change email
                  </button>
                  <button
                    type="button"
                    onClick={resendCode}
                    disabled={cooldown > 0 || loading}
                    className="font-semibold text-brand-400 hover:text-brand-300 disabled:text-slate-500 disabled:hover:text-slate-500"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <span className="text-slate-500">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm text-error-400">
      {message}
    </div>
  );
}

function InfoBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-success-500/30 bg-success-500/10 px-3 py-2 text-sm text-success-400">
      {message}
    </div>
  );
}
