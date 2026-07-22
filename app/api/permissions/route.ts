import { NextResponse } from 'next/server';
import { getDB, saveDB, logAudit } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAccessPage, canWritePage } from '@/lib/rbac';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Check DB page_permissions — Admin can grant access to any role via RBAC
  if (!canAccessPage(user.role_id, '/settings/permissions')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าถึงการจัดการสิทธิ์' }, { status: 403 });
  }

  const db = getDB();
  return NextResponse.json({
    roles: db.roles,
    page_permissions: db.page_permissions,
    categories: db.categories,
  });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  // Only ADMIN can write (save) permissions — checked via canWritePage
  if (!user || !canWritePage(user.role_id, '/settings/permissions')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แก้ไขการกำหนดสิทธิ์ระบบ' }, { status: 403 });
  }

  try {
    const { page_permissions, categories } = await req.json();
    const db = getDB();

    if (Array.isArray(page_permissions)) {
      db.page_permissions = page_permissions;
    }

    if (Array.isArray(categories)) {
      db.categories = categories;
    }

    saveDB(db);

    logAudit(user.id, user.username, 'UPDATE_PERMISSIONS', 'System RBAC', 'อัปเดตการตั้งค่าสิทธิ์เข้าถึงหน้าและหมวดหมู่');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
