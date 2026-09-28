'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { QuickAddModal } from './QuickAddModal';
import {
  Menu,
  Plus,
  LogOut,
} from 'lucide-react';

interface NavbarProps {
  onMenuToggle: () => void;
  onRefresh?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuToggle, onRefresh }) => {
  const { user, logout } = useAuth();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  const getPersonaColor = () => {
    if (user?.role === 'admin') return 'bg-amber-500 text-white';
    if (user?.role === 'devangi') return 'bg-pink-500 text-white';
    return 'bg-sky-500 text-white';
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between">
        {/* Left Side: Mobile Menu + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2 text-slate-700 font-semibold text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>365note System</span>
          </div>
        </div>

        {/* Right Side: Quick Add + User Profile Badge + Logout */}
        <div className="flex items-center gap-3">
          {/* Quick Add Button */}
          <button
            onClick={() => setQuickAddOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-all hover:shadow-indigo-200 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden xs:inline">Quick Add</span>
          </button>

          {/* User Profile Badge (No switch dropdown) */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200/90 bg-slate-50/70">
            <div
              className={`w-7 h-7 rounded-lg ${getPersonaColor()} flex items-center justify-center font-bold text-xs uppercase shadow-sm`}
            >
              {user?.username?.[0] || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <span className="block text-xs font-bold text-slate-800 leading-tight">
                {user?.display_name || 'User'}
              </span>
              <span className="block text-[10px] text-slate-400 capitalize font-semibold">
                {user?.role || 'Guest'}
              </span>
            </div>
          </div>

          {/* Dedicated Sign Out Button */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-600 text-xs font-bold transition-all disabled:opacity-50"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSuccess={() => {
          onRefresh?.();
        }}
      />
    </>
  );
};
