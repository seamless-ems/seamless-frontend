import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { User } from './types';
import { Login } from './pages/Login';
import { SpeakerIntake } from './pages/SpeakerIntake';
import { SpeakerPortal } from './pages/SpeakerPortal';
import { EventDashboard } from './pages/EventDashboard';
import { Events } from './pages/Events';
import { Settings } from './pages/Settings';
import { Schedule } from './pages/Schedule';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState('schedule');

  // Simple hash router effect
  useEffect(() => {
    // Load any previously stored user (e.g. after OAuth redirect)
    try {
      const stored = localStorage.getItem('seamless_user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Could not parse stored user', e);
    }

    // If the app was redirected with an access_token in the hash (e.g. #portal?access_token=...), persist it
    try {
      const rawHash = window.location.hash || '';
      const [routePart, queryPart] = rawHash.replace(/^#/, '').split('?');
      if (queryPart) {
        const params = new URLSearchParams(queryPart);
        const token = params.get('access_token');
        if (token) {
          localStorage.setItem('access_token', token);

          // If we don't already have a stored user, decode the JWT locally and populate seamless_user so the app
          // recognizes the session immediately without an extra backend call.
          const existingUser = localStorage.getItem('seamless_user');
          if (!existingUser) {
            try {
              const payloadBase64 = token.split('.')[1];
              if (payloadBase64) {
                const padded = payloadBase64.padEnd(payloadBase64.length + (4 - (payloadBase64.length % 4)) % 4, '=');
                const json = JSON.parse(decodeURIComponent(escape(window.atob(padded))));
                // Map common claim names to our User shape
                const id = json.id || json.sub || json.user_id || '';
                const name = json.name || (json.first_name && json.last_name ? `${json.first_name} ${json.last_name}` : json.first_name || json.last_name) || '';
                const email = json.email || '';
                // Prefer an explicit role claim when present. Ignore any `is_admin` boolean claim.
                let tokenRole: 'ADMIN' | 'SPEAKER' | undefined;
                if (typeof json.role === 'string') {
                  const r = json.role.toUpperCase();
                  if (r === 'ADMIN' || r === 'SPEAKER') tokenRole = r as any;
                }

                if (id && email) {
                  // If token provides a role, use it. If not, preserve an existing stored user's role to avoid
                  // accidental downgrades. Otherwise default to SPEAKER.
                  let finalRole: 'ADMIN' | 'SPEAKER';
                  try {
                    const existingRaw = localStorage.getItem('seamless_user');
                    if (tokenRole) {
                      finalRole = tokenRole;
                    } else if (existingRaw) {
                      const existing = JSON.parse(existingRaw) as User;
                      finalRole = existing.role === 'ADMIN' ? 'ADMIN' : 'SPEAKER';
                    } else {
                      finalRole = 'SPEAKER';
                    }
                  } catch (e) {
                    finalRole = tokenRole || 'SPEAKER';
                  }

                  const u = { id, name: name || email.split('@')[0], email, role: finalRole } as const;
                  try { localStorage.setItem('seamless_user', JSON.stringify(u)); } catch (e) { /* ignore */ }
                  setUser(u as any);
                }
              }
            } catch (e) {
              // If JWT decode fails, ignore and let the app fetch user via backend when needed
              console.warn('Failed to decode JWT payload locally', e);
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }

    const handleHashChange = () => {
      // Normalize hash: support '#admin?access_token=...' and '#/admin?foo=bar'
      const raw = window.location.hash || '';
      const cleaned = raw.replace(/^#\/?/, '');
      const [routePart] = cleaned.split('?');
      // Take only the first path segment (handle '#/a/b' or '#/a?x')
      const firstSegment = String(routePart || 'schedule').split('/')[0] || 'schedule';
      let hash = firstSegment || 'schedule';
      // Map speaker-intake -> intake for compatibility
      if (hash === 'speaker-intake' || hash.includes('speaker-intake')) {
        hash = 'intake';
      }
      // Debug: show parsed route in console to help troubleshooting
      // eslint-disable-next-line no-console
      console.debug('[router] parsed hash:', { raw, cleaned, routePart, firstSegment, hash });
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
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('seamless_user');
    } catch (e) {
      // ignore
    }
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
      case 'settings':
        if (!user || user.role !== 'ADMIN') return <Login onLogin={handleLogin} />;
        return <Settings />;
      case 'events':
        if (!user || user.role !== 'ADMIN') return <Login onLogin={handleLogin} />;
        return <Events />;
      case 'admin':
        if (!user || user.role !== 'ADMIN') return <Login onLogin={handleLogin} />;
        return <EventDashboard />;
      case 'schedule':
      default:
        return <Events />;
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
