'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Sparkles, Shield, User, GraduationCap, Building2, ArrowRight, Loader2, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { switchUser } = useAuth();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [activePersona, setActivePersona] = useState<string | null>(null);

  const personas = [
    {
      id: 'admin',
      name: 'Admin',
      roleText: 'Master Dashboard & Full Controls',
      badge: 'Admin Access',
      color: 'from-amber-500 to-amber-600',
      icon: Shield,
      pin: '3725',
    },
    {
      id: 'devangi',
      name: 'Devangi',
      roleText: 'Classes, School, Kharcha & Family',
      badge: 'Devangi Space',
      color: 'from-rose-500 to-pink-600',
      icon: GraduationCap,
      pin: '1111',
    },
    {
      id: 'shrikesh',
      name: 'Shrikesh',
      roleText: 'Office, Kharcha & Family',
      badge: 'Shrikesh Space',
      color: 'from-sky-500 to-indigo-600',
      icon: Building2,
      pin: '2222',
    },
  ];

  const handleQuickLogin = async (personaId: string, defaultPin: string) => {
    setLoading(true);
    setActivePersona(personaId);
    try {
      const ok = await switchUser(personaId, defaultPin);
      if (ok) {
        toast(`Welcome back, ${personaId.toUpperCase()}!`, 'success');
        window.location.href = '/';
      } else {
        toast(`Failed to sign in as ${personaId}`, 'error');
      }
    } finally {
      setLoading(false);
      setActivePersona(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast('Please enter username', 'error');
      return;
    }

    setLoading(true);
    try {
      const ok = await switchUser(username.trim().toLowerCase(), pinCode);
      if (ok) {
        toast('Logged in successfully', 'success');
        router.push('/');
      } else {
        toast('Invalid username or PIN code', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full relative z-10 space-y-8 my-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-xl shadow-indigo-500/30">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            365<span className="text-indigo-400">note</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Personal work & money management system for Devangi, Shrikesh & Admin.
          </p>
        </div>

        {/* 1-Click Fast Persona Switcher */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/15 p-6 rounded-3xl shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase font-extrabold tracking-wider text-indigo-300">
              Select Your Profile to Sign In
            </h2>
            <span className="text-[11px] text-slate-400">Instant 1-Click Access</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {personas.map(p => {
              const Icon = p.icon;
              const isSelected = activePersona === p.id;

              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLogin(p.id, p.pin)}
                  className="group relative p-4 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 text-left transition-all hover:scale-[1.02] flex flex-col justify-between min-h-[140px] disabled:opacity-50"
                >
                  <div>
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${p.color} flex items-center justify-center text-white mb-3 shadow-md`}
                    >
                      {isSelected ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <h3 className="font-bold text-white text-base leading-tight group-hover:text-indigo-300 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">
                      {p.roleText}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                    <span className="text-[10px] uppercase font-bold text-indigo-300/80">
                      Login as {p.name}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-300 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Manual Login Accordion / Form */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold uppercase tracking-wider">
            <KeyRound className="w-4 h-4 text-indigo-400" />
            <span>Or Enter Credentials</span>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Username (admin / devangi / shrikesh)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  PIN Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    placeholder="Enter PIN"
                    value={pinCode}
                    onChange={e => setPinCode(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Sign In to 365note
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500">
          Secure, authenticated role-based tracking system • 365note
        </p>
      </div>
    </div>
  );
}
