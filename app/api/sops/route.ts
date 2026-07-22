import { NextResponse } from 'next/server';
import { getDB, saveDB, logAudit, SOP, generateSimpleEmbedding, getNextId } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { filterSOPsForRole, canAccessPage, canWritePage } from '@/lib/rbac';
import { createSOPAnnouncement } from '@/lib/announcement';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  const roleId = user ? user.role_id : 3; // Default agent

  const { searchParams } = new URL(req.url);
  const trash = searchParams.get('trash');

  if (trash === 'true') {
    // Return trashed SOPs — check DB page_permissions for /sops/trash
    if (!user || !canAccessPage(user.role_id, '/sops/trash')) {
      return NextResponse.json({ trash: [] });
    }
    const db = getDB();
    return NextResponse.json({ trash: db.trash_sops || [] });
  }

  const sops = filterSOPsForRole(roleId);
  const status = searchParams.get('status');
  const categoryId = searchParams.get('category_id');

  let filtered = sops;
  if (status) {
    filtered = filtered.filter((s) => s.status === status);
  }
  if (categoryId) {
    filtered = filtered.filter((s) => s.category_id === parseInt(categoryId, 10));
  }

  return NextResponse.json({ sops: filtered });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
  }
  // Check DB page_permissions via helper
  if (!canWritePage(user.role_id, '/sops/new')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์สร้าง SOP' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, content, category_id, tags, review_cycle_months, attachments, notify } = body;

    const db = getDB();
    const now = new Date().toISOString();
    const cycleMonths = parseInt(review_cycle_months || '6', 10);
    const expiresAt = new Date(Date.now() + cycleMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

    const newId = getNextId('sop');

    // Workflow: SUP creates -> PENDING_APPROVE, Admin creates -> PUBLISHED directly
    const initialStatus = user.role_name === 'ADMIN' ? 'PUBLISHED' : 'PENDING_APPROVE';

    const newSOP: SOP = {
      id: newId,
      category_id: parseInt(category_id || '1', 10),
      title,
      content,
      status: initialStatus,
      created_by: user.id,
      updated_by: user.id,
      version: 1,
      tags: Array.isArray(tags) ? tags : [],
      review_cycle_months: cycleMonths,
      expires_at: expiresAt,
      last_reviewed_at: now,
      embedding: generateSimpleEmbedding(content),
      attachments: Array.isArray(attachments) ? attachments : [],
      created_at: now,
      updated_at: now,
    };

    db.sops.unshift(newSOP);
    saveDB(db);

    logAudit(user.id, user.username, 'CREATE_SOP', `SOP #${newId}`, `สร้าง SOP ใหม่: ${title} (สถานะ: ${initialStatus})`);

    // Auto-create announcement for new SOP (if notify enabled)
    if (initialStatus === 'PUBLISHED' && notify !== false) {
      createSOPAnnouncement(user.id, 'CREATED', title, newId);
    }

    return NextResponse.json({ sop: newSOP });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
