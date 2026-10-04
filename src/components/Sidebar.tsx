'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  GraduationCap,
  School as SchoolIcon,
  Building2,
  Wallet,
  Users2,
  FileSpreadsheet,
  CalendarDays,
  FileText,
  Sparkles,
  CheckSquare,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role || 'admin';

  // Navigation configurations strictly adhering to Requirement 10
  const getNavItems = () => {
    if (role === 'devangi') {
      return [
        { label: 'Dashboard', href: '/', icon: LayoutDashboard },
        { label: 'Daily Planner', href: '/planner', icon: CheckSquare },
        { label: 'Classes', href: '/classes', icon: GraduationCap },
        { label: 'School', href: '/school', icon: SchoolIcon },
        { label: 'Daily Kharcha', href: '/kharcha', icon: Wallet },
        { label: 'Family Money', href: '/family-money', icon: Users2 },
        { label: 'Monthly Report', href: '/reports', icon: FileText },
      ];
    }

    if (role === 'shrikesh') {
      return [
        { label: 'Dashboard', href: '/', icon: LayoutDashboard },
        { label: 'Daily Planner', href: '/planner', icon: CheckSquare },
        { label: 'Office', href: '/office', icon: Building2 },
        { label: 'Daily Kharcha', href: '/kharcha', icon: Wallet },
        { label: 'Family Money', href: '/family-money', icon: Users2 },
        { label: 'Monthly Report', href: '/reports', icon: FileText },
      ];
    }

    // Admin has access to all modules
    return [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'Daily Planner', href: '/planner', icon: CheckSquare },
      { label: 'Classes', href: '/classes', icon: GraduationCap },
      { label: 'Schools', href: '/school', icon: SchoolIcon },
      { label: 'Office', href: '/office', icon: Building2 },
      { label: 'Daily Kharcha', href: '/kharcha', icon: Wallet },
      { label: 'Family Money', href: '/family-money', icon: Users2 },
      { label: 'Excel Import', href: '/excel-import', icon: FileSpreadsheet },
      { label: 'Calendar', href: '/calendar', icon: CalendarDays },
      { label: 'Reports', href: '/reports', icon: FileText },
    ];
  };

  const navItems = getNavItems();

  const getRoleBadge = () => {
    if (role === 'admin') {
      return {
        bg: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white',
        label: 'Admin Portal',
      };
    }
    if (role === 'devangi') {
      return {
        bg: 'bg-gradient-to-r from-rose-500 to-pink-600 text-white',
        label: "Devangi's Space",
      };
    }
    return {
      bg: 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white',
      label: "Shrikesh's Space",
    };
  };

  const badge = getRoleBadge();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white/95 backdrop-blur-md border-r border-slate-200/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-slate-800">
                365<span className="text-indigo-600">note</span>
              </span>
              <span className="block text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                Personal Tracker
              </span>
            </div>
          </Link>
        </div>

        {/* Current Active User Pill */}
        <div className="px-5 py-4">
          <div className={`p-3 rounded-xl shadow-sm ${badge.bg}`}>
            <p className="text-xs uppercase font-medium tracking-wide opacity-80">Logged In As</p>
            <p className="text-base font-bold capitalize">{user?.display_name || role}</p>
            <p className="text-[11px] opacity-90 mt-0.5">{badge.label}</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'text-indigo-600 scale-110' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 text-xs text-slate-400 text-center">
          365note System • v1.0
        </div>
      </aside>
    </>
  );
};
