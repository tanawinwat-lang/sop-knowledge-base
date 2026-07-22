'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  FolderTree,
  Plus,
  Trash2,
  Loader2,
  Check,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileType,
} from 'lucide-react';

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  allowed_roles: number[];
}

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChanged: () => void;
}

/** Build a hierarchical tree from flat category list */
interface TreeNode extends Category {
  children: TreeNode[];
  depth: number;
}

function buildCategoryTree(categories: Category[]): TreeNode[] {
  const roots: TreeNode[] = [];

  const nodes = categories.map((c) => ({ ...c, children: [], depth: 0 }));

  // Find all top-level (parent_id === null) nodes
  const topNodes = nodes.filter((n) => n.parent_id === null);

  function attachChildren(parents: TreeNode[], depth: number) {
    for (const parent of parents) {
      const children = nodes.filter((n) => n.parent_id === parent.id);
      children.forEach((child) => {
        child.depth = depth;
      });
      parent.children = children;
      attachChildren(children, depth + 1);
    }
  }

  roots.push(...topNodes);
  attachChildren(roots, 1);

  return roots;
}

/** Flatten tree into ordered list with depth info for display */
function flattenTree(
  nodes: TreeNode[],
  result: { id: number; name: string; depth: number; parent_id: number | null }[] = []
) {
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth: node.depth, parent_id: node.parent_id });
    flattenTree(node.children, result);
  }
  return result;
}

export function CategoryManagerModal({ isOpen, onClose, onCategoriesChanged }: CategoryManagerModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add category form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState<string>('NONE');
  const [newAllowedRoles, setNewAllowedRoles] = useState<number[]>([1, 2, 3]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Roles reference
  const [roles, setRoles] = useState<{ id: number; role_name: string }[]>([]);

  const fetchCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (res.ok) {
        setCategories(data.categories || []);
      } else {
        setError(data.error || 'ไม่สามารถโหลดหมวดหมู่ได้');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetch('/api/roles')
        .then((r) => r.json())
        .then((d) => setRoles(d.roles || []))
        .catch(() => {});
    }
  }, [isOpen]);

  // Reset form
  const resetForm = () => {
    setShowAddForm(false);
    setNewName('');
    setNewParentId('NONE');
    setNewAllowedRoles([1, 2, 3]);
    setAddError('');
  };

  const handleAddCategory = async () => {
    if (!newName.trim()) {
      setAddError('กรุณากรอกชื่อหมวดหมู่');
      return;
    }
    setIsSubmitting(true);
    setAddError('');

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          parent_id: newParentId === 'NONE' ? null : newParentId,
          allowed_roles: newAllowedRoles,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถสร้างหมวดหมู่ได้');

      resetForm();
      await fetchCategories();
      onCategoriesChanged();
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/categories/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถลบหมวดหมู่ได้');

      setDeleteTarget(null);
      await fetchCategories();
      onCategoriesChanged();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleRole = (roleId: number) => {
    setNewAllowedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  if (!isOpen) return null;

  const tree = buildCategoryTree(categories);
  const flatList = flattenTree(tree);

  // Available parents (only top-level and existing parents that aren't their own descendants)
  const getAllDescendantIds = (catId: number): number[] => {
    const ids: number[] = [];
    const children = categories.filter((c) => c.parent_id === catId);
    for (const child of children) {
      ids.push(child.id);
      ids.push(...getAllDescendantIds(child.id));
    }
    return ids;
  };

  const roleLabels: Record<number, string> = {};
  roles.forEach((r) => {
    roleLabels[r.id] = r.role_name;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">จัดการหมวดหมู่เอกสาร</h3>
              <p className="text-xs text-slate-400">เพิ่ม ลบ และจัดโครงสร้างหมวดหมู่แบบลำดับชั้น</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Error banner */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Add Category Button / Form */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl text-sm text-slate-400 hover:text-indigo-300 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มหมวดหมู่ใหม่</span>
            </button>
          ) : (
            <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  หมวดหมู่ใหม่
                </h4>
                <button
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  ยกเลิก
                </button>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">ชื่อหมวดหมู่ *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="เช่น ระบบข้อมูลบุคคล"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">หมวดหมู่หลัก (ถ้ามี)</label>
                <select
                  value={newParentId}
                  onChange={(e) => setNewParentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="NONE">— ไม่มี (เป็นหมวดหมู่หลัก) —</option>
                  {categories
                    .filter((c) => c.parent_id === null)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        📁 {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">สิทธิ์การเข้าถึง (Allowed Roles)</label>
                <div className="flex flex-wrap gap-2">
                  {roles.length > 0
                    ? roles.map((r) => (
                        <label
                          key={r.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-all ${
                            newAllowedRoles.includes(r.id)
                              ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={newAllowedRoles.includes(r.id)}
                            onChange={() => handleToggleRole(r.id)}
                            className="sr-only"
                          />
                          {r.role_name}
                        </label>
                      ))
                    : [1, 2, 3].map((rid) => (
                        <label
                          key={rid}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-all ${
                            newAllowedRoles.includes(rid)
                              ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={newAllowedRoles.includes(rid)}
                            onChange={() => handleToggleRole(rid)}
                            className="sr-only"
                          />
                          {rid === 1 ? 'ADMIN' : rid === 2 ? 'SUPERVISOR' : 'AGENT'}
                        </label>
                      ))}
                </div>
              </div>

              {addError && (
                <p className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {addError}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleAddCategory}
                  disabled={isSubmitting || !newName.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {isSubmitting ? 'กำลังสร้าง...' : 'สร้างหมวดหมู่'}
                </button>
              </div>
            </div>
          )}

          {/* Category Tree */}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-xs">กำลังโหลดหมวดหมู่...</span>
            </div>
          ) : flatList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-slate-800 border border-slate-800 rounded-xl">
              <FolderTree className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">ยังไม่มีหมวดหมู่เอกสาร</p>
              <p className="text-xs text-slate-500 mt-1">คลิก "เพิ่มหมวดหมู่ใหม่" เพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 pb-1.5 border-b border-slate-800 mb-1">
                <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                  โครงสร้างหมวดหมู่
                </span>
                <span className="text-[11px] text-slate-500">{categories.length} รายการ</span>
              </div>

              {flatList.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                  style={{ paddingLeft: `${12 + item.depth * 20}px` }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.depth === 0 ? (
                      <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      </div>
                    )}
                    <span className="text-sm text-slate-200 truncate">{item.name}</span>
                    {item.parent_id === null && (
                      <span className="text-[10px] text-emerald-500/60 font-medium flex-shrink-0">หลัก</span>
                    )}
                    {item.depth > 0 && (
                      <span className="text-[10px] text-indigo-400/50 font-medium flex-shrink-0">ย่อย</span>
                    )}
                  </div>

                  <button
                    onClick={() => setDeleteTarget(categories.find((c) => c.id === item.id) || null)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    title="ลบหมวดหมู่นี้"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            หมวดหมู่หลักสามารถมีหมวดหมู่ย่อยได้ไม่จำกัดระดับ
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            ปิด
          </button>
        </div>

        {/* Delete Confirmation Dialog */}
        {deleteTarget && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl flex items-center justify-center p-6">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">ยืนยันการลบหมวดหมู่</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    คุณแน่ใจที่จะลบ "{deleteTarget.name}" หรือไม่?
                  </p>
                </div>
              </div>

              {deleteError && (
                <p className="mb-3 text-xs text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {deleteError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeleteError('');
                  }}
                  className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleDeleteCategory}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  {isDeleting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
