import { NextResponse } from 'next/server';
import { getDB, saveDB, logAudit, Feedback, getNextId } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const userId = user ? user.id : 3;

  try {
    const { is_helpful, reason } = await req.json();
    const db = getDB();
    const sopId = parseInt(id, 10);

    const sop = db.sops.find((s) => s.id === sopId);
    if (!sop) {
      return NextResponse.json({ error: 'ไม่พบเอกสาร SOP' }, { status: 404 });
    }

    const newFeedback: Feedback = {
      id: getNextId('feedback'),
      sop_id: sopId,
      user_id: userId,
      is_helpful: Boolean(is_helpful),
      reason: reason || undefined,
      created_at: new Date().toISOString(),
    };

    db.feedbacks.unshift(newFeedback);
    saveDB(db);

    if (user) {
      logAudit(
        user.id,
        user.username,
        'SUBMIT_FEEDBACK',
        `SOP #${sopId}`,
        `ส่งข้อเสนอแนะ: ${is_helpful ? '👍 เข้าใจง่าย' : `👎 ยังงงอยู่ (${reason || 'ไม่ระบุสาเหตุ'})`}`
      );
    }

    return NextResponse.json({ feedback: newFeedback, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
