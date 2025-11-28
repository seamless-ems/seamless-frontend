import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { User } from './types';
import { Login } from './pages/Login';
import { SpeakerIntake } from './pages/SpeakerIntake';
import { SpeakerPortal } from './pages/SpeakerPortal';
import { AdminDashboard } from './pages/AdminDashboard';
import { Schedule } from './pages/Schedule';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState('schedule');

  // Simple hash router effect
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'schedule';
      setActivePage(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Init
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (page: string) => {
    window.location.hash = page;
  };

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    // Redirect based on role
    if (newUser.role === 'ADMIN') navigate('admin');
    else navigate('portal');
  };

  const handleLogout = () => {
    setUser(null);
    navigate('schedule');
  };

  // Guard routes
  const renderContent = () => {
    switch (activePage) {
      case 'login':
        return <Login onLogin={handleLogin} />;
      case 'intake':
        // If logged in, redirect away from intake
        if (user) {
            navigate(user.role === 'ADMIN' ? 'admin' : 'portal');
            return null; 
        }
        return <SpeakerIntake onComplete={() => navigate('login')} />;
      case 'portal':
        if (!user || user.role !== 'SPEAKER') return <Login onLogin={handleLogin} />;
        return <SpeakerPortal user={user} />;
      case 'admin':
        if (!user || user.role !== 'ADMIN') return <Login onLogin={handleLogin} />;
        return <AdminDashboard />;
      case 'schedule':
      default:
        return <Schedule />;
    }
  };

  // Login page has its own layout wrapper, other pages share the dashboard layout
  if (activePage === 'login') {
      return renderContent();
  }

  return (
    <Layout 
      user={user} 
      activePage={activePage} 
      onNavigate={navigate} 
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
}
