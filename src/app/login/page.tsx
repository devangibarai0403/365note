'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  Lock,
  User,
  KeyRound,
  ArrowRight,
  Loader2,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
} from 'lucide-react';

export default function LoginPage() {
  const { switchUser } = useAuth();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [showPin, setShowPin] = useState(false);
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
      toast('Please enter your security PIN', 'error');
      return;
    }

    setLoading(true);
    try {
      const ok = await switchUser(username.trim().toLowerCase(), pinCode.trim());
      if (ok) {
        toast('Authentication successful', 'success');
        window.location.href = '/';
      } else {
        setErrorMessage('Invalid username or PIN code. Please verify credentials.');
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 relative text-slate-800">
      {/* Top Security Banner */}
      <div className="w-full max-w-md mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/70 border border-slate-300/80 text-[11px] font-semibold text-slate-700 tracking-wide">
          <Shield className="w-3.5 h-3.5 text-slate-700" />
          <span>Restricted Portal • Authorized Personnel Only</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md my-auto">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 sm:p-10 space-y-6">
          {/* Official Emblem & System Title */}
          <div className="text-center space-y-2 pb-2 border-b border-slate-100">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white shadow-xs mx-auto">
              <Building2 className="w-6 h-6 text-slate-100" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                365Note Portal
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Academic & Operations Management System
              </p>
            </div>
          </div>

          {/* Form Header */}
          <div>
            <h2 className="text-sm font-semibold text-slate-800 tracking-tight">
              Sign In to Your Account
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your designated User ID and Security PIN to proceed.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                User ID / Username
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
                  placeholder="Enter User ID (e.g. admin)"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors font-medium"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="pin"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
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
                  type={showPin ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••"
                  value={pinCode}
                  onChange={e => setPinCode(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors font-medium tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                Enter your designated 4-digit PIN code.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security Compliance Statement */}
          <div className="pt-4 border-t border-slate-100 text-center space-y-1">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              This system is encrypted and monitored. Unauthorized access attempts are logged and reported.
            </p>
          </div>
        </div>
      </div>

      {/* System Footer */}
      <div className="w-full max-w-md mx-auto text-center mt-6">
        <p className="text-[11px] text-slate-400 font-medium">
          365Note Operations Platform • System v2.4 • Active
        </p>
      </div>
    </div>
  );
}
