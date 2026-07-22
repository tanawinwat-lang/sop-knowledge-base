'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellRing,
  ChevronRight,
  Loader2,
  Paperclip,
} from 'lucide-react';

interface AttachmentItem {
  id: string;
  type: 'image' | 'link' | 'file';
  name: string;
  url: string;
}

interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  announcement_type: 'GENERAL' | 'SOP_UPDATE' | 'URGENT';
  isRead: boolean;
  acknowledged: boolean;
  created_at: string;
  createdBy: string;
  attachments?: AttachmentItem[];
  commentCount?: number;
}

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/announcements?include_read=true');
      const data = await res.json();
      if (res.ok) {
        const all = data.announcements || [];
        setAnnouncements(all);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchAnnouncements, 30000);
    fetchAnnouncements();
    return () => clearInterval(interval);
  }, [fetchAnnouncements]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const typeLabels: Record<string, string> = {
    URGENT: 'สำคัญ / ด่วน',
    SOP_UPDATE: 'อัปเดต SOP',
    GENERAL: 'ประกาศทั่วไป',
  };

  const typeBadgeColors: Record<string, string> = {
    URGENT: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    SOP_UPDATE: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    GENERAL: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };

  return (
    <>
      {/* ===== BELL BUTTON IN HEADER ===== */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-all"
          title="ประกาศข่าวสาร"
        >
          {isOpen ? (
            <BellRing className="w-5 h-5 text-indigo-400" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-[18px] h-[18px] text-[9px] font-bold bg-rose-500 text-white rounded-full shadow-lg shadow-rose-500/40">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* ===== DROPDOWN MENU ===== */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-150">
            {/* Dropdown Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                  <BellRing className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100">ประกาศข่าวสาร</h3>
                  <p className="text-[9px] text-slate-500 mt-px">
                    {unreadCount > 0
                      ? `${unreadCount} รายการที่ยังไม่อ่าน`
                      : 'ไม่มีประกาศใหม่'}
                  </p>
                </div>
              </div>
              <Link
                href="/announcements"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-1 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                ดูทั้งหมด <ChevronRight className="w-2.5 h-2.5" />
              </Link>
            </div>

            {/* Dropdown List */}
            <div className="max-h-[360px] overflow-y-auto">
              {loading && announcements.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                  <span className="text-[10px]">กำลังโหลด...</span>
                </div>
              ) : announcements.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <Bell className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p className="text-[10px]">ไม่มีประกาศ</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/50">
                  {announcements.map((ann, i) => (
                    <button
                      key={ann.id}
                      onClick={() => {
                        setIsOpen(false);
                        router.push('/announcements');
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-800/40 transition-colors flex items-start gap-3 group ${
                        !ann.isRead ? 'bg-slate-800/20' : ''
                      } ${i === 0 && !ann.isRead ? 'bg-indigo-500/5' : ''}`}
                    >
                      {/* Tiny circular status dot */}
                      <div className="flex-shrink-0 pt-1.5">
                        {!ann.isRead ? (
                          <span className="block w-2 h-2 rounded-full bg-indigo-400 ring-2 ring-indigo-400/20" />
                        ) : (
                          <span className="block w-2 h-2 rounded-full bg-transparent border border-slate-700" />
                        )}
                      </div>

                      {/* Row content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`text-xs font-semibold truncate ${
                              !ann.isRead ? 'text-slate-100' : 'text-slate-400'
                            }`}
                          >
                            {ann.title}
                          </span>
                          <span className="text-[9px] text-slate-600 flex-shrink-0 whitespace-nowrap">
                            {new Date(ann.created_at).toLocaleDateString('th-TH', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {ann.content}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className={`px-1.5 py-[1px] text-[7px] font-bold rounded-full border ${
                              typeBadgeColors[ann.announcement_type] || 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {typeLabels[ann.announcement_type] || 'ทั่วไป'}
                          </span>
                          {ann.attachments && ann.attachments.length > 0 && (
                            <span className="flex items-center gap-0.5 text-[8px] text-slate-500">
                              <Paperclip className="w-2 h-2" />
                              {ann.attachments.length}
                            </span>
                          )}
                          {!ann.acknowledged && (
                            <span className="text-[8px] text-emerald-400 font-medium">• ยังไม่อ่าน</span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dropdown Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-slate-800 bg-slate-900/80">
              <span className="text-[9px] text-slate-500">{announcements.length} รายการ</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[9px] text-slate-400 hover:text-slate-200 transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
