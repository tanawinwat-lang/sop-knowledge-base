'use client';

import React, { useState } from 'react';
import { Search, Sparkles, X, ArrowRight, CornerDownLeft } from 'lucide-react';

interface SmartSearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SmartSearchBar({ onSearch, isLoading }: SmartSearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const sampleQueries = [
    'อยากหยุดงานเพราะไม่สบาย',
    'คืนสินค้าชำรุดภายในกี่วัน',
    'อนุมัติงบประมาณเกิน 5 แสน',
    'นโยบาย WFH',
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur-md opacity-30 group-hover:opacity-50 transition-opacity" />

        <div className="relative flex items-center bg-slate-900 border-2 border-slate-700/80 focus-within:border-indigo-500 rounded-2xl shadow-2xl overflow-hidden transition-all">
          <div className="pl-5 pr-3 text-indigo-400">
            <Search className="w-6 h-6" />
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา SOP ด้วยคีย์เวิร์ด หรือพิมพ์ประโยคคำถามภาษาธรรมชาติ เช่น 'อยากหยุดงานเพราะไม่สบาย'..."
            className="w-full py-4 bg-transparent text-slate-100 placeholder-slate-400 text-base md:text-lg focus:outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-slate-400 hover:text-slate-200 mr-2"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="m-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>กำลังค้นหา...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>ค้นหา</span>
                <CornerDownLeft className="w-4 h-4 hidden sm:inline" />
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Suggested Quick Queries */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
        <span className="flex items-center gap-1 font-medium text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> ตัวอย่างค้นหา:
        </span>
        {sampleQueries.map((q) => (
          <button
            key={q}
            onClick={() => {
              setQuery(q);
              onSearch(q);
            }}
            className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 rounded-lg transition-all"
          >
            "{q}"
          </button>
        ))}
      </div>
    </div>
  );
}
