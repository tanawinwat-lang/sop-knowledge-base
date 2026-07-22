import { NextResponse } from 'next/server';
import { getDB, saveDB, logAudit, generateSimpleEmbedding } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canWritePage } from '@/lib/rbac';
import { createSOPAnnouncement } from '@/lib/announcement';

// PUT /api/change-requests/[id] — Approve or reject a change request
// Body: { action: 'approve' | 'reject', review_comment?: string }
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
  }

  // Only Admin/Supervisor can review (uses approval permission)
  if (!canWritePage(user.role_id, '/approval')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์พิจารณาคำขอเปลี่ยนแปลง' }, { status: 403 });
  }

  try {
    const { action, review_comment } = await req.json();
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'กรุณาระบุ action: approve หรือ reject' }, { status: 400 });
    }

    const db = getDB();
    const requestId = parseInt(id, 10);
    const index = db.change_requests.findIndex((cr) => cr.id === requestId);

    if (index === -1) {
      return NextResponse.json({ error: 'ไม่พบคำขอเปลี่ยนแปลงนี้' }, { status: 404 });
    }

    const changeReq = db.change_requests[index];

    if (changeReq.status !== 'PENDING') {
      return NextResponse.json({ error: 'คำขอนี้ได้รับการดำเนินการไปแล้ว' }, { status: 400 });
    }

    if (action === 'approve') {
      // Find the target SOP
      const sopIndex = db.sops.findIndex((s) => s.id === changeReq.sop_id);
      if (sopIndex === -1) {
        return NextResponse.json({ error: 'ไม่พบเอกสาร SOP ที่ต้องการเปลี่ยนแปลง (อาจถูกลบไปแล้ว)' }, { status: 404 });
      }

      const sop = db.sops[sopIndex];
      const now = new Date().toISOString();

      // Apply the changes — updated_by becomes the APPROVER's name
      sop.title = changeReq.title;
      sop.content = changeReq.content;
      sop.embedding = generateSimpleEmbedding(sop.content);
      sop.updated_by = user.id; // ผู้ Approve
      sop.version += 1;
      sop.updated_at = now;

      db.sops[sopIndex] = sop;

      // Mark change request as APPROVED
      changeReq.status = 'APPROVED';
      changeReq.reviewed_by = user.id;
      changeReq.reviewed_at = now;
      changeReq.review_comment = review_comment || null;

      db.change_requests[index] = changeReq;
      saveDB(db);

      logAudit(
        user.id,
        user.username,
        'APPROVE_CHANGE_REQUEST',
        `SOP #${changeReq.sop_id}`,
        `อนุมัติคำขอเปลี่ยนแปลง SOP "${sop.title}" (v${sop.version})`
      );

      // Auto-create announcement for SOP update
      if (sop.status === 'PUBLISHED') {
        createSOPAnnouncement(user.id, 'UPDATED', sop.title, sop.id);
      }

      return NextResponse.json({
        success: true,
        message: 'อนุมัติคำขอเปลี่ยนแปลงเรียบร้อย — SOP ได้รับการอัปเดตแล้ว',
        change_request: { ...changeReq, sop_title: sop.title },
      });
    } else {
      // REJECT
      changeReq.status = 'REJECTED';
      changeReq.reviewed_by = user.id;
      changeReq.reviewed_at = new Date().toISOString();
      changeReq.review_comment = review_comment || '';

      db.change_requests[index] = changeReq;
      saveDB(db);

      logAudit(
        user.id,
        user.username,
        'REJECT_CHANGE_REQUEST',
        `SOP #${changeReq.sop_id}`,
        `ปฏิเสธคำขอเปลี่ยนแปลง SOP (เหตุผล: ${review_comment || 'ไม่ระบุ'})`
      );

      return NextResponse.json({
        success: true,
        message: 'ปฏิเสธคำขอเปลี่ยนแปลงเรียบร้อย',
        change_request: changeReq,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
