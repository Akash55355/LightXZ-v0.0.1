import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Tab = 'home' | 'classes' | 'quizzes' | 'games' | 'community' | 'leaderboard';

interface NavContextValue {
  tab: Tab;
  setTab: (t: Tab) => void;
  // For deep navigation (subject view, quiz play, etc.)
  view: string | null;
  viewParams: Record<string, string> | null;
  navigate: (view: string, params?: Record<string, string>) => void;
  goBack: () => void;
}

const NavContext = createContext<NavContextValue | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<Tab>('home');
  const [view, setView] = useState<string | null>(null);
  const [viewParams, setViewParams] = useState<Record<string, string> | null>(null);
  const [history, setHistory] = useState<{ view: string | null; params: Record<string, string> | null }[]>([]);

  const navigate = useCallback((v: string, params?: Record<string, string>) => {
    setHistory((h) => [...h, { view, params: viewParams }]);
    setView(v);
    setViewParams(params ?? null);
  }, [view, viewParams]);

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) {
        setView(null);
        setViewParams(null);
        return h;
      }
      const prev = h[h.length - 1];
      setView(prev.view);
      setViewParams(prev.params);
      return h.slice(0, -1);
    });
  }, []);

  const handleSetTab = useCallback((t: Tab) => {
    setTab(t);
    setView(null);
    setViewParams(null);
    setHistory([]);
  }, []);

  return (
    <NavContext.Provider value={{ tab, setTab: handleSetTab, view, viewParams, navigate, goBack }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
}
