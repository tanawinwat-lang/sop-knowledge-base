'use client';

import React, { useState } from 'react';
import { Lock, KeyRound, Check, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PasswordSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!currentPassword.trim()) {
      setError('กรุณากรอกรหัสผ่านปัจจุบัน');
      return;
    }
    if (!newPassword.trim()) {
      setError('กรุณากรอกรหัสผ่านใหม่');
      return;
    }
    if (newPassword.length < 6) {
      setError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    if (currentPassword === newPassword) {
      setError('รหัสผ่านใหม่ต้องแตกต่างจากรหัสผ่านปัจจุบัน');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');

      setSuccess(data.message || 'เปลี่ยนรหัสผ่านสำเร็จ');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
              <KeyRound className="w-6 h-6 text-emerald-400" />
              <span>ตั้งค่ารหัสผ่านใหม่</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              เปลี่ยนรหัสผ่านประจำตัวของคุณเพื่อความปลอดภัยของบัญชี
            </p>
          </div>
        </div>
      </div>

      {/* Password Change Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        {error && (
          <div className="p-3 mb-5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 mb-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current Password */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              รหัสผ่านปัจจุบัน
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านปัจจุบัน"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              รหัสผ่านใหม่
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="รหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              ยืนยันรหัสผ่านใหม่
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Show Password Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-300">
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <span>แสดงรหัสผ่าน</span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังเปลี่ยนรหัสผ่าน...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>เปลี่ยนรหัสผ่าน</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Tips */}
      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-2">
        <h4 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-indigo-400" />
          เคล็ดลับความปลอดภัย
        </h4>
        <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
          <li>รหัสผ่านควรมีความยาวอย่างน้อย 8 ตัวอักษร</li>
          <li>ใช้ตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักขระพิเศษผสมกัน</li>
          <li>หลีกเลี่ยงการใช้รหัสผ่านซ้ำกับเว็บอื่น</li>
          <li>เปลี่ยนรหัสผ่านทุก 3 เดือนเพื่อความปลอดภัยสูงสุด</li>
        </ul>
      </div>
    </div>
  );
}
