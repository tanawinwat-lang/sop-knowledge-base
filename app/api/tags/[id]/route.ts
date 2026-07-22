import { NextResponse } from 'next/server';
import { getDB, saveDB, logAudit } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role_name !== 'ADMIN') {
    return NextResponse.json({ error: 'เฉพาะ Admin เท่านั้นที่สามารถลบแท็กได้' }, { status: 403 });
  }

  const db = getDB();
  const tagId = parseInt(id, 10);
  const index = db.tag_library.findIndex((t) => t.id === tagId);

  if (index === -1) {
    return NextResponse.json({ error: 'ไม่พบแท็ก' }, { status: 404 });
  }

  const removed = db.tag_library.splice(index, 1)[0];

  // Also remove this tag from all SOPs
  db.sops.forEach((sop) => {
    sop.tags = sop.tags.filter((t) => t !== removed.name);
  });

  saveDB(db);

  logAudit(user.id, user.username, 'DELETE_TAG', `Tag #${id}`, `ลบแท็ก: ${removed.name} (ลบออกจาก SOP ทั้งหมดด้วย)`);

  return NextResponse.json({ success: true, deletedTag: removed.name });
}
