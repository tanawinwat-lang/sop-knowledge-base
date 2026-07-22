'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Headphones } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'การเข้าสู่ระบบล้มเหลว');

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-xl">
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 mx-auto flex items-center justify-center shadow-xl shadow-indigo-500/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            เข้าสู่ระบบ SOP Knowledge Base
          </h1>
          <p className="text-xs text-slate-400">ระบบจัดการระเบียบปฏิบัติและค้นหาข้อมูลด้วย AI</p>
        </div>

        {error && (
          <div className="p-3 mb-6 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">อีเมล หรือ ชื่อผู้ใช้งาน</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">รหัสผ่าน</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >              {isLoading ? (
              <span>กำลังเข้าสู่ระบบ...</span>
            ) : (
              <>
                <span>เข้าสู่ระบบ</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Test Accounts Switcher */}
        <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
          <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase text-center">
            คลิกทดสอบในบทบาทต่างๆ (Demo Test Accounts):
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => quickLogin('admin@company.com')}
              className="p-2.5 bg-slate-800 hover:bg-purple-900/30 border border-slate-700 hover:border-purple-500/50 rounded-xl text-center transition-all group"
            >
              <ShieldCheck className="w-4 h-4 text-purple-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
              <p className="text-[11px] font-semibold text-purple-300">Admin</p>
            </button>
            <button
              onClick={() => quickLogin('sup@company.com')}
              className="p-2.5 bg-slate-800 hover:bg-blue-900/30 border border-slate-700 hover:border-blue-500/50 rounded-xl text-center transition-all group"
            >
              <UserCheck className="w-4 h-4 text-blue-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
              <p className="text-[11px] font-semibold text-blue-300">Supervisor</p>
            </button>
            <button
              onClick={() => quickLogin('agent@company.com')}
              className="p-2.5 bg-slate-800 hover:bg-emerald-900/30 border border-slate-700 hover:border-emerald-500/50 rounded-xl text-center transition-all group"
            >
              <Headphones className="w-4 h-4 text-emerald-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
              <p className="text-[11px] font-semibold text-emerald-300">Agent</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
