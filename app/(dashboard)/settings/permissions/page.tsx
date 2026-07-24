'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Save, Check, Folder, Lock, BookOpen, LayoutDashboard,
  FileCheck, MessageSquareWarning, Users, History, Bell, KeyRound,
  FilePlus, Trash2, Eye, Edit3, Trash, X, ChevronDown, Search, UsersRound,
  HardDrive
} from 'lucide-react';

// Route-to-Thai-name mapping
const routeLabels: Record<string, { label: string; group: string; icon: any }> = {
  '/dashboard':      { label: 'แดชบอร์ดหลัก', group: '📊 เมนูหลัก', icon: LayoutDashboard },
  '/sops':           { label: 'คลังเอกสาร SOP', group: '📖 SOP', icon: BookOpen },
  '/sops/new':       { label: 'สร้าง SOP ใหม่', group: '📖 SOP', icon: FilePlus },
  '/sops/trash':     { label: 'ถังขยะ (Trash)', group: '📖 SOP', icon: Trash2 },
  '/approval':       { label: 'รออนุมัติ SOP', group: '📖 SOP', icon: FileCheck },
  '/feedback':       { label: 'ข้อเสนอแนะ SOP', group: '📖 SOP', icon: MessageSquareWarning },
  '/announcements':  { label: 'ประกาศข่าวสาร', group: '📢 ประกาศ', icon: Bell },
  '/settings/password':    { label: 'ตั้งค่ารหัสผ่าน', group: '🔐 จัดการบัญชีผู้ใช้', icon: KeyRound },
  '/settings/users':       { label: 'จัดการผู้ใช้งาน & ตำแหน่ง', group: '🔐 จัดการบัญชีผู้ใช้', icon: Users },
  '/settings/permissions': { label: 'จัดการสิทธิ์ระบบ (RBAC)', group: '🔐 จัดการบัญชีผู้ใช้', icon: ShieldCheck },
  '/settings/backups':     { label: 'จัดการ Backup', group: '🔐 จัดการบัญชีผู้ใช้', icon: HardDrive },
  '/settings/audit-logs':  { label: 'บันทึกระบบ (Audit Logs)', group: '🔐 จัดการบัญชีผู้ใช้', icon: History },
};

