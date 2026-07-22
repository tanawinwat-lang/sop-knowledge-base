import { NextResponse } from 'next/server';
import { getDB, saveDB, logAudit } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role_name !== 'ADMIN') {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์ลบตำแหน่ง' }, { status: 403 });
  }

  const roleId = parseInt(id, 10);
  if (roleId === 1 || roleId === 2 || roleId === 3) {
    return NextResponse.json({ error: 'ไม่สามารถลบตำแหน่งหลักของระบบ (ADMIN, SUPERVISOR, AGENT) ได้' }, { status: 400 });
  }

  const db = getDB();
  const index = db.roles.findIndex((r) => r.id === roleId);
  if (index === -1) {
    return NextResponse.json({ error: 'ไม่พบตำแหน่งที่ระบุ' }, { status: 404 });
  }

  const removed = db.roles.splice(index, 1)[0];

  // Reassign users having this deleted role to AGENT (role_id: 3)
  db.users.forEach((u) => {
    if (u.role_id === roleId) {
      u.role_id = 3;
    }
  });

  // Clean up page_permissions
  db.page_permissions = db.page_permissions.filter((p) => p.role_id !== roleId);

  saveDB(db);

  logAudit(currentUser.id, currentUser.username, 'DELETE_ROLE', `Role #${roleId}`, `ลบตำแหน่ง ${removed.role_name}`);

  return NextResponse.json({ success: true, roles: db.roles });
}
