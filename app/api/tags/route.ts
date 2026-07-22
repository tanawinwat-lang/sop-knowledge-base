import { NextResponse } from 'next/server';
import { getDB, saveDB, logAudit, TagLibrary, getNextId } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canWritePage } from '@/lib/rbac';

export async function GET() {
  const db = getDB();
  return NextResponse.json({ tags: db.tag_library || [] });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
  }
  // Check DB page_permissions via helper — uses /sops/new permission since tags are managed within SOP forms
  if (!canWritePage(user.role_id, '/sops/new')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์สร้างแท็ก' }, { status: 403 });
  }

  try {
    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อแท็ก' }, { status: 400 });
    }

    const db = getDB();
    const tagName = name.trim();

    // Check for duplicate
    if (db.tag_library.some((t) => t.name.toLowerCase() === tagName.toLowerCase())) {
      return NextResponse.json({ error: 'แท็กนี้มีอยู่แล้วในระบบ' }, { status: 400 });
    }

    const newId = getNextId('tag');
    const newTag: TagLibrary = {
      id: newId,
      name: tagName,
      created_at: new Date().toISOString(),
    };

    db.tag_library.push(newTag);
    saveDB(db);

    logAudit(user.id, user.username, 'CREATE_TAG', `Tag #${newId}`, `สร้างแท็ก: ${tagName}`);

    return NextResponse.json({ tag: newTag });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
