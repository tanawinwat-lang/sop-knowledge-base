import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { filterCategoriesForRole, canWritePage } from '@/lib/rbac';
import { getDB, saveDB, logAudit, Category, getNextId } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  const roleId = user ? user.role_id : 3;
  const categories = filterCategoriesForRole(roleId);
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !canWritePage(user.role_id, '/sops/new')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์จัดการหมวดหมู่' }, { status: 403 });
  }

  try {
    const { name, parent_id, allowed_roles } = await req.json();
    const db = getDB();
    const newId = getNextId('category');

    // Validate parent_id if provided
    if (parent_id) {
      const parentIdNum = parseInt(parent_id, 10);
      const parentExists = db.categories.some((c) => c.id === parentIdNum);
      if (!parentExists) {
        return NextResponse.json({ error: 'ไม่พบหมวดหมู่หลักที่ระบุ' }, { status: 400 });
      }
    }

    const newCat: Category = {
      id: newId,
      name,
      parent_id: parent_id ? parseInt(parent_id, 10) : null,
      allowed_roles: Array.isArray(allowed_roles) ? allowed_roles : [1, 2, 3],
    };

    db.categories.push(newCat);
    saveDB(db);

    logAudit(user.id, user.username, 'CREATE_CATEGORY', `Folder #${newId}`, `สร้างหมวดหมู่ใหม่: ${name}`);

    return NextResponse.json({ category: newCat });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
