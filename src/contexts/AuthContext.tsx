import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setCurrentToken, setTokenAndNotify, clearTokenAndNotify, setUserAndNotify, clearUserAndNotify } from '@/lib/session';
import UpdateNameDialog from '@/components/account/UpdateNameDialog';
import { updateMe } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpdateName, setShowUpdateName] = useState(false);
  const skipKey = (uid?: string | null) => `seamless-skip-update-name`;
  const isSkipped = (uid?: string | null) => {
    try {
      return !!localStorage.getItem(skipKey(uid));
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    // Check for existing session
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        // Keep in-memory session in sync for non-react consumers
        setCurrentToken(storedToken);
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        const displayName = (parsed?.name || '').trim();
        if ((!displayName || displayName === 'Seamless User') && !isSkipped(parsed?.id)) setShowUpdateName(true);
      } catch {
        // Invalid stored data, clear it
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
    
    setIsLoading(false);

    // Listen for external auth changes (e.g. firebase auth helper)
    const onTokenChanged = () => {
      const t = localStorage.getItem('auth_token');
      setToken(t);
      // keep session module in sync
      setCurrentToken(t);
    };

    const onUserChanged = () => {
      const u = localStorage.getItem('auth_user');
      if (u) {
        try {
          const parsed = JSON.parse(u);
          setUser(parsed);
          const displayName = (parsed?.name || '').trim();
          if ((!displayName || displayName === 'Seamless User') && !isSkipped(parsed?.id)) setShowUpdateName(true);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    window.addEventListener('auth-token-changed', onTokenChanged as EventListener);
    window.addEventListener('auth-user-changed', onUserChanged as EventListener);

    return () => {
      window.removeEventListener('auth-token-changed', onTokenChanged as EventListener);
      window.removeEventListener('auth-user-changed', onUserChanged as EventListener);
    };
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    // Keep session helpers in sync (writes localStorage + notifies listeners)
    setTokenAndNotify(newToken);
    setUserAndNotify(newUser);
    // If this account has no display name yet (or backend default), prompt the user to add one.
    const displayName = (newUser?.name || '').trim();
    try {
      const skipped = !!localStorage.getItem(skipKey(newUser?.id));
      if ((!displayName || displayName === 'Seamless User') && !skipped) {
        setShowUpdateName(true);
      }
    } catch (e) {
      if (!displayName || displayName === 'Seamless User') setShowUpdateName(true);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    clearTokenAndNotify();
    clearUserAndNotify();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
      }}
    >
      {children}
      <UpdateNameDialog
        open={showUpdateName}
        onOpenChange={(open) => setShowUpdateName(open)}
        initialName={user?.name || ''}
        userId={user?.id}
        onSave={async (name) => {
          try {
            const res = await updateMe({ name });
            const updated = { ...(user as User), name: res?.name || name };
            setUser(updated);
            setUserAndNotify(updated);
            setShowUpdateName(false);
          } catch (e) {
            console.error('Failed to update name', e);
            throw e;
          }
        }}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
