'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Lock, User, KeyRound, ArrowRight, Loader2, ShieldCheck, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { switchUser } = useAuth();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim()) {
      toast('Please enter your username', 'error');
      return;
    }

    if (!pinCode.trim()) {
      toast('Please enter your PIN code', 'error');
      return;
    }

    setLoading(true);
    try {
      const ok = await switchUser(username.trim().toLowerCase(), pinCode.trim());
      if (ok) {
        toast('Signed in successfully', 'success');
        window.location.href = '/';
      } else {
        setErrorMessage('Invalid username or PIN code. Please verify and try again.');
        toast('Authentication failed', 'error');
      }
    } catch {
      setErrorMessage('Connection error. Please try again.');
      toast('Authentication error', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle, formal ambient background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 space-y-6">
        {/* Brand Logo & Formal Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            365<span className="text-indigo-400">note</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Management & Tracking Portal
          </p>
        </div>

        {/* Formal Login Card */}
        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/80 py-8 px-6 shadow-2xl rounded-3xl sm:px-10 space-y-6">
          <div className="border-b border-slate-700/60 pb-4">
            <h2 className="text-base font-bold text-white tracking-tight">
              Enter Credentials
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Sign in with your assigned username and security PIN
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="pin"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Security PIN
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <KeyRound className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="pin"
                  name="pin"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Enter your PIN"
                  value={pinCode}
                  onChange={e => setPinCode(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium tracking-widest"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-600/30 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 active:scale-[0.99]"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-slate-700/60 text-center">
            <p className="text-[11px] text-slate-500 font-medium">
              Authorized Personnel Only • Secure Access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
