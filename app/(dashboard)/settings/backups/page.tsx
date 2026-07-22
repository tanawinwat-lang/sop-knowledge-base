'use client';

import React, { useState, useEffect } from 'react';
import {
  HardDrive, Download, RotateCcw, Trash2, Plus, Loader2,
  Check, X, AlertTriangle, FileText, Calendar, Clock, Database,
} from 'lucide-react';

interface BackupItem {
  filename: string;
  size: number;
  size_label: string;
  created_at: string;
  created_at_label: string;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [totalSize, setTotalSize] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/backups');
      const data = await res.json();
      if (res.ok) {
        setBackups(data.backups || []);
        setTotalSize(data.total_size_label || '0 B');
        setTotalCount(data.total || 0);
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/backups/create', { method: 'POST' });
      if (res.ok) {
        setCreateSuccess(true);
        showMessage('success', 'สร้าง Backup สำเร็จ!');
        fetchBackups();
        setTimeout(() => setCreateSuccess(false), 3000);
      } else {
        const data = await res.json();
        showMessage('error', data.error || 'สร้าง Backup ไม่สำเร็จ');
      }
    } catch {
      showMessage('error', 'เกิดข้อผิดพลาดในการสร้าง Backup');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (filename: string) => {
    setRestoringFile(filename);
    setConfirmRestore(null);
    try {
      const res = await fetch(`/api/backups/restore/${encodeURIComponent(filename)}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showMessage('success', `✅ คืนค่า "${filename}" สำเร็จ!`);
        fetchBackups();
      } else {
        showMessage('error', data.error || 'คืนค่าไม่สำเร็จ');
      }
    } catch {
      showMessage('error', 'เกิดข้อผิดพลาดในการคืนค่า');
    } finally {
      setRestoringFile(null);
    }
  };

  const handleDelete = async (filename: string) => {
    setDeletingFile(filename);
    try {
      const res = await fetch(`/api/backups/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showMessage('success', `ลบ "${filename}" สำเร็จ`);
        fetchBackups();
      } else {
        showMessage('error', data.error || 'ลบไม่สำเร็จ');
      }
    } catch {
      showMessage('error', 'เกิดข้อผิดพลาดในการลบ');
    } finally {
      setDeletingFile(null);
    }
  };

  const handleDownload = (filename: string) => {
    // Trigger download by navigating to the file
    window.open(`/api/backups/download/${encodeURIComponent(filename)}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <HardDrive className="w-6 h-6 text-indigo-400" />
            <span>จัดการ Backup ฐานข้อมูล</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            สำรองและคืนค่าข้อมูล database.json — backup จะถูกสร้างอัตโนมัติทุกวันเวลา 22:00 น. (กำหนดการตามเซิร์ฟเวอร์)
          </p>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={isCreating}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          {isCreating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : createSuccess ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {isCreating ? 'กำลังสร้าง...' : createSuccess ? 'สร้างสำเร็จ!' : 'สร้าง Backup ตอนนี้'}
        </button>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Database className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">จำนวน Backup</p>
              <p className="text-2xl font-bold text-slate-100">{totalCount}</p>
            </div>
          </div>
        </div>
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <HardDrive className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">ขนาดรวมทั้งหมด</p>
              <p className="text-2xl font-bold text-slate-100">{totalSize}</p>
            </div>
          </div>
        </div>
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Calendar className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">วัน retention</p>
              <p className="text-2xl font-bold text-slate-100">7 วัน</p>
            </div>
          </div>
        </div>
      </div>

      {/* Backup List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <span>รายการ Backup ทั้งหมด ({totalCount} ไฟล์)</span>
        </h3>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
          </div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <HardDrive className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-400">ยังไม่มีไฟล์ Backup</p>
            <p className="text-xs text-slate-500">ระบบจะสร้าง Backup อัตโนมัติทุกครั้งที่มีการบันทึกข้อมูล หรือกดปุ่ม "สร้าง Backup ตอนนี้"</p>
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map((backup) => (
              <div
                key={backup.filename}
                className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md hover:border-slate-700 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-slate-800/80 text-slate-500">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono font-semibold text-slate-200 truncate">
                      {backup.filename}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {backup.size_label}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {backup.created_at_label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                  {/* Download */}
                  <button
                    onClick={() => handleDownload(backup.filename)}
                    className="p-2 text-slate-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-all"
                    title="ดาวน์โหลด Backup นี้"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Restore */}
                  {confirmRestore === backup.filename ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRestore(backup.filename)}
                        disabled={restoringFile === backup.filename}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 disabled:opacity-50"
                      >
                        {restoringFile === backup.filename ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        ยืนยัน
                      </button>
                      <button
                        onClick={() => setConfirmRestore(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRestore(backup.filename)}
                      className="p-2 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-all"
                      title="คืนค่า Backup นี้"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(backup.filename)}
                    disabled={deletingFile === backup.filename}
                    className="p-2 text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all disabled:opacity-50"
                    title="ลบ Backup นี้"
                  >
                    {deletingFile === backup.filename ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restore Warning Modal */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">ยืนยันการคืนค่า Backup</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  ข้อมูลปัจจุบันจะถูกสำรองไว้ก่อนคืนค่า (pre-restore-backup)
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300 mb-1">คุณแน่ใจที่จะคืนค่าจากไฟล์:</p>
            <p className="text-xs font-mono font-bold text-sky-300 mb-4 break-all">{confirmRestore}</p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmRestore(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleRestore(confirmRestore)}
                disabled={restoringFile === confirmRestore}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                {restoringFile === confirmRestore ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                คืนค่า Backup นี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
