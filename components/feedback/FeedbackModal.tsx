'use client';

import React, { useState } from 'react';
import { ThumbsDown, ThumbsUp, Send, X, MessageSquareWarning, CheckCircle2 } from 'lucide-react';

interface FeedbackModalProps {
  sopId: number;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function FeedbackModal({ sopId, isOpen, onClose, onSubmitted }: FeedbackModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetch(`/api/sops/${sopId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_helpful: false, reason }),
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
        if (onSubmitted) onSubmitted();
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickReasons = [
    'ข้อมูลใน SOP เก่าหมดอายุแล้ว (ข้อมูลปีเก่า)',
    'ขั้นตอนการปฏิบัติงานอ่านแล้วยังงงเข้าใจยาก',
    'ไม่มีรายละเอียดกรณีเกิดเคสยกเว้น',
    'ลิงก์หรือรูปภาพเปิดไม่ได้',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <MessageSquareWarning className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">แจ้งข้อเสนอแนะ SOP นี้ (Feedback)</h3>
              <p className="text-xs text-slate-400">ระบุเหตุผลเพื่อส่งไปยัง Dashboard ของ Supervisor</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-10 text-center space-y-3 animate-in zoom-in-95">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h4 className="text-base font-bold text-slate-100">ส่งข้อเสนอแนะเรียบร้อย!</h4>
            <p className="text-xs text-slate-400">ระบบได้ส่งเหตุผลไปยังหน้า "SOP ที่ต้องปรับปรุงด่วน" ของ Supervisor แล้ว</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">เลือกเหตุผลที่ต้องการแจ้งปรับปรุง:</label>
              <div className="space-y-1.5">
                {quickReasons.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all border ${
                      reason === r
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-200 font-semibold'
                        : 'bg-slate-800 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                    }`}
                  >
                    • {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">หรือระบุเหตุผลเพิ่มเติม:</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ระบุข้อความสั้นๆ ว่าส่วนไหนต้องการปรับปรุง..."
                rows={3}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !reason.trim()}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ส่งเหตุผล (👎 Dislike)</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
