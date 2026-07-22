'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, RefreshCw, Clock, User, CalendarDays, AlertTriangle, Loader2, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function TrashPage() {
  const [trashItems, setTrashItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const router = useRouter();

  const fetchTrash = () => {
    setIsLoading(true);
    fetch('/api/sops?trash=true')
      .then((res) => res.json())
      .then((data) => {
        setTrashItems(data.trash || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (id: number) => {
    setRestoringId(id);
    try {
      const res = await fetch(`/api/sops/${id}/restore`, { method: 'POST' });
      if (res.ok) {
        setTrashItems((prev) => prev.filter((t) => t.sop.id !== id));
      }
    } catch {}
    setRestoringId(null);
  };

  const daysUntilPermanentDelete = (deletedAt: string) => {
    const diff = Date.now() - new Date(deletedAt).getTime();
    const daysLeft = Math.ceil((30 * 24 * 60 * 60 * 1000 - diff) / (24 * 60 * 60 * 1000));
    return Math.max(0, daysLeft);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <Link href="/sops" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> กลับสู่คลัง SOP
          </Link>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Trash2 className="w-6 h-6 text-rose-400" />
            <span>ถังขยะ (Trash)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            เอกสาร SOP ที่ถูกลบ จะถูกเก็บไว้ 30 วัน หากไม่กู้คืนจะถูกลบถาวรอัตโนมัติ
          </p>
        </div>
        <button
          onClick={fetchTrash}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> รีเฟรช
        </button>
      </div>

      {/* Trash List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">กำลังโหลด...</div>
        ) : trashItems.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
            <Trash2 className="w-10 h-10 mx-auto mb-3 text-slate-700" />
            <p className="text-sm">ถังขยะว่าง</p>
            <p className="text-xs text-slate-600 mt-1">เอกสารที่ถูกลบจะปรากฏที่นี่</p>
          </div>
        ) : (
          trashItems.map((item: any) => {
            const daysLeft = daysUntilPermanentDelete(item.deleted_at);
            return (
              <div
                key={item.sop.id}
                className="p-5 bg-slate-900 border border-slate-800 hover:border-rose-500/30 rounded-2xl transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <h3 className="text-sm font-bold text-slate-100 truncate">{item.sop.title}</h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        ลบโดย: {item.deleted_by_username}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        ลบเมื่อ: {new Date(item.deleted_at).toLocaleString('th-TH')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        หมดอายุใน: {daysLeft} วัน
                      </span>
                    </div>

                    {daysLeft <= 3 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 w-fit">
                        <AlertTriangle className="w-3 h-3" />
                        จะถูกลบถาวรในอีก {daysLeft} วัน
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleRestore(item.sop.id)}
                    disabled={restoringId === item.sop.id}
                    className="flex-shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    {restoringId === item.sop.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>กู้คืน</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
