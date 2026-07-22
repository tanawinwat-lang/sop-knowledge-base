import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';
import { canAccessPage } from '@/lib/rbac';

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
const BACKUP_DIR = path.join(process.cwd(), 'data', 'backup');

// POST /api/backups/create — force-create a backup immediately
export async function POST() {
  const user = await getCurrentUser();
  if (!user || !canAccessPage(user.role_id, '/settings/audit-logs')) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  if (!fs.existsSync(DB_FILE)) {
    return NextResponse.json({ error: 'ไม่มีไฟล์ database ให้สำรอง' }, { status: 400 });
  }

  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `database-${timestamp}.json`);
    fs.copyFileSync(DB_FILE, backupPath);

    const stat = fs.statSync(backupPath);

    return NextResponse.json({
      success: true,
      message: 'สร้าง backup สำเร็จ',
      backup: {
        filename: `database-${timestamp}.json`,
        size: stat.size,
        created_at: stat.mtime.toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'ไม่สามารถสร้าง backup ได้: ' + err.message }, { status: 500 });
  }
}
