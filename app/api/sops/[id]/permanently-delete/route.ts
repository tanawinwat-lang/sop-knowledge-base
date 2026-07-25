import { NextResponse } from 'next/server';
import { getDB, saveDB, logAudit } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canDeletePage } from '@/lib/rbac';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !canDeletePage(user.role_id, '/sops/trash')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ลบเอกสารถาวรจากถังขยะ' }, { status: 403 });
  }

  const db = getDB();
  const trashIndex = db.trash_sops.findIndex((t) => t.sop.id === parseInt(id, 10));

  if (trashIndex === -1) {
    return NextResponse.json({ error: 'ไม่พบเอกสารในถังขยะ' }, { status: 404 });
  }

  // Permanently delete: remove from trash array entirely
  const deleted = db.trash_sops.splice(trashIndex, 1)[0];
  saveDB(db);

  logAudit(
    user.id,
    user.username,
    'PERMANENTLY_DELETE_SOP',
    `SOP #${id}`,
    `ลบเอกสารถาวรจากถังขยะ: ${deleted.sop.title}`
  );

  return NextResponse.json({ success: true, message: 'ลบเอกสารถาวรแล้ว' });
}
