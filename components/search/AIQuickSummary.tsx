'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, Zap } from 'lucide-react';

interface AIQuickSummaryProps {
  summary: string;
  isSearching: boolean;
}

export function AIQuickSummary({ summary, isSearching }: AIQuickSummaryProps) {
  const [displayText, setDisplayText] = useState('');
  const [copied, setCopied] = useState(false);

  // Streaming text simulation to satisfy < 2.5s streaming experience requirement
  useEffect(() => {
    if (!summary) {
      setDisplayText('');
      return;
    }

    let i = 0;
    setDisplayText('');
    const speed = 15; // ms per character
    const interval = setInterval(() => {
      if (i < summary.length) {
        setDisplayText(summary.substring(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [summary]);

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!summary && !isSearching) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/40 border border-indigo-500/30 p-5 md:p-6 shadow-2xl backdrop-blur-md my-6">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10" />

      {/* Top Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/30">
            <Sparkles className="w-4 h-4 text-white animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-transparent flex items-center gap-2">
              <span>AI Quick Summary Panel</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                <Zap className="w-3 h-3" /> ตอบลูกค้าใน 5 วินาที
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">สรุปคำตอบข้อ 1, 2, 3 อัตโนมัติสำหรับ Agent โดยไม่ต้องกดเปิดอ่านไฟล์เต็ม</p>
          </div>
        </div>

        {summary && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 rounded-lg text-xs font-semibold text-indigo-200 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>คัดลอกแล้ว!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-indigo-300" />
                <span>คัดลอกข้อความ</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Body Content */}
      {isSearching ? (
        <div className="py-6 flex items-center gap-3 text-indigo-300 text-sm animate-pulse">
          <Sparkles className="w-5 h-5 animate-spin" />
          <span>กำลังอ่านวิเคราะห์เอกสาร SOP และเรียบเรียงสรุปด้วย AI...</span>
        </div>
      ) : (
        <div className="text-slate-200 text-sm md:text-base leading-relaxed font-sans whitespace-pre-wrap">
          {displayText}
          {displayText.length < summary.length && <span className="inline-block w-2 h-4 bg-indigo-400 ml-1 animate-pulse" />}
        </div>
      )}
    </div>
  );
}
