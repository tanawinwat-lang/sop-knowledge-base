'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Sparkles, Send, Bot, User, Loader2, ChevronRight, FileText, Lightbulb, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SopLink {
  id: number;
  title: string;
  snippet: string;
  score: number;
  matchType: string;
  reason?: string;
  relevanceScore?: number;
}

interface AiAnalysis {
  recommendation: string;
  topMatch: { title: string; reason: string; howToUse: string } | null;
  allMatches: { title: string; relevanceScore: number; reason: string }[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  sopLinks?: SopLink[];
  analysis?: AiAnalysis;
}

export function AIChatPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'สวัสดี! 👋 บอกปัญหาหรือสถานการณ์ที่คุณเจอ แล้ว AI จะวิเคราะห์ว่า SOP ใดควรใช้แก้ไข เช่น:\n• "พนักงานขอใบรับรองแพทย์แต่เอกสารไม่ครบ"\n• "ลูกค้าต้องการคืนสินค้าหมดเขต"\n• "ขั้นตอนอนุมัติงบประมาณทำยังไง"',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/search/hybrid?q=${encodeURIComponent(userMsg)}`);
      const data = await res.json();

      const results = data.results || [];
      const analysis: AiAnalysis | undefined = data.analysis;
      const summary = data.summary || '';

      if (results.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `ขออภัย ไม่พบเอกสาร SOP ที่เกี่ยวข้องกับ "${userMsg}" ในระบบ กรุณาลองเปลี่ยนคำค้นหาหรือสอบถามหัวหน้างาน`,
          },
        ]);
      } else {
        // Build SOP links — only show documents with real relevance (score >= 5 from content/tags)
        const sopLinks: SopLink[] = results
          .filter((r: any) => {
            const matchInfo = analysis?.allMatches.find((m) => m.title === r.sop.title);
            return matchInfo && matchInfo.relevanceScore >= 5;
          })
          .slice(0, 5)
          .map((r: any) => {
            const matchInfo = analysis?.allMatches.find((m) => m.title === r.sop.title);
            return {
              id: r.sop.id,
              title: r.sop.title,
              snippet: r.snippet || '',
              score: r.score || 0,
              matchType: r.matchType || '',
              reason: matchInfo?.reason || '',
              relevanceScore: matchInfo?.relevanceScore || 0,
            };
          });

        // Use AI analysis recommendation if available, otherwise fallback to summary
        const assistantText = analysis?.recommendation || summary || `พบ ${results.length} เอกสารที่เกี่ยวข้อง`;

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: assistantText,
            sopLinks: sopLinks,
            analysis: analysis,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 4) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-slate-400 border-slate-600/30 bg-slate-800/50';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 7) return 'แนะนำสูง';
    if (score >= 4) return 'ปานกลาง';
    return 'ต่ำ';
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Panel */}
      {isOpen && (
        <div className="w-[420px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-8rem)] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 border-b border-indigo-500/30 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">AI SOP Assistant</h3>
                <p className="text-[10px] text-indigo-200">วิเคราะห์ปัญหา → แนะนำ SOP ที่เหมาะสม</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {messages.map((msg, i) => (
              <div key={i}>
                {/* User / Assistant Bubble */}
                <div className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div
                    className={`p-1.5 rounded-full flex-shrink-0 mt-0.5 ${
                      msg.role === 'assistant'
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <Bot className="w-3.5 h-3.5" />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-indigo-600/80 text-white'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    {msg.role === 'assistant' && msg.analysis?.topMatch ? (
                      <>
                        {/* Recommendation header badge */}
                        <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-slate-700/50">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">AI วิเคราะห์ & แนะนำ</span>
                        </div>
                        <p>{msg.text}</p>
                      </>
                    ) : (
                      <p>{msg.text}</p>
                    )}
                  </div>
                </div>

                {/* SOP Links with Analysis Reasons */}
                {msg.role === 'assistant' && msg.sopLinks && msg.sopLinks.length > 0 && (
                  <div className="ml-10 mt-2 space-y-1.5">
                    {msg.sopLinks.map((link, idx) => (
                      <button
                        key={link.id}
                        onClick={() => {
                          setIsOpen(false);
                          router.push(`/sops/${link.id}`);
                        }}
                        className="w-full flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/60 hover:bg-indigo-500/10 border border-slate-700/60 hover:border-indigo-500/30 transition-all text-left group"
                      >
                        <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 flex-shrink-0 mt-0.5">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-indigo-200 group-hover:text-indigo-100 truncate">
                              {link.title}
                            </span>
                            {(link.relevanceScore !== undefined && link.relevanceScore > 0) && (
                              <span className={`flex-shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded-full border ${getScoreColor(link.relevanceScore)}`}>
                                {getScoreLabel(link.relevanceScore)}
                              </span>
                            )}
                            <ChevronRight className="w-3 h-3 text-indigo-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                          </div>
                          {link.reason && (
                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                              <Target className="w-2.5 h-2.5 inline mr-0.5 text-indigo-400" />
                              {link.reason}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                            {link.snippet.replace(/[#*\[\]`>]/g, '').substring(0, 100)}...
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-full bg-indigo-500/20 text-indigo-400 flex-shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-400 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังวิเคราะห์ปัญหาและค้นหา SOP ที่เหมาะสม...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 flex items-center gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="บอกปัญหาหรือสถานการณ์ที่คุณเจอ..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* FAB Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 ${
          isOpen
            ? 'bg-slate-700 hover:bg-slate-600 scale-90'
            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:scale-105'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
}
