'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { WYSIWYGEditor } from '@/components/sops/WYSIWYGEditor';
import { AICopilotSidebar } from '@/components/sops/AICopilotSidebar';
import { AttachmentManager, Attachment } from '@/components/sops/AttachmentManager';
import { FileEdit, Save, ArrowLeft, Loader2, Folder, Bell, BellOff, Tag } from 'lucide-react';

export default function EditSOPPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('1');
  const [tags, setTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tagLibrary, setTagLibrary] = useState<any[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [isAICopilotOpen, setIsAICopilotOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [notifyOnUpdate, setNotifyOnUpdate] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const topLevelCats = categories.filter((c: any) => c.parent_id === null);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []));
    fetch('/api/tags')
      .then((res) => res.json())
      .then((data) => setTagLibrary(data.tags || []));

    fetch(`/api/sops/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.sop) {
          setTitle(data.sop.title);
          setContent(data.sop.content);
          setCategoryId(data.sop.category_id.toString());
          setTags(data.sop.tags || []);
          setAttachments(data.sop.attachments || []);
        }
      });
  }, [id]);

  const handleAddTag = async (t?: string) => {
    const tag = t || tagInput.trim();
    if (!tag || tags.includes(tag)) return;

    // Auto-create tag in library if it doesn't exist
    const exists = tagLibrary.some((lib: any) => lib.name.toLowerCase() === tag.toLowerCase());
    if (!exists) {
      try {
        await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: tag }),
        });
        const res = await fetch('/api/tags');
        const data = await res.json();
        setTagLibrary(data.tags || []);
      } catch {}
    }

    setTags([...tags, tag]);
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleDeleteTagFromLibrary = async (tagId: number, tagName: string) => {
    if (!confirm(`ลบแท็ก "${tagName}" ออกจากระบบ? (จะถูกลบออกจาก SOP ทั้งหมด)`)) return;
    try {
      await fetch(`/api/tags/${tagId}`, { method: 'DELETE' });
      const res = await fetch('/api/tags');
      const data = await res.json();
      setTagLibrary(data.tags || []);
      setTags((prev) => prev.filter((t) => t !== tagName));
    } catch {}
  };

  const filteredSuggestions = tagInput.trim()
    ? tagLibrary.filter(
        (t: any) =>
          t.name.toLowerCase().includes(tagInput.toLowerCase()) &&
          !tags.includes(t.name)
      )
    : [];

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/sops/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category_id: categoryId, tags, attachments, notify: notifyOnUpdate }),
      });
      if (!res.ok) throw new Error('ไม่สามารถบันทึกการแก้ไขได้');
      router.push(`/sops/${id}`);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> ย้อนกลับ
          </button>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <FileEdit className="w-6 h-6 text-indigo-400" />
            <span>แก้ไขเอกสาร SOP #{id}</span>
          </h1>
        </div>
        <button
          onClick={handleUpdate}
          disabled={isSaving}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>บันทึกเวอร์ชันใหม่</span>
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">ชื่อเอกสาร:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-base text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
            <Folder className="w-3.5 h-3.5 text-indigo-400" /> หมวดหมู่:
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full py-2.5 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            {topLevelCats.map((cat: any) => (
              <React.Fragment key={cat.id}>
                <option value={cat.id}>📁 {cat.name}</option>
                {categories
                  .filter((ch: any) => ch.parent_id === cat.id)
                  .map((child: any) => (
                    <option key={child.id} value={child.id}>
                      &nbsp;&nbsp;&nbsp;↳ {child.name}
                    </option>
                  ))}
              </React.Fragment>
            ))}
          </select>
        </div>

        {/* Tags Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-400" /> แท็กประจำเอกสาร (Tags):
            </label>
            <button
              type="button"
              onClick={() => setShowTagManager(!showTagManager)}
              className="text-[10px] text-slate-400 hover:text-indigo-300 transition-colors"
            >
              จัดการแท็กทั้งหมด ({tagLibrary.length})
            </button>
          </div>

          {/* Inline Tag Manager Popup */}
          {showTagManager && (
            <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300">แท็กทั้งหมดในระบบ</span>
                <button
                  type="button"
                  onClick={() => setShowTagManager(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ปิด
                </button>
              </div>
              {tagLibrary.length === 0 ? (
                <p className="text-xs text-slate-500">ยังไม่มีแท็กในระบบ</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {tagLibrary.map((lib: any) => (
                    <span
                      key={lib.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-slate-300"
                    >
                      #{lib.name}
                      <button
                        type="button"
                        onClick={() => handleDeleteTagFromLibrary(lib.id, lib.name)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {tags.map((t) => (
              <span
                key={t}
                className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                #{t}
                <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-rose-400">
                  ×
                </button>
              </span>
            ))}
            <div className="relative">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    setShowTagSuggestions(true);
                  }}
                  onFocus={() => setShowTagSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                    if (e.key === 'Escape') setShowTagSuggestions(false);
                  }}
                  placeholder="พิมพ์เพื่อค้นหาแท็ก..."
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-48"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  + เพิ่ม
                </button>
              </div>
              {/* Tag Suggestions Dropdown */}
              {showTagSuggestions && tagInput.trim() && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                  {filteredSuggestions.map((s: any) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleAddTag(s.name)}
                      className="w-full px-3.5 py-2 text-xs text-slate-200 hover:bg-indigo-500/20 hover:text-white text-left flex items-center gap-2 transition-colors"
                    >
                      <Tag className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                      <span>#{s.name}</span>
                    </button>
                  ))}
                  {/* Create new tag option if typed text isn't already in tags */}
                  {!tags.includes(tagInput.trim()) && !tagLibrary.some(
                    (lib: any) => lib.name.toLowerCase() === tagInput.trim().toLowerCase()
                  ) && (
                    <button
                      type="button"
                      onClick={() => handleAddTag()}
                      className="w-full px-3.5 py-2 text-xs text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 text-left flex items-center gap-2 border-t border-slate-700/50 transition-colors"
                    >
                      <span className="text-base leading-none">➕</span>
                      <span>สร้างแท็กใหม่ "{tagInput.trim()}"</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">เนื้อหา SOP:</label>
          <WYSIWYGEditor
            value={content}
            onChange={setContent}
            onOpenAICopilot={() => setIsAICopilotOpen(true)}
          />
        </div>

        {/* Attachments */}
        <AttachmentManager attachments={attachments} onChange={setAttachments} />

        {/* Notification Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl transition-colors ${notifyOnUpdate ? 'bg-indigo-500/20' : 'bg-slate-800'}`}>
              {notifyOnUpdate ? (
                <Bell className="w-4 h-4 text-indigo-400" />
              ) : (
                <BellOff className="w-4 h-4 text-slate-500" />
              )}
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-200">แจ้งเตือนผู้ใช้เมื่ออัปเดต</label>
              <p className="text-[11px] text-slate-500">สร้างประกาศข่าวสารอัตโนมัติเมื่อบันทึกการเปลี่ยนแปลง</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotifyOnUpdate(!notifyOnUpdate)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              notifyOnUpdate ? 'bg-indigo-600' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                notifyOnUpdate ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <AICopilotSidebar
        isOpen={isAICopilotOpen}
        onClose={() => setIsAICopilotOpen(false)}
        onApplyDraft={(draft) => setContent(draft)}
        currentContent={content}
        onApplyPolished={(p) => setContent(p)}
      />
    </div>
  );
}
