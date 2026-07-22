'use client';

import React, { useState } from 'react';
import { Sparkles, Wand2, FileCheck2, Loader2, X, ArrowRight } from 'lucide-react';

interface AICopilotSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDraft: (content: string) => void;
  currentContent: string;
  onApplyPolished: (polished: string) => void;
}

export function AICopilotSidebar({
  isOpen,
  onClose,
  onApplyDraft,
  currentContent,
  onApplyPolished,
}: AICopilotSidebarProps) {
  const [topic, setTopic] = useState('');
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [isLoadingPolish, setIsLoadingPolish] = useState(false);

  const handleGenerateDraft = async () => {
    if (!topic.trim()) return;
    setIsLoadingDraft(true);
    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DRAFT', topic }),
      });
      const data = await res.json();
      if (data.result) {
        onApplyDraft(data.result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDraft(false);
    }
  };

  const handlePolishText = async () => {
    if (!currentContent.trim()) return;
    setIsLoadingPolish(true);
    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'POLISH', text: currentContent }),
      });
      const data = await res.json();
      if (data.result) {
        onApplyPolished(data.result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPolish(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-900 border-l border-indigo-500/30 p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-300">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-indigo-400 font-bold">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-spin-slow" />
            <h3 className="text-base text-slate-100">AI Writing Copilot</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action 1: Draft Outline */}
        <div className="mt-6 p-4 rounded-xl bg-slate-800 border border-slate-700/70 space-y-3">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
            <Wand2 className="w-4 h-4 text-indigo-400" />
            <span>ช่วยดราฟต์โครงร่าง SOP (Draft Outline)</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            พิมพ์หัวข้อสั้นๆ แล้วให้ AI ช่วยเจนเนอเรตหัวข้อและขั้นตอนมาตรฐาน 1, 2, 3 ให้อัตโนมัติ
          </p>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="เช่น ขั้นตอนอนุมัติเบิกค่าเดินทาง..."
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleGenerateDraft}
            disabled={isLoadingDraft || !topic.trim()}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20"
          >
            {isLoadingDraft ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังดราฟต์เนื้อหา...</span>
              </>
            ) : (
              <>
                <span>สร้างโครงร่างใส่เอดิเตอร์</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Action 2: Polish Language */}
        <div className="mt-5 p-4 rounded-xl bg-slate-800 border border-slate-700/70 space-y-3">
          <div className="flex items-center gap-2 text-purple-300 font-semibold text-sm">
            <FileCheck2 className="w-4 h-4 text-purple-400" />
            <span>เกลาภาษาให้กระชับเป็นทางการ (Polish Language)</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            ปรับเปลี่ยนภาษาเขียนทั่วไปในเอดิเตอร์ให้เป็นภาษาระเบียบปฏิบัติการที่เป็นทางการและอ่านง่าย
          </p>
          <button
            onClick={handlePolishText}
            disabled={isLoadingPolish || !currentContent.trim()}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-600/20"
          >
            {isLoadingPolish ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังเกลาภาษา...</span>
              </>
            ) : (
              <>
                <span>เกลาภาษาเนื้อหาปัจจุบัน</span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800 text-center text-[11px] text-slate-400">
        AI Copilot ช่วยลดเวลาเขียนเอกสาร SOP กว่า 70%
      </div>
    </div>
  );
}
