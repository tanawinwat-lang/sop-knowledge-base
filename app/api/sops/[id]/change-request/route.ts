import { NextResponse } from 'next/server';
import { getDB, saveDB, logAudit, getNextId, ChangeRequest } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { filterCategoriesForRole } from '@/lib/rbac';

// POST /api/sops/[id]/change-request — submit a change request for this SOP
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
  }

  const db = getDB();
  const sopId = parseInt(id, 10);
  const sop = db.sops.find((s) => s.id === sopId);

  if (!sop) {
    return NextResponse.json({ error: 'ไม่พบเอกสาร SOP' }, { status: 404 });
  }

  // Check category permission
  const allowedCategories = filterCategoriesForRole(user.role_id);
  const isAllowed = allowedCategories.some((c) => c.id === sop.category_id);
  if (!isAllowed) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าถึงเอกสารนี้' }, { status: 403 });
  }

  try {
    const { title, content, reason } = await req.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อเรื่อง' }, { status: 400 });
    }
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุเนื้อหา' }, { status: 400 });
    }
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุเหตุผลในการขอเปลี่ยนแปลง' }, { status: 400 });
    }

    const newRequest: ChangeRequest = {
      id: getNextId('change_request'),
      sop_id: sopId,
      title: title.trim(),
      content: content.trim(),
      reason: reason.trim(),
      requested_by: user.id,
      requested_by_username: user.username,
      requested_at: new Date().toISOString(),
      status: 'PENDING',
    };

    db.change_requests.push(newRequest);
    saveDB(db);

    logAudit(
      user.id,
      user.username,
      'SUBMIT_CHANGE_REQUEST',
      `SOP #${sopId}`,
      `ส่งคำขอเปลี่ยนแปลง SOP: ${sop.title}`
    );

    return NextResponse.json({
      change_request: {
        ...newRequest,
        sop_title: sop.title,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
