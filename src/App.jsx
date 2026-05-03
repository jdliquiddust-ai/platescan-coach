import { useState } from 'react';
import { getCurrentUser, isOnboarded } from './utils/storage';
import { UserContext } from './context/UserContext';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import LogMeal from './pages/LogMeal';
import History from './pages/History';
import Settings from './pages/Settings';
import Navigation from './components/Navigation';

export default function App() {
  const [username, setUsername] = useState(() => getCurrentUser());
  const [page, setPage] = useState('dashboard');
  const [onboarded, setOnboardedState] = useState(() => {
    const u = getCurrentUser();
    return u ? isOnboarded(u) : false;
  });

  const handleAuth = (user) => {
    setUsername(user);
    setOnboardedState(isOnboarded(user));
    setPage('dashboard');
  };

  const handleLogout = () => {
    setUsername(null);
    setOnboardedState(false);
    setPage('dashboard');
  };

  if (!username) return <Auth onAuth={handleAuth} />;

  if (!onboarded) {
    return (
      <UserContext.Provider value={username}>
        <Onboarding onComplete={() => setOnboardedState(true)} />
      </UserContext.Provider>
    );
  }

  return (
    <UserContext.Provider value={username}>
      <div className="flex justify-center min-h-screen" style={{ background: 'linear-gradient(160deg,#060d06 0%,#0a1a0f 50%,#060d06 100%)' }}>
        <div className="w-full max-w-[430px] min-h-screen flex flex-col relative pb-20">
          {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
          {page === 'log'       && <LogMeal onBack={() => setPage('dashboard')} onDone={() => setPage('dashboard')} />}
          {page === 'history'   && <History />}
          {page === 'settings'  && <Settings onLogout={handleLogout} />}
          <Navigation current={page} onNavigate={setPage} />
        </div>
      </div>
    </UserContext.Provider>
  );
}
