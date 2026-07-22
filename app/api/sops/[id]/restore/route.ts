import { NextResponse } from 'next/server';
import { getDB, saveDB, logAudit } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canWritePage } from '@/lib/rbac';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !canWritePage(user.role_id, '/sops/trash')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์กู้คืนเอกสาร SOP' }, { status: 403 });
  }

  const db = getDB();
  const trashIndex = db.trash_sops.findIndex((t) => t.sop.id === parseInt(id, 10));

  if (trashIndex === -1) {
    return NextResponse.json({ error: 'ไม่พบเอกสารในถังขยะ' }, { status: 404 });
  }

  // Restore: move from trash back to active SOPs
  const restored = db.trash_sops.splice(trashIndex, 1)[0];
  restored.sop.updated_at = new Date().toISOString();
  restored.sop.updated_by = user.id;
  db.sops.unshift(restored.sop);
  saveDB(db);

  logAudit(
    user.id,
    user.username,
    'RESTORE_SOP',
    `SOP #${id}`,
    `กู้คืนเอกสารจากถังขยะ: ${restored.sop.title}`
  );

  return NextResponse.json({ success: true, sop: restored.sop });
}
