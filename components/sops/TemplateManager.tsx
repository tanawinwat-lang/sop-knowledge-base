'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Loader2,
  X,
  Check,
  AlertTriangle,
  Sparkles,
  Folder,
  Clock,
  Tag,
} from 'lucide-react';

interface Template {
  id: number;
  name: string;
  description: string;
  content: string;
  category_id: number;
  tags: string[];
  review_cycle_months: number;
  created_by: number;
  created_at: string;
}

interface TemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Template) => void;
}

export function TemplateManager({ isOpen, onClose, onSelectTemplate }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('1');
  const [formTags, setFormTags] = useState('');
  const [formCycle, setFormCycle] = useState('6');

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/sop-templates');
      const data = await res.json();
      if (res.ok) setTemplates(data.templates || []);
    } catch {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      fetch('/api/categories')
        .then((r) => r.json())
        .then((d) => setCategories(d.categories || []));
    }
  }, [isOpen]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formContent.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/sop-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDesc,
          content: formContent,
          category_id: formCategory,
          tags: formTags.split(',').map((t) => t.trim()).filter(Boolean),
          review_cycle_months: formCycle,
        }),
      });
      if (!res.ok) throw new Error('สร้าง Template ไม่สำเร็จ');
      showMessage('success', 'สร้าง Template สำเร็จ!');
      setShowCreateForm(false);
      setFormName('');
      setFormDesc('');
      setFormContent('');
      setFormTags('');
      setFormCategory('1');
      setFormCycle('6');
      fetchTemplates();
    } catch (err: any) {
      showMessage('error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/sop-templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('ลบไม่สำเร็จ');
      showMessage('success', 'ลบ Template สำเร็จ');
      setDeleteTarget(null);
      fetchTemplates();
    } catch (err: any) {
      showMessage('error', err.message);
    }
  };

  const getCategoryName = (catId: number) => {
    const cat = categories.find((c: any) => c.id === catId);
    return cat ? cat.name : 'ไม่ระบุหมวดหมู่';
  };

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">จัดการแม่แบบเอกสาร SOP (Templates)</h3>
              <p className="text-[11px] text-slate-400">สร้างและเลือกใช้แม่แบบเพื่อลดเวลาเขียน SOP</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mx-5 mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}>
            {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Search + Create button */}
        <div className="flex items-center gap-3 p-5 pb-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหา Template..."
              className="w-full pl-4 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            สร้าง Template ใหม่
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3">
          {/* Create Form */}
          {showCreateForm && (
            <form onSubmit={handleCreate} className="p-4 bg-slate-800 border border-indigo-500/40 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" /> สร้างแม่แบบใหม่
              </h4>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">ชื่อ Template *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  placeholder="เช่น SOP การอบรมความปลอดภัย"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">คำอธิบาย</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  placeholder="คำอธิบายสั้นๆ ว่า Template นี้ใช้ทำอะไร"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                    <Folder className="w-3 h-3 inline mr-1" />หมวดหมู่
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {categories.filter((c: any) => c.parent_id === null).map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                    <Clock className="w-3 h-3 inline mr-1" />รอบทบทวน
                  </label>
                  <select
                    value={formCycle}
                    onChange={(e) => setFormCycle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="3">3 เดือน</option>
                    <option value="6">6 เดือน</option>
                    <option value="12">12 เดือน</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                  <Tag className="w-3 h-3 inline mr-1" />แท็ก (คั่นด้วยเครื่องหมายจุลภาค)
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  placeholder="เช่น Safety, อบรม, ความปลอดภัย"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">เนื้อหา Template (Markdown) *</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  rows={8}
                  placeholder="เนื้อหาที่ต้องการให้เป็นแม่แบบ... ใช้ [วงเล็บเหลี่ยม] สำหรับส่วนที่ต้องกรอกเอง"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formName.trim() || !formContent.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  บันทึก Template
                </button>
              </div>
            </form>
          )}

          {/* Template List */}
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <FileText className="w-10 h-10 mx-auto opacity-40" />
              <p className="text-sm">ยังไม่มีแม่แบบเอกสาร</p>
              <p className="text-xs">กด "สร้าง Template ใหม่" เพื่อเพิ่มแม่แบบแรกของคุณ</p>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-indigo-500/40 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <h4 className="text-sm font-bold text-slate-100 truncate">{template.name}</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{template.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span>📁 {getCategoryName(template.category_id)}</span>
                      <span>🔄 ทุก {template.review_cycle_months} เดือน</span>
                      {template.tags.length > 0 && (
                        <span>🏷️ {template.tags.slice(0, 3).join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => {
                        onSelectTemplate(template);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold rounded-lg transition-all"
                    >
                      ใช้ Template นี้
                    </button>
                    <button
                      onClick={() => setDeleteTarget(template.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Delete confirm */}
                {deleteTarget === template.id && (
                  <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="px-2.5 py-1.5 text-[10px] font-semibold text-slate-400 hover:text-slate-200 rounded-lg"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> ยืนยันการลบ
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
