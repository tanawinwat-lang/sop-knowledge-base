import { NextResponse } from 'next/server';
import { getDB, saveDB } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAccessPage } from '@/lib/rbac';

// DELETE /api/sop-templates/[id] — delete a single template
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role_name !== 'ADMIN') {
    return NextResponse.json({ error: 'เฉพาะ Admin เท่านั้นที่สามารถลบ Template ได้' }, { status: 403 });
  }

  const db = getDB();
  const templateId = parseInt(id, 10);
  const template = db.sop_templates.find((t) => t.id === templateId);

  if (!template) {
    return NextResponse.json({ error: 'ไม่พบ Template นี้' }, { status: 404 });
  }

  db.sop_templates = db.sop_templates.filter((t) => t.id !== templateId);

  const { logAudit } = await import('@/lib/db');
  logAudit(user.id, user.username, 'DELETE_TEMPLATE', `Template #${templateId}`, `ลบ Template: ${template.name}`);

  saveDB(db);
  return NextResponse.json({ success: true });
}
