import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDB, saveDB, clearDBCache } from '@/lib/db';
import { initializePostgresDB, loadDBFromPostgresSync } from '@/lib/db-postgres';

// POST: Restore all data from PostgreSQL
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }
  if (user.role_name !== 'ADMIN') {
    return NextResponse.json({ error: 'เฉพาะ Admin เท่านั้น' }, { status: 403 });
  }

  try {
    const { db_url } = await req.json();

    if (!db_url || typeof db_url !== 'string') {
      return NextResponse.json({ error: 'กรุณาระบุ DATABASE URL' }, { status: 400 });
    }

    // Temporarily set the URL for this request
    process.env.DATABASE_URL = db_url;

    // Try to initialize and load data
    await initializePostgresDB();
    const pgData = loadDBFromPostgresSync();

    if (!pgData) {
      return NextResponse.json({
        success: false,
        message: '❌ ไม่พบข้อมูลใน PostgreSQL หรือไม่สามารถเชื่อมต่อได้',
      }, { status: 404 });
    }

    // Clear cache so getDB() will re-read
    clearDBCache();

    // Store the URL so future sync works
    const db = getDB();
    db.db_config = {
      db_url,
      pg_connected: true,
      last_sync_at: new Date().toISOString(),
    };
    saveDB(db);

    // Count what we restored
    const restored = {
      users: pgData.users?.length || 0,
      sops: pgData.sops?.length || 0,
      categories: pgData.categories?.length || 0,
      announcements: pgData.announcements?.length || 0,
    };

    return NextResponse.json({
      success: true,
      message: `✅ กู้คืนข้อมูลสำเร็จ! ผู้ใช้ ${restored.users} ราย, SOP ${restored.sops} ฉบับ, หมวดหมู่ ${restored.categories} หมวด, ประกาศ ${restored.announcements} รายการ`,
      restored,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล',
    }, { status: 500 });
  }
}