// Permission levels mapped to boolean triples
const PERM_LEVELS = [
  { value: 'none', label: 'ไม่มีสิทธิ์', short: 'ปิด', icon: X, color: 'text-slate-500 bg-slate-800/50 border-slate-700', hover: 'hover:bg-slate-700' },
  { value: 'read', label: 'อ่านอย่างเดียว', short: 'อ่าน', icon: Eye, color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', hover: 'hover:bg-emerald-500/20' },
  { value: 'write', label: 'อ่าน + เขียน', short: 'เขียน', icon: Edit3, color: 'text-sky-300 bg-sky-500/10 border-sky-500/30', hover: 'hover:bg-sky-500/20' },
  { value: 'full', label: 'จัดการเต็ม (ลบได้)', short: 'เต็ม', icon: ShieldCheck, color: 'text-purple-300 bg-purple-500/10 border-purple-500/30', hover: 'hover:bg-purple-500/20' },
] as const;

function getPermLevel(perm: { can_access: boolean; can_write: boolean; can_delete: boolean }): string {
  if (!perm.can_access) return 'none';
  if (perm.can_delete) return 'full';
  if (perm.can_write) return 'write';
  return 'read';
}

function setPermLevel(level: string): { can_access: boolean; can_write: boolean; can_delete: boolean } {
  switch (level) {
    case 'full': return { can_access: true, can_write: true, can_delete: true };
    case 'write': return { can_access: true, can_write: true, can_delete: false };
    case 'read': return { can_access: true, can_write: false, can_delete: false };
    default: return { can_access: false, can_write: false, can_delete: false };
  }
}

// Derive groups dynamically from routeLabels — any new group added to routeLabels appears automatically
const allRouteGroups = [...new Set(Object.values(routeLabels).map((v) => v.group))];
const preferredGroupOrder = ['📊 เมนูหลัก', '📖 SOP', '📢 ประกาศ', '🔐 จัดการบัญชีผู้ใช้'];
// Show preferred groups first, then any new groups at the end
const groupOrder = [...new Set([...preferredGroupOrder, ...allRouteGroups])];

export default function PermissionsPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<number>(1); // Default to ADMIN
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [canEditPermissions, setCanEditPermissions] = useState(false);

  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      });

    fetch('/api/permissions')
      .then((res) => res.json())
      .then((data) => {
        setRoles(data.roles || []);
        setPermissions(data.page_permissions || []);
        setCategories(data.categories || []);
      });
  }, []);

  // Determine edit permission dynamically from RBAC data
  // SUPER_ADMIN bypasses all checks; other roles must have can_write=true for /settings/permissions
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role_name === 'SUPER_ADMIN') {
      setCanEditPermissions(true);
    } else if (permissions.length > 0) {
      const myPerm = permissions.find(
        (p: any) => p.role_id === currentUser.role_id && p.page_route === '/settings/permissions'
      );
      setCanEditPermissions(myPerm?.can_write || false);
    }
  }, [currentUser, permissions]);

  // Get permissions for the active role
  const activeRolePermissions = permissions.filter((p) => p.role_id === activeTab);
  const activeRoleObj = roles.find((r) => r.id === activeTab);

  const handleChangeLevel = (route: string, newLevel: string) => {
    setPermissions(
      permissions.map((p) => {
        if (p.role_id === activeTab && p.page_route === route) {
          return { ...p, ...setPermLevel(newLevel) };
        }
        return p;
      })
    );
  };

  const handleBulkAction = (level: string) => {
    const newPerms = setPermLevel(level);
    setPermissions(
      permissions.map((p) => {
        if (p.role_id === activeTab) {
          return { ...p, ...newPerms };
        }
        return p;
      })
    );
  };

  const handleToggleCategoryRole = (catId: number, roleId: number) => {
    setCategories(
      categories.map((c) => {
        if (c.id === catId) {
          const current = c.allowed_roles || [];
          const updated = current.includes(roleId)
            ? current.filter((r: number) => r !== roleId)
            : [...current, roleId];
          return { ...c, allowed_roles: updated };
        }
        return c;
      })
    );
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_permissions: permissions, categories }),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Show ALL roles in tabs (built-in + custom like SOP_TEAM)
  const availableRoles = roles;

  // Group routes by group order
  const groupedRoutes = groupOrder.map((group) => ({
    group,
    routes: Object.entries(routeLabels)
      .filter(([, info]) => info.group === group)
      .map(([route, info]) => ({ route, info })),
  }));

  // Filter by search
  const filteredGroups = searchQuery.trim()
    ? groupedRoutes
        .map((g) => ({
          ...g,
          routes: g.routes.filter(
            (r) =>
              r.info.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
              r.route.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((g) => g.routes.length > 0)
    : groupedRoutes;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-purple-400" />
            <span>จัดการสิทธิ์การใช้งานระบบ</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            เลือกบทบาทด้านล่างเพื่อกำหนดสิทธิ์การเข้าถึงเมนูต่างๆ และหมวดหมู่เอกสาร
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={isSaving || !canEditPermissions}
          className={`px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all ${
            canEditPermissions
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold shadow-purple-600/30'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {canEditPermissions ? (
            savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" /> บันทึกสิทธิ์เรียบร้อย!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> บันทึกการเปลี่ยนแปลง
              </>
            )
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" /> เฉพาะผู้มีสิทธิ์เท่านั้น
            </>
          )}
        </button>
      </div>

      {/* Read-only notice for non-privileged */}
      {!canEditPermissions && currentUser && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>คุณมีสิทธิ์ดูข้อมูลเท่านั้น — เฉพาะผู้ดูแลระบบ (Super Admin / Admin) เท่านั้นที่แก้ไขได้</span>
        </div>
      )}

      {/* ===== ROLE TABS ===== */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-px">
        {availableRoles.map((role) => {
          const isActive = activeTab === role.id;
          const tabColors: Record<string, string> = {
            SUPER_ADMIN: isActive
              ? 'border-amber-500 text-amber-300 bg-amber-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600',
            ADMIN: isActive
              ? 'border-purple-500 text-purple-300 bg-purple-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600',
            SUPERVISOR: isActive
              ? 'border-blue-500 text-blue-300 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600',
            AGENT: isActive
              ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600',
          };
          const defaultStyle = isActive
            ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
            : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600';

          return (
            <button
              key={role.id}
              onClick={() => setActiveTab(role.id)}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-lg border border-b-0 transition-all ${
                tabColors[role.role_name] || defaultStyle
              }`}
            >
              <span className="flex items-center gap-2">
                <UsersRound className="w-3.5 h-3.5" />
                {role.role_name}
                {isActive && (
                  <span className="text-[10px] opacity-60">(กำลังตั้งค่า)</span>
                )}
              </span>
            </button>
          );
        })}

        {/* Search */}
        <div className="ml-auto flex items-center gap-2 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเมนู..."
              className="w-40 pl-7 pr-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* ===== ROLE NAME + BULK ACTIONS ===== */}
      {activeRoleObj && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-lg ${
              activeRoleObj.role_name === 'SUPER_ADMIN'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : activeRoleObj.role_name === 'ADMIN'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : activeRoleObj.role_name === 'SUPERVISOR'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {activeRoleObj.role_name.charAt(0)}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">{activeRoleObj.role_name}</h2>
              <p className="text-[10px] text-slate-500">
                จำนวน {activeRolePermissions.length} เมนูที่กำหนดสิทธิ์
              </p>
            </div>
          </div>

          {canEditPermissions && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-500 mr-1">ดำเนินการทั้งหมด:</span>
              {PERM_LEVELS.map((lvl) => (
                <button
                  key={lvl.value}
                  onClick={() => handleBulkAction(lvl.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all flex items-center gap-1 ${lvl.color} ${lvl.hover}`}
                  title={`ตั้งค่าทุกเมนูเป็น "${lvl.label}"`}
                >
                  <lvl.icon className="w-3 h-3" />
                  {lvl.short}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== PERMISSION LIST BY GROUP ===== */}
      {filteredGroups.map(({ group, routes }) => (
        <div key={group} className="space-y-1.5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">
            {group}
          </h3>
          <div className="space-y-1">
            {routes.map(({ route, info }) => {
              const perm = activeRolePermissions.find((p) => p.page_route === route);
              if (!perm) return null;
              const level = getPermLevel(perm);
              const levelInfo = PERM_LEVELS.find((l) => l.value === level)!;
              const Icon = info.icon;

              return (
                <div
                  key={route}
                  className="group flex items-center justify-between gap-3 px-4 py-3 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl transition-all"
                >
                  {/* Route Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-1.5 rounded-lg bg-slate-800/80 text-slate-500 group-hover:text-indigo-400 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">
                        {info.label}
                      </p>
                      <p className="text-[9px] text-slate-600 font-mono truncate">
                        {route}
                      </p>
                    </div>
                  </div>                  {/* Permission Level Selector */}
                      {canEditPermissions ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {PERM_LEVELS.map((lvl) => {
                        const isSelected = level === lvl.value;
                        const LvlIcon = lvl.icon;
                        return (
                          <button
                            key={lvl.value}
                            onClick={() => handleChangeLevel(route, lvl.value)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all flex items-center gap-1 ${
                              isSelected
                                ? lvl.color + ' shadow-sm'
                                : 'text-slate-600 border-slate-700/50 hover:border-slate-600 hover:text-slate-400 bg-transparent'
                            }`}
                            title={lvl.label}
                          >
                            <LvlIcon className="w-3 h-3" />
                            <span className="hidden sm:inline">{lvl.short}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${levelInfo.color}`}>
                      <levelInfo.icon className="w-3 h-3 inline mr-1" />
                      {levelInfo.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* ===== CATEGORY ACCESS — inline per role ===== */}
      <div className="pt-4 border-t border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <Folder className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-200">
            สิทธิ์เข้าถึงหมวดหมู่เอกสาร สำหรับ {activeRoleObj?.role_name || 'บทบาทนี้'}
          </h3>
        </div>

        <div className="grid gap-3">
          {categories.map((cat) => {
            const hasAccess = cat.allowed_roles?.includes(activeTab) ?? true;
            return (
              <div
                key={cat.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all ${
                  hasAccess
                    ? 'bg-slate-900/60 border-slate-700/80'
                    : 'bg-slate-900/20 border-slate-800/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Folder className={`w-4 h-4 flex-shrink-0 ${hasAccess ? 'text-indigo-400' : 'text-slate-600'}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-medium truncate ${hasAccess ? 'text-slate-200' : 'text-slate-500'}`}>
                      {cat.name}
                    </p>
                    {cat.parent_id && (
                      <p className="text-[9px] text-slate-600">หมวดหมู่ย่อย</p>
                    )}
                  </div>
                </div>

                {canEditPermissions ? (
                  <button
                    onClick={() => handleToggleCategoryRole(cat.id, activeTab)}
                    disabled={!canEditPermissions}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all flex items-center gap-1.5 ${
                      hasAccess
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                        : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400'
                    }`}
                  >
                    {hasAccess ? (
                      <>
                        <Check className="w-3 h-3" /> อนุญาตแล้ว
                      </>
                    ) : (
                      <>
                        <X className="w-3 h-3" /> ไม่อนุญาต
                      </>
                    )}
                  </button>
                ) : (
                  <span className={`flex-shrink-0 text-[10px] font-semibold ${hasAccess ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasAccess ? '✔ อนุญาต' : '✖ ไม่อนุญาต'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
