import { NextResponse } from 'next/server';
import { getDB, saveDB, logAudit } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canWritePage, canDeletePage } from '@/lib/rbac';
import bcrypt from 'bcryptjs';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser || !canWritePage(currentUser.role_id, '/settings/users')) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไขผู้ใช้งาน' }, { status: 403 });
  }

  try {
    const { role_id, password, email, is_active } = await req.json();
    const db = getDB();
    const userId = parseInt(id, 10);
    const user = db.users.find((u) => u.id === userId);

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 });
    }

    if (role_id !== undefined) user.role_id = parseInt(role_id, 10);
    if (email !== undefined) user.email = email;
    if (password !== undefined) user.password_hash = bcrypt.hashSync(password, 10);
    if (is_active !== undefined) user.is_active = is_active;

    saveDB(db);

    const role = db.roles.find((r) => r.id === user.role_id);
    const statusChange = is_active !== undefined ? `, สถานะ: ${is_active ? 'Active' : 'Inactive'}` : '';
    logAudit(
      currentUser.id,
      currentUser.username,
      'UPDATE_USER',
      `User #${id}`,
      `อัปเดตผู้ใช้งาน ${user.username}${statusChange} เป็นตำแหน่ง ${role?.role_name}`
    );

    return NextResponse.json({ success: true, is_active: user.is_active, role_name: role?.role_name });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser || !canDeletePage(currentUser.role_id, '/settings/users')) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์ลบผู้ใช้งาน' }, { status: 403 });
  }

  const db = getDB();
  const userId = parseInt(id, 10);
  const index = db.users.findIndex((u) => u.id === userId);

  if (index === -1) {
    return NextResponse.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 });
  }

  const removed = db.users.splice(index, 1)[0];
  saveDB(db);

  logAudit(currentUser.id, currentUser.username, 'DELETE_USER', `User #${id}`, `ลบผู้ใช้งาน ${removed.username}`);

  return NextResponse.json({ success: true });
}
