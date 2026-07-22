import { NextResponse } from 'next/server';
import { getDB, saveDB, logAudit } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canDeletePage } from '@/lib/rbac';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !canDeletePage(user.role_id, '/feedback')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ลบข้อเสนอแนะ' }, { status: 403 });
  }

  const feedbackId = parseInt(id, 10);
  const db = getDB();

  const index = db.feedbacks.findIndex((f) => f.id === feedbackId);
  if (index === -1) {
    return NextResponse.json({ error: 'ไม่พบข้อเสนอแนะนี้' }, { status: 404 });
  }

  const removed = db.feedbacks.splice(index, 1)[0];
  saveDB(db);

  logAudit(
    user.id,
    user.username,
    'DELETE_FEEDBACK',
    `Feedback #${feedbackId}`,
    `ลบข้อเสนอแนะสำหรับ SOP #${removed.sop_id} (${removed.is_helpful ? 'Like' : 'Dislike'})`
  );

  return NextResponse.json({ success: true, message: 'ลบข้อเสนอแนะเรียบร้อยแล้ว' });
}
