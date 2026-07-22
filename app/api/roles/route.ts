import { NextResponse } from 'next/server';
import { getDB, saveDB, logAudit, Role, PagePermission } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const db = getDB();
  return NextResponse.json({ roles: db.roles });
}

export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role_name !== 'ADMIN') {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์สร้างตำแหน่งใหม่ (เฉพาะ Admin)' }, { status: 403 });
  }

  try {
    const { role_name } = await req.json();
    if (!role_name || !role_name.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อตำแหน่ง' }, { status: 400 });
    }

    const db = getDB();
    const cleanRoleName = role_name.trim().toUpperCase().replace(/\s+/g, '_');

    // Check duplicate role name
    const exists = db.roles.some((r) => r.role_name === cleanRoleName);
    if (exists) {
      return NextResponse.json({ error: 'ตำแหน่งนี้มีในระบบแล้ว' }, { status: 400 });
    }

    const newRoleId = db.roles.length ? Math.max(...db.roles.map((r) => r.id)) + 1 : 1;
    const newRole: Role = {
      id: newRoleId,
      role_name: cleanRoleName as any,
    };

    db.roles.push(newRole);

    // Initialize default page permissions for the new role
    const defaultPages = [
      '/dashboard',
      '/sops',
      '/sops/new',
      '/sops/trash',
      '/announcements',
      '/approval',
      '/feedback',
      '/settings/password',
      '/settings/users',
      '/settings/permissions',
      '/settings/audit-logs',
    ];

    let nextPermId = db.page_permissions.length ? Math.max(...db.page_permissions.map((p) => p.id)) + 1 : 1;

    defaultPages.forEach((route) => {
      const canAccess = route === '/dashboard' || route === '/sops';
      db.page_permissions.push({
        id: nextPermId++,
        role_id: newRoleId,
        page_route: route,
        can_access: canAccess,
        can_write: canAccess,
        can_delete: false,
      });
    });

    saveDB(db);

    logAudit(
      currentUser.id,
      currentUser.username,
      'CREATE_ROLE',
      `Role #${newRoleId}`,
      `สร้างตำแหน่งใหม่ในระบบ: ${cleanRoleName}`
    );

    return NextResponse.json({ role: newRole, roles: db.roles });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
