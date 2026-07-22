'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { GlobalSearchModal } from '@/components/layout/GlobalSearchModal';
import { AIChatPopup } from '@/components/layout/AIChatPopup';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [user, setUser] = useState<{ username: string; role_name: 'ADMIN' | 'SUPERVISOR' | 'AGENT' } | null>(null);
  const [pagePermissions, setPagePermissions] = useState<any[]>([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setPagePermissions(data.pagePermissions || []);
        } else {
          window.location.href = '/login';
        }
      })
      .catch(() => {
        window.location.href = '/login';
      });

    const handleOpenCmdK = () => setIsCmdKOpen(true);
    window.addEventListener('open-cmd-k', handleOpenCmdK);
    return () => window.removeEventListener('open-cmd-k', handleOpenCmdK);
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Responsive Sidebar */}        <Sidebar
        userRole={user.role_name}
        username={user.username}
        pagePermissions={pagePermissions}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main App Content Container */}
      <div className="flex-1 flex flex-col md:pl-72 min-w-0">
        <Header
          userRole={user.role_name}
          username={user.username}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">{children}</main>
      </div>

      {/* Global Cmd+K Palette */}
      <GlobalSearchModal isOpen={isCmdKOpen} onClose={() => setIsCmdKOpen(false)} />

      {/* AI Chat Popup — Bottom Right */}
      <AIChatPopup />
    </div>
  );
}
