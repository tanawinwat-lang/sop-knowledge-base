'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SOPExpiryBadge } from '@/components/sops/SOPExpiryBadge';
import { CategoryManagerModal } from '@/components/sops/CategoryManagerModal';
import {
  BookOpen, Plus, Search, Folder, Tag, ChevronRight, Settings2, Trash2,
  AlertTriangle, Loader2, CheckSquare, Square, Download, FileText, X,
} from 'lucide-react';
export default function SOPsPage() {
  const searchParams = useSearchParams();
  const categoryIdParam = searchParams.get('category_id');

  const [sops, setSops] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryIdParam || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState<string>('AGENT');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Operations State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  const [bulkValue, setBulkValue] = useState<string>('');
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bulkExportData, setBulkExportData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUserRole(data.user.role_name);
      });

    fetch('/api/sops?status=PUBLISHED')
      .then((res) => res.json())
      .then((data) => setSops(data.sops || []));

    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []));
  }, []);

  const canManageCategories = userRole === 'ADMIN' || userRole === 'SUPERVISOR';
  const canCreate = userRole === 'ADMIN' || userRole === 'SUPERVISOR';
  const canDelete = userRole === 'ADMIN' || userRole === 'SUPERVISOR';
  const canBulk = userRole === 'ADMIN' || userRole === 'SUPERVISOR';

  const topLevelCats = categories.filter((c: any) => c.parent_id === null);
  const getChildCats = (parentId: number): any[] =>
    categories.filter((c: any) => c.parent_id === parentId);

  const countSopsInCategory = (catId: number): number => {
    const direct = sops.filter((s: any) => s.category_id === catId).length;
    const childIds = categories.filter((c: any) => c.parent_id === catId).map((c: any) => c.id);
    return direct + childIds.reduce((sum: number, cid: number) => sum + countSopsInCategory(cid), 0);
  };

  const handleCategoriesChanged = useCallback(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []));
  }, []);

  const getCategoryWithChildren = (catId: number): number[] => {
    const children = categories
      .filter((c: any) => c.parent_id === catId)
      .flatMap((c: any) => getCategoryWithChildren(c.id));
    return [catId, ...children];
  };

  const filteredSOPs = sops.filter((sop) => {
    if (selectedCategory !== 'ALL') {
      const catIds = getCategoryWithChildren(parseInt(selectedCategory, 10));
      if (!catIds.includes(sop.category_id)) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return sop.title.toLowerCase().includes(q) ||
        sop.content.toLowerCase().includes(q) ||
        sop.tags?.some((t: string) => t.toLowerCase().includes(q));
    }
    return true;
  });

  // Bulk Operations
  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSOPs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSOPs.map((s) => s.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const showBulkMessage = (type: 'success' | 'error', text: string) => {
    setBulkMessage({ type, text });
    setTimeout(() => setBulkMessage(null), 4000);
  };

  const handleBulkAction = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const body: any = { action: bulkAction, ids: Array.from(selectedIds) };
      if (bulkAction === 'MOVE_CATEGORY') body.value = bulkValue;
      if (bulkAction === 'ADD_TAGS' || bulkAction === 'REMOVE_TAGS') {
        body.value = bulkTagInput.split(',').map((t) => t.trim()).filter(Boolean);
      }

      const res = await fetch('/api/sops/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'ดำเนินการไม่สำเร็จ');

      if (bulkAction === 'EXPORT_JSON' && data.export_data) {
        // Trigger download
        const blob = new Blob([JSON.stringify(data.export_data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = data.filename || 'sops-export.json';
        a.click();
        URL.revokeObjectURL(url);
        showBulkMessage('success', `ส่งออก ${data.count} รายการแล้ว`);
      } else {
        showBulkMessage('success', data.message || `ดำเนินการ ${data.count} รายการสำเร็จ`);
        // Refresh SOPs
        const refresh = await fetch('/api/sops?status=PUBLISHED');
        const refreshData = await refresh.json();
        setSops(refreshData.sops || []);
        setSelectedIds(new Set());
      }
    } catch (err: any) {
      showBulkMessage('error', err.message);
    } finally {
      setIsBulkProcessing(false);
      setBulkAction('');
      setBulkValue('');
      setBulkTagInput('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            <span>คลังระเบียบปฏิบัติมาตรฐาน (SOP Library)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">รวบรวมเอกสาร SOP และขั้นตอนการปฏิบัติงานทั้งหมดในระบบ</p>
        </div>

        {canCreate && (
          <Link
            href="/sops/new"
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างเอกสาร SOP ใหม่</span>
          </Link>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900 p-4 border border-slate-800 rounded-2xl shadow-xl">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อเอกสาร คีย์เวิร์ด หรือแท็ก..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Folder className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-64 py-2.5 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">📂 ทุกหมวดหมู่ (All Categories)</option>
              {topLevelCats.map((cat: any) => (
                <React.Fragment key={cat.id}>
                  <option value={cat.id}>📁 {cat.name} ({countSopsInCategory(cat.id)})</option>
                  {getChildCats(cat.id).map((child: any) => (
                    <option key={child.id} value={child.id}>
                      &nbsp;&nbsp;&nbsp;↳ {child.name} ({countSopsInCategory(child.id)})
                    </option>
                  ))}
                </React.Fragment>
              ))}
            </select>
          </div>

          {canManageCategories && (
            <button
              onClick={() => setShowCategoryManager(true)}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-indigo-300 rounded-xl text-xs flex items-center gap-1.5 transition-all flex-shrink-0"
              title="จัดการหมวดหมู่"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">จัดการหมวดหมู่</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Operations Toolbar */}
      {selectedIds.size > 0 && canBulk && (
        <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Selected count + clear */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-200">
                เลือกแล้ว {selectedIds.size} รายการ
              </span>
            </div>
            <button
              onClick={clearSelection}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <X className="w-3 h-3" /> ล้างการเลือก
            </button>
          </div>

          {/* Bulk action controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Action selector */}
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">— เลือกคำสั่ง —</option>
              <option value="DELETE">🗑️ ลบที่เลือก</option>
              <option value="MOVE_CATEGORY">📂 ย้ายหมวดหมู่</option>
              <option value="ADD_TAGS">🏷️ เพิ่มแท็ก</option>
              <option value="REMOVE_TAGS">🏷️ ลบแท็ก</option>
              <option value="EXPORT_JSON">📥 ส่งออก JSON</option>
            </select>

            {/* MOVE_CATEGORY: category picker */}
            {bulkAction === 'MOVE_CATEGORY' && (
              <select
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="">— เลือกหมวดหมู่ —</option>
                {categories.filter((c: any) => c.parent_id === null).map((cat: any) => (
                  <React.Fragment key={cat.id}>
                    <option value={cat.id}>{cat.name}</option>
                    {categories.filter((ch: any) => ch.parent_id === cat.id).map((ch: any) => (
                      <option key={ch.id} value={ch.id}>&nbsp;&nbsp;↳ {ch.name}</option>
                    ))}
                  </React.Fragment>
                ))}
              </select>
            )}

            {/* ADD_TAGS / REMOVE_TAGS: tag input */}
            {(bulkAction === 'ADD_TAGS' || bulkAction === 'REMOVE_TAGS') && (
              <input
                type="text"
                value={bulkTagInput}
                onChange={(e) => setBulkTagInput(e.target.value)}
                placeholder="แท็ก คั่นด้วยจุลภาค..."
                className="flex-1 min-w-[200px] py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            )}

            {/* Execute button */}
            {bulkAction && (
              <button
                onClick={handleBulkAction}
                disabled={isBulkProcessing || (bulkAction === 'MOVE_CATEGORY' && !bulkValue) || ((bulkAction === 'ADD_TAGS' || bulkAction === 'REMOVE_TAGS') && !bulkTagInput.trim())}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                {isBulkProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
                {isBulkProcessing ? 'กำลังดำเนินการ...' : 'ดำเนินการ'}
              </button>
            )}
          </div>

          {/* Status message */}
          {bulkMessage && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
              bulkMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}>
              <span>{bulkMessage.text}</span>
            </div>
          )}
        </div>
      )}

      {/* SOPs Grid List */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {canBulk && filteredSOPs.length > 0 && (
            <button onClick={toggleSelectAll} className="flex items-center gap-1.5 hover:text-indigo-300 transition-colors">
              {selectedIds.size === filteredSOPs.length ? (
                <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              {selectedIds.size === filteredSOPs.length ? 'ล้างทั้งหมด' : `เลือกทั้งหมด (${filteredSOPs.length})`}
            </button>
          )}
        </p>
        <span className="text-[10px] text-slate-500">พบ {filteredSOPs.length} เอกสาร</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSOPs.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
            ไม่พบเอกสาร SOP ในหมวดหมู่นี้
          </div>
        ) : (
          filteredSOPs.map((sop) => (
            <div key={sop.id} className="p-5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 rounded-2xl transition-all shadow-md group flex flex-col justify-between space-y-4">
              <Link href={`/sops/${sop.id}`} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Bulk selection checkbox */}
                    {canBulk && (
                      <button
                        onClick={(e) => { e.preventDefault(); toggleSelect(sop.id); }}
                        className="flex-shrink-0 p-0.5 text-slate-500 hover:text-indigo-400"
                      >
                        {selectedIds.has(sop.id) ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    )}
                    <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {sop.title}
                    </h3>
                  </div>
                  <SOPExpiryBadge expiresAt={sop.expires_at} reviewCycleMonths={sop.review_cycle_months} />
                </div>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {sop.content.replace(/[#*`>]/g, '').substring(0, 180)}...
                </p>
              </Link>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <div className="flex items-center gap-1 flex-wrap">
                    {sop.tags?.slice(0, 3).map((t: string) => (
                      <span key={t} className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded">#{t}</span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canDelete && (
                    <button
                      onClick={(e) => { e.preventDefault(); setDeleteTarget(sop); }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="ลบเอกสารนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <Link
                    href={`/sops/${sop.id}`}
                    className="text-indigo-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                  >
                    อ่านต่อ <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <CategoryManagerModal
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        onCategoriesChanged={handleCategoriesChanged}
      />

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">ยืนยันการลบเอกสาร</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  คุณแน่ใจที่จะลบ "{deleteTarget.title}" หรือไม่? เอกสารจะถูกย้ายไปถังขยะและจะถูกลบถาวรหลังจาก 30 วัน
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={isDeleting}
                className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const res = await fetch(`/api/sops/${deleteTarget.id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('ไม่สามารถลบเอกสารได้');
                    setSops((prev: any[]) => prev.filter((s: any) => s.id !== deleteTarget.id));
                    setDeleteTarget(null);
                  } catch (err: any) { alert(err.message); }
                  finally { setIsDeleting(false); }
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {isDeleting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
