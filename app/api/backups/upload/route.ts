import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';
import { canAccessPage } from '@/lib/rbac';
import { getDB, saveDB, clearDBCache } from '@/lib/db';

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
const BACKUP_DIR = path.join(process.cwd(), 'data', 'backup');

// POST /api/backups/upload — upload a full database JSON to restore
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !canAccessPage(user.role_id, '/settings/audit-logs')) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { data } = body;

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'กรุณาส่งข้อมูล JSON ที่ถูกต้อง' }, { status: 400 });
    }

    // Validate that it looks like a database backup
    if (!data.users || !data.sops) {
      return NextResponse.json({ error: 'ข้อมูลไม่สมบูรณ์ — ต้องมี users และ sops' }, { status: 400 });
    }

    // Backup current database before restoring
    if (fs.existsSync(DB_FILE)) {
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safetyPath = path.join(BACKUP_DIR, `pre-upload-${timestamp}.json`);
      fs.copyFileSync(DB_FILE, safetyPath);
    }

    // Write the uploaded data as the new database
    const writeData = JSON.stringify(data, null, 2);
    fs.writeFileSync(DB_FILE, writeData, 'utf-8');

    // Clear cache so getDB() reads the new file
    clearDBCache();

    // Sync to PostgreSQL immediately
    const restoredDB = getDB();
    saveDB(restoredDB);

    return NextResponse.json({
      success: true,
      message: `กู้คืนข้อมูลสำเร็จ! ผู้ใช้ ${data.users.length} ราย, SOP ${data.sops.length} ฉบับ, ประกาศ ${data.announcements?.length || 0} รายการ, หมวดหมู่ ${data.categories?.length || 0} หมวด`,
      restored: {
        users: data.users.length,
        sops: data.sops.length,
        announcements: data.announcements?.length || 0,
        categories: data.categories?.length || 0,
        change_requests: data.change_requests?.length || 0,
        feedbacks: data.feedbacks?.length || 0,
        trash: data.trash_sops?.length || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'ไม่สามารถกู้คืนข้อมูลได้: ' + err.message }, { status: 500 });
  }
}
