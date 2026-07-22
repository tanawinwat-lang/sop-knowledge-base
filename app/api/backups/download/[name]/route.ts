import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';
import { canAccessPage } from '@/lib/rbac';

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backup');

// GET /api/backups/download/[name] — download a backup file
export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const user = await getCurrentUser();
  if (!user || !canAccessPage(user.role_id, '/settings/audit-logs')) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  // Validate filename for security
  if (!name || !name.endsWith('.json') || name.includes('..') || name.includes('/') || name.includes('\\')) {
    return NextResponse.json({ error: 'ชื่อไฟล์ไม่ถูกต้อง' }, { status: 400 });
  }

  const filePath = path.join(BACKUP_DIR, name);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'ไม่พบไฟล์ backup นี้' }, { status: 404 });
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${name}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'ไม่สามารถอ่านไฟล์ได้: ' + err.message }, { status: 500 });
  }
}
