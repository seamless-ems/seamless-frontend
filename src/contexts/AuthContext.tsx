import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setCurrentToken, setTokenAndNotify, clearTokenAndNotify, setUserAndNotify, clearUserAndNotify } from '@/lib/session';

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

  useEffect(() => {
    // Check for existing session
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        // Keep in-memory session in sync for non-react consumers
        setCurrentToken(storedToken);
        setUser(JSON.parse(storedUser));
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
          setUser(JSON.parse(u));
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
