import { NextResponse } from 'next/server';
import { getDB, saveDB, logAudit, User } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAccessPage } from '@/lib/rbac';
import { ensurePersisted } from '@/lib/db-context';
import bcrypt from 'bcryptjs';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !canAccessPage(currentUser.role_id, '/settings/users')) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึงการจัดการผู้ใช้งาน' }, { status: 403 });
  }

  const db = getDB();
  const usersClean = db.users.map((u) => {
    const role = db.roles.find((r) => r.id === u.role_id);
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      role_id: u.role_id,
      role_name: role ? role.role_name : 'AGENT',
      is_active: u.is_active,
      created_at: u.created_at,
    };
  });

  return NextResponse.json({ users: usersClean, roles: db.roles });
}

export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !canAccessPage(currentUser.role_id, '/settings/users')) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์สร้างผู้ใช้งานใหม่' }, { status: 403 });
  }

  try {
    const { username, email, password, role_id } = await req.json();

    if (!username || !email || !password || !role_id) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    const db = getDB();

    // Check duplicate username or email
    const exists = db.users.some((u) => u.username === username || u.email === email);
    if (exists) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรืออีเมลนี้มีในระบบแล้ว' }, { status: 400 });
    }

    const newId = db.users.length ? Math.max(...db.users.map((u) => u.id)) + 1 : 1;
    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    const newUser: User = {
      id: newId,
      username,
      email,
      password_hash: passwordHash,
      role_id: parseInt(role_id, 10),
      is_active: true,
      created_at: now,
    };

    db.users.push(newUser);
    saveDB(db);

    const role = db.roles.find((r) => r.id === newUser.role_id);
    logAudit(
      currentUser.id,
      currentUser.username,
      'CREATE_USER',
      `User #${newId}`,
      `สร้างผู้ใช้ใหม่: ${username} (${email}) ในตำแหน่ง ${role?.role_name}`
    );

    await ensurePersisted();
    return NextResponse.json({
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role_id: newUser.role_id,
        role_name: role?.role_name || 'AGENT',
        created_at: newUser.created_at,
      },
    });
  } catch (err: any) {
    await ensurePersisted();
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
