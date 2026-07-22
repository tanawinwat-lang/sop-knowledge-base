import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';
import { canAccessPage } from '@/lib/rbac';

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
const BACKUP_DIR = path.join(process.cwd(), 'data', 'backup');

// POST /api/backups/restore/[name] — restore a backup file
// Creates a safety backup of current database.json before restoring
export async function POST(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const user = await getCurrentUser();
  if (!user || !canAccessPage(user.role_id, '/settings/audit-logs')) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  // Validate filename for security (prevent path traversal)
  if (!name || !name.endsWith('.json') || name.includes('..') || name.includes('/') || name.includes('\\')) {
    return NextResponse.json({ error: 'ชื่อไฟล์ไม่ถูกต้อง' }, { status: 400 });
  }

  const backupPath = path.join(BACKUP_DIR, name);

  if (!fs.existsSync(backupPath)) {
    return NextResponse.json({ error: 'ไม่พบไฟล์ backup นี้' }, { status: 404 });
  }

  try {
    // Safety: backup the current database before restoring
    if (fs.existsSync(DB_FILE)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safetyPath = path.join(BACKUP_DIR, `pre-restore-${timestamp}.json`);
      fs.copyFileSync(DB_FILE, safetyPath);
    }

    // Restore: copy backup over current database
    fs.copyFileSync(backupPath, DB_FILE);

    // Clear the in-memory cache so next getDB() reads the restored file
    const { clearDBCache } = await import('@/lib/db');
    clearDBCache();

    return NextResponse.json({
      success: true,
      message: `คืนค่า backup "${name}" สำเร็จ (ระบบจะใช้ข้อมูลที่คืนค่าในการทำงานครั้งต่อไป)`,
      restored_from: name,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'ไม่สามารถคืนค่า backup ได้: ' + err.message }, { status: 500 });
  }
}
