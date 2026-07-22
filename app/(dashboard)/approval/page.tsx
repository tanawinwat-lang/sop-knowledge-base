'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCheck, Check, X, Clock, Eye, AlertCircle, SendHorizontal,
  Loader2, MessageSquare, User, Calendar, ShieldCheck,
  CheckSquare, Square, XCircle,
} from 'lucide-react';

export default function ApprovalPage() {
  const [pendingSOPs, setPendingSOPs] = useState<any[]>([]);
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [reviewingCrId, setReviewingCrId] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedCr, setSelectedCr] = useState<any>(null);

  // Bulk state
  const [selectedSopIds, setSelectedSopIds] = useState<Set<number>>(new Set());
  const [selectedCrIds, setSelectedCrIds] = useState<Set<number>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bulkReviewComment, setBulkReviewComment] = useState('');

  const fetchAll = () => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/sops?status=PENDING_APPROVE').then((r) => r.json()),
      fetch('/api/change-requests?status=PENDING').then((r) => r.json()),
    ]).then(([sopData, crData]) => {
      setPendingSOPs(sopData.sops || []);
      setChangeRequests(crData.change_requests || []);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // ====== Single SOP Approve ======
  const handleApprove = async (id: number) => {
    setApprovingId(id);
    try {
      const res = await fetch(`/api/sops/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });
      if (res.ok) {
        fetchAll();
      } else {
        const data = await res.json();
        showBulkMsg('error', data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setApprovingId(null);
    }
  };

  // ====== Batch SOP Approve ======
  const handleBatchApproveSOPs = async () => {
    if (selectedSopIds.size === 0) return;
    setIsBulkProcessing(true);
    try {
      let success = 0;
      let errors = 0;
      for (const id of selectedSopIds) {
        const res = await fetch(`/api/sops/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PUBLISHED' }),
        });
        if (res.ok) success++;
        else errors++;
      }
      showBulkMsg('success', `อนุมัติ ${success} รายการ${errors > 0 ? `, ไม่สำเร็จ ${errors} รายการ` : ''}`);
      setSelectedSopIds(new Set());
      fetchAll();
    } catch (err) {
      showBulkMsg('error', 'เกิดข้อผิดพลาดในการอนุมัติ');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // ====== Single CR Review ======
  const openReviewModal = (cr: any) => {
    setSelectedCr(cr);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const handleReviewChangeRequest = async (action: 'approve' | 'reject') => {
    if (!selectedCr) return;
    setReviewingCrId(selectedCr.id);
    try {
      const res = await fetch(`/api/change-requests/${selectedCr.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, review_comment: reviewComment }),
      });
      if (res.ok) {
        setShowReviewModal(false);
        setSelectedCr(null);
        fetchAll();
      } else {
        const data = await res.json();
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewingCrId(null);
    }
  };

  // ====== Batch CR Approve/Reject ======
  const handleBatchCR = async (action: 'approve' | 'reject') => {
    if (selectedCrIds.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const res = await fetch('/api/change-requests/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ids: Array.from(selectedCrIds),
          review_comment: bulkReviewComment || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ดำเนินการไม่สำเร็จ');
      showBulkMsg('success', data.message || `${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'} ${data.count} รายการเรียบร้อย`);
      setSelectedCrIds(new Set());
      setBulkReviewComment('');
      fetchAll();
    } catch (err: any) {
      showBulkMsg('error', err.message);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const showBulkMsg = (type: 'success' | 'error', text: string) => {
    setBulkMessage({ type, text });
    setTimeout(() => setBulkMessage(null), 5000);
  };

  const totalPending = pendingSOPs.length + changeRequests.length;
  const selectedSopCount = selectedSopIds.size;
  const selectedCrCount = selectedCrIds.size;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
              <FileCheck className="w-6 h-6 text-indigo-400" />
              <span>กระดานพิจารณาอนุมัติ (Approval Workflow)</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              พิจารณาอนุมัติเอกสาร SOP ใหม่ และคำขอเปลี่ยนแปลงจากพนักงาน
            </p>
          </div>
          {totalPending > 0 && (
            <span className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              รอดำเนินการ {totalPending} รายการ
            </span>
          )}
        </div>
      </div>

      {/* Bulk Message */}
      {bulkMessage && (
        <div className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          bulkMessage.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
        }`}>
          {bulkMessage.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          {bulkMessage.text}
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
        </div>
      ) : totalPending === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
          <Check className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">ไม่มีรายการค้างรอดำเนินการ</h3>
          <p className="text-xs text-slate-400">เอกสาร SOP และคำขอเปลี่ยนแปลงทั้งหมดได้รับการดำเนินการแล้ว</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ======================================================= */}
          {/* Section 1: Pending SOP Approvals — WITH BATCH SUPPORT */}
          {/* ======================================================= */}
          {pendingSOPs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-indigo-400" />
                  เอกสาร SOP รออนุมัติ ({pendingSOPs.length})
                </h2>
                {/* Select all toggle */}
                <button
                  onClick={() => {
                    if (selectedSopIds.size === pendingSOPs.length) {
                      setSelectedSopIds(new Set());
                    } else {
                      setSelectedSopIds(new Set(pendingSOPs.map((s: any) => s.id)));
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
                >
                  {selectedSopIds.size === pendingSOPs.length ? (
                    <><CheckSquare className="w-3.5 h-3.5" /> เลิกเลือกทั้งหมด</>
                  ) : (
                    <><Square className="w-3.5 h-3.5" /> เลือกทั้งหมด</>
                  )}
                </button>
              </div>

              {/* Batch SOP Toolbar */}
              {selectedSopCount > 0 && (
                <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <span className="text-xs font-semibold text-indigo-200">เลือกแล้ว {selectedSopCount} รายการ</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedSopIds(new Set())}
                      className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleBatchApproveSOPs}
                      disabled={isBulkProcessing}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-lg shadow-emerald-600/20"
                    >
                      {isBulkProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckSquare className="w-3.5 h-3.5" />
                      )}
                      อนุมัติทั้งหมด ({selectedSopCount})
                    </button>
                  </div>
                </div>
              )}

              <div className="grid gap-3">
                {pendingSOPs.map((sop) => (
                  <div
                    key={sop.id}
                    className={`p-5 bg-slate-900 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl transition-all ${
                      selectedSopIds.has(sop.id) ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Checkbox */}
                      <button
                        onClick={() => {
                          const next = new Set(selectedSopIds);
                          if (next.has(sop.id)) next.delete(sop.id);
                          else next.add(sop.id);
                          setSelectedSopIds(next);
                        }}
                        className="mt-0.5 flex-shrink-0 text-slate-500 hover:text-indigo-400 transition-colors"
                      >
                        {selectedSopIds.has(sop.id) ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 opacity-50 hover:opacity-100" />
                        )}
                      </button>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> PENDING
                          </span>
                          <span className="text-xs text-slate-400">
                            สร้าง: {new Date(sop.created_at).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-100 truncate">{sop.title}</h3>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{sop.content.substring(0, 160)}...</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <Link
                        href={`/sops/${sop.id}`}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> ดูตัวอย่าง
                      </Link>
                      <button
                        onClick={() => handleApprove(sop.id)}
                        disabled={approvingId === sop.id}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all"
                      >
                        {approvingId === sop.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        อนุมัติ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* Section 2: Pending Change Requests — WITH BATCH SUPPORT */}
          {/* ======================================================= */}
          {changeRequests.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <SendHorizontal className="w-4 h-4 text-sky-400" />
                  คำขอเปลี่ยนแปลง SOP ({changeRequests.length})
                </h2>
                {/* Select all toggle */}
                <button
                  onClick={() => {
                    if (selectedCrIds.size === changeRequests.length) {
                      setSelectedCrIds(new Set());
                    } else {
                      setSelectedCrIds(new Set(changeRequests.map((cr: any) => cr.id)));
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-sky-300 flex items-center gap-1.5 transition-colors"
                >
                  {selectedCrIds.size === changeRequests.length ? (
                    <><CheckSquare className="w-3.5 h-3.5" /> เลิกเลือกทั้งหมด</>
                  ) : (
                    <><Square className="w-3.5 h-3.5" /> เลือกทั้งหมด</>
                  )}
                </button>
              </div>

              {/* Batch CR Toolbar */}
              {selectedCrCount > 0 && (
                <div className="p-4 bg-sky-950/40 border border-sky-500/30 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-sky-200">เลือกแล้ว {selectedCrCount} รายการ</span>
                    <button
                      onClick={() => { setSelectedCrIds(new Set()); setBulkReviewComment(''); }}
                      className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      ยกเลิก
                    </button>
                  </div>

                  {/* Bulk review comment (optional) */}
                  <input
                    type="text"
                    value={bulkReviewComment}
                    onChange={(e) => setBulkReviewComment(e.target.value)}
                    placeholder="(ไม่บังคับ) ระบุเหตุผลหรือข้อเสนอแนะสำหรับทุกรายการ..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBatchCR('approve')}
                      disabled={isBulkProcessing}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-lg shadow-emerald-600/20"
                    >
                      {isBulkProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckSquare className="w-3.5 h-3.5" />
                      )}
                      อนุมัติทั้งหมด ({selectedCrCount})
                    </button>
                    <button
                      onClick={() => handleBatchCR('reject')}
                      disabled={isBulkProcessing}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50 transition-all"
                    >
                      {isBulkProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      ปฏิเสธทั้งหมด ({selectedCrCount})
                    </button>
                  </div>
                </div>
              )}

              <div className="grid gap-3">
                {changeRequests.map((cr) => (
                  <div
                    key={cr.id}
                    className={`p-5 bg-slate-900 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl transition-all ${
                      selectedCrIds.has(cr.id) ? 'border-sky-500/50 ring-1 ring-sky-500/20' : 'border-sky-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Checkbox */}
                      <button
                        onClick={() => {
                          const next = new Set(selectedCrIds);
                          if (next.has(cr.id)) next.delete(cr.id);
                          else next.add(cr.id);
                          setSelectedCrIds(next);
                        }}
                        className="mt-0.5 flex-shrink-0 text-slate-500 hover:text-sky-400 transition-colors"
                      >
                        {selectedCrIds.has(cr.id) ? (
                          <CheckSquare className="w-4 h-4 text-sky-400" />
                        ) : (
                          <Square className="w-4 h-4 opacity-50 hover:opacity-100" />
                        )}
                      </button>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-lg flex items-center gap-1">
                            <SendHorizontal className="w-3 h-3" /> CHANGE_REQUEST
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <User className="w-3 h-3" /> {cr.requested_by_username}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(cr.requested_at).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-100 truncate">{cr.sop_title}</h3>
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-3 h-3 text-slate-500 mt-0.5 shrink-0" />
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {cr.reason}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => openReviewModal(cr)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> ตรวจสอบ
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCr(cr);
                          setReviewComment('');
                          handleReviewChangeRequest('approve');
                        }}
                        disabled={reviewingCrId === cr.id}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all"
                      >
                        {reviewingCrId === cr.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        อนุมัติ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== Review Change Request Modal (Single) ===== */}
      {showReviewModal && selectedCr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-xl">
                  <SendHorizontal className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">ตรวจสอบคำขอเปลี่ยนแปลง</h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedCr.sop_title} — โดย {selectedCr.requested_by_username}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Reason */}
              <div className="p-4 bg-sky-500/5 border border-sky-500/20 rounded-xl">
                <p className="text-[11px] font-semibold text-sky-400 mb-1">📝 เหตุผลที่ขอเปลี่ยนแปลง:</p>
                <p className="text-sm text-slate-200">{selectedCr.reason}</p>
              </div>

              {/* New Title */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-1">ชื่อเรื่องใหม่:</p>
                <p className="text-sm font-bold text-slate-100">{selectedCr.title}</p>
              </div>

              {/* New Content Preview */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-1">เนื้อหาใหม่:</p>
                <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl max-h-60 overflow-y-auto">
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {selectedCr.content.substring(0, 2000)}
                    {selectedCr.content.length > 2000 ? '...' : ''}
                  </pre>
                </div>
              </div>

              {/* Review Comment */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">ความคิดเห็นของผู้อนุมัติ:</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  rows={2}
                  placeholder="(ไม่บังคับ) ระบุเหตุผลหรือข้อเสนอแนะ..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-800">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleReviewChangeRequest('reject')}
                disabled={reviewingCrId === selectedCr.id}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50"
              >
                {reviewingCrId === selectedCr.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                ปฏิเสธ
              </button>
              <button
                onClick={() => handleReviewChangeRequest('approve')}
                disabled={reviewingCrId === selectedCr.id}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                {reviewingCrId === selectedCr.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                อนุมัติ & อัปเดต SOP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
