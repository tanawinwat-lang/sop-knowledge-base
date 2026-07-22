import { NextResponse } from 'next/server';
import { getDB, saveDB, logAudit } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canWritePage } from '@/lib/rbac';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || !canWritePage(user.role_id, '/approval')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ยืนยันความถูกต้องเอกสาร' }, { status: 403 });
  }

  const db = getDB();
  const sop = db.sops.find((s) => s.id === parseInt(id, 10));

  if (!sop) {
    return NextResponse.json({ error: 'ไม่พบเอกสาร SOP' }, { status: 404 });
  }

  const now = new Date();
  const cycleMonths = sop.review_cycle_months || 6;
  const newExpiresAt = new Date(now.getTime() + cycleMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

  sop.last_reviewed_at = now.toISOString();
  sop.expires_at = newExpiresAt;
  sop.updated_by = user.id;

  saveDB(db);

  logAudit(user.id, user.username, 'RENEW_REVIEW_CYCLE', `SOP #${id}`, `ยืนยันความถูกต้องและขยายวันหมดอายุไปอีก ${cycleMonths} เดือน`);

  return NextResponse.json({ sop, success: true });
}
