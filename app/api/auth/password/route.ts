import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDB, saveDB, logAudit } from '@/lib/db';
import { getCurrentUser, verifyPassword } from '@/lib/auth';

export async function PUT(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
    }

    const db = getDB();
    const user = db.users.find((u) => u.id === currentUser.id);

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้งาน' }, { status: 404 });
    }

    // Verify current password
    if (!verifyPassword(currentPassword, user.password_hash)) {
      return NextResponse.json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }, { status: 400 });
    }

    // Hash and update new password
    user.password_hash = bcrypt.hashSync(newPassword, 10);
    saveDB(db);

    logAudit(
      currentUser.id,
      currentUser.username,
      'CHANGE_PASSWORD',
      'System',
      'เปลี่ยนรหัสผ่านของตนเองสำเร็จ'
    );

    return NextResponse.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
