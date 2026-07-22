import { NextResponse } from 'next/server';
import { getDB, saveDB, SOP_Template, getNextId } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAccessPage } from '@/lib/rbac';

// GET /api/sop-templates — list all templates
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canAccessPage(user.role_id, '/sops')) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const db = getDB();
  const templates = db.sop_templates.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return NextResponse.json({ templates });
}

// POST /api/sop-templates — create a new template
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !canAccessPage(user.role_id, '/sops/new')) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, content, category_id, tags, review_cycle_months } = body;

  if (!name?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อและเนื้อหา Template' }, { status: 400 });
  }

  const db = getDB();
  const template: SOP_Template = {
    id: getNextId('sop_template'),
    name: name.trim(),
    description: description?.trim() || '',
    content: content.trim(),
    category_id: parseInt(category_id) || 1,
    tags: tags || [],
    review_cycle_months: parseInt(review_cycle_months) || 6,
    created_by: user.id,
    created_at: new Date().toISOString(),
  };

  db.sop_templates.push(template);

  // Log audit
  const { logAudit } = await import('@/lib/db');
  logAudit(user.id, user.username, 'CREATE_TEMPLATE', `Template #${template.id}`, `สร้าง Template: ${template.name}`);

  saveDB(db);
  return NextResponse.json({ success: true, template });
}

// DELETE /api/sop-templates — batch delete (send array of IDs)
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role_name !== 'ADMIN') {
    return NextResponse.json({ error: 'เฉพาะ Admin เท่านั้นที่สามารถลบ Template ได้' }, { status: 403 });
  }

  const body = await req.json();
  const ids: number[] = body.ids || [];

  if (ids.length === 0) {
    return NextResponse.json({ error: 'กรุณาระบุ ID ที่ต้องการลบ' }, { status: 400 });
  }

  const db = getDB();
  const removed: string[] = [];
  db.sop_templates = db.sop_templates.filter((t) => {
    if (ids.includes(t.id)) {
      removed.push(t.name);
      return false;
    }
    return true;
  });

  const { logAudit } = await import('@/lib/db');
  logAudit(user.id, user.username, 'DELETE_TEMPLATE', `Templates: ${removed.join(', ')}`, `ลบ Template ${removed.length} รายการ`);

  saveDB(db);
  return NextResponse.json({ success: true, removed: removed.length });
}
