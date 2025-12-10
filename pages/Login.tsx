import React, { useState } from 'react';
import { User } from '../types';
import { MockGoogleService } from '../services/mockGoogleService';
import { Loader2 } from 'lucide-react';
import { Logo } from '../components/Logo';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState<'ADMIN' | 'SPEAKER' | null>(null);

  const handleLogin = async (role: 'ADMIN' | 'SPEAKER') => {
    setLoading(role);
    try {
      if (role === 'SPEAKER') {
        // redirect to Google OAuth
        const baseUrl = (import.meta as any).env?.VITE_API_URL || '';
        const redirectUri = `${window.location.origin}/#/oauth-callback`;
        const url = `${baseUrl.replace(/\/$/, '')}/google/login?redirect=${encodeURIComponent(redirectUri)}`;
        window.location.assign(url);
        return;
      }

      if (role === 'ADMIN') {
        // Start admin OAuth flow which will redirect back to /#/admin-callback
        const baseUrl = (import.meta as any).env?.VITE_API_URL || '';
        const redirectUri = `${window.location.origin}/#/admin-callback`;
        const url = `${baseUrl.replace(/\/$/, '')}/google/admin/login?redirect=${encodeURIComponent(redirectUri)}`;
        window.location.assign(url);
        return;
      }

      // Fallback: Admin mock/demo login
      const user = await MockGoogleService.login(role);
      onLogin(user);
    } catch (e) {
      console.error(e);
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xl max-w-md w-full space-y-8 text-center">
        <div>
           <div className="w-20 h-20 bg-blue-50 rounded-3xl mx-auto flex items-center justify-center shadow-sm mb-6 border border-blue-100">
               <Logo className="w-12 h-12" />
           </div>
           <h1 className="text-3xl font-bold text-gray-900">Sign in to Seamless EMS</h1>
           <p className="text-gray-500 mt-2">Manage your conference experience</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => handleLogin('SPEAKER')}
            disabled={!!loading}
            className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-all transform active:scale-95 disabled:opacity-50"
          >
            {loading === 'SPEAKER' ? (
              <Loader2 className="animate-spin" />
            ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
            )}
            <span>Continue as Speaker</span>
          </button>

           <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or</span>
                </div>
            </div>

          <button
            onClick={() => handleLogin('ADMIN')}
            disabled={!!loading}
            className="w-full flex items-center justify-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-all transform active:scale-95 disabled:opacity-50"
          >
             {loading === 'ADMIN' && <Loader2 className="animate-spin" />}
             <span>Admin Demo Access</span>
          </button>
        </div>
        
        <p className="text-xs text-gray-400">
            This is a simulation. No real Google authentication occurs.
        </p>
      </div>
    </div>
  );
};