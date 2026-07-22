'use client';

import React, { useState, useRef } from 'react';
import { Image, Link, FileText, X, Plus, Upload, ExternalLink, Paperclip, Loader2 } from 'lucide-react';

export interface Attachment {
  id: string;
  type: 'image' | 'link' | 'file';
  name: string;
  url: string;
  mimeType?: string;
  fileSize?: number;
}

interface AttachmentManagerProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  maxFileSizeMB?: number;
}

export function AttachmentManager({ attachments, onChange, maxFileSizeMB = 5 }: AttachmentManagerProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Add link state
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Image upload
  const imageInputRef = useRef<HTMLInputElement>(null);
  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  const removeAttachment = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;
    const newAttachment: Attachment = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'link',
      name: linkName.trim() || linkUrl.trim(),
      url: linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`,
    };
    onChange([...attachments, newAttachment]);
    setLinkName('');
    setLinkUrl('');
    setShowLinkForm(false);
    setShowAddMenu(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      alert(`ไฟล์มีขนาดใหญ่เกิน ${maxFileSizeMB}MB กรุณาเลือกไฟล์ที่เล็กลง`);
      return;
    }
    setIsUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const newAttachment: Attachment = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'image',
        name: file.name,
        url: base64,
        mimeType: file.type,
        fileSize: file.size,
      };
      onChange([...attachments, newAttachment]);
    } catch (err) {
      alert('ไม่สามารถอัปโหลดรูปภาพได้');
    } finally {
      setIsUploading(false);
      setShowAddMenu(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      alert(`ไฟล์มีขนาดใหญ่เกิน ${maxFileSizeMB}MB กรุณาเลือกไฟล์ที่เล็กลง`);
      return;
    }
    setIsUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const newAttachment: Attachment = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'file',
        name: file.name,
        url: base64,
        mimeType: file.type,
        fileSize: file.size,
      };
      onChange([...attachments, newAttachment]);
    } catch (err) {
      alert('ไม่สามารถอัปโหลดไฟล์ได้');
    } finally {
      setIsUploading(false);
      setShowAddMenu(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const typeIcons: Record<string, React.ReactNode> = {
    image: <Image className="w-4 h-4 text-purple-400" />,
    link: <Link className="w-4 h-4 text-sky-400" />,
    file: <FileText className="w-4 h-4 text-amber-400" />,
  };

  const typeBgColors: Record<string, string> = {
    image: 'bg-purple-500/10 border-purple-500/20',
    link: 'bg-sky-500/10 border-sky-500/20',
    file: 'bg-amber-500/10 border-amber-500/20',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
          สิ่งแนบ (รูปภาพ / ลิงก์ / ไฟล์):
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            disabled={isUploading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {isUploading ? 'กำลังอัปโหลด...' : 'เพิ่มสิ่งแนบ'}
          </button>

          {showAddMenu && !isUploading && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-10 overflow-hidden animate-in slide-in-from-top-2 duration-100">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <Image className="w-4 h-4 text-purple-400" />
                รูปภาพ
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                ไฟล์เอกสาร
              </button>
              <button
                type="button"
                onClick={() => { setShowLinkForm(true); setShowAddMenu(false); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <Link className="w-4 h-4 text-sky-400" />
                ลิงก์
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Link form */}
      {showLinkForm && (
        <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl space-y-2 animate-in fade-in duration-150">
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block">ชื่อลิงก์ (ไม่บังคับ)</label>
            <input
              type="text"
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
              placeholder="เช่น คู่มือการใช้งานระบบ"
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block">URL</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com/document"
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setShowLinkForm(false); setLinkName(''); setLinkUrl(''); }}
              className="px-2.5 py-1 text-[10px] text-slate-400 hover:text-slate-200"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleAddLink}
              disabled={!linkUrl.trim()}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold rounded-lg disabled:opacity-50"
            >
              เพิ่มลิงก์
            </button>
          </div>
        </div>
      )}

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs ${typeBgColors[att.type] || 'bg-slate-800 border-slate-700'}`}
            >
              {typeIcons[att.type] || <Paperclip className="w-4 h-4 text-slate-400" />}
              <span className="text-slate-200 max-w-[160px] truncate">{att.name}</span>
              {att.type === 'link' && (
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-0.5 text-slate-500 hover:text-sky-400 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {att.fileSize && (
                <span className="text-[10px] text-slate-500">{formatFileSize(att.fileSize)}</span>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                className="p-0.5 text-slate-500 hover:text-rose-400 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && !showLinkForm && (
        <p className="text-[11px] text-slate-500 italic">ยังไม่มีสิ่งแนบ — คลิก "เพิ่มสิ่งแนบ" เพื่อแนบรูปภาพ ลิงก์ หรือไฟล์</p>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
