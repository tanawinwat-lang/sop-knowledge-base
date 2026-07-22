import { NextResponse } from 'next/server';
import { getDB, saveDB, logAudit, generateSimpleEmbedding, TrashSOP } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { filterCategoriesForRole, canWritePage, canDeletePage, canAccessPage } from '@/lib/rbac';
import { createSOPAnnouncement } from '@/lib/announcement';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const roleId = user ? user.role_id : 3;

  const db = getDB();
  const sop = db.sops.find((s) => s.id === parseInt(id, 10));

  if (!sop) {
    return NextResponse.json({ error: 'ไม่พบเอกสาร SOP' }, { status: 404 });
  }

  // Category Level Permission Check
  const allowedCategories = filterCategoriesForRole(roleId);
  const isAllowed = allowedCategories.some((c) => c.id === sop.category_id);
  if (!isAllowed) {
    return NextResponse.json({ error: 'ไม่พบเอกสาร (คุณไม่มีสิทธิ์เข้าถึงหมวดหมู่นี้)' }, { status: 404 });
  }

  return NextResponse.json({ sop });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
  }
  // Check DB page_permissions via helper
  if (!canWritePage(user.role_id, '/sops/new')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แก้ไข SOP' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const db = getDB();
    const index = db.sops.findIndex((s) => s.id === parseInt(id, 10));

    if (index === -1) {
      return NextResponse.json({ error: 'ไม่พบเอกสาร SOP' }, { status: 404 });
    }

    const currentSOP = db.sops[index];
    const now = new Date().toISOString();

    // Check if status approval action — uses approval permission
    if (body.status && body.status !== currentSOP.status) {
      if (!canWritePage(user.role_id, '/approval')) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์เปลี่ยนสถานะเอกสาร' }, { status: 403 });
      }
      currentSOP.status = body.status;
      logAudit(user.id, user.username, 'APPROVE_SOP', `SOP #${id}`, `เปลี่ยนสถานะ SOP เป็น ${body.status}`);
    }

    if (body.title) currentSOP.title = body.title;
    if (body.content) {
      currentSOP.content = body.content;
      currentSOP.embedding = generateSimpleEmbedding(body.content);
    }
    if (body.category_id) currentSOP.category_id = parseInt(body.category_id, 10);
    if (body.tags) currentSOP.tags = Array.isArray(body.tags) ? body.tags : currentSOP.tags;
    if (body.attachments) currentSOP.attachments = body.attachments;

    currentSOP.updated_by = user.id;
    currentSOP.version += 1;
    currentSOP.updated_at = now;

    db.sops[index] = currentSOP;
    saveDB(db);

    logAudit(user.id, user.username, 'UPDATE_SOP', `SOP #${id}`, `อัปเดตเวอร์ชัน SOP เป็น v${currentSOP.version}`);

    // Auto-create announcement for SOP update (if notify enabled)
    if (currentSOP.status === 'PUBLISHED' && body.notify !== false) {
      createSOPAnnouncement(user.id, 'UPDATED', currentSOP.title, currentSOP.id);
    }

    return NextResponse.json({ sop: currentSOP });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
  }
  // Check DB page_permissions for delete access — uses /sops/trash can_delete
  if (!canDeletePage(user.role_id, '/sops/trash')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ลบเอกสาร SOP' }, { status: 403 });
  }

  const db = getDB();
  const index = db.sops.findIndex((s) => s.id === parseInt(id, 10));
  if (index === -1) {
    return NextResponse.json({ error: 'ไม่พบเอกสาร SOP' }, { status: 404 });
  }

  // Move to trash instead of permanent delete
  const sopToTrash = db.sops.splice(index, 1)[0];
  const trashEntry: TrashSOP = {
    sop: sopToTrash,
    deleted_at: new Date().toISOString(),
    deleted_by: user.id,
    deleted_by_username: user.username,
  };
  db.trash_sops.unshift(trashEntry);
  saveDB(db);

  logAudit(user.id, user.username, 'TRASH_SOP', `SOP #${id}`, `ย้ายเอกสารไปถังขยะ: ${sopToTrash.title}`);

  return NextResponse.json({ success: true, message: 'ย้ายเอกสารไปถังขยะแล้ว (สามารถกู้คืนได้ภายใน 30 วัน)' });
}
