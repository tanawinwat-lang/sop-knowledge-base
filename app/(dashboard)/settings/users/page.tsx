'use client';

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, ShieldCheck, Mail, Lock, User, Trash2, Check, AlertCircle, Loader2, Plus, BadgeCheck, ToggleLeft, ToggleRight } from 'lucide-react';

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // User Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('3');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [userError, setUserError] = useState('');
  const [userSuccessMsg, setUserSuccessMsg] = useState('');

  // Role Form states
  const [newRoleName, setNewRoleName] = useState('');
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [roleError, setRoleError] = useState('');
  const [roleSuccessMsg, setRoleSuccessMsg] = useState('');

  const fetchUsersAndRoles = () => {
    setIsLoading(true);
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setRoles(data.roles || []);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingUser(true);
    setUserError('');
    setUserSuccessMsg('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role_id: roleId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'สร้างผู้ใช้ไม่สำเร็จ');

      setUserSuccessMsg(`สร้างผู้ใช้ ${username} สำเร็จแล้ว!`);
      setUsername('');
      setEmail('');
      setPassword('');
      fetchUsersAndRoles();
      setTimeout(() => setUserSuccessMsg(''), 3000);
    } catch (err: any) {
      setUserError(err.message);
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    setIsSubmittingRole(true);
    setRoleError('');
    setRoleSuccessMsg('');

    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_name: newRoleName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'สร้างตำแหน่งไม่สำเร็จ');

      setRoleSuccessMsg(`สร้างตำแหน่ง ${newRoleName.toUpperCase()} สำเร็จแล้ว!`);
      setNewRoleName('');
      setRoles(data.roles || []);
      fetchUsersAndRoles();
      setTimeout(() => setRoleSuccessMsg(''), 3000);
    } catch (err: any) {
      setRoleError(err.message);
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleDeleteRole = async (rId: number, rName: string) => {
    if (!confirm(`คุณต้องการลบตำแหน่ง "${rName}" หรือไม่? ผู้ใช้ในตำแหน่งนี้จะถูกเปลี่ยนเป็น AGENT อัตโนมัติ`)) return;
    try {
      const res = await fetch(`/api/roles/${rId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ลบตำแหน่งไม่สำเร็จ');
      fetchUsersAndRoles();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRoleChange = async (userId: number, newRoleId: string) => {
    try {
      await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: newRoleId }),
      });
      fetchUsersAndRoles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: number, uname: string) => {
    if (!confirm(`คุณต้องการลบผู้ใช้งาน "${uname}" หรือไม่?`)) return;
    try {
      await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      fetchUsersAndRoles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (userId: number, currentActive: boolean, uname: string) => {
    const newStatus = !currentActive;
    if (!confirm(`คุณต้องการ${newStatus ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}บัญชีของ "${uname}" หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });
      if (res.ok) fetchUsersAndRoles();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
          <Users className="w-6 h-6 text-indigo-400" />
          <span>จัดการผู้ใช้งานและตำแหน่ง (User & Custom Role Management)</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          สร้างตำแหน่งงาน custom เพิ่มเองและสร้างบัญชีผู้ใช้งานในระบบ กำหนดตำแหน่งหน้าที่และสิทธิ์การทำงาน
        </p>
      </div>

      {/* Grid: Create Custom Role + Create User */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Box 1: Create Custom Position / Role */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 text-purple-300 font-bold border-b border-slate-800 pb-3">
            <BadgeCheck className="w-5 h-5 text-purple-400" />
            <h3 className="text-base text-slate-100">1. สร้างตำแหน่งงานเพิ่มเอง (Custom Roles)</h3>
          </div>

          {roleError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{roleError}</span>
            </div>
          )}

          {roleSuccessMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{roleSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateRole} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">ชื่อตำแหน่งงานใหม่ (Role Name):</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="เช่น HR_SPECIALIST, AUDITOR, MANAGER..."
                  required
                  className="flex-1 px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 uppercase placeholder-slate-400 focus:outline-none focus:border-purple-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={isSubmittingRole || !newRoleName.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  {isSubmittingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>เพิ่มตำแหน่ง</span>
                </button>
              </div>
            </div>
          </form>

          {/* List of active custom roles */}
          <div className="pt-2">
            <label className="text-xs font-semibold text-slate-400 block mb-2">ตำแหน่งทั้งหมดในปัจจุบัน ({roles.length}):</label>
            <div className="flex flex-wrap items-center gap-2">
              {roles.map((r) => {
                const isSystemBuiltin = r.id === 1 || r.id === 2 || r.id === 3;
                return (
                  <span
                    key={r.id}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                      r.id === 1
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : r.id === 2
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : r.id === 3
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    }`}
                  >
                    <span>{r.role_name}</span>
                    {!isSystemBuiltin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(r.id, r.role_name)}
                        className="text-slate-400 hover:text-rose-400 transition-colors"
                        title="ลบตำแหน่ง custom นี้"
                      >
                        ×
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Box 2: Create New User Account */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 text-indigo-300 font-bold border-b border-slate-800 pb-3">
            <UserPlus className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base text-slate-100">2. สร้างผู้ใช้งานใหม่ (Add User)</h3>
          </div>

          {userError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{userError}</span>
            </div>
          )}

          {userSuccessMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{userSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">ชื่อผู้ใช้งาน (Username):</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น john_doe"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">อีเมล (Email):</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@company.com"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">รหัสผ่าน (Password):</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">เลือกตำแหน่งหน้าที่ (Role/Position):</label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-semibold"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.role_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmittingUser}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {isSubmittingUser ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังสร้างบัญชี...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>สร้างผู้ใช้ใหม่</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Users List Table */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>รายชื่อผู้ใช้งานในระบบทั้งหมด ({users.length} คน)</span>
          </h3>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="p-4">ผู้ใช้งาน (User)</th>
                <th className="p-4">อีเมล (Email)</th>
                <th className="p-4">ตำแหน่ง (Role / Position)</th>
                <th className="p-4 text-center">สถานะ (Status)</th>
                <th className="p-4 text-center">การจัดการ (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-bold text-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          u.is_active === false ? 'bg-slate-600' : 'bg-indigo-600'
                        }`}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <span className={u.is_active === false ? 'text-slate-500' : ''}>{u.username}</span>
                      </div>
                    </td>
                    <td className={`p-4 ${u.is_active === false ? 'text-slate-600' : 'text-slate-400'}`}>{u.email}</td>
                    <td className="p-4">
                      <select
                        value={u.role_id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="py-1 px-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500"
                        style={u.is_active === false ? { color: '#64748b', borderColor: '#334155' } : {}}
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.role_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleActive(u.id, u.is_active !== false, u.username)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                          u.is_active === false
                            ? 'bg-slate-800 border-slate-700 text-slate-500 hover:border-emerald-500/50 hover:text-emerald-400'
                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-rose-500/15 hover:border-rose-500/30 hover:text-rose-400'
                        }`}
                        title={u.is_active === false ? 'คลิกเพื่อเปิดใช้งาน' : 'คลิกเพื่อปิดใช้งาน'}
                      >
                        {u.is_active === false ? (
                          <><ToggleLeft className="w-3.5 h-3.5" /> Inactive</>
                        ) : (
                          <><ToggleRight className="w-3.5 h-3.5" /> Active</>
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="ลบผู้ใช้งาน"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
