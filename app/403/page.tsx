import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">403 Unauthorized Access</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (Role-Based Access Control) เมนูหรือหน้าที่คุณร้องขอจำกัดสิทธิ์ไว้สำหรับ Supervisor หรือ Admin เท่านั้น
        </p>
        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับสู่หน้าแดชบอร์ดหลัก</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
