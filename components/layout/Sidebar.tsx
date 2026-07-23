'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  LayoutDashboard,
  FileCheck,
  MessageSquareWarning,
  ShieldCheck,
  Users,
  History,
  FilePlus,
  LogOut,
  ChevronRight,
  ChevronDown,
  Sparkles,
  X,
  Bell,
  KeyRound,
  Trash2,
  HardDrive,
  Database,
} from 'lucide-react';
interface SidebarProps {
  userRole: 'ADMIN' | 'SUPERVISOR' | 'AGENT';
  username: string;
  pagePermissions?: any[];
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ userRole, username, pagePermissions = [], isOpenMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  // Dynamic permission helper — checks page_permissions from RBAC database
  // Falls back to hardcoded role check if no DB permissions available (backward compat)
  const hasPageAccess = (route: string): boolean => {
    if (pagePermissions.length > 0) {
      const perm = pagePermissions.find((p) => p.page_route === route);
      if (perm) return perm.can_access;
      return false;
    }
    // Fallback: hardcoded defaults when pagePermissions not yet loaded
    return true;
  };
  const hasPageWrite = (route: string): boolean => {
    if (pagePermissions.length > 0) {
      const perm = pagePermissions.find((p) => p.page_route === route);
      if (perm) return perm.can_write;
      return false;
    }
    return false;
  };

  // Pending counts for sidebar badges (approval + feedback)
  const [pendingCount, setPendingCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);

