import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { Profile } from './types';
import { loadGuestProfile, saveGuestProfile, clearGuestProfile } from './storage';

interface AuthState {
  profile: Profile | null;
  loading: boolean;
  isMember: boolean;
  isGuest: boolean;
  isAdmin: boolean;
}

interface AuthContextValue extends AuthState {
  signInAsGuest: (name: string, username: string) => Promise<void>;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const functionUrl = (slug: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${slug}`;

const functionHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
};

async function parseJsonSafe(resp: Response): Promise<Record<string, unknown> | null> {
  try {
    const text = await resp.text();
    if (!text) return null;
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function friendlyError(resp: Response, data: Record<string, unknown> | null, fallback: string): string {
  if (data && typeof data.error === 'string') return data.error;
  if (!resp.ok && resp.status >= 500) return 'Something went wrong on our end. Please try again in a moment.';
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    profile: null,
    loading: true,
    isMember: false,
    isGuest: false,
    isAdmin: false,
  });

  const fetchMemberProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data as Profile | null;
  }, []);

  const ensureMemberProfile = useCallback(async (userId: string, email: string): Promise<Profile | null> => {
    const existing = await fetchMemberProfile(userId);
    if (existing) return existing;
    const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        name: email.split('@')[0],
        username,
        account_type: 'member',
        account_status: 'active',
      })
      .select()
      .maybeSingle();
    if (error) throw error;
    return data as Profile | null;
  }, [fetchMemberProfile]);

  const refreshProfile = useCallback(async () => {
    const guest = loadGuestProfile();
    if (guest) {
      const { data } = await supabase.from('profiles').select('*').eq('id', guest.id).maybeSingle();
      const updated = (data as Profile | null) ?? guest;
      saveGuestProfile(updated);
      setState({ profile: updated, loading: false, isMember: false, isGuest: true, isAdmin: false });
      return;
    }
    const { data: session } = await supabase.auth.getSession();
    if (session.session?.user) {
      const p = await fetchMemberProfile(session.session.user.id);
      if (p) {
        setState({
          profile: p,
          loading: false,
          isMember: true,
          isGuest: false,
          isAdmin: false,
        });
        return;
      }
    }
    setState({ profile: null, loading: false, isMember: false, isGuest: false, isAdmin: false });
  }, [fetchMemberProfile]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const guest = loadGuestProfile();
      if (guest) {
        if (!mounted) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', guest.id).maybeSingle();
        const updated = (data as Profile | null) ?? guest;
        saveGuestProfile(updated);
        setState({ profile: updated, loading: false, isMember: false, isGuest: true, isAdmin: false });
        return;
      }
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user) {
        const p = await ensureMemberProfile(session.session.user.id, session.session.user.email ?? '');
        if (!mounted) return;
        if (p) {
          setState({ profile: p, loading: false, isMember: true, isGuest: false, isAdmin: false });
          return;
        }
      }
      if (!mounted) return;
      setState({ profile: null, loading: false, isMember: false, isGuest: false, isAdmin: false });
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!mounted) return;
        if (session?.user) {
          const p = await ensureMemberProfile(session.user.id, session.user.email ?? '');
          if (!mounted) return;
          if (p) {
            setState({ profile: p, loading: false, isMember: true, isGuest: false, isAdmin: false });
          }
        } else if (!loadGuestProfile()) {
          setState({ profile: null, loading: false, isMember: false, isGuest: false, isAdmin: false });
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [ensureMemberProfile]);

  const signInAsGuest = useCallback(async (name: string, username: string) => {
    const { data, error } = await supabase.rpc('create_guest_profile', {
      p_name: name,
      p_username: username,
    });
    if (error) throw error;
    const guest: Profile = {
      id: data.id,
      name: data.name,
      username: data.username,
      avatar_url: null,
      account_type: 'guest',
      account_status: 'active',
      total_points: 0,
      created_at: new Date().toISOString(),
    };
    saveGuestProfile(guest);
    setState({ profile: guest, loading: false, isMember: false, isGuest: true, isAdmin: false });
  }, []);

  const sendCode = useCallback(async (email: string) => {
    // Try the primary send-code function (generates + stores OTP in DB, sends via Brevo)
    const resp = await fetch(functionUrl('send-code'), {
      method: 'POST',
      headers: functionHeaders,
      body: JSON.stringify({ email }),
    });
    const data = await parseJsonSafe(resp);

    if (resp.ok && data?.ok) return;

    const primaryError = friendlyError(resp, data, 'Could not send code.');

    // Fallback: if the primary function failed, try the standalone send-otp-email function
    try {
      const fallbackResp = await fetch(functionUrl('send-otp-email'), {
        method: 'POST',
        headers: functionHeaders,
        body: JSON.stringify({ email }),
      });
      const fallbackData = await parseJsonSafe(fallbackResp);
      if (fallbackResp.ok && fallbackData?.ok) return;
      throw new Error(friendlyError(fallbackResp, fallbackData, primaryError));
    } catch {
      throw new Error(primaryError);
    }
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    const resp = await fetch(functionUrl('verify-code'), {
      method: 'POST',
      headers: functionHeaders,
      body: JSON.stringify({ email, code }),
    });
    const data = await parseJsonSafe(resp);
    if (!resp.ok || !data?.ok) {
      throw new Error(friendlyError(resp, data, 'Verification failed.'));
    }

    // The edge function returns real Supabase session tokens.
    // Set them on the client so auth.getSession() and RLS work.
    if (typeof data.access_token === 'string' && typeof data.refresh_token === 'string') {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) throw sessionError;
    }
  }, []);

  const signOut = useCallback(async () => {
    clearGuestProfile();
    await supabase.auth.signOut();
    setState({ profile: null, loading: false, isMember: false, isGuest: false, isAdmin: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signInAsGuest, sendCode, verifyCode, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
