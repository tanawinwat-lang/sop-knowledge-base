'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, BookOpen, ChevronRight, X, Loader2 } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QuickItem {
  id: number;
  title: string;
  category_id: number;
  tags: string[];
  matchType: string;
  snippet: string;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<QuickItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open search modal
          window.dispatchEvent(new CustomEvent('open-cmd-k'));
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search/quick?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setItems(data.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <Search className="w-5 h-5 text-indigo-400 mr-3 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาด่วน SOP, วิธีลาป่วย, คืนสินค้า... (กด ESC เพื่อปิด)"
            autoFocus
            className="w-full bg-transparent text-slate-100 placeholder-slate-400 text-base focus:outline-none"
          />
          {isLoading && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin mr-2" />}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto divide-y divide-slate-800/50 flex-1">
          {items.length === 0 && !isLoading && (
            <div className="py-12 text-center text-slate-400">
              <Sparkles className="w-8 h-8 text-indigo-400/50 mx-auto mb-3 animate-pulse" />
              <p className="text-sm font-medium">พิมพ์คำค้นหาเพื่อควานหา SOP ในระบบด้วย Hybrid Search</p>
              <p className="text-xs text-slate-400 mt-1">ตัวอย่าง: "อยากหยุดงานเพราะไม่สบาย", "คืนสินค้าภายในกี่วัน"</p>
            </div>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                onClose();
                router.push(`/sops/${item.id}`);
              }}
              className="p-3 rounded-xl hover:bg-slate-800/80 transition-all cursor-pointer group flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mt-0.5 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{item.snippet}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 rounded-md border border-indigo-500/30">
                      {item.matchType}
                    </span>
                    {item.tags.map((tag) => (
                      <span key={tag} className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors flex-shrink-0 mt-2" />
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>
            ทางลัด: ใช้ <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded font-mono">Ctrl+K</kbd> เพื่อเรียกค้นหาได้ทุกหน้า
          </span>
          <span className="text-indigo-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Vector AI Engine
          </span>
        </div>
      </div>
    </div>
  );
}
