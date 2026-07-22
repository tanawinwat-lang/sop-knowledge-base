'use client';

import React, { useState } from 'react';
import { Upload, FileText, Loader2, X, CheckCircle2, Sparkles } from 'lucide-react';

interface DocumentIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestSuccess: (data: { title: string; content: string; tags: string[]; categoryId: number }) => void;
}

export function DocumentIngestModal({ isOpen, onClose, onIngestSuccess }: DocumentIngestModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleIngest = async () => {
    if (!file) return;
    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/sops/ingest', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถอ่านไฟล์ได้');

      onIngestSuccess({
        title: data.title,
        content: data.content,
        tags: data.tags || [],
        categoryId: data.categoryId || 1,
      });

      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">นำเข้าไฟล์เอกสารอัตโนมัติ (Document Ingestion)</h3>
              <p className="text-xs text-slate-400">แปลงไฟล์ PDF, DOCX, TXT เป็น SOP ในระบบทันที</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-6">
          <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl cursor-pointer bg-slate-800 hover:bg-slate-800/80 transition-all text-center p-6 group">
            <FileText className="w-10 h-10 text-indigo-400 group-hover:scale-110 transition-transform mb-3" />
            <p className="text-sm font-semibold text-slate-200">
              {file ? file.name : 'ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์'}
            </p>
            <p className="text-xs text-slate-400 mt-1">รองรับไฟล์ PDF, Word (.docx) หรือ Text (.txt)</p>
            <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleFileChange} className="hidden" />
          </label>

          {error && <p className="text-xs text-rose-400 mt-2 text-center">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleIngest}
            disabled={!file || isUploading}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังอ่านและทำ Vector Embedding...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>แปลงไฟล์เข้าสู่ระบบ SOP</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
