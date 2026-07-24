'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Search,
  Megaphone,
  AlertTriangle,
  Info,
  CheckCheck,
  MessageSquare,
  Send,
  X,
  Loader2,
  Calendar,
  User,
  Sparkles,
  Link as LinkIcon,
  ExternalLink,
  Paperclip,
  FileText,
  Trash2,
} from 'lucide-react';

interface Comment {
  id: number;
  user_id: number;
  username: string;
  comment: string;
  created_at: string;
}

import { WYSIWYGEditor } from '@/components/sops/WYSIWYGEditor';

interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  announcement_type: 'GENERAL' | 'SOP_UPDATE' | 'URGENT';
  isRead: boolean;
  acknowledged: boolean;
  commentCount: number;
  created_at: string;
  createdBy: string;
  attachments?: any[];
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState<string>('AGENT');
  const [loading, setLoading] = useState(true);

  // Create announcement dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<'GENERAL' | 'URGENT'>('GENERAL');
  const [isCreating, setIsCreating] = useState(false);
  const [roles, setRoles] = useState<{ id: number; role_name: string }[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [targetAllRoles, setTargetAllRoles] = useState(true);

  useEffect(() => {
    fetch('/api/roles')
      .then((r) => r.json())
      .then((d) => {
        if (d.roles) setRoles(d.roles);
      });
  }, []);

  // Comment dialog
  const [commentTarget, setCommentTarget] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/announcements?include_read=true');
      const data = await res.json();
      if (res.ok) setAnnouncements(data.announcements || []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
    fetch('/api/auth')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUserRole(d.user.role_name);
      });
  }, [fetchAnnouncements]);

  const canCreate = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'SUPERVISOR';
  const canDelete = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = searchQuery.trim()
    ? announcements.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : announcements;

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
          announcement_type: newType,
          target_role_ids: targetAllRoles ? undefined : selectedRoleIds,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewTitle('');
        setNewContent('');
        setNewType('GENERAL');
        setSelectedRoleIds([]);
        setTargetAllRoles(true);
        fetchAnnouncements();
      }
    } catch {} finally {
      setIsCreating(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      await fetch(`/api/announcements/${id}/read`, { method: 'POST' });
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true, acknowledged: true } : a)));
    } catch {}
  };

  const openComments = async (id: number) => {
    setCommentTarget(id);
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/announcements/${id}/comment`);
      const data = await res.json();
      if (res.ok) setComments(data.comments || []);
    } catch {} finally {
      setLoadingComments(false);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim() || !commentTarget) return;
    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/announcements/${commentTarget}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: commentText.trim() }),
      });
      if (res.ok) {
        setCommentText('');
        openComments(commentTarget);
      }
    } catch {} finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/announcements/${deleteTarget}`, { method: 'DELETE' });
      if (res.ok) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== deleteTarget));
        setDeleteTarget(null);
      }
    } catch {} finally {
      setIsDeleting(false);
    }
  };

  const typeIcons: Record<string, React.ReactNode> = {
    URGENT: <AlertTriangle className="w-5 h-5 text-rose-400" />,
    SOP_UPDATE: <Info className="w-5 h-5 text-sky-400" />,
    GENERAL: <Megaphone className="w-5 h-5 text-amber-400" />,
  };

  const typeLabels: Record<string, string> = {
    URGENT: 'สำคัญ / ด่วน',
    SOP_UPDATE: 'อัปเดต SOP',
    GENERAL: 'ประกาศทั่วไป',
  };

  // Render announcement content with Markdown (images, links, callouts)
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    const blocks: string[] = [];
    let currentParagraph = '';

    for (const line of lines) {
      // Image markdown: ![alt](url){:align="..."} or ![alt](url)
      const imgMatch = line.match(/^\s*!\[(.*?)\]\((.*?)\)(?:\{:align="(left|center|right|full)"\})?\s*$/);
      if (imgMatch) {
        if (currentParagraph.trim()) { blocks.push(currentParagraph); currentParagraph = ''; }
        blocks.push(`__IMAGE__${imgMatch[1]}|||${imgMatch[2]}|||${imgMatch[3] || 'center'}__`);
        continue;
      }

      if (line.trim() === '' && currentParagraph.trim()) {
        blocks.push(currentParagraph);
        currentParagraph = '';
      } else if (line.trim() !== '') {
        currentParagraph += (currentParagraph ? '\n' : '') + line;
      }
    }
    if (currentParagraph.trim()) blocks.push(currentParagraph);

    return blocks.map((block, idx) => {
      // Image block
      if (block.startsWith('__IMAGE__')) {
        const [, alt, src, align] = block.match(/__IMAGE__(.*?)\|\|\|(.*?)\|\|\|(.*?)__/) || [];
        const alignClasses: Record<string, string> = {
          left: 'mr-auto', center: 'mx-auto', right: 'ml-auto', full: 'w-full',
        };
        return (
          <div key={idx} className="my-4">
            <div className={`${alignClasses[align] || 'mx-auto'} max-w-lg`}>
              <figure className="relative group">
                <img
                  src={src} alt={alt}
                  className="rounded-xl border border-slate-700/60 bg-slate-800 shadow-lg object-cover w-full"
                  loading="lazy"
                />
                {alt && <figcaption className="mt-1.5 text-center text-[10px] text-slate-400 italic">{alt}</figcaption>}
              </figure>
            </div>
          </div>
        );
      }

      // Callout WARNING
      if (block.includes('[!WARNING]')) {
        const text = block.replace(/>\s*\[!WARNING\]/g, '').replace(/>\s*/g, '');
        return (
          <div key={idx} className="my-3 p-3 rounded-xl bg-amber-500/10 border-l-4 border-amber-500 text-amber-200">
            <p className="text-xs leading-relaxed">{text}</p>
          </div>
        );
      }

      // Callout IMPORTANT
      if (block.includes('[!IMPORTANT]')) {
        const text = block.replace(/>\s*\[!IMPORTANT\]/g, '').replace(/>\s*/g, '');
        return (
          <div key={idx} className="my-3 p-3 rounded-xl bg-indigo-500/10 border-l-4 border-indigo-500 text-indigo-200">
            <p className="text-xs leading-relaxed">{text}</p>
          </div>
        );
      }

      // Markdown headers
      if (block.startsWith('# ')) {
        return <h1 key={idx} className="text-lg font-bold text-white mt-4 mb-2">{block.replace('# ', '')}</h1>;
      }
      if (block.startsWith('## ')) {
        return <h2 key={idx} className="text-base font-bold text-slate-100 mt-3 mb-1">{block.replace('## ', '')}</h2>;
      }

      // Render paragraph with inline links: [text](url)
      const renderLinks = (text: string) => {
        const parts = text.split(/(\[.*?\]\(.*?\))/g);
        return parts.map((part, i) => {
          const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
          if (linkMatch) {
            const [, linkText, linkUrl] = linkMatch;
            return (
              <a key={i} href={linkUrl} target="_blank" rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300 underline underline-offset-2 decoration-sky-500/40 font-medium transition-all">
                {linkText}
                <svg className="w-2.5 h-2.5 inline-block ml-0.5 -mt-0.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            );
          }
          return <span key={i}>{part}</span>;
        });
      };

      return <p key={idx} className="text-xs text-slate-300 leading-relaxed my-1.5">{renderLinks(block)}</p>;
    });
  };

  const typeBadgeColors: Record<string, string> = {
    URGENT: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    SOP_UPDATE: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    GENERAL: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-amber-400" />
            <span>ประกาศข่าวสาร</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">ประกาศ อัปเดต SOP และข่าวสารสำคัญทั้งหมด</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4" />
            <span>สร้างประกาศใหม่</span>
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาประกาศย้อนหลังจากชื่อหรือเนื้อหา..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Announcements list */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
          <span className="text-xs">กำลังโหลดประกาศ...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-xs">{searchQuery ? 'ไม่พบประกาศที่ตรงกับคำค้นหา' : 'ยังไม่มีประกาศ'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ann) => (
            <div
              key={ann.id}
              className={`p-5 bg-slate-900 border border-slate-800 rounded-2xl transition-all shadow-md ${
                !ann.isRead ? 'ring-1 ring-indigo-500/30' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-xl bg-slate-800/80 flex-shrink-0">
                    {typeIcons[ann.announcement_type] || <Megaphone className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-100">{ann.title}</h3>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${typeBadgeColors[ann.announcement_type] || 'bg-slate-800 text-slate-400'}`}
                      >
                        {typeLabels[ann.announcement_type] || 'ทั่วไป'}
                      </span>
                      {!ann.isRead && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                          ใหม่
                        </span>
                      )}
                    </div>
                    <div className="mt-2">{renderFormattedContent(ann.content.replace(/@sopimg:(\d+)/g, '/api/sops/image/$1'))}</div>
                    <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {ann.createdBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(ann.created_at).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Attachments - fully clickable badges with image preview */}
                    {ann.attachments && ann.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {ann.attachments.map((att) =>
                          att.type === 'image' ? (
                            /* Image - show inline thumbnail preview on click */
                            <div key={att.id} className="space-y-1">
                              <img
                                src={att.url}
                                alt={att.name}
                                className="max-h-40 rounded-xl border border-slate-700/60 bg-slate-800 shadow-md object-contain cursor-pointer hover:ring-2 hover:ring-purple-500/50 transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(att.url, '_blank');
                                }}
                                loading="lazy"
                              />
                              <p className="text-[10px] text-slate-500 text-center truncate max-w-[200px]">{att.name}</p>
                            </div>
                          ) : (
                            /* Link or File - full badge is clickable */
                            <a
                              key={att.id}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                att.type === 'link'
                                  ? 'bg-sky-500/10 border-sky-500/20 text-sky-300 hover:bg-sky-500/20 hover:border-sky-500/40'
                                  : 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/40'
                              }`}
                            >
                              {att.type === 'link' ? (
                                <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                              )}
                              <span className="truncate max-w-[140px]">{att.name}</span>
                              <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                            </a>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
                {!ann.acknowledged && (
                  <button
                    onClick={() => handleAcknowledge(ann.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    รับทราบ
                  </button>
                )}
                {ann.acknowledged && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500">
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                    รับทราบแล้ว
                  </span>
                )}
                <button
                  onClick={() => openComments(ann.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  ความคิดเห็น ({ann.commentCount})
                </button>
                {canDelete && (
                  <button
                    onClick={() => setDeleteTarget(ann.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    ลบ
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Announcement Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                สร้างประกาศใหม่
              </h3>
              <button onClick={() => setShowCreate(false)} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">ประเภท</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as 'GENERAL' | 'URGENT')}
                  className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100"
                >
                  <option value="GENERAL">ประกาศทั่วไป</option>
                  <option value="URGENT">สำคัญ / ด่วน</option>
                </select>
              </div>

              {/* Target Audience - Role Selection */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">กลุ่มผู้รับ</label>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setTargetAllRoles(true)}
                    className={`px-3 py-1.5 text-[10px] font-semibold rounded-lg border transition-colors ${
                      targetAllRoles
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    ทุกตำแหน่ง
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetAllRoles(false)}
                    className={`px-3 py-1.5 text-[10px] font-semibold rounded-lg border transition-colors ${
                      !targetAllRoles
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    เฉพาะบางตำแหน่ง
                  </button>
                </div>
                {!targetAllRoles && (
                  <div className="flex flex-wrap gap-1.5">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => {
                          setSelectedRoleIds((prev) =>
                            prev.includes(role.id)
                              ? prev.filter((id) => id !== role.id)
                              : [...prev, role.id]
                          );
                        }}
                        className={`px-2.5 py-1 text-[10px] font-medium rounded-lg border transition-colors ${
                          selectedRoleIds.includes(role.id)
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {role.role_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">หัวข้อประกาศ</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น อัปเดตนโยบายการทำงานปี 2026"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">เนื้อหา (รองรับ Markdown, รูปภาพ, ลิงก์, และ Slash Commands)</label>
                <WYSIWYGEditor
                  value={newContent}
                  onChange={setNewContent}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
              <button onClick={() => setShowCreate(false)} className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200">
                ยกเลิก
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating || !newTitle.trim() || !newContent.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isCreating ? 'กำลังสร้าง...' : 'เผยแพร่ประกาศ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">ยืนยันการลบประกาศ</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 mb-5">
              คุณแน่ใจหรือไม่ว่าต้องการลบประกาศนี้? ข้อมูลความคิดเห็นและการรับทราบทั้งหมดจะถูกลบออกด้วย
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {isDeleting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments Dialog */}
      {commentTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                ความคิดเห็น
              </h3>
              <button onClick={() => { setCommentTarget(null); setComments([]); }} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingComments ? (
                <div className="py-8 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  <span className="text-xs">กำลังโหลด...</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">ยังไม่มีความคิดเห็น</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-indigo-300">{c.username}</span>
                      <span className="text-[10px] text-slate-500">{new Date(c.created_at).toLocaleDateString('th-TH')}</span>
                    </div>
                    <p className="text-xs text-slate-300">{c.comment}</p>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); submitComment(); }}
              className="p-3 border-t border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="พิมพ์ความคิดเห็น..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || isSubmittingComment}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg transition-colors"
              >
                {isSubmittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
