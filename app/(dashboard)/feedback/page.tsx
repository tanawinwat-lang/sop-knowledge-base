'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquareWarning, ThumbsDown, AlertTriangle, ArrowRight, User, Clock, Mail, CheckCircle2, Loader2 } from 'lucide-react';

export default function FeedbackPage() {
  const [sops, setSops] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissingId, setDismissingId] = useState<number | null>(null);

  const fetchData = () => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/sops?status=PUBLISHED').then((r) => r.json()),
      fetch('/api/feedback').then((r) => r.json()),
    ])
      .then(([sopsData, feedbackData]) => {
        setSops(sopsData.sops || []);
        setFeedbacks(feedbackData.feedbacks || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDismiss = async (feedbackId: number) => {
    setDismissingId(feedbackId);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}`, { method: 'DELETE' });
      if (res.ok) {
        setFeedbacks((prev) => prev.filter((f) => f.id !== feedbackId));
      }
    } catch {} finally {
      setDismissingId(null);
    }
  };

  // Compute dislike list per SOP with user details & timestamps
  const rankedSOPs = sops
    .map((sop) => {
      const sopDislikes = feedbacks.filter((f) => f.sop_id === sop.id);
      return {
        ...sop,
        dislikeCount: sopDislikes.length,
        dislikeDetails: sopDislikes,
      };
    })
    .filter((sop) => sop.dislikeCount > 0)
    .sort((a, b) => b.dislikeCount - a.dislikeCount);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
          <MessageSquareWarning className="w-6 h-6 text-rose-400" />
          <span>กระดาน SOP ที่ต้องปรับปรุงด่วน (Feedback Analytics Dashboard)</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          ตรวจสอบย้อนหลังได้ชัดเจนว่าผู้ใช้คนใด (Username/Email) เป็นคนกดดิสไลก์ (👎) ส่งเข้ามาเมื่อใด พร้อมเหตุผลการปรับปรุง
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-400">กำลังดึงข้อมูลรายงานข้อเสนอแนะเรียลไทม์...</div>
      ) : (
        <div className="grid gap-4">
          {rankedSOPs.map((sop, idx) => (
            <div
              key={sop.id}
              className={`p-6 rounded-2xl border transition-all ${
                sop.dislikeCount > 0
                  ? 'bg-slate-900 border-rose-500/30 shadow-xl'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-700">
                      #{idx + 1}
                    </span>
                    <h3 className="text-base font-bold text-slate-100">{sop.title}</h3>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                      <ThumbsDown className="w-3.5 h-3.5" /> {sop.dislikeCount} ดิสไลก์ (ต้องปรับปรุง)
                    </span>
                  </div>
                </div>

                <Link
                  href={`/sops/edit/${sop.id}`}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-rose-600/20 self-start md:self-center"
                >
                  <span>แก้ไข SOP นี้ทันที</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Detailed List of Dislike Feedback entries with User details */}
              {sop.dislikeDetails.length > 0 ? (
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                  <h5 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> รายละเอียดผู้กด 👎 ดิสไลก์ ({sop.dislikeDetails.length} รายการ):
                  </h5>
                  <div className="space-y-2">
                    {sop.dislikeDetails.map((fb: any, i: number) => (
                      <div
                        key={fb.id || i}
                        className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-slate-200 space-y-1.5 relative group"
                      >
                        <div className="flex items-center justify-between text-[11px] text-rose-300 border-b border-rose-500/20 pb-1.5 flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <span className="font-bold flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-rose-400" /> {fb.user?.username || 'Agent'}
                            </span>
                            <span className="text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" /> {fb.user?.email}
                            </span>
                            <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-slate-800 text-slate-300 rounded border border-slate-700">
                              {fb.user?.role_name || 'AGENT'}
                            </span>
                          </div>
                          <span className="text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" /> {new Date(fb.created_at).toLocaleString('th-TH')}
                          </span>
                        </div>
                        <p className="text-xs text-rose-100 pt-0.5 leading-relaxed pr-8">
                          💬 <strong>เหตุผล</strong>: {fb.reason || 'ไม่ระบุสาเหตุ'}
                        </p>
                        {/* Dismiss button */}
                        <button
                          onClick={() => handleDismiss(fb.id)}
                          disabled={dismissingId === fb.id}
                          className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800/80 hover:bg-emerald-600/30 border border-slate-700 hover:border-emerald-500/50 text-slate-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all"
                          title="แก้ไขแล้ว / ปิดข้อเสนอแนะนี้"
                        >
                          {dismissingId === fb.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-[11px] text-slate-500 italic">
                  ยังไม่มีข้อเสนอแนะดิสไลก์สำหรับเอกสารนี้
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
