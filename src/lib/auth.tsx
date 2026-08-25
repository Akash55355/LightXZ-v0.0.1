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
    const resp = await fetch(functionUrl('send-code'), {
      method: 'POST',
      headers: functionHeaders,
      body: JSON.stringify({ email }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      throw new Error(data.error ?? 'Could not send code.');
    }
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    const resp = await fetch(functionUrl('verify-code'), {
      method: 'POST',
      headers: functionHeaders,
      body: JSON.stringify({ email, code }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      throw new Error(data.error ?? 'Verification failed.');
    }

    // The edge function returns real Supabase session tokens.
    // Set them on the client so auth.getSession() and RLS work.
    if (data.access_token && data.refresh_token) {
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
