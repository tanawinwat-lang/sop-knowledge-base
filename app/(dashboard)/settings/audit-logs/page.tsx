'use client';

import React, { useState, useEffect } from 'react';
import { History, Shield, Clock, User, Globe, Search } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audit-logs')
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.audit_logs || []);
        setIsLoading(false);
      });
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.username.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.target.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <History className="w-6 h-6 text-indigo-400" />
            <span>ประวัติการทำงานในระบบ (Audit Logs)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            เก็บบันทึกทุกการเคลื่อนไหว ใครสร้าง แก้ไข หรือปรับสิทธิ์หน้าระบบ พร้อมเวลาและ IP Address
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อผู้ใช้ แอ็กชัน..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800 border-b border-slate-800 text-slate-400 uppercase font-semibold">
            <tr>
              <th className="p-4">เวลา (Timestamp)</th>
              <th className="p-4">ผู้ใช้งาน (User)</th>
              <th className="p-4">การกระทำ (Action)</th>
              <th className="p-4">เป้าหมาย (Target)</th>
              <th className="p-4">รายละเอียด (Details)</th>
              <th className="p-4">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-sans">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  กำลังโหลดข้อมูล Audit Logs...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  ไม่พบบันทึกกิจกรรม
                </td>
              </tr>
            ) : (
              filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 font-mono text-slate-400 text-[11px]">
                    {new Date(l.created_at).toLocaleString('th-TH')}
                  </td>
                  <td className="p-4 font-bold text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-400" /> {l.username}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded">
                      {l.action}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-slate-200">{l.target}</td>
                  <td className="p-4 text-slate-400">{l.details}</td>
                  <td className="p-4 font-mono text-slate-400 text-[11px]">{l.ip_address || '127.0.0.1'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
