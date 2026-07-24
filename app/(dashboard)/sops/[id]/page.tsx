'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import { SOPExpiryBadge } from '@/components/sops/SOPExpiryBadge';
import { SOPMindMap } from '@/components/sops/SOPMindMap';
import {
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  Clock,
  User,
  Edit,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Loader2,
  Image,
  Link as LinkIcon,
  ExternalLink,
  Paperclip,
  FileText,
  SendHorizontal,
  X,
  GitBranch,
} from 'lucide-react';

export default function SOPDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sop, setSop] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('AGENT');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [renewSuccess, setRenewSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [crTitle, setCrTitle] = useState('');
  const [crContent, setCrContent] = useState('');
  const [crReason, setCrReason] = useState('');
  const [crSubmitting, setCrSubmitting] = useState(false);
  const [crSuccess, setCrSuccess] = useState(false);
  const [crError, setCrError] = useState('');
  const [showMindMap, setShowMindMap] = useState(false);

  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUserRole(data.user.role_name);
      });

    fetch(`/api/sops/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.sop) setSop(data.sop);
      });
  }, [id]);

  const handleHelpful = async () => {
    try {
      await fetch(`/api/sops/${id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_helpful: true }),
      });
      setFeedbackSent(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenewCycle = async () => {
    setIsRenewing(true);
    try {
      const res = await fetch(`/api/sops/${id}/verify`, { method: 'POST' });
      const data = await res.json();
      if (data.sop) {
        setSop(data.sop);
        setRenewSuccess(true);
        setTimeout(() => setRenewSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRenewing(false);
    }
  };

  // Pre-fill change request fields when modal opens
  const openChangeRequest = () => {
    setCrTitle(sop?.title || '');
    setCrContent(sop?.content || '');
    setCrReason('');
    setCrError('');
    setCrSuccess(false);
    setShowChangeRequest(true);
  };

  const submitChangeRequest = async () => {
    setCrSubmitting(true);
    setCrError('');
    try {
      const res = await fetch(`/api/sops/${id}/change-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: crTitle, content: crContent, reason: crReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถส่งคำขอได้');
      setCrSuccess(true);
      setTimeout(() => {
        setShowChangeRequest(false);
        setCrSuccess(false);
      }, 2000);
    } catch (err: any) {
      setCrError(err.message);
    } finally {
      setCrSubmitting(false);
    }
  };

  if (!sop) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p>กำลังโหลดเอกสาร SOP...</p>
      </div>
    );
  }

  const canEdit = userRole === 'ADMIN' || userRole === 'SUPERVISOR';
  const canDelete = userRole === 'ADMIN' || userRole === 'SUPERVISOR';
  const canVerifyExpiry = userRole === 'ADMIN' || userRole === 'SUPERVISOR';

  // Format content for rendering callout blocks, YouTube embeds, and images
  const renderFormattedContent = (content: string) => {
    // Process line by line for image blocks, then group into paragraphs
    const lines = content.split('\n');
    const blocks: string[] = [];
    let currentParagraph = '';

    for (const line of lines) {
      // Check for image markdown: ![alt](url){:align="..."}
      const imgMatch = line.match(/^\s*!\[(.*?)\]\((.*?)\)\{:align="(left|center|right|full)"\}\s*$/);
      if (imgMatch) {
        if (currentParagraph.trim()) {
          blocks.push(currentParagraph);
          currentParagraph = '';
        }
        blocks.push(`__IMAGE_BLOCK__${imgMatch[1]}|||${imgMatch[2]}|||${imgMatch[3]}__`);
        continue;
      }
      // Also match plain ![alt](url) without alignment
      const plainImgMatch = line.match(/^\s*!\[(.*?)\]\((.*?)\)\s*$/);
      if (plainImgMatch) {
        if (currentParagraph.trim()) {
          blocks.push(currentParagraph);
          currentParagraph = '';
        }
        blocks.push(`__IMAGE_BLOCK__${plainImgMatch[1]}|||${plainImgMatch[2]}|||center__`);
        continue;
      }

      if (line.trim() === '' && currentParagraph.trim()) {
        blocks.push(currentParagraph);
        currentParagraph = '';
      } else if (line.trim() !== '') {
        currentParagraph += (currentParagraph ? '\n' : '') + line;
      }
    }
    if (currentParagraph.trim()) {
      blocks.push(currentParagraph);
    }

    return blocks.map((block, idx) => {
      // Image block
      if (block.startsWith('__IMAGE_BLOCK__')) {
        const [, alt, src, align] = block.match(/__IMAGE_BLOCK__(.*?)\|\|\|(.*?)\|\|\|(.*?)__/) || [];
        const alignClasses: Record<string, string> = {
          left: 'mr-auto',
          center: 'mx-auto',
          right: 'ml-auto',
          full: 'w-full',
        };
        const maxWidthClasses: Record<string, string> = {
          left: 'max-w-md',
          center: 'max-w-2xl',
          right: 'max-w-md',
          full: 'w-full',
        };
        return (
          <div key={idx} className={`my-6 ${align === 'full' ? 'w-full' : ''}`}>
            <div className={`${alignClasses[align] || 'mx-auto'} ${maxWidthClasses[align] || 'max-w-2xl'}`}>
              <figure className="relative group">
                <img
                  src={src}
                  alt={alt}
                  className={`rounded-2xl border border-slate-700/60 bg-slate-800 shadow-xl object-cover ${
                    align === 'full' ? 'w-full' : 'w-full'
                  }`}
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                {alt && (
                  <figcaption className="mt-2 text-center text-xs text-slate-400 italic">
                    {alt}
                  </figcaption>
                )}
              </figure>
            </div>
          </div>
        );
      }

      // Callout WARNING box
      if (block.includes('[!WARNING]')) {
        const text = block.replace(/>\s*\[!WARNING\]/g, '').replace(/>\s*/g, '');
        return (
          <div key={idx} className="my-4 p-4 rounded-xl bg-amber-500/10 border-l-4 border-amber-500 text-amber-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>จุดเน้นย้ำและข้อควรระวัง</span>
            </div>
            <p className="text-sm leading-relaxed">{text}</p>
          </div>
        );
      }

      // Callout IMPORTANT box
      if (block.includes('[!IMPORTANT]')) {
        const text = block.replace(/>\s*\[!IMPORTANT\]/g, '').replace(/>\s*/g, '');
        return (
          <div key={idx} className="my-4 p-4 rounded-xl bg-indigo-500/10 border-l-4 border-indigo-500 text-indigo-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-indigo-400">
              <BookOpen className="w-4 h-4" />
              <span>ข้อมูลสำคัญ</span>
            </div>
            <p className="text-sm leading-relaxed">{text}</p>
          </div>
        );
      }

      // YouTube Embed block
      if (block.includes('youtube.com') || block.includes('youtu.be')) {
        return (
          <div key={idx} className="my-6 aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
            <iframe
              src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
              title="YouTube video player"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }

      // Markdown Headers
      if (block.startsWith('# ')) {
        return <h1 key={idx} className="text-2xl font-bold text-white mt-6 mb-3 border-b border-slate-800 pb-2">{block.replace('# ', '')}</h1>;
      }
      if (block.startsWith('## ')) {
        return <h2 key={idx} className="text-xl font-bold text-slate-100 mt-5 mb-2">{block.replace('## ', '')}</h2>;
      }
      if (block.startsWith('### ')) {
        return <h3 key={idx} className="text-lg font-semibold text-indigo-300 mt-4 mb-2">{block.replace('### ', '')}</h3>;
      }

      // Render paragraph with Markdown link support: [text](url)
      const renderParagraphWithLinks = (text: string) => {
        // Match [text](url) pattern
        const parts = text.split(/(\[.*?\]\(.*?\))/g);
        return parts.map((part, i) => {
          const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
          if (linkMatch) {
            const [, linkText, linkUrl] = linkMatch;
            return (
              <a
                key={i}
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300 underline underline-offset-2 decoration-sky-500/40 hover:decoration-sky-400 font-medium transition-all"
              >
                {linkText}
                <svg className="w-3 h-3 inline-block ml-0.5 -mt-0.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            );
          }
          return <span key={i}>{part}</span>;
        });
      };

      return (
        <p key={idx} className="text-slate-300 text-sm md:text-base leading-relaxed my-2">
          {renderParagraphWithLinks(block)}
        </p>
      );
    });
  };

  return (
    <div className="flex gap-6 max-w-6xl mx-auto pb-16 relative">
      {/* ===== Main Content ===== */}
      <div className={`flex-1 min-w-0 space-y-8 transition-all duration-300 ${showMindMap ? 'max-w-3xl' : 'max-w-4xl mx-auto'}`}>
        {/* Back Button */}
        <Link href="/sops" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> กลับสู่คลัง SOP
        </Link>

        {/* Header Info */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg">
                v{sop.version} {sop.status}
              </span>
              <SOPExpiryBadge expiresAt={sop.expires_at} reviewCycleMonths={sop.review_cycle_months} />
            </div>

            <div className="flex items-center gap-2">
              {/* 🧠 Mind Map Toggle Button */}
              <button
                onClick={() => setShowMindMap((prev) => !prev)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 border transition-all hidden sm:flex ${
                  showMindMap
                    ? 'bg-indigo-600/20 border-indigo-400/40 text-indigo-200'
                    : 'bg-gradient-to-br from-indigo-500/10 to-violet-500/10 hover:from-indigo-500/20 hover:to-violet-500/20 text-indigo-300 border-indigo-500/30'
                }`}
                title={showMindMap ? 'ซ่อน Mind Map' : 'แสดง Mind Map'}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Mind Map</span>
                {showMindMap && <X className="w-3 h-3 ml-0.5 opacity-60" />}
              </button>
              {canDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold rounded-xl flex items-center gap-2 border border-rose-500/30 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> ลบ
                </button>
              )}
              {canEdit && (
                <Link
                  href={`/sops/edit/${sop.id}`}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 border border-slate-700 transition-all"
                >
                  <Edit className="w-3.5 h-3.5" /> แก้ไข SOP
                </Link>
              )}
              <button
                onClick={openChangeRequest}
                className="px-4 py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-xs font-semibold rounded-xl flex items-center gap-2 border border-sky-500/30 transition-all"
                title="ส่งคำขอเปลี่ยนแปลงเนื้อหา SOP นี้"
              >
                <SendHorizontal className="w-3.5 h-3.5" /> ขอแก้ไข
              </button>
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">{sop.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 border-y border-slate-800/80 py-3">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" /> สร้างโดย: {sop.created_by === 1 ? 'Admin' : 'Supervisor'}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> ปรับปรุงล่าสุด: {new Date(sop.updated_at).toLocaleDateString('th-TH')}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" /> ทบทวนทุก: {sop.review_cycle_months || 6} เดือน
            </span>
          </div>
        </div>

        {/* Expiration Review Action Banner */}
        {canVerifyExpiry && (
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">ระบบตรวจสอบความถูกต้องของเอกสาร (Review Cycle)</h4>
                <p className="text-[11px] text-slate-400">เมื่อตรวจสอบข้อมูลปัจจุบันแล้ว กดปุ่มเพื่อขยายรอบวันหมดอายุไปอีก {sop.review_cycle_months || 6} เดือน</p>
              </div>
            </div>
            <button
              onClick={handleRenewCycle}
              disabled={isRenewing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 flex-shrink-0"
            >
              {renewSuccess ? (
                <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> ขยายเวลาสำเร็จ!</>
              ) : (
                <><CheckCircle2 className="w-3.5 h-3.5" /> ยืนยันความถูกต้อง & ต่ออายุ</>
              )}
            </button>
          </div>
        )}

        {/* Main Document Body */}
        <div className="p-6 md:p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl space-y-4">
          {renderFormattedContent(sop.content.replace(/@sopimg:(\d+)/g, '/api/sops/image/$1'))}

          {/* SOP Attachments */}
          {sop.attachments && sop.attachments.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
                <Paperclip className="w-4 h-4 text-indigo-400" />
                สิ่งแนบ ({sop.attachments.length} รายการ)
              </h4>
              <div className="flex flex-wrap gap-2">
                {sop.attachments.map((att: any) => (
                  <div key={att.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${att.type === 'image' ? 'bg-purple-500/10 border-purple-500/20 text-purple-300' : att.type === 'link' ? 'bg-sky-500/10 border-sky-500/20 text-sky-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>
                    {att.type === 'image' && <Image className="w-4 h-4" />}
                    {att.type === 'link' && <LinkIcon className="w-4 h-4" />}
                    {att.type === 'file' && <FileText className="w-4 h-4" />}
                    <span className="max-w-[180px] truncate">{att.name}</span>
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="p-1 hover:text-white transition-colors"><ExternalLink className="w-3.5 h-3.5" /></a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Feedback Section */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl text-center space-y-4 shadow-xl">
          <h4 className="text-sm font-bold text-slate-200">เอกสารนี้ประเมินว่าเป็นประโยชน์และเข้าใจง่ายหรือไม่?</h4>

          {feedbackSent ? (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 font-semibold inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> ขอบคุณสำหรับข้อเสนอแนะ!
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleHelpful}
                className="px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <ThumbsUp className="w-4 h-4" /> 👍 อ่านเข้าใจง่าย
              </button>
              <button
                onClick={() => setIsFeedbackOpen(true)}
                className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <ThumbsDown className="w-4 h-4" /> 👎 ยังงงอยู่ / ข้อมูลเก่า
              </button>
            </div>
          )}
        </div>

        {/* Feedback Dislike Reason Modal */}
        <FeedbackModal
          sopId={sop.id}
          isOpen={isFeedbackOpen}
          onClose={() => setIsFeedbackOpen(false)}
          onSubmitted={() => setFeedbackSent(true)}
        />
      </div>
      {/* ^ end of content wrapper div */}

      {/* ===== Change Request Modal ===== */}
      {showChangeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-xl">
                  <SendHorizontal className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">ขอเปลี่ยนแปลงเอกสาร SOP</h3>
                  <p className="text-[11px] text-slate-400">ส่งคำขอแก้ไขเนื้อหาไปยัง Admin/Supervisor เพื่อพิจารณา</p>
                </div>
              </div>
              <button
                onClick={() => setShowChangeRequest(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {crSuccess ? (
              <div className="p-12 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-slate-100">ส่งคำขอเรียบร้อย!</h4>
                <p className="text-xs text-slate-400">คำขอของคุณถูกส่งไปยัง Admin/Supervisor เพื่อพิจารณาอนุมัติแล้ว</p>
              </div>
            ) : (
              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">ชื่อเรื่อง <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    value={crTitle}
                    onChange={(e) => setCrTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                    placeholder="ระบุชื่อเรื่อง SOP"
                  />
                </div>

                {/* Content (WYSIWYG-like textarea) */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">เนื้อหา <span className="text-rose-400">*</span></label>
                  <textarea
                    value={crContent}
                    onChange={(e) => setCrContent(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                    rows={12}
                    placeholder="แก้ไขเนื้อหา SOP ที่ต้องการเปลี่ยนแปลง..."
                  />
                  <p className="text-[10px] text-slate-500 mt-1">คุณสามารถใช้ Markdown เพื่อจัดรูปแบบเนื้อหาได้</p>
                </div>

                {/* Reason */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    เหตุผล / ข้อเสนอแนะ <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    value={crReason}
                    onChange={(e) => setCrReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                    rows={3}
                    placeholder="อธิบายว่าทำไมต้องเปลี่ยนแปลงเอกสารนี้..."
                  />
                </div>

                {/* Error */}
                {crError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                    {crError}
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-800">
              <button
                onClick={() => setShowChangeRequest(false)}
                disabled={crSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                {crSuccess ? 'ปิด' : 'ยกเลิก'}
              </button>
              {!crSuccess && (
                <button
                  onClick={submitChangeRequest}
                  disabled={crSubmitting || !crTitle.trim() || !crContent.trim() || !crReason.trim()}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-sky-600/30 disabled:opacity-50 transition-all"
                >
                  {crSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <SendHorizontal className="w-3.5 h-3.5" />
                  )}
                  {crSubmitting ? 'กำลังส่ง...' : 'ส่งคำขอเปลี่ยนแปลง'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== SOP Mind Map Sidebar (Inline) ===== */}
      <SOPMindMap
        title={sop.title}
        content={sop.content}
        isOpen={showMindMap}
        onClose={() => setShowMindMap(false)}
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">ยืนยันการลบเอกสาร</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  คุณแน่ใจที่จะลบ "{sop.title}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
                </p>
              </div>
            </div>

            {isDeleting && (
              <p className="mb-3 text-xs text-indigo-300 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                กำลังลบเอกสาร...
              </p>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const res = await fetch(`/api/sops/${sop.id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('ไม่สามารถลบเอกสารได้');
                    window.location.href = '/sops';
                  } catch (err: any) {
                    alert(err.message);
                    setIsDeleting(false);
                    setShowDeleteConfirm(false);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {isDeleting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
