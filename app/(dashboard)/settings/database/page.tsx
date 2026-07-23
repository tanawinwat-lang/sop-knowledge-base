'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';

export default function DatabaseSettingsPage() {
  const [dbUrl, setDbUrl] = useState('');
  const [showUrl, setShowUrl] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/database');
      const data = await res.json();
      if (res.ok) {
        setStatus(data);
        // Pre-fill masked URL indicator
        if (data.hasDbUrl) {
          setDbUrl('***** (Already configured)');
        }
      }
    } catch (err) {
      setStatus({ hasDbUrl: false });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!dbUrl.trim() || dbUrl === '***** (Already configured)') return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ db_url: dbUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: data.pgConnected ? 'success' : 'info', text: data.message });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || '❌ เกิดข้อผิดพลาด' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '❌ เกิดข้อผิดพลาด' });
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    const url = prompt('วาง DATABASE_URL สำหรับกู้คืนข้อมูล:', '');
    if (!url) return;

    setRestoring(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/database/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ db_url: url }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.message });
        window.location.reload(); // Reload to apply restored data
      } else {
        setMessage({ type: 'error', text: data.message || data.error || '❌ กู้คืนไม่สำเร็จ' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '❌ เกิดข้อผิดพลาด' });
    } finally {
      setRestoring(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('แน่ใจที่จะลบการตั้งค่าฐานข้อมูล? ข้อมูลใน PostgreSQL จะยังคงอยู่')) return;

    try {
      const res = await fetch('/api/settings/database', { method: 'DELETE' });
      if (res.ok) {
        setMessage({ type: 'info', text: '✅ ลบการตั้งค่าฐานข้อมูลเรียบร้อย' });
        setDbUrl('');
        await fetchStatus();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl border border-emerald-500/30">
            <Database className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">ตั้งค่าฐานข้อมูล PostgreSQL</h1>
            <p className="text-sm text-slate-400">เชื่อมต่อฐานข้อมูลภายนอกเพื่อป้องกันข้อมูลสูญหายเมื่อ Deploy ใหม่</p>
          </div>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : message.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : message.type === 'error' ? (
            <XCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto p-1 hover:bg-white/10 rounded-lg transition-colors">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          สถานะการเชื่อมต่อ
        </h2>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> กำลังตรวจสอบ...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <StatusItem
              label="Environment Variable"
              value={status?.dbUrlFromEnv ? '✅ ตั้งค่าแล้ว' : '❌ ยังไม่ตั้งค่า'}
              color={status?.dbUrlFromEnv ? 'text-emerald-400' : 'text-rose-400'}
            />
            <StatusItem
              label="ตั้งค่าผ่านระบบ"
              value={status?.dbUrlFromConfig ? '✅ ตั้งค่าแล้ว' : '❌ ยังไม่ตั้งค่า'}
              color={status?.dbUrlFromConfig ? 'text-emerald-400' : 'text-amber-400'}
            />
            <StatusItem
              label="เชื่อมต่อ PostgreSQL"
              value={status?.pgConnected ? '✅ เชื่อมต่อแล้ว' : '❌ ยังไม่ได้เชื่อมต่อ'}
              color={status?.pgConnected ? 'text-emerald-400' : 'text-rose-400'}
            />
            <StatusItem
              label="จำนวนข้อมูลในระบบ"
              value={`${((status?.dataSize || 0) / 1024).toFixed(0)} KB (${status?.sopsCount || 0} SOPs, ${status?.usersCount || 0} Users)`}
              color="text-slate-300"
            />
            {status?.lastSyncAt && (
              <StatusItem
                label="ซิงค์ล่าสุด"
                value={new Date(status.lastSyncAt).toLocaleString('th-TH')}
                color="text-slate-300"
              />
            )}
          </div>
        )}
      </div>

      {/* Database URL Input */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-slate-200">ตั้งค่า DATABASE_URL</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          วาง Connection String จาก Neon, Supabase, หรือ PostgreSQL อื่นๆ เช่น:
          <br />
          <code className="text-emerald-300 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
            postgresql://user:password@host:5432/db?sslmode=require
          </code>
        </p>

        <div className="relative">
          <input
            type={showUrl ? 'text' : 'password'}
            value={dbUrl}
            onChange={(e) => setDbUrl(e.target.value)}
            placeholder="postgresql://..." 
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 pr-20 font-mono"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <button
              type="button"
              onClick={() => setShowUrl(!showUrl)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg"
              title={showUrl ? 'ซ่อน' : 'แสดง'}
            >
              {showUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !dbUrl.trim() || dbUrl === '***** (Already configured)'}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 disabled:opacity-50 transition-all"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'กำลังบันทึกและทดสอบการเชื่อมต่อ...' : '💾 บันทึกและทดสอบการเชื่อมต่อ'}
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleRestore}
          disabled={restoring}
          className="p-5 bg-sky-900/40 border border-sky-500/30 hover:bg-sky-800/40 rounded-2xl text-left transition-all group disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-sky-400 mb-2 ${restoring ? 'animate-spin' : 'group-hover:rotate-180 transition-transform'}`} />
          <h3 className="text-sm font-bold text-sky-200">กู้คืนข้อมูลจาก PostgreSQL</h3>
          <p className="text-xs text-sky-300/70 mt-1">
            วาง DATABASE_URL เพื่อโหลดข้อมูลทั้งหมดกลับมาจาก PostgreSQL
          </p>
        </button>

        <button
          onClick={handleClear}
          className="p-5 bg-rose-900/20 border border-rose-500/20 hover:bg-rose-800/20 rounded-2xl text-left transition-all group"
        >
          <Trash2 className="w-5 h-5 text-rose-400 mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="text-sm font-bold text-rose-200">ลบการตั้งค่าฐานข้อมูล</h3>
          <p className="text-xs text-rose-300/70 mt-1">
            ลบ URL ที่ตั้งค่าไว้ (ข้อมูลใน PostgreSQL ยังคงอยู่)
          </p>
        </button>
      </div>

      {/* Info Card */}
      <div className="p-5 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl space-y-2">
        <div className="flex items-center gap-2 text-indigo-300 text-sm font-bold">
          <AlertTriangle className="w-4 h-4" />
          <span>วิธีการทำงาน</span>
        </div>
        <ul className="text-xs text-indigo-200/70 space-y-1.5 list-disc list-inside">
          <li>URL จะถูกบันทึกใน <code className="text-indigo-300">database.json</code> — ใช้ได้ภายใน Container ปัจจุบัน</li>
          <li>เมื่อ Deploy ใหม่ → Container ใหม่ไม่มี URL นี้ → ต้องตั้งค่าใหม่</li>
          <li>แต่ <strong>ข้อมูลทั้งหมดยังอยู่ที่ PostgreSQL!</strong> — แค่กด "กู้คืนข้อมูล" เพื่อนำกลับมา</li>
          <li>แนะนำ: ตั้งค่า <code className="text-indigo-300">DATABASE_URL</code> ที่ <strong>Render Dashboard → Environment</strong> เพื่อให้ถาวร</li>
        </ul>
      </div>
    </div>
  );
}

function StatusItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 bg-slate-800/50 rounded-xl">
      <p className="text-[11px] text-slate-400 font-medium mb-0.5">{label}</p>
      <p className={`text-xs font-semibold ${color}`}>{value}</p>
    </div>
  );
}
