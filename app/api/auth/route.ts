import { NextResponse } from 'next/server';
import { getDB, logAudit } from '@/lib/db';
import { verifyPassword, signUserToken, getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // Return page_permissions for the current user's role
  // This allows the sidebar to dynamically respect RBAC settings
  const db = getDB();
  const pagePermissions = db.page_permissions.filter((p) => p.role_id === user.role_id);

  return NextResponse.json({ user, pagePermissions });
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const db = getDB();
    const user = db.users.find((u) => u.email === email || u.username === email);

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: 'อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง' }, { status: 400 });
    }

    // Check if account is active
    if (user.is_active === false) {
      return NextResponse.json({ error: 'บัญชีผู้ใช้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ' }, { status: 403 });
    }

    const role = db.roles.find((r) => r.id === user.role_id);
    const sessionUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      role_name: role ? role.role_name : ('AGENT' as const),
    };

    const token = signUserToken(sessionUser);
    logAudit(user.id, user.username, 'LOGIN', 'System', `เข้าสู่ระบบสำเร็จในฐานะ ${sessionUser.role_name}`);

    const res = NextResponse.json({ user: sessionUser, success: true });
    res.cookies.set('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (user) {
    logAudit(user.id, user.username, 'LOGOUT', 'System', 'ออกจากระบบ');
  }
  const res = NextResponse.json({ success: true });
  res.cookies.delete('token');
  return res;
}
