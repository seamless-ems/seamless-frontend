import React from 'react';
import { Calendar, Users, FileText, BarChart3, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { User } from '../types';
import { Logo } from './Logo';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, activePage, onNavigate, onLogout }) => {
  const NavItem = ({ page, icon: Icon, label }: { page: string; icon: any; label: string }) => (
    <button
      onClick={() => onNavigate(page)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        activePage === page 
          ? 'bg-blue-50 text-blue-700 font-medium' 
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-6 flex items-center space-x-3 border-b border-gray-100">
            <div className="bg-blue-50 p-2 rounded-xl">
                <Logo className="w-8 h-8" />
            </div>
          <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Seamless</h1>
              <p className="text-xs font-bold text-blue-600 tracking-wider">EMS</p>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {/* <NavItem page="schedule" icon={Calendar} label="Schedule" /> */}
          
          {!user && (
            <NavItem page="intake" icon={FileText} label="Speaker Registration" />
          )}

          {user?.role === 'SPEAKER' && (
             <NavItem page="portal" icon={Users} label="Speaker Portal" />
          )}

          {user?.role === 'ADMIN' && (
            <>
              {/* <NavItem page="admin" icon={BarChart3} label="Admin Dashboard" /> */}
              <NavItem page="events" icon={FileText} label="Events" />
              <NavItem page="settings" icon={SettingsIcon} label="Settings" />
            </>
          )}
        </nav>

        <div className="p-4 mt-auto border-t border-gray-100">
          {user ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 px-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {user.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={onLogout}
                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
            >
              Sign In
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto h-screen">
        <div className="max-w-7xl mx-auto p-6 md:p-12">
          {children}
        </div>
      </main>
    </div>
  );
};