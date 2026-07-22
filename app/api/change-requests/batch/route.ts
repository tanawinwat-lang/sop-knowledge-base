import { NextResponse } from 'next/server';
import { getDB, saveDB, logAudit, generateSimpleEmbedding } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canWritePage } from '@/lib/rbac';
import { createSOPAnnouncement } from '@/lib/announcement';

// POST /api/change-requests/batch — Approve/Reject multiple change requests at once
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
  }

  if (!canWritePage(user.role_id, '/approval')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์พิจารณาคำขอเปลี่ยนแปลง' }, { status: 403 });
  }

  const body = await req.json();
  const { action, ids, review_comment } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'กรุณาเลือกคำขอเปลี่ยนแปลงที่ต้องการดำเนินการ' }, { status: 400 });
  }

  if (!action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'กรุณาระบุ action: approve หรือ reject' }, { status: 400 });
  }

  const db = getDB();
  const now = new Date().toISOString();
  let successCount = 0;
  const errorMessages: string[] = [];

  for (const rawId of ids) {
    const id = parseInt(rawId, 10);
    const index = db.change_requests.findIndex((cr) => cr.id === id);

    if (index === -1) {
      errorMessages.push(`ไม่พบคำขอ #${id}`);
      continue;
    }

    const changeReq = db.change_requests[index];

    if (changeReq.status !== 'PENDING') {
      errorMessages.push(`คำขอ #${id} ถูกดำเนินการไปแล้ว`);
      continue;
    }

    if (action === 'approve') {
      // Find the target SOP
      const sopIndex = db.sops.findIndex((s) => s.id === changeReq.sop_id);
      if (sopIndex === -1) {
        errorMessages.push(`ไม่พบ SOP ที่อ้างอิงในคำขอ #${id}`);
        continue;
      }

      const sop = db.sops[sopIndex];

      // Apply changes — updated_by becomes the APPROVER's name
      sop.title = changeReq.title;
      sop.content = changeReq.content;
      sop.embedding = generateSimpleEmbedding(sop.content);
      sop.updated_by = user.id;
      sop.version += 1;
      sop.updated_at = now;

      db.sops[sopIndex] = sop;

      // Mark CR as APPROVED
      changeReq.status = 'APPROVED';
      changeReq.reviewed_by = user.id;
      changeReq.reviewed_at = now;
      changeReq.review_comment = review_comment || null;

      db.change_requests[index] = changeReq;

      logAudit(
        user.id,
        user.username,
        'APPROVE_CHANGE_REQUEST',
        `SOP #${changeReq.sop_id}`,
        `อนุมัติคำขอเปลี่ยนแปลง SOP "${sop.title}" (v${sop.version})`
      );

      // Auto-create announcement for SOP update
      if (sop.status === 'PUBLISHED') {
        try {
          createSOPAnnouncement(user.id, 'UPDATED', sop.title, sop.id);
        } catch {
          // Best-effort announcement creation
        }
      }

      successCount++;
    } else {
      // REJECT
      changeReq.status = 'REJECTED';
      changeReq.reviewed_by = user.id;
      changeReq.reviewed_at = now;
      changeReq.review_comment = review_comment || '';

      db.change_requests[index] = changeReq;

      logAudit(
        user.id,
        user.username,
        'REJECT_CHANGE_REQUEST',
        `SOP #${changeReq.sop_id}`,
        `ปฏิเสธคำขอเปลี่ยนแปลง SOP (เหตุผล: ${review_comment || 'ไม่ระบุ'})`
      );

      successCount++;
    }
  }

  saveDB(db);

  const actionLabel = action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ';
  let message = `${actionLabel} ${successCount} รายการเรียบร้อย`;

  if (errorMessages.length > 0) {
    message += ` (${errorMessages.length} รายการไม่สำเร็จ: ${errorMessages.slice(0, 3).join(', ')}${errorMessages.length > 3 ? ` และอีก ${errorMessages.length - 3} รายการ` : ''})`;
  }

  return NextResponse.json({
    success: true,
    count: successCount,
    errors: errorMessages,
    message,
  });
}