  useEffect(() => {
    const fetchPendingCount = () => {
      fetch('/api/approval/pending-count')
        .then((r) => r.json())
        .then((data) => {
          setPendingCount(data.total || 0);
          setFeedbackCount(data.feedbacks || 0);
        })
        .catch(() => {});
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []); // No dependency on pagePermissions — server-side handles permission filtering

  // SOP sub-items — show/hide based on page_permissions from DB
  const sopSubItems = [
    { label: 'คลังเอกสาร SOP', href: '/sops', icon: BookOpen, show: hasPageAccess('/sops') },
    { label: 'สร้าง SOP ใหม่', href: '/sops/new', icon: FilePlus, show: hasPageAccess('/sops/new') && hasPageWrite('/sops/new') },
    { label: 'รออนุมัติ SOP', href: '/approval', icon: FileCheck, show: hasPageAccess('/approval'), badge: pendingCount },
    { label: 'ข้อเสนอแนะ SOP', href: '/feedback', icon: MessageSquareWarning, show: hasPageAccess('/feedback'), badge: feedbackCount },
    { label: 'ถังขยะ (Trash)', href: '/sops/trash', icon: Trash2, show: hasPageAccess('/sops/trash') },
  ];

  // Determine if any SOP sub-item is active
  const isSOPActive = sopSubItems.some(
    (item) => item.href !== '/dashboard' && pathname.startsWith(item.href)
  );

  // SOP section expand state - auto-expand if a child is active
  const [sopExpanded, setSopExpanded] = useState(isSOPActive);

  // Auto-expand when navigating to a SOP page from outside (search, direct link)
  useEffect(() => {
    if (isSOPActive) setSopExpanded(true);
  }, [isSOPActive]);

  // จัดการบัญชีผู้ใช้ sub-items — also from DB permissions
  const accountsSubItems = [
    { label: 'ตั้งค่ารหัสผ่าน', href: '/settings/password', icon: KeyRound, show: hasPageAccess('/settings/password') },
    { label: 'จัดการผู้ใช้งาน & ตำแหน่ง', href: '/settings/users', icon: Users, show: hasPageAccess('/settings/users') },
    { label: 'จัดการสิทธิ์ระบบ (RBAC)', href: '/settings/permissions', icon: ShieldCheck, show: hasPageAccess('/settings/permissions') },
    { label: 'ตั้งค่าฐานข้อมูล (DB)', href: '/settings/database', icon: Database, show: hasPageAccess('/settings/database') },
    { label: 'จัดการ Backup', href: '/settings/backups', icon: HardDrive, show: hasPageAccess('/settings/audit-logs') },
    { label: 'บันทึกระบบ (Audit Logs)', href: '/settings/audit-logs', icon: History, show: hasPageAccess('/settings/audit-logs') },
  ];

  // Determine if any accounts sub-item is active
  const isAccountsActive = accountsSubItems.some(
    (item) => pathname.startsWith(item.href)
  );

  // Accounts section expand state - auto-expand if a child is active
  const [accountsExpanded, setAccountsExpanded] = useState(isAccountsActive);

  // Auto-expand when navigating to an accounts page from outside
  useEffect(() => {
    if (isAccountsActive) setAccountsExpanded(true);
  }, [isAccountsActive]);

  // Pre-computed classNames (avoid Turbopack template-literal parsing bug in nested elements)
  const chevronIconClass = `w-4 h-4 transition-transform duration-200 ${sopExpanded ? 'rotate-0' : '-rotate-90'} ${isSOPActive ? 'text-indigo-200' : 'text-slate-500'}`;
  const bookOpenClass = `w-4 h-4 ${isSOPActive && sopExpanded ? 'text-white' : 'text-slate-400 group-hover:text-slate-100'}`;

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    window.location.href = '/login';
  };

  const roleBadges: Record<string, { bg: string; text: string }> = {
    ADMIN: { bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30', text: 'Admin' },
    SUPERVISOR: { bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30', text: 'Supervisor' },
    AGENT: { bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', text: 'Agent' },
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-slate-900 border-r border-slate-800 text-slate-200 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                SOP Knowledge Base
              </h1>
              <p className="text-[11px] text-indigo-400 font-medium flex items-center gap-1">
                <span>AI-Powered Engine</span>
              </p>
            </div>
          </Link>
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>


        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            เมนูการใช้งาน
          </div>

          {/* Dashboard */}
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              pathname === '/dashboard'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className={`w-4 h-4 ${pathname === '/dashboard' ? 'text-white' : 'text-slate-400'}`} />
              <span>แดชบอร์ดหลัก</span>
            </div>
            {pathname === '/dashboard' && <ChevronRight className="w-4 h-4 text-indigo-200" />}
          </Link>

          {/* SOP Group - Collapsible Section */}
          <div className="pt-2">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setSopExpanded(!sopExpanded)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSopExpanded(!sopExpanded);
                }
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer select-none group ${
                isSOPActive
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className={bookOpenClass} />
                <span>SOP</span>
              </div>
              <ChevronDown className={chevronIconClass} />
            </div>

            {/* Sub-items - animated expand/collapse */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                sopExpanded ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="ml-2 space-y-0.5 border-l-2 border-slate-700/50 pl-2">
                {sopSubItems
                  .filter((item) => item.show)
                  .map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onCloseMobile}
                        className={`flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-indigo-600/40 text-white shadow-sm font-semibold border border-indigo-500/30'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-300' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                        {/* Pending count badge for approval */}
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-rose-500 text-white rounded-full shadow-lg shadow-rose-500/30">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                        {isActive && !(item.badge !== undefined && item.badge > 0) && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        )}
                      </Link>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Single items below SOP group */}
          {[
            { label: 'ประกาศข่าวสาร', href: '/announcements', icon: Bell, show: hasPageAccess('/announcements') },
          ]
            .filter((item) => item.show)
            .map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <div key={item.href} className="pt-0.5">
                  <Link
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4 text-indigo-200" />}
                  </Link>
                </div>
              );
            })}

          {/* จัดการบัญชีผู้ใช้ Group - Collapsible Section */}
          <div className="pt-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setAccountsExpanded(!accountsExpanded)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setAccountsExpanded(!accountsExpanded);
                }
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer select-none group ${
                isAccountsActive
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className={`w-4 h-4 ${isAccountsActive && accountsExpanded ? 'text-white' : 'text-slate-400 group-hover:text-slate-100'}`} />
                <span>จัดการบัญชีผู้ใช้</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${accountsExpanded ? 'rotate-0' : '-rotate-90'} ${isAccountsActive ? 'text-indigo-200' : 'text-slate-500'}`} />
            </div>

            {/* Sub-items - animated expand/collapse */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                accountsExpanded ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="ml-2 space-y-0.5 border-l-2 border-slate-700/50 pl-2">
                {accountsSubItems
                  .filter((item) => item.show)
                  .map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onCloseMobile}
                        className={`flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-indigo-600/40 text-white shadow-sm font-semibold border border-indigo-500/30'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-300' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                        {isActive && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        )}
                      </Link>
                    );
                  })}
              </div>
            </div>
          </div>
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-sm">
                {username ? username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <p className="text-sm font-semibold text-slate-200 truncate">{username}</p>
                <span
                  className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                    roleBadges[userRole]?.bg || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {roleBadges[userRole]?.text || userRole}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="ออกจากระบบ"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
