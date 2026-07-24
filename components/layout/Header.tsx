'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

interface HeaderProps {
  userRole: 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'AGENT';
  username: string;
  onOpenMobileSidebar: () => void;
}

export function Header({ userRole, username, onOpenMobileSidebar }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400 font-medium">ระบบพร้อมใช้งาน (Online)</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <NotificationBell />

        {/* User Info Badge */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg">
          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
            {username ? username.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="text-xs font-semibold text-slate-200 hidden sm:inline">{username}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
            {userRole}
          </span>
        </div>
      </div>
    </header>
  );
}
