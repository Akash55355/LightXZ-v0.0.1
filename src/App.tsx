import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import { NavProvider, useNav } from '@/lib/nav';
import { hasOnboarded } from '@/lib/storage';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import { AccountAccess } from '@/screens/AccountAccess';
import { AppShell } from '@/components/AppShell';
import { HomeScreen } from '@/screens/HomeScreen';
import { ClassesScreen } from '@/screens/ClassesScreen';
import { QuizzesScreen } from '@/screens/QuizzesScreen';
import { GamesScreen } from '@/screens/GamesScreen';
import { LeaderboardScreen } from '@/screens/LeaderboardScreen';
import { CommunityScreen } from '@/screens/CommunityScreen';
import { FullScreenLoader } from '@/components/ui';

type Stage = 'welcome' | 'access' | 'app';

function AppContent() {
  const { profile, loading, isGuest, isMember } = useAuth();
  const { tab } = useNav();

  const [stage, setStage] = useState<Stage>(() => {
    if (!hasOnboarded()) return 'welcome';
    if (profile || loading) return 'app';
    return 'access';
  });

  // If auth finishes and we have a profile, jump to app
  if (stage === 'welcome' && (isMember || isGuest)) {
    setStage('app');
  }
  if (stage === 'access' && (isMember || isGuest)) {
    setStage('app');
  }

  if (stage === 'welcome') {
    return <WelcomeScreen onGetStarted={() => setStage('access')} />;
  }

  if (stage === 'access') {
    return <AccountAccess onBack={() => setStage('welcome')} />;
  }

  if (loading && !profile) {
    return <FullScreenLoader label="Loading LightXZ…" />;
  }

  if (!profile && !isGuest && !isMember) {
    return <AccountAccess onBack={() => setStage('welcome')} />;
  }

  return (
    <AppShell>
      {tab === 'home' && <HomeScreen />}
      {tab === 'classes' && <ClassesScreen />}
      {tab === 'quizzes' && <QuizzesScreen />}
      {tab === 'games' && <GamesScreen />}
      {tab === 'community' && <CommunityScreen />}
      {tab === 'leaderboard' && <LeaderboardScreen />}
    </AppShell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavProvider>
          <AppContent />
        </NavProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
