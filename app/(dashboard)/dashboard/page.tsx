'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SOPExpiryBadge } from '@/components/sops/SOPExpiryBadge';
import {
  BookOpen,
  Folder,
  Sparkles,
  ChevronRight,
  Clock,
  AlertTriangle,
  Search,
  CheckCircle2,
} from 'lucide-react';
interface SOPItem {
  id: number;
  category_id: number;
  title: string;
  content: string;
  status: string;
  tags: string[];
  expires_at?: string;
  last_reviewed_at?: string;
  review_cycle_months?: number;
}

interface CategoryItem {
  id: number;
  name: string;
  parent_id: number | null;
  allowed_roles: number[];
}

export default function DashboardPage() {
  const [sops, setSops] = useState<SOPItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch published SOPs and allowed categories
    fetch('/api/sops?status=PUBLISHED')
      .then((res) => res.json())
      .then((data) => setSops(data.sops || []));

    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []));
  }, []);

  const searchResults = sops.filter((sop) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        sop.title.toLowerCase().includes(q) ||
        sop.content.toLowerCase().includes(q) ||
        sop.tags?.some((t: string) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const hasSearched = searchQuery.trim().length > 0;

  const expiredSOPs = sops.filter((s) => {
    if (!s.expires_at) return false;
    return new Date(s.expires_at).getTime() < Date.now();
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 border border-slate-800 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> AI Knowledge Base & SOP Engine v1.0
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            ยินดีต้อนรับสู่ระบบค้นหาและจัดการ SOP
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            ค้นหาระเบียบปฏิบัติมาตรฐานด้วยระบบ Hybrid Search (คีย์เวิร์ด + AI Semantic) พร้อมระบบสรุปคำตอบด่วนสำหรับ Agent ใน 5 วินาที
          </p>
        </div>
      </div>

      {/* Simple Search Bar — matches by title, content, or tags */}
      <div className="py-2">
        <div className="w-full max-w-4xl mx-auto">
          <div className="relative">
            <div className="relative flex items-center bg-slate-900 border-2 border-slate-700/80 focus-within:border-indigo-500 rounded-2xl shadow-2xl overflow-hidden transition-all">
              <div className="pl-5 pr-3 text-indigo-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหา SOP จากชื่อเอกสารหรือเนื้อหา..."
                className="w-full py-4 bg-transparent text-slate-100 placeholder-slate-400 text-base focus:outline-none"
              />
              {searchQuery && (
                <button                  onClick={() => setSearchQuery('')}
                className="mr-3 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                ล้าง
                </button>
              )}
            </div>
          </div>


        </div>
      </div>

      {/* Search Results List */}
      {(hasSearched || searchQuery.trim()) && (
        <div className="space-y-4">              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span>
              ผลการค้นหา ({searchResults.length} รายการ)
            </span>
          </h3>

          {searchResults.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
              ไม่พบเอกสาร SOP ที่ตรงกับคำค้นหาของคุณ
            </div>
          ) : (
            <div className="grid gap-4">
              {searchResults.map((sop) => (
                <Link
                  key={sop.id}
                  href={`/sops/${sop.id}`}
                  className="p-5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition-all shadow-md group flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {sop.title}
                      </h4>
                      <SOPExpiryBadge
                        expiresAt={sop.expires_at}
                        reviewCycleMonths={sop.review_cycle_months}
                      />
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {sop.content.replace(/[#*`>\[\]]/g, '').substring(0, 200)}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      {sop.tags?.map((t: string) => (
                        <span key={t} className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform self-end md:self-center">
                    <span>เปิดอ่านเอกสาร</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category Folders & Expired SOPs Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Category Folders Explorer (Requirement 3.2: Category Level RBAC) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Folder className="w-5 h-5 text-indigo-400" />
              <span>หมวดหมู่เอกสารที่คุณมีสิทธิ์เข้าถึง (Category Folders)</span>
            </h3>
            <span className="text-xs text-slate-400">กรองสิทธิ์ระดับโฟลเดอร์อัตโนมัติ</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categories.map((cat) => {
              const count = sops.filter((s) => s.category_id === cat.id).length;
              return (
                <Link
                  key={cat.id}
                  href={`/sops?category_id=${cat.id}`}
                  className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 rounded-2xl transition-all group flex items-start gap-3.5 shadow-md"
                >
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-105 transition-transform">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                      {cat.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">{count} เอกสาร SOP ในหมวดหมู่นี้</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Document Expiry Alert Widget (Requirement 4) */}
        <div className="space-y-4">            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
            <Clock className="w-5 h-5 text-rose-400" />
            <span>SOP ที่ต้องได้รับการตรวจสอบด่วน</span>
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            {expiredSOPs.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p>เอกสารทั้งหมดอยู่ในสภาพสมบูรณ์ ไม่พบเอกสารหมดอายุ</p>
              </div>
            ) : (
              expiredSOPs.map((sop) => (
                <Link
                  key={sop.id}
                  href={`/sops/${sop.id}`}
                  className="block p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <h5 className="text-xs font-bold text-rose-200 group-hover:text-white line-clamp-1">
                      {sop.title}
                    </h5>
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 ml-2" />
                  </div>
                  <p className="text-[11px] text-rose-300/80 mt-1">หมดอายุแล้ว ต้องการให้ Supervisor กดทบทวน</p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
