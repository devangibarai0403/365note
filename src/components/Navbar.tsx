'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { QuickAddModal } from './QuickAddModal';
import {
  Menu,
  Plus,
  LogOut,
  UserCheck,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  onMenuToggle: () => void;
  onRefresh?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuToggle, onRefresh }) => {
  const { user, switchUser, logout } = useAuth();
  const { toast } = useToast();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleSwitch = async (username: string) => {
    setUserDropdownOpen(false);
    setSwitching(true);
    const success = await switchUser(username);
    setSwitching(false);
    if (success) {
      toast(`Switched persona to ${username.toUpperCase()}!`, 'success');
      onRefresh?.();
    } else {
      toast(`Failed to switch to ${username}`, 'error');
    }
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

        {/* Right Side: Quick Add + Persona Switcher + Logout */}
        <div className="flex items-center gap-3">
          {/* Quick Add Button */}
          <button
            onClick={() => setQuickAddOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-all hover:shadow-indigo-200 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden xs:inline">Quick Add</span>
          </button>

          {/* User Persona Switcher */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div
                className={`w-7 h-7 rounded-lg ${getPersonaColor()} flex items-center justify-center font-bold text-xs uppercase shadow-sm`}
              >
                {user?.username?.[0] || 'U'}
              </div>
              <div className="hidden md:block text-left">
                <span className="block text-xs font-bold text-slate-800 leading-tight">
                  {user?.display_name || 'User'}
                </span>
                <span className="block text-[10px] text-slate-400 capitalize font-medium">
                  {user?.role || 'Guest'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Persona Switcher Dropdown */}
            {userDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Switch User Persona
                    </p>
                  </div>

                  <button
                    onClick={() => handleSwitch('admin')}
                    disabled={switching}
                    className={`w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      user?.username === 'admin' ? 'text-amber-600 bg-amber-50/50' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span>Admin (Full Access)</span>
                    </div>
                    {user?.username === 'admin' && <UserCheck className="w-4 h-4 text-amber-600" />}
                  </button>

                  <button
                    onClick={() => handleSwitch('devangi')}
                    disabled={switching}
                    className={`w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      user?.username === 'devangi' ? 'text-pink-600 bg-pink-50/50' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                      <span>Devangi (Classes/School)</span>
                    </div>
                    {user?.username === 'devangi' && <UserCheck className="w-4 h-4 text-pink-600" />}
                  </button>

                  <button
                    onClick={() => handleSwitch('shrikesh')}
                    disabled={switching}
                    className={`w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      user?.username === 'shrikesh' ? 'text-sky-600 bg-sky-50/50' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                      <span>Shrikesh (Office)</span>
                    </div>
                    {user?.username === 'shrikesh' && <UserCheck className="w-4 h-4 text-sky-600" />}
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    onClick={logout}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
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
