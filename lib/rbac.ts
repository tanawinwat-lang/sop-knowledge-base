import { getDB, Category, SOP, PagePermission } from './db';

// 🛡️ SUPER_ADMIN (role_id: 0) bypasses ALL permission checks
const IS_SUPER_ADMIN = (roleId: number) => roleId === 0;

// Find the exact page_permission entry for a role + route
export function findPagePermission(roleId: number, pageRoute: string): PagePermission | undefined {
  const db = getDB();
  return db.page_permissions.find(
    (p) => p.role_id === roleId && (p.page_route === pageRoute || pageRoute.startsWith(p.page_route + '/'))
  );
}

// Check if a role can ACCESS (read/view) a page
export function canAccessPage(roleId: number, pageRoute: string): boolean {
  if (IS_SUPER_ADMIN(roleId)) return true; // SUPER_ADMIN bypass
  const perm = findPagePermission(roleId, pageRoute);
  if (!perm) return true; // Default allow if not restricted
  return perm.can_access;
}

// Check if a role can WRITE (create/edit) on a page
export function canWritePage(roleId: number, pageRoute: string): boolean {
  if (IS_SUPER_ADMIN(roleId)) return true; // SUPER_ADMIN bypass
  const perm = findPagePermission(roleId, pageRoute);
  if (!perm) return false; // Default deny if not restricted
  return perm.can_write;
}

// Check if a role can DELETE on a page
export function canDeletePage(roleId: number, pageRoute: string): boolean {
  if (IS_SUPER_ADMIN(roleId)) return true; // SUPER_ADMIN bypass
  const perm = findPagePermission(roleId, pageRoute);
  if (!perm) return false; // Default deny if not restricted
  return perm.can_delete;
}

export function getPermissionsForRole(roleId: number): PagePermission[] {
  const db = getDB();
  return db.page_permissions.filter((p) => p.role_id === roleId);
}

// Category-Level Permission: Backend API Query Filter
// SELECT * FROM categories WHERE role_id = ANY(allowed_roles);
export function filterCategoriesForRole(roleId: number): Category[] {
  if (IS_SUPER_ADMIN(roleId)) {
    const db = getDB();
    return db.categories; // SUPER_ADMIN sees ALL categories
  }
  const db = getDB();
  return db.categories.filter((cat) => cat.allowed_roles.includes(roleId));
}

// Filter SOPs based on user's category permission
export function filterSOPsForRole(roleId: number): SOP[] {
  if (IS_SUPER_ADMIN(roleId)) {
    const db = getDB();
    return db.sops; // SUPER_ADMIN sees ALL SOPs
  }
  const db = getDB();
  const allowedCategories = filterCategoriesForRole(roleId);
  const allowedCatIds = new Set(allowedCategories.map((c) => c.id));
  return db.sops.filter((sop) => allowedCatIds.has(sop.category_id));
}
