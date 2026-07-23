import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDB, saveDB } from '@/lib/db';
import { isPostgresAvailable, saveDBToPostgres, initializePostgresDB } from '@/lib/db-postgres';

// GET: Check database connection status
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }
  if (user.role_name !== 'ADMIN') {
    return NextResponse.json({ error: 'เฉพาะ Admin เท่านั้นที่สามารถดูข้อมูลฐานข้อมูล' }, { status: 403 });
  }

  const db = getDB();
  const pgAvailable = await isPostgresAvailable().catch(() => false);

  return NextResponse.json({
    hasDbUrl: !!process.env.DATABASE_URL || !!db.db_config?.db_url,
    dbUrlFromEnv: !!process.env.DATABASE_URL,
    dbUrlFromConfig: !!db.db_config?.db_url,
    pgConnected: pgAvailable,
    lastSyncAt: db.db_config?.last_sync_at || null,
    dataSize: JSON.stringify(db).length,
    usersCount: db.users.length,
    sopsCount: db.sops.length,
  });
}

// POST: Save DATABASE_URL and sync data
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }
  if (user.role_name !== 'ADMIN') {
    return NextResponse.json({ error: 'เฉพาะ Admin เท่านั้นที่สามารถตั้งค่าฐานข้อมูลได้' }, { status: 403 });
  }

  try {
    const { db_url, saveConfig } = await req.json();
    
    if (!db_url || typeof db_url !== 'string') {
      return NextResponse.json({ error: 'กรุณาระบุ DATABASE URL' }, { status: 400 });
    }

    // Validate the URL format (basic check)
    if (!db_url.startsWith('postgresql://') && !db_url.startsWith('postgres://')) {
      return NextResponse.json({ error: 'รูปแบบ URL ไม่ถูกต้อง — ต้องขึ้นต้นด้วย postgresql://' }, { status: 400 });
    }

    // Test connection first
    // We can't directly set process.env in Node.js, but we can store it in the DB config
    // The db-postgres module will check the stored URL as fallback
    
    // Store in database.json config
    const db = getDB();
    db.db_config = {
      ...db.db_config,
      db_url,
      last_sync_at: new Date().toISOString(),
    };
    saveDB(db);

    // Also try to save to a separate file as a more reliable persistence mechanism (not ephemeral on some platforms)
    try {
      const fs = require('fs');
      const path = require('path');
      const configFile = path.join(process.cwd(), 'data', '.db_url');
      fs.writeFileSync(configFile, db_url, 'utf-8');
    } catch (e) {
      // Ignore file write errors
    }

    // Try to initialize PG and sync data
    let pgConnected = false;
    let syncSuccess = false;
    try {
      // First try with the direct connection
      // Temporarily set env var for this request (only works within this Node process)
      process.env.DATABASE_URL = db_url;
      
      await initializePostgresDB();
      pgConnected = await isPostgresAvailable().catch(() => false);
      
      if (pgConnected) {
        // Sync all current data to PG
        syncSuccess = await saveDBToPostgres(db);
        if (syncSuccess) {
          db.db_config.pg_connected = true;
          db.db_config.last_sync_at = new Date().toISOString();
          saveDB(db);
        }
      }
    } catch (pgErr: any) {
      console.error('[Settings/Database] PG sync error:', pgErr);
    }

    return NextResponse.json({
      success: true,
      pgConnected,
      syncSuccess,
      message: pgConnected
        ? '✅ เชื่อมต่อฐานข้อมูลสำเร็จ และซิงค์ข้อมูลเรียบร้อย!'
        : '⚠️ บันทึก URL แล้ว แต่ไม่สามารถเชื่อมต่อ PostgreSQL ได้ — ตรวจสอบ URL และลองอีกครั้ง',
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message || 'เกิดข้อผิดพลาดในการตั้งค่าฐานข้อมูล',
    }, { status: 500 });
  }
}

// DELETE: Clear stored DATABASE_URL
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }
  if (user.role_name !== 'ADMIN') {
    return NextResponse.json({ error: 'เฉพาะ Admin เท่านั้น' }, { status: 403 });
  }

  const db = getDB();
  db.db_config = {};
  saveDB(db);

  // Also clear the file
  try {
    const fs = require('fs');
    const path = require('path');
    const configFile = path.join(process.cwd(), 'data', '.db_url');
    if (fs.existsSync(configFile)) fs.unlinkSync(configFile);
  } catch (e) {
    // Ignore
  }

  return NextResponse.json({ success: true, message: 'ลบการตั้งค่าฐานข้อมูลเรียบร้อย' });
}
