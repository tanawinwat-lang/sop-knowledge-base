'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, ShieldCheck, Mail, Lock, User, Trash2,
  Check, AlertCircle, Loader2, Plus, BadgeCheck,
  ToggleLeft, ToggleRight, KeyRound, X, Eye, EyeOff,
  ChevronDown,
} from 'lucide-react';

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

  // Reset Password Modal
  const [resetUser, setResetUser] = useState<any | null>(null);
  const [resetPass, setResetPass] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  // Expanded role sections
  const [expandedRoles, setExpandedRoles] = useState<Record<number, boolean>>({});

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

  // Group users by role
  const usersByRole = roles.map((role) => ({
    role,
    users: users.filter((u) => u.role_id === role.id),
  })).filter((g) => g.users.length > 0);

  // Toggle section expand
  const toggleRole = (roleId: number) => {
    setExpandedRoles((prev) => ({
      ...prev,
      [roleId]: prev[roleId] === undefined ? true : !prev[roleId],
    }));
  };

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

  const openResetPassword = (u: any) => {
    setResetUser(u);
    setResetPass('');
    setShowResetPass(false);
    setResetMsg('');
  };

  const handleResetPassword = async () => {
    if (!resetPass.trim() || resetPass.length < 4) {
      setResetMsg('❌ รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }
    setIsResetting(true);
    setResetMsg('');
    try {
      const res = await fetch(`/api/users/${resetUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'รีเซ็ตรหัสผ่านไม่สำเร็จ');
      setResetMsg('✅ รีเซ็ตรหัสผ่านสำเร็จ!');
      setTimeout(() => {
        setResetUser(null);
        setResetPass('');
      }, 1500);
    } catch (err: any) {
      setResetMsg('❌ ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  // Role styling config
  const roleConfig: Record<number, { bg: string; border: string; text: string; icon: string }> = {
    1: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-300', icon: '👑' },
    2: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-300', icon: '👔' },
    3: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-300', icon: '👤' },
  };

  const getRoleStyle = (roleId: number) => {
    return roleConfig[roleId] || {
      label: 'CUSTOM',
      bg: 'bg-indigo-500/20',
      border: 'border-indigo-500/30',
      text: 'text-indigo-300',
      icon: '🔷',
    };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
          <Users className="w-6 h-6 text-indigo-400" />
          <span>จัดการผู้ใช้งานและตำแหน่ง</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          สร้างตำแหน่งงานและบัญชีผู้ใช้งาน — กำหนดตำแหน่งหน้าที่ สถานะ Active/Inactive และรีเซ็ตรหัสผ่าน
        </p>
      </div>

      {/* Grid: Create Role + Create User */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Role */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 text-purple-300 font-bold border-b border-slate-800 pb-3">
            <BadgeCheck className="w-5 h-5 text-purple-400" />
            <h3 className="text-base text-slate-100">สร้างตำแหน่งงานเพิ่ม</h3>
          </div>

          {(roleError || roleSuccessMsg) && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              roleError
                ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            }`}>
              {roleError ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />}
              <span>{roleError || roleSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateRole} className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="เช่น HR_SPECIALIST, AUDITOR..."
                required
                className="flex-1 px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 uppercase placeholder-slate-400 focus:outline-none focus:border-purple-500 font-mono"
              />
              <button
                type="submit"
                disabled={isSubmittingRole || !newRoleName.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
              >
                {isSubmittingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>เพิ่ม</span>
              </button>
            </div>
          </form>

          <div className="pt-1">
            <label className="text-xs font-semibold text-slate-400 block mb-2">ตำแหน่งทั้งหมด ({roles.length}):</label>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => {
                const isSystemBuiltin = r.id <= 3;
                const style = getRoleStyle(r.id);
                return (
                  <span
                    key={r.id}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${style.bg} ${style.border} ${style.text}`}
                  >
                    <span>{style.icon} {r.role_name}</span>
                    {!isSystemBuiltin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(r.id, r.role_name)}
                        className="ml-0.5 text-slate-400 hover:text-rose-400 transition-colors"
                        title="ลบตำแหน่งนี้"
                      >×</button>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Create User */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 text-indigo-300 font-bold border-b border-slate-800 pb-3">
            <UserPlus className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base text-slate-100">สร้างผู้ใช้งานใหม่</h3>
          </div>

          {(userError || userSuccessMsg) && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              userError
                ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            }`}>
              {userError ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />}
              <span>{userError || userSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">ชื่อผู้ใช้งาน</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น john_doe" required
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">อีเมล</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@company.com" required
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">รหัสผ่านเริ่มต้น</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">เลือกตำแหน่ง</label>
              <select value={roleId} onChange={(e) => setRoleId(e.target.value)}
                className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-semibold">
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.role_name}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={isSubmittingUser}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50">
              {isSubmittingUser ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังสร้าง...</> : <><UserPlus className="w-4 h-4" /> สร้างผู้ใช้ใหม่</>}
            </button>
          </form>
        </div>
      </div>

      {/* Users by Role Sections */}
      <div className="space-y-4 pt-4">
        <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          <span>รายชื่อผู้ใช้งานในระบบทั้งหมด ({users.length} คน)</span>
        </h3>

        {isLoading ? (
          <div className="p-10 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">กำลังโหลดข้อมูล...</p>
          </div>
        ) : usersByRole.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            ยังไม่มีผู้ใช้ในระบบ
          </div>
        ) : (
          <div className="space-y-3">
            {usersByRole.map(({ role, users: roleUsers }) => {
              const style = getRoleStyle(role.id);
              const isExpanded = expandedRoles[role.id] !== false; // default expanded
              const activeCount = roleUsers.filter((u) => u.is_active !== false).length;
              const inactiveCount = roleUsers.filter((u) => u.is_active === false).length;

              return (
                <div key={role.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  {/* Section Header - Clickable */}
                  <button
                    onClick={() => toggleRole(role.id)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${style.bg} ${style.border} border`}>
                        <ShieldCheck className={`w-4 h-4 ${style.text}`} />
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                          {style.icon} {role.role_name}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                            {roleUsers.length} คน
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Active {activeCount} คน{inactiveCount > 0 ? ` · Inactive ${inactiveCount} คน` : ''}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                  </button>

                  {/* Users List */}
                  <div className={`transition-all duration-300 ${
                    isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                  }`}>
                    <div className="border-t border-slate-800">
                      {roleUsers.map((u) => (
                        <div
                          key={u.id}
                          className={`flex items-center gap-3 px-5 py-3 border-b border-slate-800/60 last:border-b-0 hover:bg-slate-800/30 transition-colors ${
                            u.is_active === false ? 'opacity-50' : ''
                          }`}
                        >
                          {/* Avatar */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                            u.is_active === false ? 'bg-slate-600' : 'bg-indigo-600'
                          }`}>
                            {u.username.charAt(0).toUpperCase()}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-slate-100 truncate">{u.username}</div>
                            <div className="text-xs text-slate-400 truncate">{u.email}</div>
                          </div>

                          {/* Created date */}
                          <div className="hidden md:block text-[11px] text-slate-500 flex-shrink-0">
                            {new Date(u.created_at).toLocaleDateString('th-TH', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </div>

                          {/* Status + Actions */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* Active/Inactive Toggle */}
                            <button
                              onClick={() => handleToggleActive(u.id, u.is_active !== false, u.username)}
                              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                                u.is_active === false
                                  ? 'bg-slate-800 border-slate-700 text-slate-500 hover:border-emerald-500/50 hover:text-emerald-400'
                                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-rose-500/15 hover:border-rose-500/30 hover:text-rose-400'
                              }`}
                              title={u.is_active === false ? 'คลิกเพื่อเปิดใช้งาน' : 'คลิกเพื่อปิดใช้งาน'}
                            >
                              {u.is_active === false ? <><ToggleLeft className="w-3 h-3 inline-block mr-0.5" /> Inactive</> : <><ToggleRight className="w-3 h-3 inline-block mr-0.5" /> Active</>}
                            </button>

                            {/* Role Select */}
                            <select
                              value={u.role_id}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="py-1.5 px-2 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold focus:outline-none focus:border-indigo-500"
                            >
                              {roles.map((r) => (
                                <option key={r.id} value={r.id}>{r.role_name}</option>
                              ))}
                            </select>

                            {/* Reset Password */}
                            <button
                              onClick={() => openResetPassword(u)}
                              className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-colors"
                              title="รีเซ็ตรหัสผ่าน"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="ลบผู้ใช้งาน"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setResetUser(null)}>
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-xl">
                  <KeyRound className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">รีเซ็ตรหัสผ่าน</h3>
                  <p className="text-xs text-slate-400">ผู้ใช้: {resetUser.username} ({resetUser.email})</p>
                </div>
              </div>
              <button onClick={() => setResetUser(null)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetMsg ? (
              <div className={`my-4 p-3 rounded-xl text-sm font-semibold text-center ${
                resetMsg.startsWith('✅')
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}>
                {resetMsg}
              </div>
            ) : (
              <div className="my-4 space-y-3">
                <p className="text-xs text-slate-400">ป้อนรหัสผ่านใหม่สำหรับ <strong className="text-slate-200">{resetUser.username}</strong></p>
                <div className="relative">
                  <input
                    type={showResetPass ? 'text' : 'password'}
                    value={resetPass}
                    onChange={(e) => setResetPass(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleResetPassword(); }}
                    placeholder="รหัสผ่านใหม่..."
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPass(!showResetPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {!resetMsg.startsWith('✅') && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setResetUser(null)}
                  disabled={isResetting}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={isResetting || !resetPass.trim()}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-sky-600/30 disabled:opacity-50 transition-all"
                >
                  {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                  {isResetting ? 'กำลังตั้งค่า...' : 'รีเซ็ตรหัสผ่าน'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
